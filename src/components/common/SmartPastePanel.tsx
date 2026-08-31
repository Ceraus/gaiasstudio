import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ingredientsRepo } from '@/db/repositories';
import { calculateFractionalCost, fractionalCostLabel } from '@/lib/inventoryMath';
import { importFromSupplierText } from '@/lib/supplierImport';
import type { IngredientCategory } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface SmartPastePanelProps {
  onSaved: () => void;
  className?: string;
  /** `suggest` = gradient CTA first (Ingredients), like AI Suggest on Recipes. */
  variant?: 'default' | 'suggest';
}

interface PreviewForm {
  productName: string;
  price: string;
  size: string;
  unit: 'oz' | 'lbs' | 'ml' | 'g';
}

const UNITS: PreviewForm['unit'][] = ['oz', 'lbs', 'ml', 'g'];

const GRADIENT_BTN =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gaia-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-gaia-500/30 transition hover:from-gaia-700 hover:to-violet-700 hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:ring-slate-200';

function guessCategory(name: string): IngredientCategory {
  const n = name.toLowerCase();
  if (/mica|pigment|dye|colorant|lake|oxide/.test(n)) return 'colorant';
  if (/essential oil|\beo\b|fragrance|perfume/.test(n)) return 'fragrance';
  if (/shea|cocoa|mango|butter/.test(n)) return 'butter';
  if (/\boil\b|jojoba|argan|coconut|olive|almond/.test(n)) return 'oil';
  if (/clay|charcoal|oatmeal|botanical|herb|flower|petal/.test(n)) return 'botanical';
  if (/glycerin|soap base|melt.?pour|base/.test(n)) return 'base';
  return 'other';
}

export default function SmartPastePanel({
  onSaved,
  className = '',
  variant = 'default',
}: SmartPastePanelProps) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const goto = useAppStore((s) => s.goto);

  const [open, setOpen] = useState(variant === 'default');
  const [rawText, setRawText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState(false);
  const [preview, setPreview] = useState<PreviewForm | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  const fractionalPreview = useMemo(() => {
    if (!preview) return undefined;
    const price = parseFloat(preview.price);
    const size = parseFloat(preview.size);
    if (!Number.isFinite(price) || !Number.isFinite(size) || price <= 0 || size <= 0) return undefined;

    const measurementType = preview.unit === 'ml' ? 'volume' : 'weight';
    const fractional = calculateFractionalCost({
      measurementType,
      purchaseSize: size,
      purchaseUnit: preview.unit,
      purchasePrice: price,
    });
    const simple = price / size;
    return { fractional, simple, measurementType };
  }, [preview]);

  const resetPaste = () => {
    setPreview(null);
    setParseWarning(false);
    setError(null);
    setSavedName(null);
  };

  const runExtract = async () => {
    setExtracting(true);
    setError(null);
    setParseWarning(false);
    setPreview(null);
    setSavedName(null);
    try {
      const result = await importFromSupplierText(rawText, settings);
      if (!result.ok) {
        setError(result.error ?? t('inventory.smartPasteFailed', 'Extraction failed.'));
        if (result.parseWarning) setParseWarning(true);
        return;
      }
      const d = result.data ?? {};
      setPreview({
        productName: d.productName ?? '',
        price: d.price !== undefined ? String(d.price) : '',
        size: d.size !== undefined ? String(d.size) : '',
        unit: d.unit ?? 'oz',
      });
      if (result.parseWarning) {
        setParseWarning(true);
        setError(t('inventory.smartPasteReview', 'Some fields look incomplete — review before saving.'));
      }
    } finally {
      setExtracting(false);
    }
  };

  const saveToInventory = async () => {
    if (!preview) return;
    const name = preview.productName.trim();
    const price = parseFloat(preview.price);
    const size = parseFloat(preview.size);
    if (!name) {
      setError(t('inventory.smartPasteNameRequired', 'Product name is required.'));
      return;
    }
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size <= 0) {
      setError(t('inventory.smartPastePriceRequired', 'Enter a valid price and size.'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const measurementType = preview.unit === 'ml' ? 'volume' : 'weight';
      const patch = {
        active: true,
        measurementType,
        purchasePrice: price,
        purchaseSize: size,
        purchaseUnit: preview.unit,
      } as const;

      const existing = (await ingredientsRepo.all()).find(
        (i) => i.name.trim().toLowerCase() === name.toLowerCase(),
      );

      if (existing) {
        await ingredientsRepo.update(existing.id, patch);
        setSavedName(existing.name);
      } else {
        await ingredientsRepo.create({
          name,
          benefit: '',
          inci: '',
          isSoapBase: preview.unit !== 'ml' && guessCategory(name) === 'base',
          category: guessCategory(name),
          ...patch,
        });
        setSavedName(name);
      }

      onSaved();
      setRawText('');
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const previewIng = preview
    ? {
        measurementType: (preview.unit === 'ml' ? 'volume' : 'weight') as 'volume' | 'weight',
        category: guessCategory(preview.productName),
      }
    : null;

  const pasteBody = !preview ? (
    <>
      <textarea
        className="input mb-3 min-h-[88px] w-full resize-y font-mono text-xs leading-relaxed"
        placeholder={t(
          'inventory.smartPastePlaceholder',
          'Paste product title, price, and size here…',
        )}
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          setError(null);
          setSavedName(null);
        }}
      />
      <button
        type="button"
        className={`mb-3 ${GRADIENT_BTN}`}
        disabled={!rawText.trim() || extracting}
        onClick={() => void runExtract()}
        title={t(
          'inventory.smartPasteExtractTooltip',
          'Extract product details with local AI — review before saving.',
        )}
      >
        {extracting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {extracting
          ? t('inventory.smartPasteExtracting', 'Extracting…')
          : t('inventory.smartPasteExtractPromo', 'Extract with AI')}
      </button>
    </>
  ) : (
    <div className="mb-3 rounded-xl border border-gaia-200 bg-gaia-50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gaia-600">
            <Sparkles className="h-3 w-3" />
            {t('inventory.smartPastePreviewLabel', 'Extracted details')}
          </p>
          <div className="space-y-3">
            <div>
              <label className="label">{t('inventory.smartPasteName', 'Product name')}</label>
              <input
                className="input"
                value={preview.productName}
                onChange={(e) => setPreview({ ...preview, productName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('inventory.colPrice', 'Price ($)')}</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={preview.price}
                  onChange={(e) => setPreview({ ...preview, price: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('inventory.colSize', 'Purchase Size')}</label>
                <div className="flex gap-2">
                  <input
                    className="input min-w-0 flex-1"
                    inputMode="decimal"
                    value={preview.size}
                    onChange={(e) => setPreview({ ...preview, size: e.target.value })}
                  />
                  <select
                    className="input w-20 shrink-0"
                    value={preview.unit}
                    onChange={(e) =>
                      setPreview({ ...preview, unit: e.target.value as PreviewForm['unit'] })
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {fractionalPreview && previewIng && (
              <div className="rounded-lg bg-white px-3 py-2 text-sm text-gaia-900 ring-1 ring-gaia-100">
                <p className="font-medium">{t('inventory.smartPasteFractional', 'Fractional cost')}</p>
                <p className="mt-1 text-gaia-800">
                  ${fractionalPreview.simple.toFixed(4)} / {preview.unit}
                  {' · '}
                  ${fractionalPreview.fractional?.toFixed(4) ?? '—'}
                  {fractionalCostLabel(previewIng)}
                  {preview.unit === 'ml' && (
                    <span className="text-xs text-gaia-600">
                      {' '}
                      ({t('inventory.smartPasteDropNote', '1 ml = 20 drops')})
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
              <button
                type="button"
                className="btn-primary shrink-0 py-1.5 text-xs"
                disabled={saving}
                onClick={() => void saveToInventory()}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {t('inventory.smartPasteSave', 'Save to Inventory')}
              </button>
              <button type="button" className="btn-secondary shrink-0 py-1.5 text-xs" onClick={resetPaste}>
                {t('inventory.smartPasteRepaste', '← Paste different text')}
              </button>
            </div>
          </div>
    </div>
  );

  const showDetails = variant === 'default' || open || preview !== null;

  return (
    <div className={className} aria-label={t('inventory.smartPasteTitle', 'Smart Paste — Temu / Amazon')}>
      <label className="label">{t('inventory.smartPastePromoTitle', 'Smart Paste — Temu / Amazon')}</label>

      {variant === 'suggest' && (
        <button
          type="button"
          className={`mb-3 ${GRADIENT_BTN}`}
          aria-expanded={open || preview !== null}
          onClick={() => {
            if (preview) return;
            setOpen((v) => !v);
          }}
          title={t(
            'inventory.smartPasteOpenTooltip',
            'Paste a Temu or Amazon listing — local AI extracts name, price, and size.',
          )}
        >
          <ClipboardPaste className="h-4 w-4" />
          {t('inventory.smartPasteButton', 'Smart Paste')}
        </button>
      )}

      {showDetails && pasteBody}

      {showDetails && error && (
        <p className={`mb-2 flex items-start gap-1.5 text-[11px] ${parseWarning ? 'text-amber-600' : 'text-rose-600'}`}>
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {error}{' '}
            {!parseWarning && settings.localAiEnabled && (
              <button type="button" className="underline hover:text-amber-800" onClick={() => goto('settings')}>
                {t('inventory.smartPasteSettingsLink', 'Check Local AI settings →')}
              </button>
            )}
          </span>
        </p>
      )}

      {showDetails && savedName && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t('inventory.smartPasteSaved', 'Saved {{name}} to inventory.', { name: savedName })}
        </p>
      )}

      {showDetails && (
      <p className="flex flex-nowrap items-center gap-2 overflow-x-auto text-[11px] text-slate-400">
        <span className="shrink-0">{t('inventory.smartPasteModelsLabel', 'Models:')}</span>
        <span className="shrink-0 font-mono text-slate-500">llama3.1:8b</span>
        <span className="shrink-0 text-slate-300" aria-hidden>·</span>
        <span className="shrink-0 font-mono text-slate-500">qwen2.5:7b</span>
        <span className="shrink-0 text-slate-300" aria-hidden>·</span>
        <button
          type="button"
          className="shrink-0 underline decoration-slate-300 underline-offset-2 hover:text-gaia-600 hover:decoration-gaia-400"
          onClick={() => goto('settings')}
        >
          {t('inventory.smartPasteSettingsInline', 'Local AI settings')}
        </button>
        <span className="shrink-0 text-slate-300" aria-hidden>·</span>
        <button
          type="button"
          className="shrink-0 underline decoration-slate-300 underline-offset-2 hover:text-gaia-600 hover:decoration-gaia-400"
          onClick={() => goto('settings')}
        >
          {t('inventory.smartPasteOllamaInline', 'Ollama URL')}
        </button>
      </p>
      )}
    </div>
  );
}
