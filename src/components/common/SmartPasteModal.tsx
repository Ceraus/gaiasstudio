import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardPaste, Loader2, Sparkles } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { ingredientsRepo } from '@/db/repositories';
import { calculateFractionalCost, fractionalCostLabel } from '@/lib/inventoryMath';
import { importFromSupplierText } from '@/lib/supplierImport';
import type { IngredientCategory } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface SmartPasteModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface PreviewForm {
  productName: string;
  price: string;
  size: string;
  unit: 'oz' | 'lbs' | 'ml' | 'g';
}

const UNITS: PreviewForm['unit'][] = ['oz', 'lbs', 'ml', 'g'];

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

export default function SmartPasteModal({ open, onClose, onSaved }: SmartPasteModalProps) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);

  const [rawText, setRawText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState(false);
  const [preview, setPreview] = useState<PreviewForm | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRawText('');
    setExtracting(false);
    setSaving(false);
    setError(null);
    setParseWarning(false);
    setPreview(null);
    setSavedName(null);
  }, [open]);

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
      setTimeout(() => onClose(), 900);
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title={
        <span className="flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-gaia-600" />
          {t('inventory.smartPasteTitle', 'Smart Paste — Temu / Amazon')}
        </span>
      }
      footer={
        preview ? (
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => void saveToInventory()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t('inventory.smartPasteSave', 'Save to Inventory')}
            </button>
          </div>
        ) : undefined
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        {t(
          'inventory.smartPasteHint',
          'Copy the product title, price, and size from Temu or Amazon and paste it below. Ollama on your PC extracts the details.',
        )}
      </p>

      {!preview ? (
        <>
          <textarea
            className="input min-h-[160px] w-full resize-y font-mono text-xs leading-relaxed"
            placeholder={t(
              'inventory.smartPastePlaceholder',
              'Paste product title, price, and size here…',
            )}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setError(null);
            }}
          />
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            disabled={!rawText.trim() || extracting}
            onClick={() => void runExtract()}
          >
            {extracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t('inventory.smartPasteExtract', 'Extract Details (Ollama)')}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">{t('inventory.smartPasteName', 'Product name')}</label>
            <input
              className="input"
              value={preview.productName}
              onChange={(e) => setPreview({ ...preview, productName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="rounded-xl bg-gaia-50 px-4 py-3 text-sm text-gaia-900 ring-1 ring-gaia-100">
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

          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => {
              setPreview(null);
              setParseWarning(false);
              setError(null);
            }}
          >
            {t('inventory.smartPasteRepaste', '← Paste different text')}
          </button>
        </div>
      )}

      {error && (
        <p className={`mt-3 text-xs ${parseWarning ? 'text-amber-700' : 'text-rose-600'}`}>{error}</p>
      )}

      {savedName && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t('inventory.smartPasteSaved', 'Saved {{name}} to inventory.', { name: savedName })}
        </p>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        {t(
          'inventory.smartPasteModelHint',
          'Recommended Ollama models: llama3.1:8b or qwen2.5:7b (Settings → Local AI → Ollama).',
        )}
      </p>
    </Modal>
  );
}
