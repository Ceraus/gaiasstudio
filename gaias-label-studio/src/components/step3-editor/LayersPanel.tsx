import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, Unlock, Trash2, Type, Square, Circle as CircleIcon, Image as ImageIcon, Shapes } from "lucide-react";
import type { FabricObject } from "fabric";
import { useCanvasContext } from "./CanvasContext";
import { getDesignObjects, isBleedMask } from "../../lib/fabricHelpers";
import { friendlyNameFor } from "../../lib/shapeFactory";

function iconFor(obj: FabricObject) {
  switch (obj.type) {
    case "textbox":
    case "i-text":
    case "text":
      return <Type size={14} />;
    case "rect":
      return <Square size={14} />;
    case "circle":
    case "ellipse":
      return <CircleIcon size={14} />;
    case "image":
      return <ImageIcon size={14} />;
    default:
      return <Shapes size={14} />;
  }
}

export function LayersPanel() {
  const { t } = useTranslation();
  const { canvas, bump } = useCanvasContext();
  if (!canvas) return null;

  const layers = getDesignObjects(canvas).slice().reverse();
  const active = canvas.getActiveObject();

  const select = (obj: FabricObject) => {
    canvas.discardActiveObject();
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    bump();
  };

  const toggleVisible = (obj: FabricObject) => {
    obj.set({ visible: !obj.visible });
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: obj });
    bump();
  };

  const toggleLock = (obj: FabricObject) => {
    const locked = !obj.selectable;
    obj.set({ selectable: !locked ? false : true, evented: !locked ? false : true });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: obj });
    bump();
  };

  const remove = (obj: FabricObject) => {
    canvas.remove(obj);
    canvas.requestRenderAll();
    bump();
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/layer-id", id);
  };

  const onDrop = (e: React.DragEvent, targetObj: FabricObject) => {
    const draggedId = e.dataTransfer.getData("text/layer-id");
    if (!draggedId) return;
    const dragged = getDesignObjects(canvas).find((o) => (o as any).data?.id === draggedId);
    if (!dragged || dragged === targetObj) return;
    const objs = canvas.getObjects().filter((o) => !isBleedMask(o));
    const targetIndex = objs.indexOf(targetObj);
    canvas.moveObjectTo(dragged, targetIndex);
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: dragged });
    bump();
  };

  if (layers.length === 0) {
    return <p className="p-3 text-sm text-brand-500">{t("editor.layersEmpty")}</p>;
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {layers.map((obj) => {
        const isActive = obj === active;
        const locked = obj.selectable === false;
        const id = (obj as any).data?.id ?? Math.random();
        return (
          <div
            key={id}
            draggable
            onDragStart={(e) => onDragStart(e, id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, obj)}
            onClick={() => select(obj)}
            className={[
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer",
              isActive ? "bg-brand-100 text-brand-800" : "hover:bg-brand-50 text-brand-700",
            ].join(" ")}
          >
            <span className="text-brand-500">{iconFor(obj)}</span>
            <span className="flex-1 truncate">{friendlyNameFor(obj)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleVisible(obj);
              }}
              className="rounded p-1 hover:bg-brand-200"
            >
              {obj.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLock(obj);
              }}
              className="rounded p-1 hover:bg-brand-200"
            >
              {locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                remove(obj);
              }}
              className="rounded p-1 text-red-500 hover:bg-red-100"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
