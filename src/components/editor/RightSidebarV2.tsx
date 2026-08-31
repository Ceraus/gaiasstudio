import React, { useState } from 'react';
import { GripVertical,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Eye,
  EyeOff,
  Layers,
  Box,
  Lock,
  Unlock,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEditorStore, type LayerInfo } from '@/store/useEditorStore';
import { editor } from '@/lib/fabric/editorController';
import { layerDisplayName } from '@/lib/layerDisplayName';
import Modal from '@/components/common/Modal';
import HistoryPanel from '@/components/editor/HistoryPanel';

const getLayerIcon = (layer: LayerInfo) => {
  if (layer.isLegibilityOverlay || layer.kind === 'overlay') return <Circle className="h-4 w-4 text-slate-500" />;
  switch (layer.kind) {
    case 'text': return <Type className="h-4 w-4 text-slate-500" />;
    case 'image': return <ImageIcon className="h-4 w-4 text-slate-500" />;
    case 'qr': return <ImageIcon className="h-4 w-4 text-slate-500" />;
    case 'shape':
    case 'rect':
    case 'circle': return <Square className="h-4 w-4 text-slate-500" />;
    case 'base': return <Layers className="h-4 w-4 text-slate-500" />;
    default: return <Box className="h-4 w-4 text-slate-500" />;
  }
};

const railTitleClass = 'text-[10px] font-bold uppercase tracking-wider text-[#0f2e53] [font-family:inherit]';

export default function RightSidebarV2() {
  const { t } = useTranslation();
  const layers = useEditorStore((s) => s.layers);
  const activeIds = useEditorStore((s) => s.activeIds);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) setDragOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedId) {
      const visible = layers.filter((l) => l.kind !== 'base');
      const target = visible[targetIndex];
      const panelIndex = target ? layers.findIndex((l) => l.id === target.id) : targetIndex;
      editor.reorderLayer(draggedId, panelIndex);
    }
    setDraggedId(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-[338px] bg-[#e4e7eb] flex flex-col h-full shrink-0 border-l border-slate-300">

      {/* Layers — top pane */}
      <div className="flex min-h-0 flex-[3] flex-col overflow-hidden">
        <div className="flex items-center pl-3 pr-4 py-2 bg-[#f4f5f7] shrink-0">
          <h2 className={railTitleClass}>{t('panels.layers', 'Layers')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#f4f5f7] [scrollbar-gutter:stable]">
          {layers && layers.length > 0 ? (
            layers.filter((l) => l.kind !== 'base').map((layer, index) => {
              const isActive = activeIds.includes(layer.id);
              return (
                <div
                  key={layer.id}
                  draggable={!layer.locked}
                  onDragStart={(e) => handleDragStart(e, layer.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => editor.selectLayer(layer.id)}
                  className={`flex items-center gap-3 pl-3 pr-4 py-2 border-b border-slate-200 cursor-pointer transition-colors ${isActive ? 'bg-white shadow-sm' : 'hover:bg-slate-50'} ${!layer.visible ? 'opacity-50' : ''} ${dragOverIndex === index ? 'border-t-2 border-t-[#1e60d3]' : ''}`}
                >
                  <div className="text-slate-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>
                  {getLayerIcon(layer)}

                  <div className="flex-1 truncate select-none text-xs text-slate-700 font-medium">
                    {layerDisplayName(layer.name, t)}
                  </div>

                  <div className="flex items-center gap-2 pr-[27px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.toggleLayerVisible(layer.id);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title={layer.visible ? t('layers.hide') : t('layers.show')}
                      aria-label={layer.visible ? t('layers.hide') : t('layers.show')}
                    >
                      {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    {!layer.locked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(layer.id); }}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.toggleLayerLock(layer.id);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title={layer.locked ? t('layers.unlock') : t('layers.lock')}
                      aria-label={layer.locked ? t('layers.unlock') : t('layers.lock')}
                    >
                      {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">
              {t('layers.none')}
            </div>
          )}
        </div>
      </div>

      {/* History — bottom pane (real undo stack) */}
      <div className="flex min-h-0 flex-[2] flex-col overflow-hidden">
        <div className="flex items-center pl-3 pr-4 py-2 bg-[#f4f5f7] shrink-0">
          <h2 className={railTitleClass}>{t('panels.history')}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] [scrollbar-gutter:stable]">
          <HistoryPanel variant="light" />
        </div>
      </div>

      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        width={360}
        title={t('editor.deleteFromDesignTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                if (confirmDeleteId) editor.deleteLayer(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              {t('common.delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t('editor.deleteFromDesignBody')}</p>
      </Modal>
    </div>
  );
}
