import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AssetSidebar } from "./AssetSidebar";
import { useAppStore } from "../../state/useAppStore";
import { useEditorStore } from "../../state/useEditorStore";

export function Step2Page() {
  const { t } = useTranslation();
  const setStep = useAppStore((s) => s.setStep);
  const setPendingAsset = useEditorStore((s) => s.setPendingAsset);

  const handleUse = (dataUrl: string) => {
    setPendingAsset(dataUrl);
    setStep("editor");
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">{t("app.title")}</h1>
          <p className="mt-1 text-brand-600">{t("assets.dragToCanvasHint")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStep("template")}
            className="flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            <ArrowLeft size={14} /> {t("nav.back")}
          </button>
          <button
            onClick={() => setStep("editor")}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t("nav.next")} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-200 bg-white p-4 shadow-panel" style={{ minHeight: 520 }}>
        <AssetSidebar onUse={handleUse} />
      </div>
    </div>
  );
}
