/**
 * LeftRail — Photoshop-style icon toolbar for Gaia's Label Studio.
 *
 * Layout: [80 px 3-col icon grid] + [optional 288 px slide-out panel]
 *
 * Tool groups (top → bottom), 3 icons per row:
 *   G1  Select & Transform (select, flip H/V)
 *   G2  Add Elements (text heading/body, image, shape, QR code, background)
 *   G3  Arrange (forward/back/front/back, center H/V)
 *   G4  Object Actions (duplicate, group, ungroup, delete)
 *   G5  View (guides, bleed overlay, legibility, zoom out/in, fit)
 *
 * Bottom:
 *   Simple/Full mode toggle (full width)
 *   Float/Dock toolbar toggle (full width)
 *
 * Simple mode shows only 2 rows of 3 essential tools.
 * Floating mode collapses to a dock button; toolbar renders as a draggable bar.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ChevronRight,
  Circle,
  Copy,
  ChevronsDown,
  ChevronsUp,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  GripHorizontal,
  Group,
  Image as ImageIcon,
  ImagePlus,
  Magnet,
  Maximize2,
  Minus,
  MousePointer2,
  MoveDown,
  MoveUp,
  PanelLeft,
  QrCode,
  SlidersHorizontal,
  Square,
  SquareDashed,
  Trash2,
  Triangle,
  Type,
  Ungroup,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { requestCanvasFit, useEditorStore } from '@/store/useEditorStore';
import AddPanel from './AddPanel';
import AssetsDrawer, { type AssetTab } from './AssetsDrawer';
import QrCodeModal from './QrCodeModal';

// ── Clamp helper ──────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// ── Group divider ─────────────────────────────────────────────────────────────
function GridSep() {
  return <div className="mx-2 my-0.5 h-px bg-gray-700" />;
}

// ── Icon button for the 3-col grid ────────────────────────────────────────────
function ToolBtn({
  icon: Icon,
  title,
  onClick,
  active = false,
  disabled = false,
  danger = false,
}: {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex aspect-square w-full items-center justify-center rounded p-1 transition
        disabled:cursor-not-allowed disabled:opacity-30
        ${
          active
            ? 'bg-gaia-600 text-white shadow-sm'
            : danger
              ? 'text-rose-400 hover:bg-rose-900/30'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ── Empty grid cell placeholder ───────────────────────────────────────────────
function EmptyCell() {
  return <div />;
}

// ── Shape picker flyout ───────────────────────────────────────────────────────
const SHAPES = [
  { kind: 'rect'     as const, Icon: Square,   label: 'Rectangle' },
  { kind: 'circle'   as const, Icon: Circle,   label: 'Circle'    },
  { kind: 'triangle' as const, Icon: Triangle, label: 'Triangle'  },
  { kind: 'line'     as const, Icon: Minus,    label: 'Line'      },
] as const;

function ShapeFlyout({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="absolute left-full top-0 z-50 ml-2 min-w-[8.75rem] rounded-xl bg-gray-800 p-2 shadow-2xl ring-1 ring-gray-600"
      onMouseLeave={onClose}
    >
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {t('add.shapes')}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {SHAPES.map(({ kind, Icon, label }) => (
          <button
            key={kind}
            title={label}
            onClick={() => { editor.addShape(kind); onClose(); }}
            className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium text-gray-300 transition hover:bg-gaia-700 hover:text-white"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Add-image via file input ──────────────────────────────────────────────────
function useFileImageAdder() {
  const inputRef = useRef<HTMLInputElement>(null);

  const trigger = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    void editor.addImageFromUrl(url, 'image', file.name).then(() => URL.revokeObjectURL(url));
    e.target.value = '';
  };

  const Input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleChange}
    />
  );

  return { trigger, Input };
}

// ── Floating toolbar ──────────────────────────────────────────────────────────
function FloatingToolbar({
  onDock,
  sel,
  zoom,
  overlayVis,
  guidesEnabled,
  legibilityOverlayVisible,
}: {
  onDock: () => void;
  sel: ReturnType<typeof useEditorStore.getState>['selection'];
  zoom: number;
  overlayVis: boolean;
  guidesEnabled: boolean;
  legibilityOverlayVisible: boolean;
}) {
  const { t } = useTranslation();
  const has = !!sel;
  const isMulti = (sel?.count ?? 0) > 1;
  const isGroup = !!sel?.isGroup;

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const s = localStorage.getItem('gaia-float-toolbar-pos');
      return s ? (JSON.parse(s) as { x: number; y: number }) : { x: 240, y: 80 };
    } catch {
      return { x: 240, y: 80 };
    }
  });
  const dragging = useRef(false);
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const [shapeOpen, setShapeOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const { trigger: addImageFile, Input: ImageInput } = useFileImageAdder();

  const onGripDown = (e: React.MouseEvent) => {
    dragging.current = true;
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const nx = origin.current.px + (e.clientX - origin.current.mx);
      const ny = origin.current.py + (e.clientY - origin.current.my);
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setPos((p) => {
        localStorage.setItem('gaia-float-toolbar-pos', JSON.stringify(p));
        return p;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const FBtn = ({
    icon: Icon,
    title,
    onClick,
    active = false,
    disabled = false,
    danger = false,
  }: {
    icon: React.ElementType;
    title: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    danger?: boolean;
  }) => (
    <button
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition
        disabled:cursor-not-allowed disabled:opacity-30
        ${active ? 'bg-gaia-600 text-white' : danger ? 'text-rose-400 hover:bg-rose-900/30' : 'text-gray-300 hover:bg-gray-600 hover:text-white'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const FSep = () => <span className="mx-0.5 h-6 w-px shrink-0 bg-gray-600" />;

  return (
    <>
      {ImageInput}
      {qrOpen && <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} />}
      <div
        className="fixed z-50 select-none rounded-xl bg-gray-900 shadow-2xl ring-1 ring-gray-600"
        style={{ left: pos.x, top: pos.y }}
      >
        {/* Grip header */}
        <div
          className="flex cursor-grab items-center justify-between rounded-t-xl border-b border-gray-700 px-2 py-1 active:cursor-grabbing"
          onMouseDown={onGripDown}
        >
          <GripHorizontal className="h-3.5 w-3.5 text-gray-500" />
          <span className="mx-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Tools
          </span>
          <button
            title={t('editor.tools.dockToolbar')}
            onClick={onDock}
            className="rounded p-0.5 text-gray-500 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Tool buttons in a horizontal row */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          {/* Select */}
          <FBtn icon={MousePointer2} title={t('editor.tools.select')} onClick={() => {}} />
          <FSep />

          {/* Add Elements */}
          <FBtn icon={Type}      title={t('editor.tools.addHeading')} onClick={() => editor.addText('heading')} />
          <FBtn icon={Type}      title={t('editor.tools.addText')}    onClick={() => editor.addText('body')} />
          <FBtn icon={ImagePlus} title={t('editor.tools.addImage')}   onClick={addImageFile} />
          <div className="relative">
            <FBtn icon={Square}  title={t('editor.tools.addShape')}   onClick={() => setShapeOpen((o) => !o)} active={shapeOpen} />
            {shapeOpen && <ShapeFlyout onClose={() => setShapeOpen(false)} />}
          </div>
          <FBtn icon={QrCode} title={t('editor.tools.addQr')} onClick={() => setQrOpen(true)} />
          <FSep />

          {/* Arrange */}
          <FBtn icon={MoveUp}                       title={t('editor.bringForward')}           disabled={!has} onClick={() => editor.stack('forward')} />
          <FBtn icon={MoveDown}                     title={t('editor.sendBackward')}            disabled={!has} onClick={() => editor.stack('backward')} />
          <FBtn icon={ChevronsUp}                   title={t('editor.tools.bringToFront')}     disabled={!has} onClick={() => editor.stack('front')} />
          <FBtn icon={ChevronsDown}                 title={t('editor.tools.sendToBack')}       disabled={!has} onClick={() => editor.stack('back')} />
          <FBtn icon={AlignHorizontalJustifyCenter} title={t('editor.alignCenterH')}           disabled={!has} onClick={() => editor.align('centerH')} />
          <FBtn icon={AlignVerticalJustifyCenter}   title={t('editor.alignCenterV')}           disabled={!has} onClick={() => editor.align('centerV')} />
          <FSep />

          {/* Object Actions */}
          <FBtn icon={Copy}    title={t('editor.duplicate')} disabled={!has} onClick={() => void editor.duplicateSelected()} />
          {isMulti && <FBtn icon={Group}   title={t('editor.group')}   onClick={() => editor.group()} />}
          {isGroup  && <FBtn icon={Ungroup} title={t('editor.ungroup')} onClick={() => editor.ungroup()} />}
          <FBtn icon={Trash2}  title={t('editor.delete')}    disabled={!has} danger onClick={() => editor.deleteSelected()} />
          <FSep />

          {/* View */}
          <FBtn icon={Magnet}       title={t('editor.toggleGuides')}            active={guidesEnabled}            onClick={() => editor.setGuidesEnabled(!guidesEnabled)} />
          <FBtn icon={SquareDashed} title={t('editor.toggleBleed')}             active={overlayVis}               onClick={() => editor.setOverlayVisible(!overlayVis)} />
          <FBtn icon={Eye}          title={t('editor.toggleLegibilityOverlay')} active={legibilityOverlayVisible} onClick={() => editor.toggleLegibilityOverlay()} />
          <FSep />
          <FBtn icon={ZoomOut}   title={t('editor.zoomOut')} onClick={() => useEditorStore.getState().set({ zoom: clamp(zoom / 1.2, 0.05, 3) })} />
          <FBtn icon={ZoomIn}    title={t('editor.zoomIn')}  onClick={() => useEditorStore.getState().set({ zoom: clamp(zoom * 1.2, 0.05, 3) })} />
          <FBtn icon={Maximize2} title={t('editor.fit')}     onClick={() => requestCanvasFit()} />
          <FSep />

          {/* Dock back */}
          <FBtn icon={PanelLeft} title={t('editor.tools.dockToolbar')} onClick={onDock} />
        </div>
      </div>
    </>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function LeftRail() {
  const { t } = useTranslation();

  // Store state
  const sel                      = useEditorStore((s) => s.selection);
  const zoom                     = useEditorStore((s) => s.zoom);
  const overlayVis               = useEditorStore((s) => s.overlayVisible);
  const guidesEnabled            = useEditorStore((s) => s.guidesEnabled);
  const legibilityOverlayVisible = useEditorStore((s) => s.legibilityOverlayVisible);
  const layers                   = useEditorStore((s) => s.layers);

  const has            = !!sel;
  const isMulti        = (sel?.count ?? 0) > 1;
  const isGroup        = !!sel?.isGroup;
  const hasBackground  = layers.some((l) => l.kind === 'background');

  // UI state
  const [activePanel,    setActivePanel]    = useState<'add' | 'background' | null>(null);
  const [activeAssetTab, setActiveAssetTab] = useState<AssetTab>('myPhotos');
  const [shapeOpen,      setShapeOpen]      = useState(false);
  const [qrOpen,         setQrOpen]         = useState(false);
  const [simpleMode,     setSimpleMode]     = useState(false);
  const [floating,       setFloating]       = useState(false);

  const togglePanel = (panel: 'add' | 'background') => {
    setActivePanel((p) => (p === panel ? null : panel));
  };

  // ── Floating mode ──────────────────────────────────────────────────────────
  if (floating) {
    return (
      <>
        {/* Minimal collapsed strip */}
        <aside className="flex w-20 shrink-0 flex-col items-center bg-gray-900 py-2">
          <button
            title={t('editor.tools.dockToolbar')}
            aria-label={t('editor.tools.dockToolbar')}
            onClick={() => setFloating(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 transition hover:bg-gray-700 hover:text-white"
          >
            <PanelLeft className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </aside>

        <FloatingToolbar
          onDock={() => setFloating(false)}
          sel={sel}
          zoom={zoom}
          overlayVis={overlayVis}
          guidesEnabled={guidesEnabled}
          legibilityOverlayVisible={legibilityOverlayVisible}
        />
      </>
    );
  }

  // ── Normal (docked) mode ───────────────────────────────────────────────────
  return (
    <aside className="flex shrink-0 flex-row">

      {/* ── 80px icon strip ──────────────────────────────────────────────────── */}
      <div className="relative flex w-20 shrink-0 flex-col overflow-y-auto bg-gray-900 py-1.5">

        {qrOpen && <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} />}

        {simpleMode ? (
          /* ── Simple mode: 2 rows × 3 essential tools ──────────────────────── */
          <div className="px-1 py-1">
            <div className="grid grid-cols-3 gap-0.5">
              {/* Row 1 */}
              <ToolBtn
                icon={Type}
                title={t('editor.tools.addHeading')}
                onClick={() => editor.addText('heading')}
              />
              <ToolBtn
                icon={ImagePlus}
                title={t('editor.tools.addImage')}
                onClick={() => togglePanel('add')}
                active={activePanel === 'add'}
              />
              <div className="relative">
                <ToolBtn
                  icon={Square}
                  title={t('editor.tools.addShape')}
                  onClick={() => setShapeOpen((o) => !o)}
                  active={shapeOpen}
                />
                {shapeOpen && <ShapeFlyout onClose={() => setShapeOpen(false)} />}
              </div>
              {/* Row 2 */}
              <ToolBtn
                icon={Copy}
                title={t('editor.duplicate')}
                disabled={!has}
                onClick={() => void editor.duplicateSelected()}
              />
              <ToolBtn
                icon={Trash2}
                title={t('editor.delete')}
                disabled={!has}
                danger
                onClick={() => editor.deleteSelected()}
              />
              <ToolBtn
                icon={Maximize2}
                title={t('editor.fit')}
                onClick={() => requestCanvasFit()}
              />
            </div>
          </div>
        ) : (
          /* ── Full mode: all groups ─────────────────────────────────────────── */
          <>
            {/* G1: Select & Transform */}
            <div className="px-1 py-1">
              <div className="grid grid-cols-3 gap-0.5">
                <ToolBtn icon={MousePointer2}  title={t('editor.tools.select')} onClick={() => {}} />
                <ToolBtn icon={FlipHorizontal2} title={t('editor.flipH')} disabled={!has} onClick={() => editor.flip('h')} />
                <ToolBtn icon={FlipVertical2}   title={t('editor.flipV')} disabled={!has} onClick={() => editor.flip('v')} />
              </div>
            </div>

            <GridSep />

            {/* G2: Add Elements */}
            <div className="px-1 py-1">
              <div className="grid grid-cols-3 gap-0.5">
                <ToolBtn icon={Type}      title={t('editor.tools.addHeading')} onClick={() => editor.addText('heading')} />
                <ToolBtn icon={Type}      title={t('editor.tools.addText')}    onClick={() => editor.addText('body')} />
                <ToolBtn
                  icon={ImagePlus}
                  title={t('editor.tools.addImage')}
                  onClick={() => togglePanel('add')}
                  active={activePanel === 'add'}
                />
                {/* Shape with flyout */}
                <div className="relative">
                  <ToolBtn
                    icon={Square}
                    title={t('editor.tools.addShape')}
                    onClick={() => setShapeOpen((o) => !o)}
                    active={shapeOpen}
                  />
                  {shapeOpen && <ShapeFlyout onClose={() => setShapeOpen(false)} />}
                </div>
                <ToolBtn icon={QrCode} title={t('editor.tools.addQr')} onClick={() => setQrOpen(true)} />
                {/* Background with pulse dot */}
                <div className="relative">
                  <ToolBtn
                    icon={ImageIcon}
                    title={t('assets.backgroundTab')}
                    onClick={() => togglePanel('background')}
                    active={activePanel === 'background'}
                  />
                  {!hasBackground && (
                    <span className="pointer-events-none absolute right-0.5 top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-gaia-500" />
                  )}
                </div>
              </div>
            </div>

            <GridSep />

            {/* G3: Arrange */}
            <div className="px-1 py-1">
              <div className="grid grid-cols-3 gap-0.5">
                <ToolBtn icon={MoveUp}                       title={t('editor.bringForward')}       disabled={!has} onClick={() => editor.stack('forward')} />
                <ToolBtn icon={MoveDown}                     title={t('editor.sendBackward')}        disabled={!has} onClick={() => editor.stack('backward')} />
                <ToolBtn icon={ChevronsUp}                   title={t('editor.tools.bringToFront')} disabled={!has} onClick={() => editor.stack('front')} />
                <ToolBtn icon={ChevronsDown}                 title={t('editor.tools.sendToBack')}   disabled={!has} onClick={() => editor.stack('back')} />
                <ToolBtn icon={AlignHorizontalJustifyCenter} title={t('editor.alignCenterH')}       disabled={!has} onClick={() => editor.align('centerH')} />
                <ToolBtn icon={AlignVerticalJustifyCenter}   title={t('editor.alignCenterV')}       disabled={!has} onClick={() => editor.align('centerV')} />
              </div>
            </div>

            <GridSep />

            {/* G4: Object Actions */}
            <div className="px-1 py-1">
              <div className="grid grid-cols-3 gap-0.5">
                <ToolBtn icon={Copy}    title={t('editor.duplicate')} disabled={!has}    onClick={() => void editor.duplicateSelected()} />
                <ToolBtn icon={Group}   title={t('editor.group')}     disabled={!isMulti} onClick={() => editor.group()} />
                <ToolBtn icon={Ungroup} title={t('editor.ungroup')}   disabled={!isGroup} onClick={() => editor.ungroup()} />
                <ToolBtn icon={Trash2}  title={t('editor.delete')}    disabled={!has} danger onClick={() => editor.deleteSelected()} />
                <EmptyCell />
                <EmptyCell />
              </div>
            </div>

            <GridSep />

            {/* G5: View */}
            <div className="px-1 py-1">
              <div className="grid grid-cols-3 gap-0.5">
                <ToolBtn icon={Magnet}       title={t('editor.toggleGuides')}            active={guidesEnabled}            onClick={() => editor.setGuidesEnabled(!guidesEnabled)} />
                <ToolBtn icon={SquareDashed} title={t('editor.toggleBleed')}             active={overlayVis}               onClick={() => editor.setOverlayVisible(!overlayVis)} />
                <ToolBtn icon={Eye}          title={t('editor.toggleLegibilityOverlay')} active={legibilityOverlayVisible} onClick={() => editor.toggleLegibilityOverlay()} />
                <ToolBtn icon={ZoomOut}   title={t('editor.zoomOut')} onClick={() => useEditorStore.getState().set({ zoom: clamp(zoom / 1.2, 0.05, 3) })} />
                <ToolBtn icon={ZoomIn}    title={t('editor.zoomIn')}  onClick={() => useEditorStore.getState().set({ zoom: clamp(zoom * 1.2, 0.05, 3) })} />
                <ToolBtn icon={Maximize2} title={t('editor.fit')}     onClick={() => requestCanvasFit()} />
              </div>
            </div>
          </>
        )}

        {/* ── Bottom controls ───────────────────────────────────────────────── */}
        <div className="mt-auto flex flex-col gap-0.5 px-1 pb-1 pt-2">
          <GridSep />
          {/* Simple / Full toggle */}
          <button
            title={simpleMode ? t('editor.tools.fullMode') : t('editor.tools.simpleMode')}
            onClick={() => setSimpleMode((s) => !s)}
            className={`flex w-full items-center justify-center gap-1 rounded px-1 py-1.5 text-[10px] font-medium transition
              ${simpleMode ? 'bg-gaia-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            {simpleMode ? 'Full' : 'Simple'}
          </button>
          {/* Float toolbar */}
          <button
            title={t('editor.tools.floatToolbar')}
            onClick={() => setFloating(true)}
            className="flex w-full items-center justify-center gap-1 rounded px-1 py-1.5 text-[10px] font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
          >
            <ChevronRight className="h-3 w-3" />
            Float
          </button>
        </div>
      </div>

      {/* ── Slide-out panel ────────────────────────────────────────────────────── */}
      {activePanel && (
        <div className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">

          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
            <span className="text-xs font-semibold text-slate-700">
              {activePanel === 'add' ? t('add.title') : t('assets.backgroundTitle')}
            </span>
            <button
              aria-label={t('common.close')}
              onClick={() => setActivePanel(null)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Panel content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activePanel === 'add' ? (
              <AddPanel />
            ) : (
              <>
                {!hasBackground && (
                  <p className="border-b border-gaia-100 bg-gaia-50 px-3 py-2 text-[11px] text-gaia-600">
                    {t('assets.backgroundHint')}
                  </p>
                )}
                <AssetsDrawer
                  activeTab={activeAssetTab}
                  onTabChange={setActiveAssetTab}
                  asBackground
                />
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
