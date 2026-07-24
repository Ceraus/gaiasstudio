import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Lock,
  Shapes,
  Trash2,
  Type,
  Unlock,
  Users,
} from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';

function kindIcon(kind: string) {
  if (kind === 'text') return Type;
  if (kind === 'group') return Users;
  if (['image', 'photo', 'logo', 'ai', 'stock', 'background'].includes(kind)) return ImageIcon;
  return Shapes;
}

export default function LayersPanel() {
  const { t } = useTranslation();
  const layers = useEditorStore((s) => s.layers);
  const activeIds = useEditorStore((s) => s.activeIds);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (layers.length === 0) {
    return <p className="p-4 text-center text-xs text-slate-400">{t('layers.empty')}</p>;
  }

  const endDrag = () => {
    setDragId(null);
    setDropIndex(null);
  };

  /** Drops above the hovered row when the pointer is in its top half. */
  const hoverIndex = (e: React.DragEvent<HTMLLIElement>, idx: number) => {
    const box = e.currentTarget.getBoundingClientRect();
    return e.clientY - box.top < box.height / 2 ? idx : idx + 1;
  };

  const commitDrop = (target: number | null) => {
    if (dragId && target !== null) {
      const from = layers.findIndex((l) => l.id === dragId);
      // Removing the dragged row first shifts every later slot up by one.
      editor.reorderLayer(dragId, from < target ? target - 1 : target);
    }
    endDrag();
  };

  return (
    <ul className="divide-y divide-slate-50" onDragLeave={() => setDropIndex(null)}>
      {layers.map((layer, idx) => {
        const Icon = kindIcon(layer.kind);
        const active = activeIds.includes(layer.id);
        const dragging = dragId === layer.id;
        return (
          <li
            key={layer.id}
            draggable={editingId !== layer.id}
            onDragStart={(e) => {
              setDragId(layer.id);
              e.dataTransfer.effectAllowed = 'move';
              // Firefox refuses to start a drag without payload.
              e.dataTransfer.setData('text/plain', layer.id);
            }}
            onDragEnd={endDrag}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropIndex(hoverIndex(e, idx));
            }}
            onDrop={(e) => {
              e.preventDefault();
              commitDrop(hoverIndex(e, idx));
            }}
            className={`relative flex items-center gap-1 px-2 py-1.5 transition
              ${active ? 'bg-gaia-50' : 'hover:bg-slate-50'}
              ${dragging ? 'opacity-40' : ''}
              ${dropIndex === idx ? 'shadow-[inset_0_2px_0_0_theme(colors.gaia.500)]' : ''}
              ${dropIndex === idx + 1 ? 'shadow-[inset_0_-2px_0_0_theme(colors.gaia.500)]' : ''}`}
          >
            <GripVertical
              className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing"
              aria-hidden="true"
            />
            <button
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => editor.selectLayer(layer.id)}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-gaia-600' : 'text-slate-400'}`} />
              {editingId === layer.id ? (
                <input
                  autoFocus
                  className="w-full rounded border border-gaia-300 px-1 py-0.5 text-xs outline-none"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    editor.renameLayer(layer.id, draft.trim() || layer.name);
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <span
                  className="truncate text-xs text-slate-700"
                  title={t('layers.renameHint', 'Double-click to rename · drag to reorder')}
                  onDoubleClick={() => {
                    setEditingId(layer.id);
                    setDraft(layer.name);
                  }}
                >
                  {layer.name}
                </span>
              )}
            </button>

            <div className="flex shrink-0 items-center">
              <button
                className="icon-btn h-7 w-7"
                title={idx === 0 ? '' : t('layers.moveUp')}
                disabled={idx === 0}
                onClick={() => editor.moveLayer(layer.id, 'up')}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                className="icon-btn h-7 w-7"
                title={idx === layers.length - 1 ? '' : t('layers.moveDown')}
                disabled={idx === layers.length - 1}
                onClick={() => editor.moveLayer(layer.id, 'down')}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                className="icon-btn h-7 w-7"
                title={layer.visible ? t('layers.hide') : t('layers.show')}
                onClick={() => editor.toggleLayerVisible(layer.id)}
              >
                {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button
                className="icon-btn h-7 w-7"
                title={layer.locked ? t('layers.unlock') : t('layers.lock')}
                onClick={() => editor.toggleLayerLock(layer.id)}
              >
                {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
              <button
                className="icon-btn h-7 w-7 text-rose-500 hover:bg-rose-50"
                title={t('common.delete')}
                onClick={() => editor.deleteLayer(layer.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
