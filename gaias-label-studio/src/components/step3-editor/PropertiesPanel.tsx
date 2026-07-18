import { useTranslation } from "react-i18next";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Copy,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  Group as GroupIcon,
  Ungroup,
} from "lucide-react";
import { ActiveSelection, Group, type FabricObject, type Textbox } from "fabric";
import { useCanvasContext } from "./CanvasContext";
import { withData } from "../../lib/fabricHelpers";
import { GOOGLE_FONTS, loadGoogleFont } from "../../lib/googleFonts";

const WEB_SAFE_FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];

function isTextObject(obj: FabricObject | null): obj is Textbox {
  return !!obj && (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text");
}

export function PropertiesPanel() {
  const { t } = useTranslation();
  const { canvas, bump } = useCanvasContext();
  if (!canvas) return null;
  const active = canvas.getActiveObject();

  if (!active) {
    return <p className="p-3 text-sm text-brand-500">{t("editor.selectSomething")}</p>;
  }

  const commit = () => {
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: active });
    bump();
  };

  const isText = isTextObject(active);
  const isMultiple = active.type === "activeselection";
  const isGroup = active.type === "group";

  const duplicate = async () => {
    const clone = await active.clone(["data"]);
    clone.set({ left: (active.left ?? 0) + 20, top: (active.top ?? 0) + 20 });
    withData(clone);
    canvas.add(clone);
    canvas.setActiveObject(clone);
    commit();
  };

  const remove = () => {
    const objs = active.type === "activeselection" ? (active as ActiveSelection).getObjects() : [active];
    canvas.discardActiveObject();
    objs.forEach((o) => canvas.remove(o));
    canvas.requestRenderAll();
    bump();
  };

  const groupSelection = () => {
    if (active.type !== "activeselection") return;
    const sel = active as ActiveSelection;
    const objects = sel.removeAll();
    const group = withData(new Group(objects));
    canvas.remove(sel as unknown as FabricObject);
    canvas.add(group);
    canvas.setActiveObject(group);
    commit();
  };

  const ungroupSelection = () => {
    if (active.type !== "group") return;
    const group = active as Group;
    const objects = group.removeAll();
    canvas.remove(group);
    objects.forEach((o) => canvas.add(o));
    const sel = new ActiveSelection(objects, { canvas });
    canvas.setActiveObject(sel);
    commit();
  };

  const setFont = async (family: string) => {
    await loadGoogleFont(family);
    active.set({ fontFamily: family } as any);
    commit();
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex flex-wrap gap-1.5">
        <IconButton title={t("editor.duplicate")} onClick={duplicate}>
          <Copy size={14} />
        </IconButton>
        <IconButton title={t("editor.delete")} onClick={remove} danger>
          <Trash2 size={14} />
        </IconButton>
        <IconButton title={t("editor.bringToFront")} onClick={() => (canvas.bringObjectToFront(active), commit())}>
          <ArrowUpToLine size={14} />
        </IconButton>
        <IconButton title={t("editor.sendToBack")} onClick={() => (canvas.sendObjectToBack(active), commit())}>
          <ArrowDownToLine size={14} />
        </IconButton>
        <IconButton title={t("editor.bringForward")} onClick={() => (canvas.bringObjectForward(active), commit())}>
          <ChevronUp size={14} />
        </IconButton>
        <IconButton title={t("editor.sendBackward")} onClick={() => (canvas.sendObjectBackwards(active), commit())}>
          <ChevronDown size={14} />
        </IconButton>
        {isMultiple && (
          <IconButton title={t("editor.group")} onClick={groupSelection}>
            <GroupIcon size={14} />
          </IconButton>
        )}
        {isGroup && (
          <IconButton title={t("editor.ungroup")} onClick={ungroupSelection}>
            <Ungroup size={14} />
          </IconButton>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-brand-600">{t("editor.opacity")}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={active.opacity ?? 1}
          onChange={(e) => {
            active.set({ opacity: parseFloat(e.target.value) });
            canvas.requestRenderAll();
          }}
          onMouseUp={commit}
          className="w-full"
        />
      </div>

      {isText && (
        <>
          <div>
            <label className="text-xs font-semibold text-brand-600">{t("editor.font")}</label>
            <select
              value={(active as any).fontFamily ?? "Montserrat"}
              onChange={(e) => setFont(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
            >
              <optgroup label="Boutique">
                {GOOGLE_FONTS.map((f) => (
                  <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                    {f.family}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Standard">
                {WEB_SAFE_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-600">{t("editor.fontSize")}</label>
            <input
              type="range"
              min={8}
              max={160}
              value={(active as any).fontSize ?? 28}
              onChange={(e) => {
                active.set({ fontSize: parseInt(e.target.value, 10) } as any);
                canvas.requestRenderAll();
              }}
              onMouseUp={commit}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <ToggleButton
              active={(active as any).fontWeight === "bold" || (active as any).fontWeight === 700}
              onClick={() => {
                const cur = (active as any).fontWeight;
                active.set({ fontWeight: cur === "bold" || cur === 700 ? "normal" : "bold" } as any);
                commit();
              }}
            >
              <Bold size={14} />
            </ToggleButton>
            <ToggleButton
              active={(active as any).fontStyle === "italic"}
              onClick={() => {
                const cur = (active as any).fontStyle;
                active.set({ fontStyle: cur === "italic" ? "normal" : "italic" } as any);
                commit();
              }}
            >
              <Italic size={14} />
            </ToggleButton>
            <ToggleButton
              active={!!(active as any).underline}
              onClick={() => {
                active.set({ underline: !(active as any).underline } as any);
                commit();
              }}
            >
              <Underline size={14} />
            </ToggleButton>
            <div className="mx-1 h-5 w-px bg-brand-200" />
            <ToggleButton active={(active as any).textAlign === "left"} onClick={() => (active.set({ textAlign: "left" } as any), commit())}>
              <AlignLeft size={14} />
            </ToggleButton>
            <ToggleButton
              active={(active as any).textAlign === "center"}
              onClick={() => (active.set({ textAlign: "center" } as any), commit())}
            >
              <AlignCenter size={14} />
            </ToggleButton>
            <ToggleButton active={(active as any).textAlign === "right"} onClick={() => (active.set({ textAlign: "right" } as any), commit())}>
              <AlignRight size={14} />
            </ToggleButton>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-600">{t("editor.textColor")}</label>
            <input
              type="color"
              value={typeof active.fill === "string" ? active.fill : "#22301f"}
              onChange={(e) => {
                active.set({ fill: e.target.value });
                canvas.requestRenderAll();
              }}
              onBlur={commit}
              className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-brand-200"
            />
          </div>
        </>
      )}

      {!isText && "fill" in active && (
        <div>
          <label className="text-xs font-semibold text-brand-600">{t("editor.fillColor")}</label>
          <input
            type="color"
            value={typeof active.fill === "string" ? active.fill : "#4f7f60"}
            onChange={(e) => {
              active.set({ fill: e.target.value });
              canvas.requestRenderAll();
            }}
            onBlur={commit}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-brand-200"
          />
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        "rounded-lg border p-2",
        danger ? "border-red-200 text-red-500 hover:bg-red-50" : "border-brand-200 text-brand-700 hover:bg-brand-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ToggleButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-lg border p-2",
        active ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 text-brand-700 hover:bg-brand-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
