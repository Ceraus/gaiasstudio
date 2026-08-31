import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '@/store/useEditorStore';
import { editor } from '@/lib/fabric/editorController';
import FontPicker from '@/components/editor/FontPicker';
import ColorSwatch from '@/components/editor/ColorSwatch';
import QrCodeModal from './QrCodeModal';
import type { PendingShapeKind } from '@/lib/editorTools';

import {
  Type,
  Image as ImageIcon,
  Shapes,
  QrCode,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Bold,
  Italic,
  Underline,
  Crop,
  RefreshCw,
  FolderOpen,
  Images,
  Square,
  Circle,
  Triangle,
  Minus,
  Star,
  Hexagon,
  ArrowRight,
  FlipHorizontal2,
  FlipVertical2,
  Check,
} from 'lucide-react';

type CircleSide = 'top' | 'bottom' | 'left' | 'right';
type CurveMenu = 'circle' | 'wave' | null;

function arcForSide(side: CircleSide) {
  // Circle r=10 at (16,16). Short outside arc on the chosen side.
  switch (side) {
    case 'right':
      return 'M 24.7 9.3 A 10 10 0 0 1 24.7 22.7';
    case 'left':
      return 'M 7.3 9.3 A 10 10 0 0 0 7.3 22.7';
    case 'bottom':
      return 'M 9.3 24.7 A 10 10 0 0 0 22.7 24.7';
    case 'top':
    default:
      return 'M 9.3 7.3 A 10 10 0 0 1 22.7 7.3';
  }
}

function CurveCircleIcon({ side = 'top', className }: { side?: CircleSide; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
      <path d={arcForSide(side)} stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function CurveWaveIcon({ down = false, className }: { down?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <path
        d={down ? 'M 4 11 Q 16 26 28 11' : 'M 4 22 Q 16 7 28 22'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <text
        x="16"
        y={down ? 15 : 20}
        textAnchor="middle"
        fill="currentColor"
        fontSize="8"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
      >
        abc
      </text>
    </svg>
  );
}

function CornerTriangle() {
  return (
    <span
      className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-b-[8px] border-l-[8px] border-b-slate-500 border-l-transparent"
      aria-hidden
    />
  );
}

/** Label outline with a centered object — not text-align / hamburger bars. */
function CenterOnLabelIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
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

/** Shared muted section fills so Text / Image / Shape / QR use one system. */
type SectionTint = 'add' | 'type' | 'align' | 'slider' | 'peach' | 'rose';

const SECTION_TINT: Record<SectionTint, string> = {
  add: 'rounded-xl border border-teal-200 bg-teal-100 p-3',
  type: 'rounded-xl border border-green-200 bg-green-100 p-3',
  align: 'rounded-xl border border-violet-200 bg-violet-100 p-3',
  slider: 'rounded-xl border border-sky-200 bg-sky-100 p-3',
  peach: 'rounded-xl border border-orange-200 bg-orange-100 p-3',
  rose: 'rounded-xl border border-rose-200 bg-rose-100 p-3',
};

function SectionCard({
  tint,
  className = '',
  children,
}: {
  tint: SectionTint;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`${SECTION_TINT[tint]} shrink-0 ${className}`}>{children}</div>;
}

type Tab = 'text' | 'image' | 'shape' | 'codes';
type FileIntent = 'add' | 'replace';

interface Props {
  onOpenBackgroundChooser: () => void;
}

export default function LeftSidebarV2({ onOpenBackgroundChooser }: Props) {
  const { t } = useTranslation();
  const selection = useEditorStore((s) => s.selection);
  const cropMode = useEditorStore((s) => s.cropMode);
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [showQrModal, setShowQrModal] = useState(false);
  const [units, setUnits] = useState<'inch' | 'mm'>('inch');
  const [curveMenu, setCurveMenu] = useState<CurveMenu>(null);
  const curveMenuRef = useRef<HTMLDivElement>(null);
  const fileIntent = useRef<FileIntent>('add');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    editor.registerImageFilePicker(() => {
      fileIntent.current = 'add';
      fileRef.current?.click();
    });
    return () => editor.registerImageFilePicker(() => {});
  }, []);

  useEffect(() => {
    if (selection?.isText) setActiveTab('text');
    else if (selection?.isQr) setActiveTab('codes');
    else if (selection?.isImage) setActiveTab('image');
    else if (selection?.isShape) setActiveTab('shape');
  }, [selection]);

  useEffect(() => {
    if (!curveMenu) return;
    const onDoc = (event: MouseEvent) => {
      if (curveMenuRef.current && !curveMenuRef.current.contains(event.target as Node)) {
        setCurveMenu(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [curveMenu]);

  const pickFile = (intent: FileIntent) => {
    fileIntent.current = intent;
    fileRef.current?.click();
  };

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const done = () => URL.revokeObjectURL(url);
    if (fileIntent.current === 'replace') {
      void editor.replaceSelectedImage(url, file.name).then(done);
    } else {
      void editor.addImageFromUrl(url, 'image', file.name).then(done);
    }
  };

  const toDisplay = (inches: number) => (units === 'mm' ? inches * 25.4 : inches);
  const fromDisplay = (value: number) => (units === 'mm' ? value / 25.4 : value);

  const setSize = (axis: 'w' | 'h', raw: string) => {
    const next = Number(raw);
    if (!Number.isFinite(next) || !selection) return;
    const inches = fromDisplay(next);
    if (axis === 'w') editor.setSelectedSizeIn(inches, selection.lockAspect ? inches * (selection.heightIn / Math.max(selection.widthIn, 0.01)) : selection.heightIn);
    else editor.setSelectedSizeIn(selection.lockAspect ? inches * (selection.widthIn / Math.max(selection.heightIn, 0.01)) : selection.widthIn, inches);
  };

  const ToolButton = ({ icon: Icon, label, tab }: { icon: React.ElementType; label: string; tab: Tab }) => {
    const isActive = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => {
          setActiveTab(tab);
          if (tab === 'text') editor.setActiveTool('text');
          if (tab === 'image') editor.setActiveTool('image');
          if (tab === 'shape') editor.setActiveTool('shape');
          if (tab === 'codes') editor.setActiveTool('codes');
        }}
        className={`flex w-full flex-col items-center justify-center gap-1.5 py-4 transition-colors ${
          isActive ? 'bg-[#f4f5f7] text-[#2a303c]' : 'text-slate-400 hover:bg-[#343b47] hover:text-white'
        }`}
      >
        <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.5} />
        <span className="px-1 text-center text-[10px] font-medium leading-tight">{label}</span>
      </button>
    );
  };

  const CaptionButton = ({
    icon: Icon,
    label,
    onClick,
    active,
    disabled,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded px-0.5 py-1 text-[#1e293b] ${
        disabled ? 'cursor-not-allowed opacity-40' : active ? 'bg-[#e2e8f0]' : 'hover:bg-slate-200'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="max-w-full text-center text-[8px] font-semibold leading-tight">{label}</span>
    </button>
  );

  const AlignCaptionButton = ({
    icon: Icon,
    label,
    onClick,
    active,
    disabled,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex min-h-[3.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded px-1 py-2 text-[#1e293b] ${
        disabled ? 'cursor-not-allowed opacity-40' : active ? 'bg-[#e2e8f0]' : 'hover:bg-slate-200'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
      <span className="max-w-[5.5rem] text-center text-[9px] font-semibold leading-tight">{label}</span>
    </button>
  );

  const renderAlignmentSection = (opts?: { showTextAlign?: boolean }) => {
    const showTextAlign = opts?.showTextAlign ?? false;
    const noSelection = (selection?.count ?? 0) === 0;
    return (
      <div
        data-alignment-section
        className={`${SECTION_TINT.align} flex shrink-0 flex-col items-stretch gap-3`}
      >
        <label className="shrink-0 text-center text-[10px] font-bold uppercase tracking-wider text-[#0f2e53]">
          {t('editor.alignmentPosition')}
        </label>

        {showTextAlign && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="w-full shrink-0 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t('add.text')}
            </p>
            <div className="flex w-full items-stretch justify-center gap-1.5">
              <AlignCaptionButton icon={AlignLeft} label={t('editor.alignTextLeft')} active={selection?.textAlign === 'left'} onClick={() => void editor.setActiveProps({ textAlign: 'left' })} />
              <AlignCaptionButton icon={AlignCenter} label={t('editor.alignTextCenter')} active={selection?.textAlign === 'center'} onClick={() => void editor.setActiveProps({ textAlign: 'center' })} />
              <AlignCaptionButton icon={AlignRight} label={t('editor.alignTextRight')} active={selection?.textAlign === 'right'} onClick={() => void editor.setActiveProps({ textAlign: 'right' })} />
            </div>
          </div>
        )}

        <div className={`flex flex-col items-center gap-2 ${noSelection ? 'pointer-events-none opacity-40' : ''}`}>
          <p className="w-full shrink-0 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t('editor.alignOnLabel')}
          </p>
          <div className="flex w-full items-stretch justify-center gap-1.5">
            <AlignCaptionButton icon={AlignCenterVertical} label={t('editor.alignCenterH')} onClick={() => editor.align('centerH')} />
            <AlignCaptionButton icon={AlignCenterHorizontal} label={t('editor.alignCenterV')} onClick={() => editor.align('centerV')} />
            <AlignCaptionButton icon={CenterOnLabelIcon} label={t('editor.centerOnLabel')} onClick={() => editor.centerSelected()} />
          </div>
          <div className="flex w-full items-stretch justify-center gap-1.5">
            <AlignCaptionButton icon={AlignStartVertical} label={t('editor.alignLeft')} onClick={() => editor.align('left')} />
            <AlignCaptionButton icon={AlignEndVertical} label={t('editor.alignRight')} onClick={() => editor.align('right')} />
            <AlignCaptionButton icon={AlignStartHorizontal} label={t('editor.alignTop')} onClick={() => editor.align('top')} />
            <AlignCaptionButton icon={AlignEndHorizontal} label={t('editor.alignBottom')} onClick={() => editor.align('bottom')} />
          </div>
        </div>
      </div>
    );
  };

  const PillButton = ({
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
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-full border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold text-[#1e293b] shadow-sm transition-all ${
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-50'
      }`}
    >
      <Icon className="h-4 w-4 text-[#0f2e53]" />
      {label}
    </button>
  );

  const renderTextTab = () => (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 [scrollbar-gutter:stable]">
      <SectionCard tint="add" className="space-y-3">
        <PillButton icon={Type} label={t('editor.addTextBox')} onClick={() => editor.addText('body')} />
        <PillButton
          icon={RefreshCw}
          label={t('editor.addCurvedText')}
          onClick={() => {
            editor.addText('heading');
            editor.setTextCurveStyle({ mode: 'circle', side: 'top' });
          }}
        />
      </SectionCard>

      <div className={`flex flex-col gap-3 pb-3 ${!selection?.isText ? 'pointer-events-none opacity-40' : ''}`}>
        <SectionCard tint="type" className="flex flex-col gap-5">
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <FontPicker value={selection?.fontFamily || 'Arial'} loading={selection?.fontLoading} onChange={(f) => void editor.setActiveProps({ fontFamily: f })} />
            </div>
            <div className="flex w-20 items-center justify-between rounded border border-slate-300 bg-white px-2">
              <input
                type="number"
                value={Math.round(selection?.fontSize || 24)}
                onChange={(e) => void editor.setActiveProps({ fontSize: Number(e.target.value) })}
                className="w-full border-none bg-transparent p-0 text-center text-sm font-medium text-[#1e293b] [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
              />
              <div className="flex flex-col">
                <button type="button" onClick={() => void editor.setActiveProps({ fontSize: (selection?.fontSize || 24) + 1 })} className="leading-none text-slate-400 hover:text-slate-700">▲</button>
                <button type="button" onClick={() => void editor.setActiveProps({ fontSize: Math.max(1, (selection?.fontSize || 24) - 1) })} className="leading-none text-slate-400 hover:text-slate-700">▼</button>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-1 px-0.5 text-[#1e293b]">
            <CaptionButton icon={Bold} label={t('text.bold')} active={selection?.fontWeight === 'bold'} onClick={() => void editor.setActiveProps({ fontWeight: selection?.fontWeight === 'bold' ? 'normal' : 'bold' })} />
            <CaptionButton icon={Italic} label={t('text.italic')} active={!!selection?.italic} onClick={() => void editor.setActiveProps({ fontStyle: selection?.italic ? 'normal' : 'italic' })} />
            <CaptionButton icon={Underline} label={t('text.underline', 'Underline')} active={!!selection?.underline} onClick={() => void editor.setActiveProps({ underline: !selection?.underline })} />
            <div className="flex flex-col items-center gap-0.5 px-0.5">
              <ColorSwatch value={selection?.fill || '#000000'} onChange={async (c) => editor.setActiveProps({ fill: c })} />
              <span className="text-center text-[8px] font-semibold leading-tight">{t('editor.alignTextColor', 'Text Color')}</span>
            </div>
          </div>
        </SectionCard>

        {renderAlignmentSection({ showTextAlign: true })}

        <SectionCard tint="slider">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#0f2e53]">{t('text.lineHeight')}: {selection?.lineHeight?.toFixed(1) || 1.2}</label>
          <input type="range" min="0.5" max="2.5" step="0.1" value={selection?.lineHeight || 1.2} onChange={(e) => void editor.setActiveProps({ lineHeight: Number(e.target.value) })} className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-[#1e60d3]" />
        </SectionCard>

        <SectionCard tint="peach">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#0f2e53]">{t('editor.transparency')}: {Math.round((1 - (selection?.opacity ?? 1)) * 100)}%</label>
          <input type="range" min="0" max="100" step="1" value={Math.round((1 - (selection?.opacity ?? 1)) * 100)} onChange={(e) => void editor.setActiveProps({ opacity: 1 - (Number(e.target.value) / 100) })} className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-[#1e60d3]" />
        </SectionCard>

        <SectionCard tint="rose">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#0f2e53]">
            {t('editor.curvedTextLabel')}:{' '}
            {selection?.curveMode === 'circle' && selection.curve
              ? t(`editor.curveSide.${selection.circleSide ?? 'top'}`)
              : Math.round(selection?.curve || 0)}
          </label>
          <div ref={curveMenuRef} className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <button
                type="button"
                title={t('editor.circlePath')}
                aria-label={t('editor.circlePath')}
                aria-expanded={curveMenu === 'circle'}
                onClick={() => {
                  setCurveMenu((open) => (open === 'circle' ? null : 'circle'));
                  if (!(selection?.curveMode === 'circle' && selection.curve)) {
                    editor.setTextCurveStyle({ mode: 'circle', side: 'top' });
                  }
                }}
                className={`relative flex h-12 w-full items-center justify-center rounded border bg-white ${
                  selection?.curveMode === 'circle' && selection.curve
                    ? 'border-[#1e60d3] bg-[#e8eef9] text-[#0f2e53]'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CurveCircleIcon side={selection?.circleSide ?? 'top'} className="h-8 w-8" />
                <CornerTriangle />
              </button>
              {curveMenu === 'circle' && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-20 grid w-[148px] grid-cols-2 gap-1 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
                  {(['right', 'left', 'top', 'bottom'] as CircleSide[]).map((side) => (
                    <button
                      key={side}
                      type="button"
                      title={t('editor.circleSide', { side: t(`editor.curveSide.${side}`) })}
                      aria-label={t('editor.circleSide', { side: t(`editor.curveSide.${side}`) })}
                      onClick={() => {
                        editor.setTextCurveStyle({ mode: 'circle', side });
                        setCurveMenu(null);
                      }}
                      className={`flex h-11 items-center justify-center rounded ${
                        selection?.curveMode === 'circle' && selection.circleSide === side
                          ? 'bg-[#dbe7fb] text-[#0f2e53]'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <CurveCircleIcon side={side} className="h-8 w-8" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <button
                type="button"
                title={t('editor.waveCurve')}
                aria-label={t('editor.waveCurve')}
                aria-expanded={curveMenu === 'wave'}
                onClick={() => {
                  setCurveMenu((open) => (open === 'wave' ? null : 'wave'));
                  if (!(selection?.curveMode === 'wave' && selection.curve)) {
                    editor.setTextCurveStyle({ mode: 'wave', amount: 50 });
                  }
                }}
                className={`relative flex h-12 w-full items-center justify-center rounded border bg-white ${
                  selection?.curveMode === 'wave' && selection.curve
                    ? 'border-[#1e60d3] bg-[#e8eef9] text-[#0f2e53]'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CurveWaveIcon down={(selection?.curve || 0) < 0} className="h-8 w-8" />
                <CornerTriangle />
              </button>
              {curveMenu === 'wave' && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-20 flex w-[148px] gap-1 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    title={t('editor.waveUp')}
                    aria-label={t('editor.waveUp')}
                    onClick={() => {
                      editor.setTextCurveStyle({ mode: 'wave', amount: 50 });
                      setCurveMenu(null);
                    }}
                    className={`flex h-11 flex-1 items-center justify-center rounded ${
                      selection?.curveMode === 'wave' && (selection?.curve || 0) > 0
                        ? 'bg-[#dbe7fb] text-[#0f2e53]'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CurveWaveIcon className="h-8 w-8" />
                  </button>
                  <button
                    type="button"
                    title={t('editor.waveDown')}
                    aria-label={t('editor.waveDown')}
                    onClick={() => {
                      editor.setTextCurveStyle({ mode: 'wave', amount: -50 });
                      setCurveMenu(null);
                    }}
                    className={`flex h-11 flex-1 items-center justify-center rounded ${
                      selection?.curveMode === 'wave' && (selection?.curve || 0) < 0
                        ? 'bg-[#dbe7fb] text-[#0f2e53]'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CurveWaveIcon down className="h-8 w-8" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={selection?.curveMode === 'circle' ? 0 : selection?.curve || 0}
            onChange={(e) => editor.setTextCurve(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-[#1e60d3]"
            aria-label={t('editor.waveAmount')}
          />
        </SectionCard>
      </div>
    </div>
  );

  const renderImageTab = () => (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 [scrollbar-gutter:stable]">
      <SectionCard tint="add" className="space-y-3">
        <PillButton icon={ImageIcon} label={t('editor.tools.addImage')} onClick={() => pickFile('add')} />
        <PillButton
          icon={FolderOpen}
          label={t('editor.replaceImage')}
          disabled={!selection?.isImage}
          onClick={() => pickFile('replace')}
        />
        <PillButton icon={Images} label={t('assets.setAsBackground')} onClick={onOpenBackgroundChooser} />
      </SectionCard>

      <div className={`flex flex-col gap-3 pb-3 ${!selection?.isImage && !cropMode ? 'pointer-events-none opacity-40' : ''}`}>
        <SectionCard tint="type" className="flex flex-col gap-2">
          {cropMode ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => editor.applyCrop()} className="flex flex-1 items-center justify-center gap-2 rounded border border-[#cbd5e1] py-1.5 text-xs font-bold text-[#1e293b] hover:bg-slate-200">
                <Check className="h-3.5 w-3.5" /> {t('editor.applyCrop')}
              </button>
              <button type="button" onClick={() => editor.cancelCrop()} className="flex flex-1 items-center justify-center rounded border border-[#cbd5e1] py-1.5 text-xs font-bold text-[#1e293b] hover:bg-slate-200">
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => editor.startCrop()} className="flex w-full flex-col items-center justify-center gap-1 rounded border border-[#cbd5e1] bg-transparent py-1.5 text-[10px] font-bold text-[#1e293b] hover:bg-slate-200">
              <Crop className="h-3.5 w-3.5" /> {t('editor.cropImage')}
            </button>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => editor.flip('h')} className="flex flex-1 flex-col items-center justify-center gap-1 rounded border border-[#cbd5e1] py-1.5 text-[10px] font-bold text-[#1e293b] hover:bg-slate-200">
              <FlipHorizontal2 className="h-3.5 w-3.5" /> {t('editor.flipH')}
            </button>
            <button type="button" onClick={() => editor.flip('v')} className="flex flex-1 flex-col items-center justify-center gap-1 rounded border border-[#cbd5e1] py-1.5 text-[10px] font-bold text-[#1e293b] hover:bg-slate-200">
              <FlipVertical2 className="h-3.5 w-3.5" /> {t('editor.flipV')}
            </button>
          </div>
        </SectionCard>

        {renderAlignmentSection()}

        <SectionCard tint="slider">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#0f2e53]">{t('editor.transparency')}: {Math.round((1 - (selection?.opacity ?? 1)) * 100)}%</label>
          <input type="range" min="0" max="100" step="1" value={Math.round((1 - (selection?.opacity ?? 1)) * 100)} onChange={(e) => void editor.setActiveProps({ opacity: 1 - (Number(e.target.value) / 100) })} className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-[#1e60d3]" />
        </SectionCard>

        <SectionCard tint="rose" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#0f2e53]">{t('editor.changeColor')}</span>
            <ColorSwatch
              value={selection?.adjust?.tint || '#7c3aed'}
              onChange={async (color) => editor.setImageAdjust({ tint: color })}
            />
          </div>
          <button type="button" onClick={() => editor.resetImageAdjust()} className="w-full rounded border border-[#cbd5e1] py-1.5 text-xs font-bold text-[#1e293b] hover:bg-slate-200">
            {t('editor.removeColor')}
          </button>
        </SectionCard>

        <SectionCard tint="peach">
          <div className="mb-2 flex rounded-full bg-slate-200 p-0.5">
            <button type="button" onClick={() => setUnits('inch')} className={`flex-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${units === 'inch' ? 'bg-[#1e60d3] text-white' : 'text-slate-500'}`}>inch</button>
            <button type="button" onClick={() => setUnits('mm')} className={`flex-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${units === 'mm' ? 'bg-[#1e60d3] text-white' : 'text-slate-500'}`}>mm</button>
          </div>
          <div className="mt-2 flex gap-2">
            <label className="flex-1 text-[10px] font-bold uppercase text-[#0f2e53]">
              {t('panels.width')}:
              <input type="number" step="0.01" value={toDisplay(selection?.widthIn || 0).toFixed(2)} onChange={(e) => setSize('w', e.target.value)} className="mt-1 w-full rounded border border-[#cbd5e1] p-1.5 text-xs text-[#1e293b]" />
            </label>
            <label className="flex-1 text-[10px] font-bold uppercase text-[#0f2e53]">
              {t('panels.height')}:
              <input type="number" step="0.01" value={toDisplay(selection?.heightIn || 0).toFixed(2)} onChange={(e) => setSize('h', e.target.value)} className="mt-1 w-full rounded border border-[#cbd5e1] p-1.5 text-xs text-[#1e293b]" />
            </label>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={!!selection?.lockAspect} onChange={() => editor.toggleLockAspect()} className="rounded text-[#1e60d3] focus:ring-[#1e60d3]" />
            {t('editor.lockAspectRatio')}
          </label>
        </SectionCard>
      </div>
    </div>
  );

  const renderShapeTab = () => {
    const shapes: { kind: PendingShapeKind; icon: React.ElementType; label: string }[] = [
      { kind: 'rect', icon: Square, label: t('add.rect') },
      { kind: 'circle', icon: Circle, label: t('add.circle') },
      { kind: 'triangle', icon: Triangle, label: t('add.triangle') },
      { kind: 'line', icon: Minus, label: t('add.line') },
      { kind: 'roundRect', icon: Square, label: t('add.roundRect') },
      { kind: 'star', icon: Star, label: t('add.star') },
      { kind: 'arrow', icon: ArrowRight, label: t('add.arrow') },
      { kind: 'hexagon', icon: Hexagon, label: t('add.hexagon') },
    ];
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 [scrollbar-gutter:stable]">
        <SectionCard tint="add" className="grid grid-cols-2 gap-2">
          {shapes.map(({ kind, icon: Icon, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                useEditorStore.getState().set({ pendingShape: kind });
                editor.addShape(kind);
              }}
              className="flex flex-col items-center gap-1 rounded-xl border border-[#cbd5e1] bg-white px-2 py-3 text-xs font-bold text-[#1e293b] hover:bg-slate-50"
            >
              <Icon className="h-5 w-5 text-[#0f2e53]" />
              {label}
            </button>
          ))}
        </SectionCard>

        <div className={`flex flex-col gap-3 pb-3 ${!selection?.isShape ? 'pointer-events-none opacity-40' : ''}`}>
          <SectionCard tint="type" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase text-[#0f2e53]">{t('panels.fill')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!selection?.fill}
                  onChange={() => void editor.setActiveProps(selection?.fill ? { fill: '' } : { fill: '#a7c4a0' })}
                  className="rounded text-[#1e60d3]"
                />
                <ColorSwatch value={selection?.fill || '#a7c4a0'} onChange={async (c) => editor.setActiveProps({ fill: c })} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase text-[#0f2e53]">{t('panels.stroke')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!selection?.stroke}
                  onChange={() => void editor.setActiveProps(selection?.stroke ? { stroke: '', strokeWidth: 0 } : { stroke: '#000000', strokeWidth: 2 })}
                  className="rounded text-[#1e60d3]"
                />
                <ColorSwatch value={selection?.stroke || '#000000'} onChange={async (c) => editor.setActiveProps({ stroke: c, strokeWidth: Math.max(selection?.strokeWidth || 0, 2) })} />
              </div>
            </div>
          </SectionCard>

          {renderAlignmentSection()}

          <SectionCard tint="slider">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#0f2e53]">{t('editor.transparency')}: {Math.round((1 - (selection?.opacity ?? 1)) * 100)}%</label>
            <input type="range" min="0" max="100" step="1" value={Math.round((1 - (selection?.opacity ?? 1)) * 100)} onChange={(e) => void editor.setActiveProps({ opacity: 1 - (Number(e.target.value) / 100) })} className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-[#1e60d3]" />
          </SectionCard>

          <SectionCard tint="peach" className="flex gap-2">
            <label className="flex-1 text-[10px] font-bold uppercase text-[#0f2e53]">
              {t('panels.width')}:
              <input type="number" step="0.01" value={toDisplay(selection?.widthIn || 0).toFixed(2)} onChange={(e) => setSize('w', e.target.value)} className="mt-1 w-full rounded border border-[#cbd5e1] p-1.5 text-xs text-[#1e293b]" />
            </label>
            <label className="flex-1 text-[10px] font-bold uppercase text-[#0f2e53]">
              {t('panels.height')}:
              <input type="number" step="0.01" value={toDisplay(selection?.heightIn || 0).toFixed(2)} onChange={(e) => setSize('h', e.target.value)} className="mt-1 w-full rounded border border-[#cbd5e1] p-1.5 text-xs text-[#1e293b]" />
            </label>
          </SectionCard>
        </div>
      </div>
    );
  };

  const renderCodesTab = () => (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 [scrollbar-gutter:stable]">
      <SectionCard tint="add">
        <PillButton icon={QrCode} label={selection?.isQr ? t('editor.tools.editQr') : t('editor.tools.addQr')} onClick={() => setShowQrModal(true)} />
      </SectionCard>
      {renderAlignmentSection()}
    </div>
  );

  return (
    <div className="flex h-full shrink-0">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="z-10 flex w-[72px] shrink-0 flex-col items-center bg-[#2a303c] py-2 shadow-[2px_0_10px_rgba(0,0,0,0.1)]">
        <ToolButton icon={Type} label={t('editor.tabText')} tab="text" />
        <ToolButton icon={ImageIcon} label={t('editor.tabImage')} tab="image" />
        <ToolButton icon={Shapes} label={t('editor.tabShape')} tab="shape" />
        <ToolButton icon={QrCode} label={t('editor.tabCodes')} tab="codes" />
      </div>

      <div className="z-0 flex h-full min-h-0 w-[364px] flex-col overflow-hidden border-r border-slate-300 bg-[#f4f5f7]">
        {activeTab === 'text' && renderTextTab()}
        {activeTab === 'image' && renderImageTab()}
        {activeTab === 'shape' && renderShapeTab()}
        {activeTab === 'codes' && renderCodesTab()}
      </div>

      {showQrModal && <QrCodeModal open={true} onClose={() => setShowQrModal(false)} />}
    </div>
  );
}
