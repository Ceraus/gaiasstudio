import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, Layers, Sliders, PlusSquare, History as HistoryIcon } from "lucide-react";
import { useEditorStore } from "../../state/useEditorStore";
import { AddToolsPanel } from "./AddToolsPanel";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { HistoryPanel } from "./HistoryPanel";

type Tab = "add" | "layers" | "properties" | "history";

export function FloatingToolbox() {
  const { t } = useTranslation();
  const toolboxPos = useEditorStore((s) => s.toolboxPos);
  const setToolboxPos = useEditorStore((s) => s.setToolboxPos);
  const [tab, setTab] = useState<Tab>("add");
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: toolboxPos.x, originY: toolboxPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setToolboxPos({
        x: Math.max(0, dragState.current.originX + dx),
        y: Math.max(0, dragState.current.originY + dy),
      });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    { key: "add", label: t("editor.addShape"), icon: <PlusSquare size={14} /> },
    { key: "layers", label: t("editor.layers"), icon: <Layers size={14} /> },
    { key: "properties", label: t("editor.toolbox"), icon: <Sliders size={14} /> },
    { key: "history", label: t("editor.history"), icon: <HistoryIcon size={14} /> },
  ];

  return (
    <div
      className="absolute z-30 w-72 rounded-2xl border border-brand-200 bg-white shadow-panel"
      style={{ left: toolboxPos.x, top: toolboxPos.y }}
    >
      <div
        onMouseDown={onHeaderMouseDown}
        className="flex cursor-grab items-center gap-2 rounded-t-2xl bg-brand-600 px-3 py-2 text-white active:cursor-grabbing"
      >
        <GripVertical size={16} />
        <span className="text-sm font-semibold">{t("editor.toolbox")}</span>
      </div>

      <div className="flex border-b border-brand-100">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={[
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold",
              tab === tb.key ? "border-b-2 border-brand-600 text-brand-700" : "text-brand-400 hover:text-brand-600",
            ].join(" ")}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
        {tab === "add" && <AddToolsPanel />}
        {tab === "layers" && <LayersPanel />}
        {tab === "properties" && <PropertiesPanel />}
        {tab === "history" && <HistoryPanel />}
      </div>
    </div>
  );
}
