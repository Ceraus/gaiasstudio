import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize, Minus, MousePointerSquareDashed, Plus } from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { EDITOR_PPI } from '@/lib/units';
import { useAppStore } from '@/store/useAppStore';
import { useEditorStore } from '@/store/useEditorStore';
import { assetsRepo } from '@/db/repositories';
import { fileToDataUrl, imageSize, isImageFile, normalizeImage } from '@/lib/files';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function CanvasStage() {
  const { t } = useTranslation();
  const template = useAppStore((s) => s.template);
  const context = useAppStore((s) => s.context);
  const designId = useAppStore((s) => s.designId);
  const settings = useAppStore((s) => s.settings);

  const zoom = useEditorStore((s) => s.zoom);
  const layers = useEditorStore((s) => s.layers);
  const cropMode = useEditorStore((s) => s.cropMode);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const bleed = settings.bleedIn;
  const baseW = template ? (template.labelWidthIn + 2 * bleed) * EDITOR_PPI : 1;
  const baseH = template ? (template.labelHeightIn + 2 * bleed) * EDITOR_PPI : 1;

  const fit = useCallback(() => {
    const c = containerRef.current;
    if (!c || !template) return;
    const pad = 72;
    const s = Math.min((c.clientWidth - pad) / baseW, (c.clientHeight - pad) / baseH);
    useEditorStore.getState().set({ zoom: clamp(s, 0.05, 3) });
  }, [baseW, baseH, template]);

  // Initialize the Fabric editor for this template/context.
  useEffect(() => {
    if (!canvasRef.current || !template) return;
    let disposed = false;
    const initialJson = useAppStore.getState().designJson;
    void editor
      .init({ el: canvasRef.current, template, context, settings, designId, initialJson })
      .then(() => {
        if (!disposed) fit();
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
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fit]);

  // Keyboard shortcuts (ignored while typing or editing text on the canvas).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const active = editor.canvas?.getActiveObject() as { isEditing?: boolean } | undefined;
      if (active?.isEditing) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) void editor.redo();
        else void editor.undo();
      } else if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        void editor.redo();
      } else if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        void editor.duplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.canvas?.getActiveObject()) {
          e.preventDefault();
          editor.deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const assetUrl = e.dataTransfer.getData('application/x-gaia-asset');
    const assetKind = e.dataTransfer.getData('application/x-gaia-kind') || 'image';
    if (assetUrl) {
      await editor.addImageFromUrl(assetUrl, assetKind as 'image');
      return;
    }
    const files = Array.from(e.dataTransfer.files).filter(isImageFile);
    for (const file of files) {
      const raw = await fileToDataUrl(file);
      const dataUrl = await normalizeImage(raw);
      const { width, height } = await imageSize(dataUrl);
      await assetsRepo.create({ name: file.name, kind: 'photo', dataUrl, width, height });
      await editor.addImageFromUrl(dataUrl, 'photo', file.name);
    }
  };

  return (
    <div
      ref={containerRef}
      className="canvas-checkerboard relative flex-1 overflow-auto"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex min-h-full min-w-full items-center justify-center p-10">
        <div style={{ width: baseW * zoom, height: baseH * zoom }} className="relative">
          <div
            className="shadow-2xl"
            style={{
              width: baseW,
              height: baseH,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <canvas ref={canvasRef} />
          </div>

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

      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-gaia-500 bg-gaia-500/10 text-sm font-medium text-gaia-700">
          {t('assets.dropHere')}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-white/95 px-2 py-1.5 shadow-lg ring-1 ring-slate-200">
        <button
          className="icon-btn"
          title={t('editor.zoomOut')}
          onClick={() => useEditorStore.getState().set({ zoom: clamp(zoom / 1.2, 0.05, 3) })}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-xs font-medium tabular-nums text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="icon-btn"
          title={t('editor.zoomIn')}
          onClick={() => useEditorStore.getState().set({ zoom: clamp(zoom * 1.2, 0.05, 3) })}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button className="icon-btn" title={t('editor.fit')} onClick={fit}>
          <Maximize className="h-4 w-4" />
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
