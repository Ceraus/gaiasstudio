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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  if (layers.length === 0) {
    return <p className="p-4 text-center text-xs text-slate-400">{t('layers.empty')}</p>;
  }

  return (
    <ul className="divide-y divide-slate-50">
      {layers.map((layer, idx) => {
        const Icon = kindIcon(layer.kind);
        const active = activeIds.includes(layer.id);
        return (
          <li
            key={layer.id}
            draggable={editingId !== layer.id}
            onDragStart={(event) => {
              setDraggedId(layer.id);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', layer.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTargetId(layer.id);
            }}
            onDragLeave={() => {
              if (dropTargetId === layer.id) setDropTargetId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = draggedId ?? event.dataTransfer.getData('text/plain');
              if (sourceId && sourceId !== layer.id) editor.reorderLayer(sourceId, layer.id);
              setDraggedId(null);
              setDropTargetId(null);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDropTargetId(null);
            }}
            className={`flex items-center gap-1.5 border-y border-transparent px-2 py-1.5 ${
              dropTargetId === layer.id
                ? 'border-gaia-400 bg-gaia-100'
                : active
                  ? 'bg-gaia-50'
                  : 'hover:bg-slate-50'
            } ${draggedId === layer.id ? 'opacity-50' : ''}`}
          >
            <GripVertical
              className="h-4 w-4 shrink-0 cursor-grab text-slate-300"
              aria-hidden="true"
            />
            <button
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={(event) =>
                editor.selectLayer(layer.id, event.metaKey || event.ctrlKey || event.shiftKey)}
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
