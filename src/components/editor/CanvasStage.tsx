import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid3x3, Magnet, Maximize, Minus, MousePointerSquareDashed, Plus, Ruler, SquareDashed } from 'lucide-react';
import * as fabric from 'fabric';
import { editor } from '@/lib/fabric/editorController';
import { toolFromKey } from '@/lib/editorTools';
import { EDITOR_PPI } from '@/lib/units';
import { resolvePrintGuides } from '@/lib/printGuides';
import { useAppStore } from '@/store/useAppStore';
import { consumePendingAffirmationText } from '@/lib/sendAffirmationToLabel';
import { clampEditorZoom, EDITOR_MAX_ZOOM, EDITOR_MIN_ZOOM, useEditorStore } from '@/store/useEditorStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { fileToDataUrl, isImageFile, normalizeImage } from '@/lib/files';
import {
  computeEditorFitZoom,
  FIT_HUD_GAP,
  FIT_HUD_INSET,
  FIT_MIN_PAD,
  RULER_WELL_PAD,
} from '@/lib/editorFitZoom';
import CanvasRulers, { RULER_SIZE } from './CanvasRulers';
import PrintGuideCallouts from './PrintGuideCallouts';

/** Nested square — same glyph as the left-sidebar Center on label control. */
function CenterOnLabelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export default function CanvasStage() {
  const { t } = useTranslation();
  const template = useAppStore((s) => s.template);
  const context = useAppStore((s) => s.context);
  const designId = useAppStore((s) => s.designId);
  const settings = useAppStore((s) => s.settings);
  const pendingAffirmationText = useAppStore((s) => s.pendingAffirmationText);
  const editorReady = useEditorStore((s) => s.ready);

  const zoom = useEditorStore((s) => s.zoom);
  const layers = useEditorStore((s) => s.layers);
  const activeTool = useEditorStore((s) => s.activeTool);
  const spacePanActive = useEditorStore((s) => s.spacePanActive);
  const cropMode = useEditorStore((s) => s.cropMode);
  const rulersVisible = useEditorStore((s) => s.rulersVisible);
  const overlayVisible = useEditorStore((s) => s.overlayVisible);
  const guidesEnabled = useEditorStore((s) => s.guidesEnabled);
  const gridEnabled = useEditorStore((s) => s.gridEnabled);
  const printGuideBleedHit = useEditorStore((s) => s.printGuideBleedHit);
  const printGuideSafeHit = useEditorStore((s) => s.printGuideSafeHit);
  const fitRequest = useEditorStore((s) => s.fitRequest);
  const hasSelection = useEditorStore((s) => !!s.selection);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomHudRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ active: false, x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [dragOver, setDragOver] = useState(false);

  const panMode = activeTool === 'hand' || spacePanActive;

  const printGuides = template
    ? resolvePrintGuides(template)
    : { bleedIn: 0.125, safeIn: 0.125, printToTheEdge: true };
  const bleed = printGuides.bleedIn;
  const safe = printGuides.safeIn;
  const isRound = template?.shape === 'circle' || template?.shape === 'oval';
  const baseW = template ? (template.labelWidthIn + 2 * bleed) * EDITOR_PPI : 1;
  const baseH = template ? (template.labelHeightIn + 2 * bleed) * EDITOR_PPI : 1;
  const wellPad = rulersVisible ? RULER_WELL_PAD : 0;
  const displayW = Math.round(baseW * zoom);
  const displayH = Math.round(baseH * zoom);

  const measureHudInset = () => {
    const c = containerRef.current;
    const hud = zoomHudRef.current;
    if (!c || !hud) return FIT_HUD_INSET;
    const gap = Math.ceil(c.getBoundingClientRect().bottom - hud.getBoundingClientRect().top) + FIT_HUD_GAP;
    return Math.max(FIT_HUD_INSET, gap);
  };

  const fit = useCallback(() => {
    const c = containerRef.current;
    if (!c || !template || !c.clientWidth || !c.clientHeight) return;
    const zoom = computeEditorFitZoom({
      containerW: c.clientWidth,
      containerH: c.clientHeight,
      artboardW: baseW,
      artboardH: baseH,
      rulersVisible,
      rulerSize: RULER_SIZE,
      hudInset: measureHudInset(),
      minZoom: EDITOR_MIN_ZOOM,
      maxZoom: EDITOR_MAX_ZOOM,
    });
    useEditorStore.getState().set({ zoom });
  }, [baseW, baseH, template, rulersVisible]);

  // Any control anywhere in the editor can ask for a re-fit by bumping the
  // counter; the measurement itself only makes sense here.
  useEffect(() => {
    if (fitRequest > 0) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest]);

  // Keep Fabric's backing store ≥ displayed CSS pixels × retina so CSS zoom
  // never bilinear-stretches the bleed rings, type, or selection handles.
  useEffect(() => {
    editor.applyDisplayScale(zoom);
  }, [zoom]);

  // Initialize the Fabric editor for this template/context.
  useEffect(() => {
    if (!canvasRef.current || !template) return;
    let disposed = false;
    const initialJson = useAppStore.getState().designJson;
    void editor
      .init({ el: canvasRef.current, template, context, settings, designId, initialJson })
      .then(() => {
        if (disposed) return;
        const pending = consumePendingAffirmationText();
        if (pending) editor.addText('body', pending);
        fit();
      });
    return () => {
      disposed = true;
      // Preserve the design so it survives navigation (editor <-> export).
      if (editor.canvas) useAppStore.getState().setDesignJson(editor.serialize());
      editor.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, context, designId]);

  useEffect(() => {
    if (!pendingAffirmationText || !editorReady || !editor.canvas) return;
    const text = consumePendingAffirmationText();
    if (text) editor.addText('body', text);
  }, [pendingAffirmationText, editorReady]);

  useEffect(() => {
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fit]);

  // Pinch-to-zoom on touch devices (classic responsive editor).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastDistance = 0;

    const distance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) lastDistance = distance(e.touches);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || lastDistance <= 0) return;
      e.preventDefault();
      const d = distance(e.touches);
      const factor = d / lastDistance;
      lastDistance = d;
      const current = useEditorStore.getState().zoom;
      useEditorStore.getState().set({ zoom: clampEditorZoom(current * factor) });
    };

    const onTouchEnd = () => {
      lastDistance = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [template?.id]);

  // Keyboard shortcuts (ignored while typing or editing text on the canvas).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const active = editor.canvas?.getActiveObject() as { isEditing?: boolean } | undefined;
      if (active?.isEditing) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        useEditorStore.getState().set({ spacePanActive: true });
        editor.refreshToolCursor();
        return;
      }

      const meta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const hasSelection = !!editor.canvas?.getActiveObject();

      if (meta && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) void editor.redo();
        else void editor.undo();
      } else if (meta && key === 'y') {
        e.preventDefault();
        void editor.redo();
      } else if (!meta && !e.altKey && toolFromKey(key)) {
        e.preventDefault();
        const tool = toolFromKey(key)!;
        if (tool === 'eraser' && editor.canvas?.getActiveObject()?.type === 'image') {
          editor.removeBackgroundFromSelection();
        } else if (tool === 'image') {
          editor.setActiveTool('image');
          editor.triggerImageUpload();
        } else {
          editor.setActiveTool(tool);
        }
      } else if (meta && key === 'd') {
        e.preventDefault();
        void editor.duplicateSelected();
      } else if (meta && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) editor.ungroup();
        else editor.group();
      } else if (e.key === '[') {
        if (hasSelection) {
          e.preventDefault();
          editor.stack('backward');
        }
      } else if (e.key === ']') {
        if (hasSelection) {
          e.preventDefault();
          editor.stack('forward');
        }
      } else if (e.key === 'Escape') {
        if (editor.cropMode) {
          e.preventDefault();
          editor.cancelCrop();
        } else if (hasSelection) {
          e.preventDefault();
          editor.canvas?.discardActiveObject();
          editor.canvas?.requestRenderAll();
        }
      } else if (e.key.startsWith('Arrow')) {
        if (!hasSelection) return;
        e.preventDefault();
        const step = e.shiftKey ? 20 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        editor.nudge(dx, dy);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hasSelection) {
          e.preventDefault();
          editor.deleteSelected();
        }
      } else if (meta && e.shiftKey && key === 'c') {
        e.preventDefault();
        editor.copyStyle();
      } else if (meta && e.shiftKey && key === 'v') {
        e.preventDefault();
        editor.pasteStyle();
      } else if (meta && key === 'c') {
        if (hasSelection) {
          e.preventDefault();
          editor.copySelected();
        }
      } else if (meta && key === 'x') {
        if (hasSelection) {
          e.preventDefault();
          editor.cutSelected();
        }
      } else if (meta && key === 'v') {
        if (editor.hasClipboard) {
          e.preventDefault();
          void editor.pasteClipboard();
        }
      } else if (meta && key === 'a') {
        e.preventDefault();
        const canvas = editor.canvas;
        if (canvas) {
          const objs = canvas.getObjects().filter((o) => o.selectable !== false);
          if (objs.length === 1) {
            canvas.setActiveObject(objs[0]);
          } else if (objs.length > 1) {
            canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
          }
          canvas.requestRenderAll();
        }
      } else if (meta && (key === '=' || key === '+')) {
        e.preventDefault();
        useEditorStore.getState().set({ zoom: clampEditorZoom(zoom * 1.2) });
      } else if (meta && key === '-') {
        e.preventDefault();
        useEditorStore.getState().set({ zoom: clampEditorZoom(zoom / 1.2) });
      } else if (meta && key === '0') {
        e.preventDefault();
        fit();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        useEditorStore.getState().set({ spacePanActive: false });
        editor.refreshToolCursor();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [fit, zoom]);

  // Hand-tool / spacebar pan by scrolling the canvas container.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!panMode || e.button !== 0) return;
      panRef.current = {
        active: true,
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
      container.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!panRef.current.active) return;
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      container.scrollLeft = panRef.current.scrollLeft - dx;
      container.scrollTop = panRef.current.scrollTop - dy;
    };

    const onMouseUp = () => {
      if (!panRef.current.active) return;
      panRef.current.active = false;
      container.style.cursor = panMode ? 'grab' : '';
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [panMode]);

  const addFromLibrary = useLibraryStore((s) => s.addFromDataUrl);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const assetUrl = e.dataTransfer.getData('application/x-gaia-asset');
    const assetKind = e.dataTransfer.getData('application/x-gaia-kind') || 'image';
    if (assetUrl) {
      await editor.addImageFromUrl(assetUrl, assetKind as 'image');
      return;
    }
    // Files dragged directly from the OS — save to the library AND add to canvas
    const files = Array.from(e.dataTransfer.files).filter(isImageFile);
    for (const file of files) {
      const raw = await fileToDataUrl(file);
      const dataUrl = await normalizeImage(raw);
      // Use the library store so the My Photos tab stays in sync immediately
      await addFromLibrary(dataUrl, 'photo', file.name);
      await editor.addImageFromUrl(dataUrl, 'photo', file.name);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomWheel = e.ctrlKey || e.metaKey || e.altKey;
    if (!zoomWheel) return;
    e.preventDefault();

    const container = containerRef.current;
    const current = useEditorStore.getState().zoom;
    const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    const next = clampEditorZoom(current * delta);

    if (e.altKey && container) {
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left + container.scrollLeft;
      const cursorY = e.clientY - rect.top + container.scrollTop;
      const ratio = next / current;
      container.scrollLeft = cursorX * ratio - (e.clientX - rect.left);
      container.scrollTop = cursorY * ratio - (e.clientY - rect.top);
    }

    useEditorStore.getState().set({ zoom: next });
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-full min-h-0 w-full flex-1 overflow-auto bg-[#e9ecef] ${panMode ? 'cursor-grab' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onWheel={handleWheel}
    >
      <div
        className="flex min-h-full min-w-full items-center justify-center p-6"
        style={{
          // Lift the artboard so a max-size Fit sits above the zoom HUD, not under it.
          paddingBottom: FIT_MIN_PAD / 2 + FIT_HUD_INSET,
          ...(rulersVisible ? { paddingLeft: 40 + RULER_SIZE, paddingTop: 40 + RULER_SIZE } : {}),
        }}
      >
        <div
          className="relative"
          style={{
            width: displayW + wellPad * 2,
            height: displayH + wellPad * 2,
          }}
        >
          {rulersVisible && (
            <CanvasRulers
              widthPx={displayW + wellPad * 2}
              heightPx={displayH + wellPad * 2}
              zoom={zoom}
              bleedPx={bleed * EDITOR_PPI}
              padPx={wellPad}
            />
          )}
          <div
            className="relative"
            style={{
              position: 'absolute',
              left: wellPad,
              top: wellPad,
              width: displayW,
              height: displayH,
            }}
          >
            <div
              className={`overflow-hidden ${isRound ? 'rounded-full' : ''}`}
              style={{
                width: baseW,
                height: baseH,
                transform: `scale(${baseW ? displayW / baseW : zoom}, ${baseH ? displayH / baseH : zoom})`,
                transformOrigin: 'top left',
                willChange: 'transform',
              }}
            >
              <canvas ref={canvasRef} style={{ display: 'block' }} />
            </div>
            {overlayVisible && (
              <PrintGuideCallouts
                canvasW={baseW}
                canvasH={baseH}
                zoom={zoom}
                bleedPx={bleed * EDITOR_PPI}
                safePx={safe * EDITOR_PPI}
                showPrintToTheEdge={printGuideBleedHit && bleed > 0.002 && printGuides.printToTheEdge}
                showSafetyArea={printGuideSafeHit && safe > 0.002}
              />
            )}

            {layers.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-[80%] rounded-2xl bg-white/85 px-5 py-4 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                  <MousePointerSquareDashed className="mx-auto mb-2 h-6 w-6 text-gaia-400" />
                  {t('editor.emptyCanvas')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-gaia-500 bg-gaia-500/10 text-sm font-medium text-gaia-700">
          {t('assets.dropHere')}
        </div>
      )}

      {/* Zoom controls */}
      <div
        ref={zoomHudRef}
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-white/95 px-2 py-1.5 shadow-lg ring-1 ring-slate-200"
      >
        <button
          className="icon-btn"
          title={t('editor.zoomOut')}
          onClick={() => useEditorStore.getState().set({ zoom: clampEditorZoom(zoom / 1.2) })}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3.5rem] px-0.5 text-center text-xs font-medium tabular-nums text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="icon-btn"
          title={t('editor.zoomIn')}
          onClick={() => useEditorStore.getState().set({ zoom: clampEditorZoom(zoom * 1.2) })}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button className="icon-btn" title={t('editor.fit')} onClick={fit}>
          <Maximize className="h-4 w-4" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button
          className={`icon-btn ${rulersVisible ? 'icon-btn-active' : ''}`}
          title={t('editor.toggleRulers', 'Show inch rulers')}
          aria-label={t('editor.toggleRulers', 'Show inch rulers')}
          aria-pressed={rulersVisible}
          onClick={() => useEditorStore.getState().set({ rulersVisible: !rulersVisible })}
        >
          <Ruler className="h-4 w-4" />
        </button>
        <button
          className={`icon-btn ${gridEnabled ? 'icon-btn-active' : ''}`}
          title={t('editor.toggleGrid', 'Show alignment grid')}
          aria-label={t('editor.toggleGrid', 'Show alignment grid')}
          aria-pressed={gridEnabled}
          onClick={() => editor.setGridEnabled(!gridEnabled)}
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
        <button
          className={`icon-btn ${guidesEnabled ? 'icon-btn-active' : ''}`}
          title={t('editor.toggleGuides', 'Toggle Guides')}
          aria-label={t('editor.toggleGuides', 'Toggle Guides')}
          aria-pressed={guidesEnabled}
          onClick={() => editor.setGuidesEnabled(!guidesEnabled)}
        >
          <Magnet className="h-4 w-4" />
        </button>
        <button
          className={`icon-btn ${overlayVisible ? 'icon-btn-active' : ''}`}
          title={t('editor.toggleBleed', 'Show / Hide Safe Zones')}
          aria-label={t('editor.toggleBleed', 'Show / Hide Safe Zones')}
          aria-pressed={overlayVisible}
          onClick={() => editor.setOverlayVisible(!overlayVisible)}
        >
          <SquareDashed className="h-4 w-4" />
        </button>
        <button
          className="icon-btn"
          title={t('editor.centerOnLabel')}
          aria-label={t('editor.centerOnLabel')}
          disabled={!hasSelection}
          onClick={() => editor.centerSelected()}
        >
          <CenterOnLabelIcon className="h-4 w-4" />
        </button>
      </div>

      {cropMode && (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-slate-200">
          <span className="text-xs text-slate-600">{t('editor.crop')}</span>
          <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => editor.applyCrop()}>
            {t('editor.applyCrop')}
          </button>
          <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => editor.cancelCrop()}>
            {t('editor.cancelCrop')}
          </button>
        </div>
      )}
    </div>
  );
}
