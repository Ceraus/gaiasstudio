import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, Download, Expand, Loader2, Minus, Plus, Printer, Ruler, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { WORKFLOW_STEP_ICONS } from '@/lib/workflowStepIcons';
import WorkflowGapBanner from '@/components/WorkflowGapBanner';
import { applyTextMapToCanvasJson, editor, parseTextObjectsFromCanvas, parseTextObjectsFromJson, readCanvasLabelLanguage, writeCanvasLabelLanguage } from '@/lib/fabric/editorController';
import { detectCanvasLabelLanguage, detectLabelLanguageFromTexts } from '@/lib/detectLabelLanguage';
import {
  applyDynamicVariablesToCanvasJson,
  resolveIngredientsForRecipe,
  resolveLatestLotCodeForRecipe,
} from '@/lib/dynamicLabelVars';
import { recipesRepo, ingredientsRepo, draftsRepo } from '@/db/repositories';
import type { AveryTemplate, Ingredient, Recipe } from '@/types';
import { buildSortedInciList } from '@/lib/inventoryMath';
import { formatNetWeightLine } from '@/lib/netWeight';
import {
  buildCalibrationPdf,
  bumpExportSeq,
  buildLabelSheetPdf,
  downloadBytes,
  peekExportName,
  planSheets,
  type ExportNameOptions,
} from '@/lib/pdfExport';
import { exportPrintReadyPdf } from '@/lib/pdfVault';
import { translateLabelTexts } from '@/lib/localAi';
import { recipeBilingualPairs } from '@/lib/offlineLabelTranslate';
import { footprintHeightIn, footprintWidthIn, slotPositionIn } from '@/lib/units';
import type { LayoutLang } from '@/lib/layoutEngine';

function useExportRecipeName(): string {
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const activeDraftId = useAppStore((s) => s.activeDraftId);
  const [recipeName, setRecipeName] = useState('Label');

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (activeRecipeId) {
        const recipe = await recipesRepo.get(activeRecipeId);
        if (!cancelled && recipe?.name) {
          setRecipeName(recipe.name);
          return;
        }
      }
      if (activeDraftId) {
        const draft = await draftsRepo.get(activeDraftId);
        if (draft?.recipeId) {
          const recipe = await recipesRepo.get(draft.recipeId);
          if (!cancelled && recipe?.name) {
            setRecipeName(recipe.name);
            return;
          }
        }
      }
      if (!cancelled) setRecipeName('Label');
    };
    void resolve();
    return () => { cancelled = true; };
  }, [activeRecipeId, activeDraftId]);

  return recipeName;
}

function buildExportOpts(brand: string, recipeName: string, ext = 'pdf'): ExportNameOptions {
  return { brand, recipeName, ext };
}

function withExt(name: string, ext: string) {
  const trimmed = name.trim() || 'label';
  return trimmed.toLowerCase().endsWith(`.${ext}`) ? trimmed : `${trimmed}.${ext}`;
}

const QTY_MAX = 9999;

function clampExportQty(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(QTY_MAX, n);
}

export default function ExportScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const template = useAppStore((s) => s.template);
  const labelPng = useAppStore((s) => s.labelPng);
  const settings = useAppStore((s) => s.settings);
  const designJson = useAppStore((s) => s.designJson);
  const setDesignJson = useAppStore((s) => s.setDesignJson);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const activeDraftId = useAppStore((s) => s.activeDraftId);
  const setActiveDraftId = useAppStore((s) => s.setActiveDraftId);
  const context = useAppStore((s) => s.context);
  const recipeName = useExportRecipeName();
  const { icon: RefineIcon, chip: refineChip } = WORKFLOW_STEP_ICONS[4];

  const [exportLang, setExportLang] = useState<LayoutLang>(() => {
    const state = useAppStore.getState();
    const detected = detectCanvasLabelLanguage(
      state.designJson,
      state.labelLanguage ?? readCanvasLabelLanguage(state.designJson),
    );
    return detected ?? settings.language ?? 'es';
  });
  const exportLangSynced = useRef(false);
  const [previewPng, setPreviewPng] = useState<string | null>(labelPng);
  const [previewLoading, setPreviewLoading] = useState(false);
  const setLabelPng = useAppStore((s) => s.setLabelPng);
  const [quantity, setQuantity] = useState(() => template?.perSheet ?? 12);
  const [qtyDraft, setQtyDraft] = useState(() => String(template?.perSheet ?? 12));
  const [busy, setBusy] = useState(false);
  const [doneName, setDoneName] = useState('');
  const [exportError, setExportError] = useState('');
  const [fileName, setFileName] = useState(() =>
    peekExportName(buildExportOpts("Gaia's Essences", 'Label')).replace(/\.pdf$/i, ''),
  );
  const [isDesignDraft, setIsDesignDraft] = useState(true);
  const [translateMsg, setTranslateMsg] = useState('');
  const [translateError, setTranslateError] = useState('');
  const [translating, setTranslating] = useState(false);
  const labelLanguage = useAppStore((s) => s.labelLanguage);
  const setLabelLanguage = useAppStore((s) => s.setLabelLanguage);
  const detectedLabelLanguage = useMemo(() => {
    const stamped = readCanvasLabelLanguage(designJson);
    const fromJson = detectCanvasLabelLanguage(designJson, stamped ?? labelLanguage);
    if (fromJson) return fromJson;
    if (editor.canvas) {
      const live = parseTextObjectsFromCanvas(editor.canvas).map((entry) => entry.text);
      return detectLabelLanguageFromTexts(live, stamped ?? labelLanguage);
    }
    return stamped ?? labelLanguage ?? null;
  }, [designJson, labelLanguage]);
  const currentLabelLanguage = detectedLabelLanguage ?? labelLanguage ?? readCanvasLabelLanguage(designJson);
  const languageAlreadyApplied = currentLabelLanguage != null && exportLang === currentLabelLanguage;

  const plan = useMemo(
    () => (template ? planSheets(template, quantity, false) : null),
    [template, quantity],
  );

  const defaultPdfName = peekExportName(buildExportOpts(settings.filenamePrefix, recipeName));

  useEffect(() => {
    if (!fileName) setFileName(defaultPdfName.replace(/\.pdf$/i, ''));
  }, [defaultPdfName, fileName]);

  useEffect(() => {
    if (labelPng) {
      setPreviewPng(labelPng);
      return;
    }
    if (!template || !designJson) {
      setPreviewPng(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    void (async () => {
      try {
        const png = await editor.renderDesignPng(designJson, template, settings);
        if (cancelled) return;
        setPreviewPng(png);
        setLabelPng(png);
      } catch (err) {
        console.error('[gaia] export.preview failed', err);
        if (!cancelled) setPreviewPng(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [labelPng, designJson, template, settings, setLabelPng]);

  useEffect(() => {
    if (detectedLabelLanguage && detectedLabelLanguage !== labelLanguage) {
      setLabelLanguage(detectedLabelLanguage);
    }
    if (!exportLangSynced.current && detectedLabelLanguage) {
      setExportLang(detectedLabelLanguage);
      exportLangSynced.current = true;
    }
  }, [detectedLabelLanguage, labelLanguage, setLabelLanguage]);

  useEffect(() => {
    if (!template) goto('template');
  }, [template, goto]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const draftLabel = t('export.designDraft', 'Design Draft');
      if (activeDraftId) {
        const existing = await draftsRepo.get(activeDraftId);
        if (cancelled) return;
        setIsDesignDraft(!existing?.name || existing.name === draftLabel || existing.name === template?.name);
        return;
      }
      if (!template || !designJson) return;
      const draft = await draftsRepo.save({
        name: draftLabel,
        designJson,
        templateId: template.id,
        context,
        recipeId: activeRecipeId ?? undefined,
      });
      if (cancelled) return;
      setActiveDraftId(draft.id);
      setIsDesignDraft(true);
    })();
    return () => { cancelled = true; };
  }, [activeDraftId, activeRecipeId, context, designJson, setActiveDraftId, t, template]);

  if (!template) {
    return null;
  }

  if (!previewPng) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        {previewLoading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-gaia-600" />
            <p className="text-sm text-slate-500">{t('export.generatingPreview', 'Preparing your label preview…')}</p>
          </>
        ) : (
          <>
            <p className="max-w-md text-sm text-slate-500">
              {designJson
                ? t('export.previewFailed', 'Could not build a preview. Open the editor and try Print & Export again.')
                : t('export.needDesign', 'Design your label in the editor first — then come back here to print.')}
            </p>
            <button className="btn-primary" onClick={() => goto('editor-v2')}>
              <ArrowLeft className="h-4 w-4" /> {t('workflow.refine', 'Refine & Design')}
            </button>
          </>
        )}
      </div>
    );
  }

  const persistDraft = async (name: string) => {
    const json = designJson ?? (editor.canvas ? editor.serialize() : null);
    if (!json || !template) return;
    const draft = await draftsRepo.save({
      id: activeDraftId ?? undefined,
      name,
      designJson: json,
      templateId: template.id,
      context,
      recipeId: activeRecipeId ?? undefined,
    });
    setActiveDraftId(draft.id);
    setIsDesignDraft(false);
  };

  const resolvedPdfName = () => withExt(fileName || defaultPdfName.replace(/\.pdf$/i, ''), 'pdf');

  const exportPdf = async () => {
    setBusy(true);
    setDoneName('');
    setExportError('');
    try {
      let png = previewPng;
      const resolvedLot = await resolveLatestLotCodeForRecipe(activeRecipeId ?? undefined);
      const recipe = activeRecipeId ? await recipesRepo.get(activeRecipeId) : undefined;
      const allIngredients = await ingredientsRepo.all();
      const resolvedIngredients = resolveIngredientsForRecipe(recipe, allIngredients);
      if (designJson && template) {
        const resolvedJson = applyDynamicVariablesToCanvasJson(designJson, {
          lotCode: resolvedLot,
          ingredients: resolvedIngredients,
        });
        png = await editor.renderDesignPng(resolvedJson, template, settings);
      }
      if (!png) throw new Error('No label preview');
      const committedQty = clampExportQty(qtyDraft);
      setQuantity(committedQty);
      setQtyDraft(String(committedQty));
      const bytes = await buildLabelSheetPdf({
        template,
        pngDataUrl: png,
        quantity: committedQty,
        fillSheet: false,
      });
      const name = resolvedPdfName();
      await exportPrintReadyPdf(bytes, name);
      bumpExportSeq(buildExportOpts(settings.filenamePrefix, recipeName));
      setDoneName(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setExportError(t('export.pdfError', 'PDF export failed: {{msg}}', { msg }));
    } finally {
      setBusy(false);
    }
  };

  const saveAndExport = async () => {
    const name = resolvedPdfName().replace(/\.pdf$/i, '');
    await persistDraft(name);
    await exportPdf();
  };

  const applyLabelLanguage = async () => {
    if (languageAlreadyApplied || translating) return;
    setTranslateError('');
    setTranslateMsg('');
    let json = designJson ?? (editor.canvas ? editor.serialize() : null);
    let entries = json ? parseTextObjectsFromJson(json) : [];
    if (!entries.length && editor.canvas) {
      entries = parseTextObjectsFromCanvas(editor.canvas);
      if (entries.length) {
        json = editor.serialize();
        const fromFresh = parseTextObjectsFromJson(json);
        if (fromFresh.length) entries = fromFresh;
      }
    }
    if (!json) {
      setTranslateError(t('export.noDesignData', 'No design data — return to the editor first.'));
      return;
    }
    if (!entries.length) {
      setTranslateError(t('export.noTextObjects', 'No text found on canvas.'));
      return;
    }
    setTranslating(true);
    setTranslateMsg(t('export.translateProgress', { done: 0, total: entries.length }));
    let recipe = activeRecipeId ? await recipesRepo.get(activeRecipeId) : undefined;
    if (!recipe && activeDraftId) {
      const draft = await draftsRepo.get(activeDraftId);
      if (draft?.recipeId) recipe = await recipesRepo.get(draft.recipeId);
    }
    const result = await translateLabelTexts(entries.map((e) => e.text), exportLang, settings, {
      pairs: recipeBilingualPairs(recipe),
    });
    if (!result.ok || !result.texts) {
      setTranslating(false);
      setTranslateError(t('export.translateError', { msg: result.error ?? 'Translation failed.' }));
      return;
    }
    const map: Record<string, string> = {};
    entries.forEach((entry, i) => {
      if (entry.id && result.texts?.[i]) map[entry.id] = result.texts[i];
    });
    const nextJson = writeCanvasLabelLanguage(applyTextMapToCanvasJson(json, map), exportLang);
    setDesignJson(nextJson);
    setLabelLanguage(exportLang);
    if (editor.canvas) editor.applyTextMap(map);
    try {
      const png = await editor.renderDesignPng(nextJson, template, settings);
      setPreviewPng(png);
      setLabelPng(png);
    } catch (err) {
      console.error('[gaia] export.translatePreview failed', err);
    }
    const doneKey =
      result.source === 'google'
        ? 'export.translateDoneGoogle'
        : result.source === 'mixed'
          ? 'export.translateDoneMixed'
          : 'export.translateDoneOffline';
    setTranslateMsg(t(doneKey));
    setTranslating(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <WorkflowGapBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden bg-gaia-50">
        <div className="w-[442px] shrink-0 overflow-y-auto border-r border-slate-200 px-4 py-6">
          <div className="mb-4">
            <button
              type="button"
              className="btn-primary relative flex w-full items-center rounded-full px-5 py-2.5 text-sm font-semibold"
              onClick={() => goto('editor-v2')}
            >
              <ArrowLeft className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <span className="flex w-full items-center justify-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${refineChip}`}
                  aria-hidden
                >
                  <RefineIcon className="h-4 w-4" />
                </span>
                {t('workflow.step4Title', 'Step 4: Refine & Design')}
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="card space-y-4">
              <div>
                <label className="label">{t('export.labelLanguage', 'Label language')}</label>
                <select
                  className="input"
                  value={exportLang}
                  onChange={(e) => {
                    exportLangSynced.current = true;
                    setExportLang(e.target.value as LayoutLang);
                  }}
                >
                  <option value="es">{t('export.langEs', 'Español (label text)')}</option>
                  <option value="en">{t('export.langEn', 'English (label text)')}</option>
                </select>
                <button
                  type="button"
                  disabled={translating || languageAlreadyApplied}
                  className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed ${
                    languageAlreadyApplied && !translating
                      ? 'bg-slate-300 text-slate-500 ring-1 ring-slate-200'
                      : 'bg-gaia-600 text-white ring-1 ring-gaia-500/30 hover:bg-gaia-700 disabled:opacity-60'
                  }`}
                  onClick={() => void applyLabelLanguage()}
                >
                  {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('export.applyLabelLanguage', 'Apply Language To Label')}
                </button>
                {translateMsg && (
                  <p className="mt-1 w-full text-center text-[11px] text-gaia-700">{translateMsg}</p>
                )}
                {translateError && (
                  <p className="mt-1 w-full rounded-lg bg-rose-50 px-3 py-2 text-center text-xs text-rose-700">
                    {translateError}
                  </p>
                )}
              </div>
              <div>
                <label className="label">{t('export.quantity')}</label>
                <input
                  type="number"
                  min={1}
                  max={QTY_MAX}
                  className="input"
                  value={qtyDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setQtyDraft('');
                      return;
                    }
                    if (!/^\d+$/.test(raw)) return;
                    setQtyDraft(raw);
                    const n = Number.parseInt(raw, 10);
                    if (n >= 1 && n <= QTY_MAX) setQuantity(n);
                  }}
                  onBlur={() => {
                    const next = clampExportQty(qtyDraft);
                    setQuantity(next);
                    setQtyDraft(String(next));
                  }}
                />
              </div>
              <div>
                <label className="label">{t('export.filenameField', 'File name')}</label>
                <input
                  className="input font-mono text-sm"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </div>
            </div>

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

            <FdaCheckerCard />

            <button
              className="btn-secondary w-full"
              data-tour="calibration"
              onClick={() => void buildCalibrationPdf().then((bytes) =>
                downloadBytes(bytes, "Gaia's Essences - Printer Calibration.pdf"))}
              title={t('export.calibrationTitle', 'A test page with a 1-inch square and margin frame — print it to verify your printer is at 100% scale.')}
            >
              <Ruler className="h-4 w-4" /> {t('export.calibration', 'Printer calibration page')}
            </button>
          </div>
        </div>

        <SheetPreviewCard
          className="min-h-0 flex-1"
          template={template}
          labelPng={previewPng}
          filled={plan?.total ?? quantity}
          isDesignDraft={isDesignDraft}
        />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur-sm">
        <button className="btn-secondary flex items-center gap-2" onClick={() => goto('editor-v2')}>
          <ArrowLeft className="h-4 w-4" />
          {t('workflow.backToEditor')}
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-violet-700 disabled:opacity-60"
            onClick={() => void saveAndExport()}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {t('export.saveAndExport')}
          </button>
          <button
            className="btn-primary rounded-full px-5 py-2.5"
            disabled={busy}
            onClick={() => void exportPdf()}
            data-tour="export-pdf"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
            {busy ? t('export.exporting') : t('export.exportPdf')}
          </button>
        </div>
      </div>
    </div>
  );
}

const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const DEFAULT_ZOOM = 2;

const SheetPreviewCard = memo(function SheetPreviewCard({
  template,
  labelPng,
  filled,
  isDesignDraft = false,
  className = '',
}: {
  template: AveryTemplate;
  labelPng: string;
  filled: number;
  isDesignDraft?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewH, setPreviewH] = useState(520);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 80) setPreviewH(Math.floor(h - 8));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoomOut = () =>
    setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)] ?? ZOOM_STEPS[0]);
  const zoomIn = () =>
    setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)] ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  const fit = () => setZoom(1);

  const canZoomOut = ZOOM_STEPS.indexOf(zoom) > 0;
  const canZoomIn  = ZOOM_STEPS.indexOf(zoom) < ZOOM_STEPS.length - 1;

  return (
    <div className={`card flex min-h-0 flex-col gap-3 rounded-none border-0 border-l border-slate-200 shadow-none ${className}`}>
      <div className="flex items-center gap-2">
        <p className="label mb-0">{t('export.sheetPreview')}</p>
        <div className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1 py-0.5">
          <div className="flex items-center justify-center gap-1">
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
              onClick={() => setZoom(1)}
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
          </div>
          <div className="mx-0.5 h-4 w-px bg-slate-300" />
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-800"
            title={t('export.fitSheet', 'Fit sheet')}
            aria-label={t('export.fitSheet', 'Fit sheet')}
            onClick={fit}
          >
            <Expand className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        </div>
        {isDesignDraft && (
          <span className="ml-auto inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            {t('export.designDraft', 'Design Draft')}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-100"
      >
        <div
          className="flex min-h-full min-w-full items-start justify-center p-4"
          style={{ minWidth: 'max-content' }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <SheetWysiwyg template={template} labelPng={labelPng} filled={filled} previewH={previewH} />
          </div>
        </div>
      </div>
    </div>
  );
});

const SheetWysiwyg = memo(function SheetWysiwyg({
  template,
  labelPng,
  filled,
  previewH,
}: {
  template: AveryTemplate;
  labelPng: string;
  filled: number;
  previewH: number;
}) {
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
});

function truncateDetail(value: string, max = 96): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function FdaCheckerCard() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const settings = useAppStore((s) => s.settings);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const [open, setOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState(activeRecipeId ?? '');
  const [lotCode, setLotCode] = useState<string | undefined>();

  useEffect(() => {
    setSelectedRecipeId((prev) => prev || (activeRecipeId ?? ''));
  }, [activeRecipeId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([recipesRepo.all(), ingredientsRepo.all()])
      .then(([nextRecipes, nextIngredients]) => {
        if (cancelled) return;
        setRecipes(nextRecipes);
        setIngredients(nextIngredients);
      })
      .catch((err) => {
        console.error('[gaia] export.loadRecipes failed', err);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void resolveLatestLotCodeForRecipe(selectedRecipeId || undefined).then((code) => {
      if (!cancelled) setLotCode(code);
    });
    return () => { cancelled = true; };
  }, [selectedRecipeId]);

  const recipe = recipes.find((r) => r.id === selectedRecipeId);
  const recipeIngredients = recipe
    ? ingredients.filter((i) => recipe.ingredientIds.includes(i.id))
    : [];
  const missingInci = recipeIngredients.filter((i) => !i.inci?.trim());
  const inciList = recipe ? buildSortedInciList(recipe, ingredients) : '';

  const checks = useMemo(() => {
    const netWtOk = !!recipe?.netWeight?.trim();
    const ingredientsOk = recipeIngredients.length > 0;
    const hasInci = ingredientsOk && missingInci.length === 0;
    const businessOk = !!settings.businessName?.trim();
    const addressOk = !!settings.businessAddress?.trim();
    const hasWarning = !!recipe?.warnings?.trim();
    const hasLot = !!lotCode?.trim();
    return { netWtOk, ingredientsOk, hasInci, businessOk, addressOk, hasWarning, hasLot };
  }, [recipe, recipeIngredients, missingInci.length, settings.businessName, settings.businessAddress, lotCode]);

  // INCI completeness is deferred for now: keep showing the missing-INCI row,
  // but do not count it as a required-check failure or issue.
  const failCount = [
    !checks.netWtOk && !!recipe,
    !checks.ingredientsOk && !!recipe,
    !checks.businessOk,
    !checks.addressOk,
  ].filter(Boolean).length;

  const allRequiredOk =
    !!recipe &&
    checks.netWtOk &&
    checks.ingredientsOk &&
    checks.businessOk &&
    checks.addressOk;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4" data-testid="fda-compliance-check">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ClipboardCheck className="h-4 w-4 shrink-0 text-blue-600" />
        <p className="flex-1 ui-label font-bold uppercase tracking-wide text-blue-700">
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
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-blue-400" />
          : <ChevronRight className="h-3.5 w-3.5 text-blue-400" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              {t('export.fdaRecipe', 'Check against recipe')}
            </label>
            <select
              className="input text-sm"
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
            >
              <option value="">{t('export.fdaSelectRecipe', '— Choose A Recipe —')}</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {!recipe && (
            <p className="rounded-lg bg-white px-3 py-2 text-[11px] text-blue-700 ring-1 ring-blue-200">
              {t('export.fdaNoRecipe', 'Choose a recipe to check net weight, ingredients, lot code, and warnings.')}
            </p>
          )}

          <ul className="space-y-2 text-xs">
            <FdaRow
              ok={checks.netWtOk}
              label={t('export.fdaNetWt', 'Net weight present (e.g. "Net wt 4 oz (113 g)")')}
              detail={checks.netWtOk ? formatNetWeightLine(recipe?.netWeight) : undefined}
              warn={!recipe}
            />
            <FdaRow
              ok={checks.ingredientsOk}
              label={t('export.fdaIngred', 'Ingredient list present (descending order of predominance)')}
              detail={checks.ingredientsOk && inciList ? truncateDetail(inciList) : undefined}
              warn={!recipe}
            />
            <FdaRow
              ok={checks.hasInci}
              label={t('export.fdaInci', 'INCI names entered for ingredients')}
              detail={
                !recipe
                  ? undefined
                  : missingInci.length
                    ? t('export.fdaInciMissing', 'Missing INCI: {{names}}', {
                        names: missingInci.map((i) => i.name).join(', '),
                      })
                    : undefined
              }
              warn={!recipe}
              deferred
            />
            <FdaRow
              ok={checks.businessOk}
              label={t('export.fdaBusiness', 'Business name set (required on all cosmetic labels)')}
              detail={checks.businessOk ? settings.businessName : undefined}
            />
            <FdaRow
              ok={checks.addressOk}
              label={t('export.fdaAddress', 'Business address set (city, state, zip minimum)')}
              detail={checks.addressOk ? settings.businessAddress : undefined}
            />
            <FdaRow
              ok={checks.hasLot}
              label={t('export.fdaLot', 'Lot code on file for this recipe (batch traceability)')}
              detail={checks.hasLot ? lotCode : undefined}
              warn={!recipe}
              optional
            />
            <FdaRow
              ok={checks.hasWarning}
              label={t('export.fdaWarning', 'Warning / caution text added to recipe')}
              detail={checks.hasWarning && recipe?.warnings ? truncateDetail(recipe.warnings) : undefined}
              warn={!recipe}
              optional
            />
          </ul>

          {allRequiredOk ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {t('export.fdaAllPassed', 'All checks passed')}
            </div>
          ) : (!checks.businessOk || !checks.addressOk) ? (
            <button
              type="button"
              className="w-full rounded-lg bg-white px-3 py-2 text-left text-[11px] text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
              onClick={() => goto('settings')}
            >
              {t('export.fdaSettingsHint', '→ Add your business name and address in Settings to complete the check.')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FdaRow({
  ok,
  label,
  detail,
  warn,
  optional,
  deferred,
}: {
  ok: boolean;
  label: string;
  detail?: string;
  warn?: boolean;
  optional?: boolean;
  /** Shown but inactive — not a blocker or counted error. */
  deferred?: boolean;
}) {
  const { t } = useTranslation();
  const muted = deferred && !ok && !warn && !optional;
  return (
    <li className={`flex items-start gap-2${muted ? ' opacity-70' : ''}`}>
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : optional || warn ? (
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-slate-300" />
      ) : muted ? (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
      )}
      <span className={ok ? 'text-slate-700' : optional || muted ? 'text-slate-400' : warn ? 'text-blue-800' : 'font-medium text-rose-700'}>
        {label}
        {optional && !ok && (
          <span className="ml-1 font-normal text-slate-400">({t('common.optional')})</span>
        )}
        {detail && (
          <span className="mt-0.5 block font-normal text-[11px] text-slate-500">{detail}</span>
        )}
      </span>
    </li>
  );
}
