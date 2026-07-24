import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, Download, FileImage, Layers, Loader2, Maximize2, Minus, Plus, Printer, X, Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import WorkflowNav from '@/components/WorkflowNav';
import { editor, parseTextObjectsFromJson } from '@/lib/fabric/editorController';
import { recipesRepo, ingredientsRepo } from '@/db/repositories';
import type { Ingredient, Recipe } from '@/types';
import {
  bumpExportSeq,
  buildLabelSheetPdf,
  downloadBytes,
  downloadDataUrl,
  peekExportName,
  planSheets,
} from '@/lib/pdfExport';
import { footprintHeightIn, footprintWidthIn, slotPositionIn } from '@/lib/units';
import type { AveryTemplate } from '@/types';

export default function ExportScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const template = useAppStore((s) => s.template);
  const labelPng = useAppStore((s) => s.labelPng);
  const settings = useAppStore((s) => s.settings);

  const [quantity, setQuantity] = useState(() => template?.perSheet ?? 12);
  const [fillSheet, setFillSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneName, setDoneName] = useState('');
  const [exportError, setExportError] = useState('');
  const [preflightDismissed, setPreflightDismissed] = useState(false);

  const plan = useMemo(
    () => (template ? planSheets(template, quantity, fillSheet) : null),
    [template, quantity, fillSheet],
  );

  if (!template || !labelPng) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-slate-500">{t('editor.emptyCanvas')}</p>
        <button className="btn-primary" onClick={() => goto('editor')}>
          <ArrowLeft className="h-4 w-4" /> {t('steps.design')}
        </button>
      </div>
    );
  }

  const pdfName = peekExportName(settings.filenamePrefix);

  const exportPdf = async () => {
    setBusy(true);
    setDoneName('');
    setExportError('');
    try {
      const bytes = await buildLabelSheetPdf({
        template,
        pngDataUrl: labelPng,
        quantity,
        fillSheet,
      });
      const name = peekExportName(settings.filenamePrefix);
      downloadBytes(bytes, name);
      bumpExportSeq(settings.filenamePrefix);
      setDoneName(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setExportError(t('export.pdfError', 'PDF export failed: {{msg}}', { msg }));
    } finally {
      setBusy(false);
    }
  };

  const exportPng = () => {
    const name = peekExportName(settings.filenamePrefix, 'png');
    downloadDataUrl(labelPng, name);
    bumpExportSeq(settings.filenamePrefix);
    setDoneName(name);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button className="icon-btn" onClick={() => goto('editor')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gaia-900">{t('export.title')}</h1>
            <p className="text-sm text-slate-600">{t('export.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4">
            <div className="card space-y-4">
              <div>
                <label className="label">{t('export.quantity')}</label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  className="input"
                  value={quantity}
                  disabled={fillSheet}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-gaia-600"
                  checked={fillSheet}
                  onChange={(e) => setFillSheet(e.target.checked)}
                />
                {t('export.fillSheet')}
              </label>
              {plan && (
                <p className="text-sm text-slate-500">
                  {t('export.sheetsNeeded', { sheets: plan.sheets, perSheet: plan.perSheet })}
                </p>
              )}
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {t('export.filename')}: <span className="font-mono text-slate-700">{pdfName}</span>
              </div>
            </div>

            <button className="btn-primary w-full py-3" disabled={busy} onClick={exportPdf}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
              {busy ? t('export.exporting') : t('export.exportPdf')}
            </button>
            <button className="btn-secondary w-full" onClick={exportPng}>
              <FileImage className="h-4 w-4" /> {t('export.exportPng')}
            </button>

            {doneName && (
              <p className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Download className="h-4 w-4" /> {t('export.done', { name: doneName })}
              </p>
            )}
            {exportError && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <X className="h-4 w-4 shrink-0" /> {exportError}
              </p>
            )}

            {/* Quick Variant */}
            <QuickVariantCard template={template} quantity={quantity} fillSheet={fillSheet} />

            {/* Avery Print Preflight */}
            {!preflightDismissed && (
              <div className="relative rounded-xl border border-amber-200 bg-amber-50 p-4">
                <button
                  className="absolute right-2 top-2 rounded p-1 text-amber-400 hover:bg-amber-100"
                  onClick={() => setPreflightDismissed(true)}
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                  {t('export.preflightTitle')}
                </p>
                <ul className="space-y-2">
                  {[
                    t('export.preflight1'),
                    t('export.preflight2'),
                    t('export.preflight3'),
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FDA Label Checker */}
            <FdaCheckerCard settings={settings} />

            <p className="text-xs text-slate-400">{t('export.tip')}</p>
          </div>

          <SheetPreviewCard
            template={template}
            labelPng={labelPng}
            filled={plan?.total ?? quantity}
          />
        </div>
      </div>
    </div>
      <WorkflowNav
        prevScreen="editor"
        prevLabel={t('workflow.backToEditor')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Variant: swap one text field and export a new PDF instantly
// ---------------------------------------------------------------------------

type TextEntry = { id: string; current: string };

function QuickVariantCard({
  template,
  quantity,
  fillSheet,
}: {
  template: AveryTemplate;
  quantity: number;
  fillSheet: boolean;
}) {
  const { t } = useTranslation();
  const settings  = useAppStore((s) => s.settings);
  const designJson = useAppStore((s) => s.designJson);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [replacement, setReplacement] = useState('');

  // Parse text objects from designJson (works even when canvas is disposed)
  const [textEntries, setTextEntries] = useState<TextEntry[]>([]);

  const loadEntries = () => {
    const json = designJson ?? (editor.canvas ? editor.serialize() : null);
    if (!json) { setTextEntries([]); return; }
    const entries = parseTextObjectsFromJson(json).map((o) => ({ id: o.id, current: o.text }));
    setTextEntries(entries);
    if (entries.length) { setSelected(entries[0].id); setReplacement(entries[0].current); }
  };

  const toggle = () => {
    setOpen((o) => {
      if (!o) loadEntries();
      return !o;
    });
  };

  const exportVariant = async () => {
    if (!selected) return;
    const json = designJson ?? (editor.canvas ? editor.serialize?.() : null);
    if (!json) { setErr('No design data — return to editor first.'); return; }

    setBusy(true);
    setDone('');
    setErr('');
    try {
      // Build variant PNG from an off-screen canvas (works when live canvas is disposed)
      const variantPng = await editor.exportVariantPng(json, selected, replacement, template, settings);

      const bytes = await buildLabelSheetPdf({ template, pngDataUrl: variantPng, quantity, fillSheet });
      const name = peekExportName(`${settings.filenamePrefix}-VAR`);
      downloadBytes(bytes, name);
      bumpExportSeq(`${settings.filenamePrefix}-VAR`);
      setDone(name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gaia-200 bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gaia-50"
        onClick={toggle}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gaia-800">
          <Zap className="h-4 w-4 text-gaia-500" />
          {t('export.quickVariant', 'Quick Variant')}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-gaia-100 px-4 pb-4 pt-3">
          <p className="text-xs text-slate-500">
            {t('export.quickVariantHint', 'Swap one text element and export a new PDF instantly — perfect for 25+ scent variants.')}
          </p>
          {textEntries.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
              {t('export.noTextObjects', 'No text found on canvas. Return to the editor and add some text.')}
            </p>
          ) : (
            <>
              <div>
                <label className="label flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> {t('export.selectText', 'Select text to swap')}
                </label>
                <select
                  className="input"
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    const entry = textEntries.find((x) => x.id === e.target.value);
                    if (entry) setReplacement(entry.current);
                  }}
                >
                  {textEntries.map((e) => (
                    <option key={e.id} value={e.id}>{e.current.length > 36 ? e.current.slice(0, 36) + '…' : e.current}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('export.variantText', 'New text (scent / variant)')}</label>
                <input
                  type="text"
                  className="input"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder={t('export.variantPlaceholder', 'e.g. Lavender Rose')}
                />
              </div>
              <button
                className="btn-primary w-full"
                disabled={busy || !replacement.trim()}
                onClick={() => void exportVariant()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {busy ? t('export.exporting') : t('export.exportVariant', 'Export Variant PDF')}
              </button>
              {done && <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><Download className="h-3.5 w-3.5" />{done}</p>}
              {err  && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zoom steps and the card that wraps the preview with controls
// ---------------------------------------------------------------------------

const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const DEFAULT_ZOOM = 1; // 100 % = fits the fixed 460 px height baseline

function SheetPreviewCard({
  template,
  labelPng,
  filled,
}: {
  template: AveryTemplate;
  labelPng: string;
  filled: number;
}) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const scrollRef = useRef<HTMLDivElement>(null);

  const zoomOut = () =>
    setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)] ?? ZOOM_STEPS[0]);
  const zoomIn = () =>
    setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)] ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  const fit = () => setZoom(DEFAULT_ZOOM);

  const canZoomOut = ZOOM_STEPS.indexOf(zoom) > 0;
  const canZoomIn  = ZOOM_STEPS.indexOf(zoom) < ZOOM_STEPS.length - 1;

  return (
    <div className="card flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="label mb-0">{t('export.sheetPreview')}</p>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:opacity-30"
            title={t('editor.zoomOut')}
            aria-label={t('editor.zoomOut')}
            disabled={!canZoomOut}
            onClick={zoomOut}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            className="min-w-[3.5rem] rounded-md px-2 py-1 text-center text-xs font-semibold text-slate-600 hover:bg-white"
            title={t('editor.fit')}
            aria-label={t('editor.fit')}
            onClick={fit}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:opacity-30"
            title={t('editor.zoomIn')}
            aria-label={t('editor.zoomIn')}
            disabled={!canZoomIn}
            onClick={zoomIn}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-slate-300" />
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-800"
            title={t('editor.fit')}
            aria-label={t('editor.fit')}
            onClick={fit}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable preview area */}
      <div
        ref={scrollRef}
        className="overflow-auto rounded-lg bg-slate-100"
        style={{ maxHeight: '70vh' }}
      >
        <div
          className="flex min-h-full min-w-full items-start justify-center p-4"
          style={{ minWidth: 'max-content' }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <SheetWysiwyg template={template} labelPng={labelPng} filled={filled} />
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        {t('export.zoomHint')}
      </p>
    </div>
  );
}

function SheetWysiwyg({
  template,
  labelPng,
  filled,
}: {
  template: AveryTemplate;
  labelPng: string;
  filled: number;
}) {
  const previewH = 460;
  const scale = previewH / template.pageHeightIn;
  const previewW = template.pageWidthIn * scale;
  const fw = footprintWidthIn(template) * scale;
  const fh = footprintHeightIn(template) * scale;
  const artW = template.labelWidthIn * scale;
  const artH = template.labelHeightIn * scale;

  const slots: { idx: number; x: number; y: number }[] = [];
  let idx = 0;
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.columns; c++) {
      const { xIn, yIn } = slotPositionIn(template, c, r);
      slots.push({ idx, x: xIn * scale, y: yIn * scale });
      idx++;
    }
  }
  const radius =
    template.shape === 'circle' || template.shape === 'oval'
      ? '50%'
      : template.shape === 'rounded-rectangle'
        ? `${template.cornerRadiusIn * scale}px`
        : '2px';

  return (
    <div
      className="relative mx-auto rounded-md bg-white shadow-inner ring-1 ring-slate-200"
      style={{ width: previewW, height: previewH }}
    >
      {slots.map((s) => {
        const used = s.idx < filled;
        return (
          <div
            key={s.idx}
            className={`absolute overflow-hidden ${used ? '' : 'border border-dashed border-slate-200'}`}
            style={{ left: s.x, top: s.y, width: fw, height: fh, borderRadius: radius }}
          >
            {used && (
              <img
                src={labelPng}
                alt=""
                className="absolute left-1/2 top-1/2"
                style={{
                  width: artW,
                  height: artH,
                  transform: `translate(-50%, -50%) rotate(${template.rotateForPrint ? 90 : 0}deg)`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FDA Label Checker
// ---------------------------------------------------------------------------
function FdaCheckerCard({ settings }: { settings: ReturnType<typeof useAppStore.getState>['settings'] }) {
  const { t } = useTranslation();
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const [open, setOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState(activeRecipeId ?? '');

  // Sync selectedRecipeId when the active recipe changes externally.
  useEffect(() => {
    setSelectedRecipeId((prev) => prev || (activeRecipeId ?? ''));
  }, [activeRecipeId]);

  useEffect(() => {
    if (!open) return;
    recipesRepo.all().then(setRecipes).catch(() => {});
    ingredientsRepo.all().then(setIngredients).catch(() => {});
  }, [open]);

  const recipe = recipes.find((r) => r.id === selectedRecipeId);
  const recipeIngredients = recipe
    ? ingredients.filter((i) => recipe.ingredientIds.includes(i.id))
    : [];

  const checks = useMemo(() => {
    const netWtOk = !!recipe?.netWeight?.trim();
    const ingredientsOk = recipeIngredients.length > 0;
    const hasInci = recipeIngredients.some((i) => i.inci?.trim());
    const businessOk = !!(settings.businessName?.trim());
    const addressOk = !!(settings.businessAddress?.trim());
    const hasWarning = !!recipe?.warnings?.trim();
    return { netWtOk, ingredientsOk, hasInci, businessOk, addressOk, hasWarning };
  }, [recipe, recipeIngredients, settings]);

  // Count only definitively failing required checks (warn=true means "unknown — no recipe yet")
  const failCount = [
    !checks.netWtOk && !!recipe,
    !checks.ingredientsOk && !!recipe,
    !checks.hasInci && !!recipe,
    !checks.businessOk,
    !checks.addressOk,
  ].filter(Boolean).length;

  // All required checks pass (recipe must be selected for recipe-dependent checks to count)
  const allRequiredOk =
    !!recipe &&
    checks.netWtOk &&
    checks.ingredientsOk &&
    checks.hasInci &&
    checks.businessOk &&
    checks.addressOk;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ClipboardCheck className="h-4 w-4 shrink-0 text-blue-600" />
        <p className="flex-1 text-xs font-bold uppercase tracking-wide text-blue-700">
          {t('export.fdaTitle', 'FDA Label Compliance Check')}
        </p>
        {failCount > 0 && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            {t('export.fdaIssues', '{{count}} issues', { count: failCount })}
          </span>
        )}
        {failCount === 0 && allRequiredOk && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {t('export.fdaAllPassed', 'All checks passed')}
          </span>
        )}
        {open ? <ChevronDown className="h-3.5 w-3.5 text-blue-400" /> : <ChevronRight className="h-3.5 w-3.5 text-blue-400" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Recipe selector */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              {t('export.fdaRecipe', 'Check against recipe')}
            </label>
            <select
              className="input text-sm"
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
            >
              <option value="">{t('export.fdaSelectRecipe', '— choose a recipe —')}</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <ul className="space-y-2 text-xs">
            <FdaRow ok={checks.netWtOk}       label={t('export.fdaNetWt',    'Net weight present (e.g. "Net wt 4 oz (113 g)")')} warn={!recipe} />
            <FdaRow ok={checks.ingredientsOk} label={t('export.fdaIngred',   'Ingredient list present (descending order of predominance)')} warn={!recipe} />
            <FdaRow ok={checks.hasInci}       label={t('export.fdaInci',     'INCI names entered for ingredients')} warn={!recipe} />
            <FdaRow ok={checks.businessOk}    label={t('export.fdaBusiness', 'Business name set (required on all cosmetic labels)')} />
            <FdaRow ok={checks.addressOk}     label={t('export.fdaAddress',  'Business address set (city, state, zip minimum)')} />
            <FdaRow ok={checks.hasWarning}    label={t('export.fdaWarning',  'Warning / caution text added to recipe')} warn={!recipe} optional />
          </ul>

          {allRequiredOk ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {t('export.fdaAllPassed', 'All checks passed')}
            </div>
          ) : (!checks.businessOk || !checks.addressOk) ? (
            <p className="rounded-lg bg-white px-3 py-2 text-[11px] text-blue-700 ring-1 ring-blue-200">
              {t('export.fdaSettingsHint', '→ Add your business name and address in Settings to complete the check.')}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FdaRow({ ok, label, warn, optional }: { ok: boolean; label: string; warn?: boolean; optional?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : optional || warn ? (
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-slate-300" />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
      )}
      <span className={ok ? 'text-slate-700' : optional ? 'text-slate-400' : warn ? 'text-blue-800' : 'font-medium text-rose-700'}>
        {label}
        {optional && !ok && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </span>
    </li>
  );
}
