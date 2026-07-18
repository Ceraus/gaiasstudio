import { useTranslation } from "react-i18next";
import { Type, Square, Circle as CircleIcon, Triangle as TriangleIcon, Minus, Disc } from "lucide-react";
import type { FabricObject } from "fabric";
import { useCanvasContext } from "./CanvasContext";
import { makeCircle, makeLine, makeOval, makeRect, makeTextbox, makeTriangle } from "../../lib/shapeFactory";
import { AutoLayoutPanel } from "./AutoLayoutPanel";

export function AddToolsPanel() {
  const { t } = useTranslation();
  const { canvas, bump } = useCanvasContext();

  const center = () => (canvas ? { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 } : { x: 0, y: 0 });

  const addAndSelect = (obj: FabricObject) => {
    if (!canvas) return;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    bump();
  };

  const tools: { key: string; label: string; icon: JSX.Element; make: () => FabricObject }[] = [
    { key: "text", label: t("editor.addText"), icon: <Type size={18} />, make: () => makeTextbox(center()) },
    { key: "rect", label: t("editor.addRect"), icon: <Square size={18} />, make: () => makeRect(center()) },
    { key: "circle", label: t("editor.addCircle"), icon: <CircleIcon size={18} />, make: () => makeCircle(center()) },
    { key: "oval", label: t("editor.addOval"), icon: <Disc size={18} />, make: () => makeOval(center()) },
    { key: "triangle", label: t("editor.addTriangle"), icon: <TriangleIcon size={18} />, make: () => makeTriangle(center()) },
    { key: "line", label: t("editor.addLine"), icon: <Minus size={18} />, make: () => makeLine(center()) },
  ];

  return (
    <div className="p-3">
      <AutoLayoutPanel />
      <div className="grid grid-cols-3 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.key}
            onClick={() => addAndSelect(tool.make())}
            className="flex flex-col items-center gap-1 rounded-xl border border-brand-200 bg-white p-3 text-brand-700 hover:bg-brand-50"
          >
            {tool.icon}
            <span className="text-[11px] font-semibold">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
