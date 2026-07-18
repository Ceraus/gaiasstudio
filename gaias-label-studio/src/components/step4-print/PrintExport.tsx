import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, FolderOpen, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useAppStore } from "../../state/useAppStore";
import type { AveryTemplate } from "../../../shared/contract";
import { SheetPreview } from "./SheetPreview";
import { flattenProjectToDataUrl } from "../../lib/flattenCanvas";
import { inToPx } from "../../lib/units";

export function PrintExport() {
  const { t } = useTranslation();
  const setStep = useAppStore((s) => s.setStep);
  const templateSku = useAppStore((s) => s.templateSku);
  const projectName = useAppStore((s) => s.projectName);
  const canvasJson = useAppStore((s) => s.canvasJson);

  const [templates, setTemplates] = useState<AveryTemplate[]>([]);
  const [quantity, setQuantity] = useState(20);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    api.templates.getAll().then(setTemplates);
  }, []);

  const template = useMemo(() => templates.find((tp) => tp.sku === templateSku) ?? null, [templates, templateSku]);
  const slots = template ? template.columns * template.rows : 1;
  const sheetsNeeded = Math.max(1, Math.ceil(quantity / slots));

  const handleExport = async () => {
    if (!template || !canvasJson) return;
    setBusy(true);
    setResult(null);
    try {
      const widthPx = inToPx(template.widthIn);
      const heightPx = inToPx(template.heightIn);
      const dataUrl = await flattenProjectToDataUrl(canvasJson, widthPx, heightPx, 4);
      const res = await api.pdf.export({
        templateSku: template.sku,
        quantity,
        canvasDataUrl: dataUrl,
        canvasWidthPx: widthPx,
        canvasHeightPx: heightPx,
        fileBaseName: projectName.replace(/\s+/g, "_"),
      });
      if (res.success) {
        setResult({ success: true, message: t("print.exportSuccess", { path: res.filePath }) });
      } else {
        setResult({ success: false, message: t("print.exportError", { error: res.error }) });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!template) {
    return <div className="p-8 text-brand-600">Loading template…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">{t("print.heading")}</h1>
        <button
          onClick={() => setStep("editor")}
          className="flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          <ArrowLeft size={14} /> {t("nav.back")}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-200 bg-white p-6 shadow-panel">
        <label className="text-sm font-semibold text-brand-700">{t("print.quantity")}</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || "1", 10)))}
          className="mt-2 w-40 rounded-lg border border-brand-200 px-3 py-2 text-sm"
        />
        <p className="mt-2 text-sm text-brand-600">{t("print.sheetsNeeded", { count: sheetsNeeded, sku: template.sku })}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-200 bg-white p-6 shadow-panel">
        <h2 className="text-lg font-bold text-brand-800">{t("print.sheetPreviewHeading")}</h2>
        <p className="mt-1 text-sm text-brand-500">{t("print.sheetPreviewHint")}</p>
        <div className="mt-4 overflow-x-auto">
          <SheetPreview template={template} quantity={quantity} />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleExport}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-panel hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {busy ? t("print.exporting") : t("print.export")}
        </button>
        <button
          onClick={() => api.files.openDesignsFolder()}
          className="flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3 font-semibold text-brand-700 hover:bg-brand-50"
        >
          <FolderOpen size={16} /> {t("print.openFolder")}
        </button>
      </div>

      {result && (
        <p className={`mt-4 text-sm font-semibold ${result.success ? "text-brand-700" : "text-red-600"}`}>{result.message}</p>
      )}
    </div>
  );
}
