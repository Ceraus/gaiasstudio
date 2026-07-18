import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Undo2, Redo2, Eye, EyeOff, Loader2, Check } from "lucide-react";
import type { AveryTemplate } from "../../../shared/contract";
import { useAppStore } from "../../state/useAppStore";
import { useEditorStore } from "../../state/useEditorStore";

export function EditorTopBar({
  template,
  onUndo,
  onRedo,
}: {
  template: AveryTemplate | null;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const { t } = useTranslation();
  const setStep = useAppStore((s) => s.setStep);
  const showBleed = useEditorStore((s) => s.showBleed);
  const toggleBleed = useEditorStore((s) => s.toggleBleed);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const canUndo = useEditorStore((s) => s.canUndo());
  const canRedo = useEditorStore((s) => s.canRedo());

  return (
    <div className="flex items-center justify-between border-b border-brand-100 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStep("assets")}
          className="flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          <ArrowLeft size={14} /> {t("nav.back")}
        </button>
        {template && (
          <span className="ml-2 text-sm text-brand-500">
            {t("editor.canvasSize", { width: template.widthIn, height: template.heightIn })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-lg border border-brand-200 p-2 text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          title={t("editor.undo")}
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-lg border border-brand-200 p-2 text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          title={t("editor.redo")}
        >
          <Redo2 size={15} />
        </button>
        <button
          onClick={toggleBleed}
          className={[
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold",
            showBleed ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 text-brand-700 hover:bg-brand-50",
          ].join(" ")}
          title={t("editor.toggleBleed")}
        >
          {showBleed ? <Eye size={14} /> : <EyeOff size={14} />}
          {t("editor.toggleBleed")}
        </button>

        <span className="flex items-center gap-1 text-xs text-brand-400">
          {saveStatus === "saving" && (
            <>
              <Loader2 size={12} className="animate-spin" /> {t("editor.saving")}
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check size={12} /> {t("editor.saved")}
            </>
          )}
        </span>
      </div>

      <button
        onClick={() => setStep("print")}
        className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        {t("nav.next")} <ArrowRight size={14} />
      </button>
    </div>
  );
}
