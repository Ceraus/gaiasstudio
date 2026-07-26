// ---------------------------------------------------------------------------
// LayersPanel — robust layer management for the Canva-clone editor.
//
//   • DRAG-AND-DROP z-index reordering (grab a row, drop between rows;
//     a green insertion line previews where the layer will land). The
//     Up/Down chevrons remain as a keyboard/accessible fallback.
//   • MULTI-SELECT: Ctrl/Cmd-click toggles a layer in the selection,
//     Shift-click selects a range — then Group them with one click.
//     Selecting a single group offers Ungroup.
//   • Lock, hide/show, double-click rename, and delete per layer.
//
// Locked layers cannot be dragged (unlock first) — that keeps the structural
// Base / Background / Legibility Overlay stack safe from accidental shuffles.
// ---------------------------------------------------------------------------
import { useState, type DragEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Group as GroupIcon,
  GripVertical,
  Image as ImageIcon,
  Lock,
  Shapes,
  Square,
  Trash2,
  Type,
  Ungroup as UngroupIcon,
  Unlock,
  Users,
} from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';

function kindIcon(kind: string) {
  if (kind === 'text') return Type;
  if (kind === 'group') return Users;
  if (kind === 'base' || kind === 'overlay') return Square;
  if (['image', 'photo', 'logo', 'ai', 'stock', 'background'].includes(kind)) return ImageIcon;
  return Shapes;
}

export default function LayersPanel() {
  const { t } = useTranslation();
  const layers = useEditorStore((s) => s.layers);
  const activeIds = useEditorStore((s) => s.activeIds);
  const selection = useEditorStore((s) => s.selection);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Drag-and-drop state: the layer being dragged + the gap index (0..N) where
  // it would be inserted. Gap i sits ABOVE row i in panel order.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropGap, setDropGap] = useState<number | null>(null);

  // Shift-click range selection anchors from the last plainly-clicked row.
  const [anchorId, setAnchorId] = useState<string | null>(null);

  if (layers.length === 0) {
    return <p className="p-4 text-center text-xs text-slate-400">{t('layers.empty')}</p>;
  }

  // ── Selection handling ──────────────────────────────────────────────────
  const handleRowClick = (e: MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle this layer in the multi-selection.
      const next = activeIds.includes(id)
        ? activeIds.filter((x) => x !== id)
        : [...activeIds, id];
      editor.selectLayers(next);
      setAnchorId(id);
      return;
    }
    if (e.shiftKey && anchorId) {
      const a = layers.findIndex((l) => l.id === anchorId);
      const b = layers.findIndex((l) => l.id === id);
      if (a !== -1 && b !== -1) {
        const [from, to] = a < b ? [a, b] : [b, a];
        editor.selectLayers(layers.slice(from, to + 1).map((l) => l.id));
        return;
      }
    }
    editor.selectLayer(id);
    setAnchorId(id);
  };

  // ── Drag-and-drop handling ───────────────────────────────────────────────
  const handleDragStart = (e: DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, rowIndex: number) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDropGap(before ? rowIndex : rowIndex + 1);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (dragId === null || dropGap === null) return;
    const fromIndex = layers.findIndex((l) => l.id === dragId);
    if (fromIndex !== -1) {
      // Convert the gap index into the FINAL panel index after removal.
      const finalIndex = dropGap > fromIndex ? dropGap - 1 : dropGap;
      if (finalIndex !== fromIndex) editor.reorderLayer(dragId, finalIndex);
    }
    setDragId(null);
    setDropGap(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropGap(null);
  };

  const multiSelected = activeIds.length >= 2;
  const singleGroupSelected = activeIds.length === 1 && !!selection?.isGroup;

  return (
    <div className="flex h-full flex-col">
      {/* ── Group / Ungroup action bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 py-1.5">
        <button
          className="btn-secondary px-2.5 py-1 text-xs"
          disabled={!multiSelected}
          title={t('layers.groupTitle', 'Group the selected layers (Ctrl+G)')}
          onClick={() => editor.group()}
        >
          <GroupIcon className="h-3.5 w-3.5" />
          {t('layers.group', 'Group')}
        </button>
        <button
          className="btn-secondary px-2.5 py-1 text-xs"
          disabled={!singleGroupSelected}
          title={t('layers.ungroupTitle', 'Split the selected group back into layers')}
          onClick={() => editor.ungroup()}
        >
          <UngroupIcon className="h-3.5 w-3.5" />
          {t('layers.ungroup', 'Ungroup')}
        </button>
        <span className="ml-auto pr-1 text-[10px] leading-tight text-slate-400">
          {multiSelected
            ? t('layers.nSelected', '{{count}} selected', { count: activeIds.length })
            : t('layers.multiHint', 'Ctrl-click: multi · drag: reorder')}
        </span>
      </div>

      {/* ── Layer rows ───────────────────────────────────────────────────────── */}
      <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto" onDrop={handleDrop}>
        {layers.map((layer, idx) => {
          const Icon = kindIcon(layer.kind);
          const active = activeIds.includes(layer.id);
          const isDragging = dragId === layer.id;
          const canDrag = !layer.locked && editingId !== layer.id;
          return (
            <li
              key={layer.id}
              draggable={canDrag}
              onDragStart={(e) => canDrag && handleDragStart(e, layer.id)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`relative flex items-center gap-1 px-1.5 py-1.5 transition-opacity ${
                active ? 'bg-gaia-50' : 'hover:bg-slate-50'
              } ${isDragging ? 'opacity-40' : ''}`}
            >
              {/* Insertion indicator lines (top gap = idx, bottom gap = idx+1 on last row) */}
              {dropGap === idx && (
                <span className="pointer-events-none absolute -top-px left-1 right-1 z-10 h-0.5 rounded-full bg-gaia-500" />
              )}
              {idx === layers.length - 1 && dropGap === layers.length && (
                <span className="pointer-events-none absolute -bottom-px left-1 right-1 z-10 h-0.5 rounded-full bg-gaia-500" />
              )}

              {/* Drag handle */}
              <span
                className={`shrink-0 ${canDrag ? 'cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing' : 'cursor-not-allowed text-slate-200'}`}
                title={canDrag
                  ? t('layers.dragHint', 'Drag to reorder')
                  : t('layers.dragLocked', 'Unlock to reorder')}
                aria-hidden="true"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>

              <button
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={(e) => handleRowClick(e, layer.id)}
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
    </div>
  );
}
