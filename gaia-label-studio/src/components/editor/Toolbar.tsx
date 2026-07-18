import { useTranslation } from 'react-i18next';
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Copy,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Magnet,
  MoveDown,
  MoveUp,
  Redo2,
  SquareDashed,
  Trash2,
  Undo2,
  Ungroup,
} from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';

function Sep() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;
}

export default function Toolbar() {
  const { t } = useTranslation();
  const sel = useEditorStore((s) => s.selection);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const overlayVisible = useEditorStore((s) => s.overlayVisible);
  const guidesEnabled = useEditorStore((s) => s.guidesEnabled);

  const has = !!sel;
  const isImage = !!sel?.isImage;
  const isMulti = (sel?.count ?? 0) > 1;
  const isGroup = !!sel?.isGroup;

  return (
    <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5">
      <button className="icon-btn" disabled={!canUndo} title={t('editor.undo')} onClick={() => void editor.undo()}>
        <Undo2 className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!canRedo} title={t('editor.redo')} onClick={() => void editor.redo()}>
        <Redo2 className="h-4 w-4" />
      </button>
      <Sep />
      <button className="icon-btn" disabled={!has} title={t('editor.duplicate')} onClick={() => void editor.duplicateSelected()}>
        <Copy className="h-4 w-4" />
      </button>
      <button className="icon-btn text-rose-500 hover:bg-rose-50" disabled={!has} title={t('editor.delete')} onClick={() => editor.deleteSelected()}>
        <Trash2 className="h-4 w-4" />
      </button>
      <Sep />
      <button className="icon-btn" disabled={!has} title={t('editor.alignLeft')} onClick={() => editor.align('left')}>
        <AlignHorizontalJustifyStart className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.alignCenterH')} onClick={() => editor.align('centerH')}>
        <AlignHorizontalJustifyCenter className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.alignRight')} onClick={() => editor.align('right')}>
        <AlignHorizontalJustifyEnd className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.alignTop')} onClick={() => editor.align('top')}>
        <AlignVerticalJustifyStart className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.alignCenterV')} onClick={() => editor.align('centerV')}>
        <AlignVerticalJustifyCenter className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.alignBottom')} onClick={() => editor.align('bottom')}>
        <AlignVerticalJustifyEnd className="h-4 w-4" />
      </button>
      <Sep />
      <button className="icon-btn" disabled={!has} title={t('editor.bringForward')} onClick={() => editor.stack('forward')}>
        <MoveUp className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.sendBackward')} onClick={() => editor.stack('backward')}>
        <MoveDown className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.flipH')} onClick={() => editor.flip('h')}>
        <FlipHorizontal2 className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!has} title={t('editor.flipV')} onClick={() => editor.flip('v')}>
        <FlipVertical2 className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!isImage} title={t('editor.crop')} onClick={() => editor.startCrop()}>
        <Crop className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!isMulti} title={t('editor.group')} onClick={() => editor.group()}>
        <Group className="h-4 w-4" />
      </button>
      <button className="icon-btn" disabled={!isGroup} title={t('editor.ungroup')} onClick={() => editor.ungroup()}>
        <Ungroup className="h-4 w-4" />
      </button>
      <Sep />
      <button
        className={`icon-btn ${guidesEnabled ? 'icon-btn-active' : ''}`}
        title={t('editor.toggleGuides')}
        onClick={() => editor.setGuidesEnabled(!guidesEnabled)}
      >
        <Magnet className="h-4 w-4" />
      </button>
      <button
        className={`icon-btn ${overlayVisible ? 'icon-btn-active' : ''}`}
        title={t('editor.toggleBleed')}
        onClick={() => editor.setOverlayVisible(!overlayVisible)}
      >
        <SquareDashed className="h-4 w-4" />
      </button>
    </div>
  );
}
