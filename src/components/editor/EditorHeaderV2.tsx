import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  Copy,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  FolderTree,
  Grid3x3,
  Keyboard,
  Image as ImageIcon,
  Layers,
  Magnet,
  Maximize2,
  Redo2,
  SpellCheck,
  SquareDashed,
  Trash2,
  Undo2,
  ZoomIn,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Collection } from '@/types';
import { collectionsRepo, draftsRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';
import {
  clampEditorZoom,
  EDITOR_MAX_ZOOM,
  EDITOR_MIN_ZOOM,
  requestCanvasFit,
  useEditorStore,
} from '@/store/useEditorStore';
import { editor } from '@/lib/fabric/editorController';
import { WORKFLOW_STEP_ICONS } from '@/lib/workflowStepIcons';
import Modal from '@/components/common/Modal';
import CollectionsModal from '@/components/screens/CollectionsModal';
import ShortcutsModal from './ShortcutsModal';

const VIEW_CHECKED_BG = '#d4eaf7';

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#0f2e53]" aria-hidden>
      {children}
    </span>
  );
}

/** Vertical rect + vertical center line — Avery Center Vertically. */
function CenterVerticallyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="8" y="3.5" width="8" height="17" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4.5v15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal rect + horizontal center line — Avery Center Horizontally. */
function CenterHorizontallyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="8" width="17" height="8" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.5 12h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Square with a crosshair — Avery Center on Template. */
function CenterOnTemplateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 6.5v11M6.5 12h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Overlapping squares: solid vs outline encodes back/front; `step` is a one-layer nudge. */
function ArrangeStackIcon({
  solid,
  step,
  className,
}: {
  solid: 'back' | 'front';
  step?: boolean;
  className?: string;
}) {
  const offset = step ? 3.2 : 5;
  const back = { x: 3.5, y: 3.5 + offset, w: 12, h: 12 };
  const front = { x: 3.5 + offset, y: 3.5, w: 12, h: 12 };
  const fillBack = solid === 'back';
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x={back.x}
        y={back.y}
        width={back.w}
        height={back.h}
        rx="1.4"
        fill={fillBack ? 'currentColor' : 'white'}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x={front.x}
        y={front.y}
        width={front.w}
        height={front.h}
        rx="1.4"
        fill={fillBack ? 'white' : 'currentColor'}
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

interface Props {
  onExport: () => void;
  onToggleFullscreen: () => void;
  onOpenBackgroundChooser: () => void;
}

function HeaderMenu({
  label,
  icon: Icon,
  disabled,
  stayOpen,
  menuClassName,
  children,
}: {
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
  stayOpen?: boolean;
  menuClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 min-w-[48px] flex-col items-center justify-center gap-1 font-sans text-[#0f2e53] hover:text-[#1e60d3] disabled:cursor-not-allowed disabled:opacity-30 min-[1400px]:min-w-[54px]"
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} />
        <span className="whitespace-nowrap text-[11px] font-extrabold">{label}</span>
      </button>
      {open && (
        <div
          className={`absolute left-1/2 top-full z-50 mt-1 min-w-[13.5rem] -translate-x-1/2 rounded-md bg-white py-1 shadow-xl ring-1 ring-slate-200 ${menuClassName ?? ''}`}
          onClick={stayOpen ? undefined : () => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] font-medium text-[#0f2e53] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <IconFrame>{icon}</IconFrame>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function ViewCheckItem({
  checked,
  icon,
  label,
  onClick,
  disabled,
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] font-medium text-[#0f2e53] disabled:cursor-not-allowed disabled:opacity-30 ${
        checked ? '' : 'hover:bg-slate-50'
      }`}
      style={checked ? { backgroundColor: VIEW_CHECKED_BG } : undefined}
    >
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border border-[#0f2e53] bg-white"
        aria-hidden
      >
        {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <IconFrame>{icon}</IconFrame>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function FlipViewItem({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] font-medium text-[#0f2e53] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <IconFrame>
          <FlipHorizontal2 className="h-4 w-4" strokeWidth={1.7} />
        </IconFrame>
        <span className="flex-1 whitespace-nowrap">{t('editor.flip')}</span>
        <span className="text-[10px] text-slate-400" aria-hidden>
          ▸
        </span>
      </button>
      {open && !disabled && (
        <div className="absolute left-full top-0 z-10 ml-1 min-w-[10.5rem] rounded-md bg-white py-1 shadow-xl ring-1 ring-slate-200">
          <MenuItem
            icon={<FlipHorizontal2 className="h-4 w-4" strokeWidth={1.7} />}
            label={t('editor.flipH')}
            onClick={() => {
              editor.flip('h');
              setOpen(false);
            }}
          />
          <MenuItem
            icon={<FlipVertical2 className="h-4 w-4" strokeWidth={1.7} />}
            label={t('editor.flipV')}
            onClick={() => {
              editor.flip('v');
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ZoomMenu() {
  const { t } = useTranslation();
  const zoom = useEditorStore((s) => s.zoom);
  const pct = Math.round(zoom * 100);
  const [typed, setTyped] = useState(String(pct));

  useEffect(() => {
    setTyped(String(pct));
  }, [pct]);

  const commitTyped = (rawText = typed) => {
    const raw = Number.parseInt(String(rawText).replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(raw)) {
      setTyped(String(pct));
      return;
    }
    useEditorStore.getState().set({ zoom: clampEditorZoom(raw / 100) });
  };

  return (
    <div className="px-3 py-3" onMouseDown={(event) => event.stopPropagation()}>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#0f2e53]">
        <span>{Math.round(EDITOR_MIN_ZOOM * 100)}%</span>
        <span>{Math.round(EDITOR_MAX_ZOOM * 100)}%</span>
      </div>
      <input
        type="range"
        min={Math.round(EDITOR_MIN_ZOOM * 100)}
        max={Math.round(EDITOR_MAX_ZOOM * 100)}
        value={pct}
        aria-label={t('editor.zoom')}
        onChange={(event) => {
          useEditorStore.getState().set({ zoom: clampEditorZoom(Number(event.target.value) / 100) });
        }}
        className="h-1.5 w-full cursor-pointer accent-[#0f2e53]"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => requestCanvasFit()}
          className="whitespace-nowrap text-[13px] font-semibold text-[#0f2e53] hover:text-[#1e60d3]"
        >
          {t('editor.fitToScreen')}
        </button>
        <label className="flex items-center gap-1 text-[13px] font-semibold text-[#0f2e53]">
          <input
            type="text"
            inputMode="numeric"
            value={typed}
            aria-label={t('editor.zoomPercent')}
            onChange={(event) => {
              const next = event.target.value;
              setTyped(next);
              const raw = Number.parseInt(next.replace(/[^\d]/g, ''), 10);
              if (Number.isFinite(raw) && next.trim() !== '') {
                useEditorStore.getState().set({ zoom: clampEditorZoom(raw / 100) });
              }
            }}
            onBlur={(event) => commitTyped(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitTyped(event.currentTarget.value);
              }
            }}
            className="h-7 w-14 rounded border border-slate-300 bg-white px-1.5 text-right text-[13px] font-semibold tabular-nums text-[#0f2e53] outline-none focus:border-[#1e60d3]"
          />
          <span>%</span>
        </label>
      </div>
    </div>
  );
}

export default function EditorHeaderV2({ onExport, onToggleFullscreen, onOpenBackgroundChooser }: Props) {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const template = useAppStore((s) => s.template);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const hasClipboard = useEditorStore((s) => s.hasClipboard);
  const selection = useEditorStore((s) => s.selection);
  const gridEnabled = useEditorStore((s) => s.gridEnabled);
  const guidesEnabled = useEditorStore((s) => s.guidesEnabled);
  const textBoxOutlines = useEditorStore((s) => s.textBoxOutlines);
  const editorFullscreen = useEditorStore((s) => s.editorFullscreen);
  const spellCheckEnabled = useEditorStore((s) => s.spellCheckEnabled);
  const hasSelection = (selection?.count ?? 0) > 0;
  const { icon: PrintExportIcon, chip: printExportChip } = WORKFLOW_STEP_ICONS[5];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [managingCollections, setManagingCollections] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});

  const reloadCollections = useCallback(() => {
    void Promise.all([collectionsRepo.all(), draftsRepo.all()]).then(([cols, drafts]) => {
      setCollections(cols);
      const counts: Record<string, number> = {};
      for (const draft of drafts) {
        if (draft.collectionId) counts[draft.collectionId] = (counts[draft.collectionId] ?? 0) + 1;
      }
      setCollectionCounts(counts);
    });
  }, []);

  useEffect(() => {
    if (managingCollections) reloadCollections();
  }, [managingCollections, reloadCollections]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') setShortcutsOpen((open) => !open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const IconButton = ({
    icon: Icon,
    label,
    onClick,
    disabled,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 min-w-[48px] flex-col items-center justify-center gap-1 font-sans text-[#0f2e53] hover:text-[#1e60d3] disabled:cursor-not-allowed disabled:opacity-30 min-[1400px]:min-w-[54px]"
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
      <span className="whitespace-nowrap text-[11px] font-extrabold">{label}</span>
    </button>
  );

  return (
    <header className="relative z-20 grid h-[80px] w-full shrink-0 select-none grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-slate-300 bg-white px-4 font-sans xl:px-6">
      <div className="min-w-0 justify-self-start pr-3">
        <div
          data-testid="editor-template-identity"
          className="flex w-max max-w-full flex-col items-start justify-center leading-tight"
        >
          <div className="whitespace-nowrap text-[22px] font-black tracking-tight text-[#0f2e53]">
            {t('editor.averyTemplate', { id: template?.id || '94510' })}
          </div>
          <button
            type="button"
            data-testid="editor-change-template"
            onClick={() => goto('template')}
            className="mt-0.5 text-[15px] font-medium text-[#2563eb] hover:text-blue-700"
          >
            {t('editor.changeTemplate')}
          </button>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-center justify-self-stretch px-1">
        <div
          data-testid="editor-tools"
          className="flex shrink-0 items-center justify-center gap-0.5 min-[1400px]:gap-2"
        >
        <IconButton icon={Undo2} label={t('editor.undo')} onClick={() => void editor.undo()} disabled={!canUndo} />
        <IconButton icon={Redo2} label={t('editor.redo')} onClick={() => void editor.redo()} disabled={!canRedo} />
        <div className="mx-0.5 h-10 w-px bg-slate-200 min-[1400px]:mx-1" />
        <IconButton icon={Copy} label={t('editor.copy')} onClick={() => editor.copySelected()} disabled={!hasSelection} />
        <IconButton icon={ClipboardPaste} label={t('editor.paste')} onClick={() => void editor.pasteClipboard()} disabled={!hasClipboard} />
        <div className="mx-0.5 h-10 w-px bg-slate-200 min-[1400px]:mx-1" />

        <HeaderMenu icon={CenterOnTemplateIcon} label={t('editor.alignMenu')} disabled={!hasSelection}>
          <MenuItem
            icon={<CenterVerticallyIcon className="h-5 w-5" />}
            label={t('editor.alignCenterV')}
            onClick={() => editor.align('centerV')}
          />
          <MenuItem
            icon={<CenterHorizontallyIcon className="h-5 w-5" />}
            label={t('editor.alignCenterH')}
            onClick={() => editor.align('centerH')}
          />
          <MenuItem
            icon={<CenterOnTemplateIcon className="h-5 w-5" />}
            label={t('editor.centerOnTemplate')}
            onClick={() => editor.centerSelected()}
          />
        </HeaderMenu>

        <HeaderMenu icon={Layers} label={t('editor.arrangeMenu')} disabled={!hasSelection}>
          <MenuItem
            icon={<ArrangeStackIcon solid="back" step className="h-5 w-5" />}
            label={t('editor.sendBackward')}
            onClick={() => editor.stack('backward')}
          />
          <MenuItem
            icon={<ArrangeStackIcon solid="front" step className="h-5 w-5" />}
            label={t('editor.sendForward')}
            onClick={() => editor.stack('forward')}
          />
          <MenuItem
            icon={<ArrangeStackIcon solid="back" className="h-5 w-5" />}
            label={t('editor.tools.sendToBack')}
            onClick={() => editor.stack('back')}
          />
          <MenuItem
            icon={<ArrangeStackIcon solid="front" className="h-5 w-5" />}
            label={t('editor.sendToFront')}
            onClick={() => editor.stack('front')}
          />
        </HeaderMenu>

        <HeaderMenu icon={Eye} label={t('editor.viewMenu')} stayOpen menuClassName="min-w-[15.5rem]">
          <FlipViewItem disabled={!hasSelection} />
          <ViewCheckItem
            checked={gridEnabled}
            icon={<Grid3x3 className="h-4 w-4" strokeWidth={1.7} />}
            label={t('editor.showGrid')}
            onClick={() => editor.setGridEnabled(!gridEnabled)}
          />
          <ViewCheckItem
            checked={textBoxOutlines}
            icon={<SquareDashed className="h-4 w-4" strokeWidth={1.7} />}
            label={t('editor.showTextBoxOutlines')}
            onClick={() => editor.setTextBoxOutlines(!textBoxOutlines)}
          />
          <ViewCheckItem
            checked={editorFullscreen}
            icon={<Maximize2 className="h-4 w-4" strokeWidth={1.7} />}
            label={t('editor.fullScreenMode')}
            onClick={onToggleFullscreen}
          />
          <ViewCheckItem
            checked={guidesEnabled}
            icon={<Magnet className="h-4 w-4" strokeWidth={1.7} />}
            label={t('editor.snapToEdge')}
            onClick={() => editor.setGuidesEnabled(!guidesEnabled)}
          />
          <ViewCheckItem
            checked={spellCheckEnabled}
            icon={<SpellCheck className="h-4 w-4" strokeWidth={1.7} />}
            label={t('editor.spellCheck')}
            onClick={() => editor.setSpellCheckEnabled(!spellCheckEnabled)}
          />
        </HeaderMenu>

        <div className="mx-0.5 h-10 w-px bg-slate-200 min-[1400px]:mx-1" />
        <IconButton icon={ImageIcon} label={t('assets.backgroundTab')} onClick={onOpenBackgroundChooser} />
        <div className="mx-0.5 h-10 w-px bg-slate-200 min-[1400px]:mx-1" />

        <HeaderMenu icon={ZoomIn} label={t('editor.zoom')} stayOpen menuClassName="w-[16.5rem] min-w-[16.5rem]">
          <ZoomMenu />
        </HeaderMenu>

          <IconButton icon={Trash2} label={t('editor.delete')} onClick={() => setConfirmDelete(true)} disabled={!hasSelection} />
        </div>
      </div>

      <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 justify-self-end pl-2 min-[1400px]:gap-3 min-[1400px]:pl-3">
        <button
          type="button"
          data-testid="editor-manage-collections"
          title={t('collections.assignToCollection', 'Assign to a Collection')}
          aria-label={t('collections.assignToCollection', 'Assign to a Collection')}
          onClick={() => setManagingCollections(true)}
          className="manage-collections-pill inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition min-[1400px]:h-auto min-[1400px]:w-auto min-[1400px]:gap-[calc(0.375rem*1.18)] min-[1400px]:px-[calc(0.75rem*1.18)] min-[1400px]:py-[calc(0.375rem*1.18)] min-[1400px]:text-[length:calc(0.875rem*1.18)] min-[1400px]:font-semibold min-[1400px]:leading-[calc(1.25rem*1.18)]"
        >
          <FolderTree className="h-[calc(1rem*1.18)] w-[calc(1rem*1.18)] shrink-0" strokeWidth={1.75} />
          <span className="hidden whitespace-nowrap min-[1400px]:inline">
            {t('collections.assignToCollection', 'Assign to a Collection')}
          </span>
        </button>
        <button
          type="button"
          title={t('shortcuts.title', 'Keyboard shortcuts (?)')}
          aria-label={t('shortcuts.title', 'Keyboard shortcuts')}
          onClick={() => setShortcutsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded text-[#0f2e53] hover:text-[#1e60d3]"
        >
          <Keyboard className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onExport}
          className="btn-primary inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold min-[1400px]:px-5"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${printExportChip}`}
            aria-hidden
          >
            <PrintExportIcon className="h-4 w-4" />
          </span>
          {t('workflow.step5Title', 'Step 5: Print & Export')}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        width={360}
        title={t('editor.deleteFromDesignTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                editor.deleteSelected();
                setConfirmDelete(false);
              }}
            >
              {t('common.delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t('editor.deleteFromDesignBody')}</p>
      </Modal>
      <CollectionsModal
        open={managingCollections}
        collections={collections}
        counts={collectionCounts}
        onClose={() => setManagingCollections(false)}
        onChanged={reloadCollections}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}
