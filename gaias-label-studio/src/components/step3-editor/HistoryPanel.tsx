import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { api } from "../../lib/api";
import type { ProjectVersion } from "../../../shared/contract";
import { useAppStore } from "../../state/useAppStore";
import { useCanvasContext } from "./CanvasContext";
import { upsertBleedMask } from "../../lib/fabricHelpers";
import { useEditorStore } from "../../state/useEditorStore";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function HistoryPanel() {
  const { t } = useTranslation();
  const { canvas, bump } = useCanvasContext();
  const projectId = useAppStore((s) => s.projectId);
  const showBleed = useEditorStore((s) => s.showBleed);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  useEffect(() => {
    if (!projectId) return;
    api.versions.list(projectId).then(setVersions);
  }, [projectId]);

  const restore = async (versionId: number) => {
    if (!canvas) return;
    const version = await api.versions.restore(versionId);
    await canvas.loadFromJSON(JSON.parse(version.canvasJson));
    const bleedPx = (canvas as any).__bleedInPx ?? 0;
    upsertBleedMask(canvas, bleedPx, showBleed);
    canvas.requestRenderAll();
    bump();
  };

  if (!projectId || versions.length === 0) {
    return (
      <div className="p-3 text-sm text-brand-500">
        <div className="mb-2 flex items-center gap-2 font-semibold text-brand-700">
          <History size={15} /> {t("editor.history")}
        </div>
        {t("editor.historyEmpty")}
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-700">
        <History size={15} /> {t("editor.history")}
      </div>
      <div className="flex flex-col gap-1">
        {versions.map((v) => (
          <button
            key={v.id}
            onClick={() => restore(v.id)}
            className="flex items-center justify-between rounded-lg border border-brand-100 px-3 py-2 text-left text-xs hover:bg-brand-50"
          >
            <span>{formatTime(v.createdAt)}</span>
            <span className="font-semibold text-brand-600">{t("editor.restore")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
