import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, FileImage, Loader2, Printer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
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
    <div className="h-full overflow-y-auto bg-gaia-50">
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

            <p className="text-xs text-slate-400">{t('export.tip')}</p>
          </div>

          <div className="card">
            <p className="label">{t('export.sheetPreview')}</p>
            <SheetWysiwyg
              template={template}
              labelPng={labelPng}
              filled={plan?.total ?? quantity}
            />
          </div>
        </div>
      </div>
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
