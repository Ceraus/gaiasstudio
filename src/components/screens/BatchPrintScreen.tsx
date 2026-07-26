/**
 * BatchPrintScreen — the "ink saver".
 *
 * Queues several *different* saved designs onto a single Avery sheet so a
 * part-used sheet of sticker paper is never thrown away. The maker only picks
 * designs and quantities; every measurement stays hidden inside pdf-lib.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  ImageOff,
  Loader2,
  Minus,
  Plus,
  Printer,
  Trash2,
  Wand2,
} from 'lucide-react';
import type { AveryDataset, AveryTemplate, Draft } from '@/types';
import { draftsRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';
import averyData from '@/data/averyTemplates.json';
import {
  buildMixedSheetPdf,
  bumpExportSeq,
  downloadBytes,
  peekExportName,
  planBatchSlots,
  type BatchItem,
  type ExportNameOptions,
} from '@/lib/pdfExport';
import { footprintHeightIn, footprintWidthIn, slotPositionIn } from '@/lib/units';

const templates = (averyData as AveryDataset).templates;

interface QueueEntry {
  draft: Draft;
  quantity: number;
}

export default function BatchPrintScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const settings = useAppStore((s) => s.settings);
  const batchDraftIds = useAppStore((s) => s.batchDraftIds);

  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [doneName, setDoneName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all(batchDraftIds.map((id) => draftsRepo.get(id)))
      .then((rows) => {
        if (cancelled) return;
        setQueue(rows.filter((d): d is Draft => !!d).map((draft) => ({ draft, quantity: 1 })));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [batchDraftIds]);

  /**
   * Every design on a sheet must share one Avery template — otherwise the slots
   * would not line up with the physical die-cuts. The first design's template
   * wins and anything else is flagged rather than silently mis-printed.
   */
  const template: AveryTemplate | undefined = useMemo(
    () => templates.find((tpl) => tpl.id === queue[0]?.draft.templateId),
    [queue],
  );

  const mismatched = useMemo(
    () => queue.filter((q) => q.draft.templateId !== queue[0]?.draft.templateId),
    [queue],
  );

  const printable = useMemo(
    () => queue.filter((q) => q.draft.templateId === queue[0]?.draft.templateId),
    [queue],
  );

  const perSheet = template?.perSheet ?? 0;
  const totalLabels = printable.reduce((sum, q) => sum + q.quantity, 0);
  const sheets = perSheet ? Math.max(1, Math.ceil(totalLabels / perSheet)) : 0;
  const emptySlots = perSheet ? sheets * perSheet - totalLabels : 0;

  const setQuantity = (id: string, quantity: number) => {
    setQueue((q) => q.map((e) => (e.draft.id === id ? { ...e, quantity: Math.max(1, Math.min(999, quantity)) } : e)));
  };

  const removeEntry = (id: string) => {
    setQueue((q) => q.filter((e) => e.draft.id !== id));
  };

  /** Spreads the remaining slots evenly so the sheet comes out completely full. */
  const fillSheet = useCallback(() => {
    if (!perSheet || !printable.length) return;
    const target = Math.max(perSheet, Math.ceil(totalLabels / perSheet) * perSheet);
    const base = Math.floor(target / printable.length);
    let remainder = target % printable.length;
    const shares = new Map(
      printable.map((q) => {
        const extra = remainder > 0 ? 1 : 0;
        remainder -= extra;
        return [q.draft.id, base + extra];
      }),
    );
    setQueue((q) => q.map((e) => ({ ...e, quantity: shares.get(e.draft.id) ?? e.quantity })));
  }, [perSheet, printable, totalLabels]);

  const exportPdf = async () => {
    if (!template) return;
    setBusy(true);
    setDoneName('');
    setError('');
    try {
      // Rasterize each design off-screen at print resolution.
      const { editor } = await import('@/lib/fabric/editorController');
      const items: BatchItem[] = [];
      for (const entry of printable) {
        const png = await editor.renderDesignPng(entry.draft.designJson, template, settings);
        items.push({ pngDataUrl: png, quantity: entry.quantity });
      }
      const bytes = await buildMixedSheetPdf({ template, items });
      const opts: ExportNameOptions = {
        brand: settings.filenamePrefix,
        recipeName: 'Batch Print',
        series: 'batch',
      };
      const name = peekExportName(opts);
      downloadBytes(bytes, name);
      bumpExportSeq(opts);
      setDoneName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch export failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!queue.length || !template) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <Printer className="h-12 w-12 text-slate-300" />
        <p className="max-w-sm text-sm text-slate-500">
          {t('batch.emptyHint', 'Tick two or more saved designs in the Workspace, then choose "Print together" to fill one sheet.')}
        </p>
        <button className="btn-primary" onClick={() => goto('drafts')}>
          <ArrowLeft className="h-4 w-4" /> {t('drafts.title')}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button className="icon-btn" aria-label={t('common.back', 'Back')} onClick={() => goto('drafts')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gaia-900">{t('batch.title', 'Mixed Batch Print')}</h1>
            <p className="text-sm text-slate-600">
              {t('batch.subtitle', 'Fill one sheet with several designs so no sticker paper goes to waste.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <div className="card space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="label mb-0">{t('batch.sheet', 'Sheet')}</p>
                <p className="text-sm font-medium text-slate-700">{template.name}</p>
              </div>
              <p className="text-sm text-slate-500">
                {t('batch.summary', '{{total}} labels · {{sheets}} sheet(s) · {{perSheet}} per sheet', {
                  total: totalLabels,
                  sheets,
                  perSheet,
                })}
              </p>
              {emptySlots > 0 && (
                <div className="flex items-start justify-between gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                  <p className="text-xs text-amber-800">
                    {t('batch.emptySlots', '{{count}} empty slot(s) left on the last sheet.', { count: emptySlots })}
                  </p>
                  <button
                    className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                    onClick={fillSheet}
                  >
                    <Wand2 className="mr-1 inline h-3 w-3" />
                    {t('batch.fillEvenly', 'Fill evenly')}
                  </button>
                </div>
              )}
            </div>

            {mismatched.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-800">
                  {t('batch.mismatch', 'These designs use a different label size and were left out: {{names}}. One sheet can only hold one size.', {
                    names: mismatched.map((m) => m.draft.name).join(', '),
                  })}
                </p>
              </div>
            )}

            <ul className="space-y-2">
              {queue.map(({ draft, quantity }) => {
                const wrongSize = draft.templateId !== queue[0].draft.templateId;
                return (
                  <li
                    key={draft.id}
                    className={`flex items-center gap-3 rounded-xl border bg-white p-2 ${
                      wrongSize ? 'border-rose-200 opacity-60' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {draft.thumb
                        ? <img src={draft.thumb} alt="" className="h-full w-full object-contain" />
                        : <ImageOff className="h-5 w-5 text-slate-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{draft.name}</p>
                      {wrongSize && (
                        <p className="text-[11px] text-rose-600">{t('batch.differentSize', 'Different label size')}</p>
                      )}
                    </div>
                    {!wrongSize && (
                      <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200">
                        <button
                          className="flex h-8 w-7 items-center justify-center text-slate-500 hover:bg-slate-100"
                          aria-label={t('batch.decrease', 'One fewer')}
                          onClick={() => setQuantity(draft.id, quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          className="w-12 border-0 bg-transparent py-0 text-center text-xs tabular-nums text-slate-700 outline-none"
                          aria-label={t('batch.quantityFor', 'Copies of {{name}}', { name: draft.name })}
                          value={quantity}
                          onChange={(e) => setQuantity(draft.id, Number(e.target.value) || 1)}
                        />
                        <button
                          className="flex h-8 w-7 items-center justify-center text-slate-500 hover:bg-slate-100"
                          aria-label={t('batch.increase', 'One more')}
                          onClick={() => setQuantity(draft.id, quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <button
                      className="icon-btn h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-50"
                      title={t('batch.remove', 'Remove from sheet')}
                      aria-label={t('batch.remove', 'Remove from sheet')}
                      onClick={() => removeEntry(draft.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              className="btn-primary w-full py-3"
              disabled={busy || !printable.length}
              onClick={() => void exportPdf()}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
              {busy ? t('export.exporting') : t('batch.exportPdf', 'Export Batch PDF')}
            </button>

            {doneName && (
              <p className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Download className="h-4 w-4" /> {t('export.done', { name: doneName })}
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}
          </div>

          <div className="card">
            <p className="label">{t('export.sheetPreview')}</p>
            <div className="overflow-auto rounded-lg bg-slate-100 p-4">
              <BatchSheetPreview template={template} entries={printable} />
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              {t('batch.previewHint', 'This is exactly how the sheet will print.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchSheetPreview({
  template,
  entries,
}: {
  template: AveryTemplate;
  entries: QueueEntry[];
}) {
  const previewH = 460;
  const scale = previewH / template.pageHeightIn;
  const previewW = template.pageWidthIn * scale;
  const fw = footprintWidthIn(template) * scale;
  const fh = footprintHeightIn(template) * scale;
  const artW = template.labelWidthIn * scale;
  const artH = template.labelHeightIn * scale;

  const order = planBatchSlots(entries.map((e) => ({ pngDataUrl: '', quantity: e.quantity })));

  const radius =
    template.shape === 'circle' || template.shape === 'oval'
      ? '50%'
      : template.shape === 'rounded-rectangle'
        ? `${template.cornerRadiusIn * scale}px`
        : '2px';

  const slots: { idx: number; x: number; y: number }[] = [];
  let idx = 0;
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.columns; c++) {
      const { xIn, yIn } = slotPositionIn(template, c, r);
      slots.push({ idx, x: xIn * scale, y: yIn * scale });
      idx++;
    }
  }

  return (
    <div
      className="relative mx-auto rounded-md bg-white shadow-inner ring-1 ring-slate-200"
      style={{ width: previewW, height: previewH }}
    >
      {slots.map((s) => {
        const entry = s.idx < order.length ? entries[order[s.idx]] : undefined;
        return (
          <div
            key={s.idx}
            className={`absolute overflow-hidden ${entry ? '' : 'border border-dashed border-slate-200'}`}
            style={{ left: s.x, top: s.y, width: fw, height: fh, borderRadius: radius }}
          >
            {entry?.draft.thumb && (
              <img
                src={entry.draft.thumb}
                alt={entry.draft.name}
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
