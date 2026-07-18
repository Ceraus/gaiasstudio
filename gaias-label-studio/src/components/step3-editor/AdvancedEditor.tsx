import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Canvas, FabricImage } from "fabric";
import { api } from "../../lib/api";
import { useAppStore } from "../../state/useAppStore";
import { useEditorStore } from "../../state/useEditorStore";
import type { AveryTemplate } from "../../../shared/contract";
import { PX_PER_IN, inToPx } from "../../lib/units";
import { getDesignObjects, isBleedMask, setupSmartGuides, upsertBleedMask, withData, withExportGuardsHidden } from "../../lib/fabricHelpers";
import { CanvasContext } from "./CanvasContext";
import { FloatingToolbox } from "./FloatingToolbox";
import { EditorTopBar } from "./EditorTopBar";
import { AssetSidebar } from "../step2-assets/AssetSidebar";

const AUTOSAVE_DEBOUNCE_MS = 2000;

export function AdvancedEditor() {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const isRestoringRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canvasInstance, setCanvasInstance] = useState<Canvas | null>(null);
  const [version, setVersion] = useState(0);
  const [template, setTemplate] = useState<AveryTemplate | null>(null);
  const [scale, setScale] = useState(1);

  const projectId = useAppStore((s) => s.projectId);
  const projectName = useAppStore((s) => s.projectName);
  const templateSku = useAppStore((s) => s.templateSku);
  const context = useAppStore((s) => s.context);
  const recipeId = useAppStore((s) => s.recipeId);
  const canvasJson = useAppStore((s) => s.canvasJson);
  const setProject = useAppStore((s) => s.setProject);
  const setCanvasJsonInStore = useAppStore((s) => s.setCanvasJson);

  const showBleed = useEditorStore((s) => s.showBleed);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const resetHistory = useEditorStore((s) => s.resetHistory);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const pendingAssetDataUrl = useEditorStore((s) => s.pendingAssetDataUrl);
  const setPendingAsset = useEditorStore((s) => s.setPendingAsset);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const scheduleAutosave = useCallback(() => {
    setSaveStatus("saving");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      const canvas = fabricRef.current;
      if (!canvas || !templateSku) return;
      const json = JSON.stringify(canvas.toObject(["data"]));
      let pid = useAppStore.getState().projectId;
      if (!pid) {
        const created = await api.projects.upsert({ name: projectName, templateSku, context, recipeId, canvasJson: json });
        pid = created.id;
        setProject({ id: created.id, name: created.name });
      } else {
        await api.projects.upsert({ id: pid, name: projectName, templateSku, context, recipeId, canvasJson: json });
      }
      setCanvasJsonInStore(json);
      await api.versions.save(pid, json);
      setSaveStatus("saved");
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [projectName, templateSku, context, recipeId, setProject, setCanvasJsonInStore, setSaveStatus]);

  const captureHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isRestoringRef.current) return;
    pushHistory(JSON.stringify(canvas.toObject(["data"])));
  }, [pushHistory]);

  // ---------------------------------------------------------------------
  // Canvas bootstrap
  // ---------------------------------------------------------------------
  useEffect(() => {
    let disposed = false;

    (async () => {
      const templates = await api.templates.getAll();
      const tpl = templates.find((tp) => tp.sku === templateSku) ?? null;
      if (disposed || !tpl || !canvasElRef.current) return;
      setTemplate(tpl);

      const widthPx = inToPx(tpl.widthIn);
      const heightPx = inToPx(tpl.heightIn);
      const bleedPx = inToPx(tpl.bleedIn);

      const canvas = new Canvas(canvasElRef.current, {
        width: widthPx,
        height: heightPx,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      });
      (canvas as any).__bleedInPx = bleedPx;
      fabricRef.current = canvas;
      setupSmartGuides(canvas);

      if (canvasJson) {
        try {
          await canvas.loadFromJSON(JSON.parse(canvasJson));
        } catch {
          /* corrupt/legacy JSON — start blank rather than crash */
        }
      }

      upsertBleedMask(canvas, bleedPx, showBleed);
      resetHistory(JSON.stringify(canvas.toObject(["data"])));
      canvas.requestRenderAll();
      setCanvasInstance(canvas);

      const onChange = (e: any) => {
        if (e?.target && isBleedMask(e.target)) return;
        captureHistory();
        scheduleAutosave();
        bump();
      };
      canvas.on("object:added", onChange);
      canvas.on("object:removed", onChange);
      canvas.on("object:modified", onChange);
      canvas.on("selection:created", bump);
      canvas.on("selection:updated", bump);
      canvas.on("selection:cleared", bump);
    })();

    return () => {
      disposed = true;
      fabricRef.current?.dispose();
      fabricRef.current = null;
      setCanvasInstance(null);
    };
    // Intentionally only re-run when the chosen template changes; project/recipe
    // changes are read fresh from the store inside the debounced callbacks above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateSku]);

  // Drop a pending asset (queued from Step 2) onto the freshly-mounted canvas.
  useEffect(() => {
    if (!canvasInstance || !pendingAssetDataUrl) return;
    (async () => {
      const img = await FabricImage.fromURL(pendingAssetDataUrl, { crossOrigin: "anonymous" });
      const canvas = canvasInstance;
      const scaleToFit = Math.max(canvas.getWidth() / (img.width || 1), canvas.getHeight() / (img.height || 1));
      img.set({ scaleX: scaleToFit, scaleY: scaleToFit, left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: "center", originY: "center" });
      withData(img, { name: "Background photo" });
      canvas.add(img);
      canvas.sendObjectToBack(img);
      const masks = canvas.getObjects().filter(isBleedMask);
      masks.forEach((m) => canvas.bringObjectToFront(m));
      canvas.requestRenderAll();
      setPendingAsset(null);
      // The add-then-reorder above only fires a single "object:added" history
      // snapshot (taken mid-reorder); re-capture now that stacking is final.
      captureHistory();
      scheduleAutosave();
      bump();
    })();
  }, [canvasInstance, pendingAssetDataUrl, setPendingAsset, captureHistory, scheduleAutosave, bump]);

  // Re-draw the bleed mask whenever its visibility is toggled from the top bar.
  useEffect(() => {
    if (!canvasInstance || !template) return;
    upsertBleedMask(canvasInstance, inToPx(template.bleedIn), showBleed);
    canvasInstance.requestRenderAll();
  }, [showBleed, canvasInstance, template]);

  // Zoom-to-fit whenever the available viewport space changes.
  useEffect(() => {
    if (!wrapperRef.current || !template) return;
    const el = wrapperRef.current;
    const compute = () => {
      const availW = el.clientWidth - 48;
      const availH = el.clientHeight - 48;
      const canvasW = inToPx(template.widthIn);
      const canvasH = inToPx(template.heightIn);
      setScale(Math.max(0.05, Math.min(availW / canvasW, availH / canvasH, 2)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [template]);

  const handleUndo = () => {
    const json = undo();
    if (!json || !fabricRef.current) return;
    isRestoringRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
      upsertBleedMask(fabricRef.current!, (fabricRef.current as any).__bleedInPx ?? 0, showBleed);
      fabricRef.current!.requestRenderAll();
      isRestoringRef.current = false;
      bump();
      scheduleAutosave();
    });
  };

  const handleRedo = () => {
    const json = redo();
    if (!json || !fabricRef.current) return;
    isRestoringRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
      upsertBleedMask(fabricRef.current!, (fabricRef.current as any).__bleedInPx ?? 0, showBleed);
      fabricRef.current!.requestRenderAll();
      isRestoringRef.current = false;
      bump();
      scheduleAutosave();
    });
  };

  const addImageToCanvas = useCallback(
    async (dataUrl: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const img = await FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
      const scaleToFit = Math.min((canvas.getWidth() * 0.7) / (img.width || 1), (canvas.getHeight() * 0.7) / (img.height || 1), 1);
      img.set({ scaleX: scaleToFit, scaleY: scaleToFit, left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: "center", originY: "center" });
      withData(img, { name: "Image" });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      bump();
    },
    [bump]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const asset = e.dataTransfer.getData("text/gaia-asset");
    if (asset) {
      addImageToCanvas(asset);
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => addImageToCanvas(String(reader.result));
      reader.readAsDataURL(file);
    }
  };

  // Global keyboard shortcuts: delete, undo/redo, duplicate.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      const isEditingText = (active as any)?.isEditing;

      if ((e.key === "Delete" || e.key === "Backspace") && active && !isEditingText) {
        e.preventDefault();
        const objs = active.type === "activeselection" ? (active as any).getObjects() : [active];
        canvas.discardActiveObject();
        objs.forEach((o: any) => canvas.remove(o));
        canvas.requestRenderAll();
        bump();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && active && !isEditingText) {
        e.preventDefault();
        active.clone(["data"]).then((clone: any) => {
          clone.set({ left: (active.left ?? 0) + 20, top: (active.top ?? 0) + 20 });
          withData(clone);
          canvas.add(clone);
          canvas.setActiveObject(clone);
          canvas.requestRenderAll();
          bump();
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasW = template ? inToPx(template.widthIn) : 0;
  const canvasH = template ? inToPx(template.heightIn) : 0;
  const hasContent = canvasInstance ? getDesignObjects(canvasInstance).length > 0 : false;

  return (
    <CanvasContext.Provider value={{ canvas: canvasInstance, version, bump }}>
      <div className="flex h-full flex-col">
        <EditorTopBar template={template} onUndo={handleUndo} onRedo={handleRedo} />

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r border-brand-100 bg-white p-3">
            <AssetSidebar onUse={addImageToCanvas} />
          </div>

          <div ref={wrapperRef} className="relative flex-1 overflow-auto bg-canvasgray p-6">
            {!hasContent && (
              <div className="pointer-events-none absolute left-1/2 top-6 z-10 w-[420px] -translate-x-1/2 rounded-xl bg-white/90 px-4 py-2 text-center text-xs text-brand-600 shadow-sm">
                {t("editor.blankCanvasHint")}
              </div>
            )}
            <div className="flex min-h-full items-center justify-center">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{ width: canvasW * scale, height: canvasH * scale }}
                className="relative shadow-panel"
              >
                <div style={{ width: canvasW, height: canvasH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <canvas ref={canvasElRef} />
                </div>
              </div>
            </div>
            <FloatingToolbox />
          </div>
        </div>
      </div>
    </CanvasContext.Provider>
  );
}
