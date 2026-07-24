/**
 * Canva-style context toolbar.
 *
 * Layout:
 *   [LEFT: context controls — change based on selection type]
 *   [RIGHT: common controls — always visible when something is selected]
 *   [FAR RIGHT: global controls — undo/redo, guides, bleed overlay]
 *
 * Text selected  → FontPicker | Size ±  | B I U S | ColorSwatch | Align | ··· (spacing/curve popover)
 * Image selected → Crop | Flip H/V | Opacity
 * Shape selected → Fill swatch | Stroke swatch | StrokeWidth | CornerRadius | Opacity
 * Nothing        → hint text
 *
 * Right cluster (when anything selected):
 *   Opacity% | LayerOrder | Duplicate | Trash | Align strip | Group/Ungroup
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Crop,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Italic,
  Magnet,
  Minus,
  MoveDown,
  MoveUp,
  Paintbrush,
  Plus,
  Redo2,
  Ruler,
  SquareDashed,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Ungroup,
} from 'lucide-react';
import * as fabric from 'fabric';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';
import { useAppStore } from '@/store/useAppStore';
import { ptToPx, pxToPt } from '@/lib/units';
import ColorSwatch from './ColorSwatch';
import FontPicker from './FontPicker';

// ── helpers ───────────────────────────────────────────────────────────────────
function Sep() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />;
}

function Btn({
  icon: Icon,
  title,
  onClick,
  active = false,
  disabled = false,
  danger = false,
  className = '',
}: {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition
        disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-gaia-100 text-gaia-700' : danger ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100'}
        ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** A popover anchored to its trigger. */
function Popover({
  trigger,
  children,
}: {
  trigger: (open: boolean, toggle: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={rootRef}
      onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Opacity number input ──────────────────────────────────────────────────────
function OpacityInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(() => String(Math.round(value * 100)));
  // Sync draft when a different object is selected
  useEffect(() => { setDraft(String(Math.round(value * 100))); }, [value]);
  return (
    <div className="flex h-8 items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs">
      <input
        type="number"
        min={0}
        max={100}
        className="w-12 border-0 bg-transparent px-1.5 py-0 text-center text-xs text-slate-700 outline-none"
        value={draft}
        onChange={(e) => { setDraft(e.target.value); const n = Number(e.target.value); if (n >= 0 && n <= 100) onChange(n / 100); }}
        onBlur={() => setDraft(String(Math.round(value * 100)))}
        onFocus={(e) => e.target.select()}
      />
      <span className="pr-1.5 text-slate-400">%</span>
    </div>
  );
}

// ── Font size stepper ─────────────────────────────────────────────────────────
function FontSizeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(() => String(Math.round(pxToPt(value))));
  // Sync draft when a different object is selected
  useEffect(() => { setDraft(String(Math.round(pxToPt(value)))); }, [value]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 4 && n <= 400) onChange(ptToPx(n));
    else setDraft(String(Math.round(pxToPt(value))));
  };

  const step = (delta: number) => {
    const cur = Math.round(pxToPt(value));
    const next = Math.max(4, Math.min(400, cur + delta));
    onChange(ptToPx(next));
    setDraft(String(next));
  };

  return (
    <div className="flex h-8 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button className="flex h-full w-6 items-center justify-center text-slate-500 hover:bg-slate-100"
        onClick={() => step(-1)}><Minus className="h-3 w-3" /></button>
      <input
        type="number"
        min={4} max={400}
        className="w-10 border-0 bg-transparent py-0 text-center text-xs text-slate-700 outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(draft); if (e.key === 'ArrowUp') step(1); if (e.key === 'ArrowDown') step(-1); }}
        onFocus={(e) => e.target.select()}
      />
      <button className="flex h-full w-6 items-center justify-center text-slate-500 hover:bg-slate-100"
        onClick={() => step(1)}><Plus className="h-3 w-3" /></button>
    </div>
  );
}

// ── Text spacing / curve popover ──────────────────────────────────────────────
function TextAdvancedPopover() {
  const sel = useEditorStore((s) => s.selection);
  if (!sel?.isText) return null;
  const set = (patch: Record<string, unknown>) => void editor.setActiveProps(patch);

  return (
    <Popover
      trigger={(open, toggle) => (
        <button
          onClick={toggle}
          title="Text spacing & effects"
          className={`flex h-8 items-center gap-0.5 rounded-lg px-1.5 text-xs text-slate-500 transition hover:bg-slate-100 ${open ? 'bg-slate-100' : ''}`}
        >
          Spacing <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    >
      <div className="space-y-3 text-xs">
        <SliderRow
          label="Line height"
          value={sel.lineHeight}
          min={0.7} max={2.5} step={0.05}
          format={(v) => v.toFixed(1)}
          onChange={(v) => set({ lineHeight: v })}
        />
        <SliderRow
          label="Letter spacing"
          value={sel.charSpacing}
          min={-100} max={800} step={10}
          format={(v) => String(Math.round(v))}
          onChange={(v) => set({ charSpacing: v })}
        />
        <SliderRow
          label="Curve"
          value={sel.curve ?? 0}
          min={-100} max={100} step={1}
          format={(v) => String(Math.round(v))}
          onChange={(v) => void editor.setTextCurve(v)}
        />
      </div>
    </Popover>
  );
}

function SliderRow({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-slate-700">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step}
        className="w-full accent-gaia-600" value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

// ── Text align popover ────────────────────────────────────────────────────────
function TextAlignGroup({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  const aligns = [
    { v: 'left', Icon: AlignLeft, label: 'Align left' },
    { v: 'center', Icon: AlignCenter, label: 'Align center' },
    { v: 'right', Icon: AlignRight, label: 'Align right' },
  ] as const;

  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200">
      {aligns.map(({ v, Icon, label }) => (
        <button
          key={v}
          title={label}
          aria-label={label}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex h-8 w-8 items-center justify-center text-sm transition ${
            value === v ? 'bg-gaia-100 text-gaia-700' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

// ── Text case dropdown ────────────────────────────────────────────────────────
/** Apply a text-case transform by mutating `text` and storing the original. */
function applyTextCase(caseVal: string) {
  const canvas = editor.canvas;
  if (!canvas) return;
  canvas.getActiveObjects().forEach((o) => {
    const tb = o as fabric.FabricObject & { text?: string; gaiaTextCase?: string; gaiaOriginalText?: string };
    if (tb.type !== 'textbox' && tb.type !== 'i-text' && tb.type !== 'text') return;
    const current = tb.text ?? '';
    // Capture original before first transform
    const original = tb.gaiaOriginalText ?? current;
    let next = original;
    if (caseVal === 'uppercase') next = original.toUpperCase();
    else if (caseVal === 'lowercase') next = original.toLowerCase();
    else if (caseVal === 'capitalize') next = original.replace(/\b\w/g, (c) => c.toUpperCase());
    tb.gaiaOriginalText = original;
    tb.gaiaTextCase = caseVal;
    tb.set({ text: next } as Partial<fabric.FabricObject>);
  });
  canvas.requestRenderAll();
  (editor as unknown as { onChanged?: () => void }).onChanged?.();
  (editor as unknown as { syncSelection?: () => void }).syncSelection?.();
}

/** TextCaseBtn — mutates text content directly so it renders & exports correctly. */
function TextCaseBtn({ value }: { value: string }) {
  const cases = [
    { v: 'none',       label: 'Aa  Original'  },
    { v: 'uppercase',  label: 'AA  Uppercase'  },
    { v: 'lowercase',  label: 'aa  Lowercase'  },
    { v: 'capitalize', label: 'Aa  Title case' },
  ];
  const isActive = value !== 'none' && !!value;
  return (
    <Popover
      trigger={(open, toggle) => (
        <button
          onClick={toggle}
          title="Text case"
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition hover:bg-slate-100 ${open || isActive ? 'bg-gaia-100 text-gaia-700' : 'text-slate-500'}`}
        >
          Aa
        </button>
      )}
    >
      <div className="space-y-0.5">
        {cases.map((c) => (
          <button
            key={c.v}
            onClick={() => applyTextCase(c.v)}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-gaia-50 ${value === c.v ? 'text-gaia-700 font-semibold' : 'text-slate-700'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </Popover>
  );
}

// ── Align strip popover (for multi-select) ────────────────────────────────────
function AlignPopover({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const aligns: { fn: Parameters<typeof editor.align>[0]; Icon: React.ElementType; label: string }[] = [
    { fn: 'left',    Icon: AlignHorizontalJustifyStart,  label: t('editor.alignLeft')    },
    { fn: 'centerH', Icon: AlignHorizontalJustifyCenter, label: t('editor.alignCenterH') },
    { fn: 'right',   Icon: AlignHorizontalJustifyEnd,    label: t('editor.alignRight')   },
    { fn: 'top',     Icon: AlignVerticalJustifyStart,    label: t('editor.alignTop')     },
    { fn: 'centerV', Icon: AlignVerticalJustifyCenter,   label: t('editor.alignCenterV') },
    { fn: 'bottom',  Icon: AlignVerticalJustifyEnd,      label: t('editor.alignBottom')  },
  ];

  return (
    <Popover
      trigger={(open, toggle) => (
        <button
          disabled={disabled}
          onClick={toggle}
          title="Align"
          className={`flex h-8 items-center gap-0.5 rounded-lg px-1.5 text-xs text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 ${open ? 'bg-slate-100' : ''}`}
        >
          <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
          <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    >
      <div className="grid grid-cols-3 gap-1">
        {aligns.map(({ fn, Icon, label }) => (
          <button key={fn} title={label} onClick={() => editor.align(fn)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-gaia-50">
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </Popover>
  );
}

// ── Stroke width mini-input ───────────────────────────────────────────────────
function StrokeWidthInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex h-8 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
      <input
        type="number" min={0} max={40}
        className="w-12 border-0 bg-transparent px-1.5 py-0 text-center text-xs text-slate-700 outline-none"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={(e) => e.target.select()}
      />
      <span className="pr-1.5 text-[10px] text-slate-400">px</span>
    </div>
  );
}

// ── MAIN TOOLBAR ──────────────────────────────────────────────────────────────
export default function Toolbar() {
  const { t } = useTranslation();
  const sel            = useEditorStore((s) => s.selection);
  const canUndo        = useEditorStore((s) => s.canUndo);
  const canRedo        = useEditorStore((s) => s.canRedo);
  const overlayVis              = useEditorStore((s) => s.overlayVisible);
  const guidesEnabled           = useEditorStore((s) => s.guidesEnabled);
  const legibilityOverlayVisible = useEditorStore((s) => s.legibilityOverlayVisible);
  const rulerVisible            = useEditorStore((s) => s.rulerVisible);
  const hasStyleCopied          = useEditorStore((s) => s.hasStyleCopied);
  const brandColors    = useAppStore((s) => s.settings.brandColors);

  const has     = !!sel;
  const isText  = !!sel?.isText;
  const isImage = !!sel?.isImage;
  const isShape = !!sel?.isShape;
  const isMulti = (sel?.count ?? 0) > 1;
  const isGroup = !!sel?.isGroup;

  const set = (patch: Record<string, unknown>) => void editor.setActiveProps(patch);

  return (
    <div className="no-scrollbar flex min-h-[44px] items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1">

      {/* ── TEXT CONTEXT ───────────────────────────────────────────────── */}
      {isText && (
        <>
          <FontPicker
            value={sel.fontFamily}
            loading={sel.fontLoading}
            onChange={(f) => set({ fontFamily: f })}
          />
          <div className="w-2" />
          <FontSizeInput
            value={sel.fontSize}
            onChange={(v) => set({ fontSize: v })}
          />
          <Sep />
          {/* Text colour */}
          <ColorSwatch
            size="sm"
            label="Color"
            value={/^#/.test(sel.fill) ? sel.fill : '#2b2b2b'}
            onChange={(c) => set({ fill: c })}
            brandColors={brandColors}
          />
          <Sep />
          {/* B / I / U / S toggles */}
          <Btn icon={Bold}          title={t('text.bold')}          active={sel.bold}          onClick={() => set({ fontWeight: sel.bold ? 'normal' : 'bold' })} />
          <Btn icon={Italic}        title={t('text.italic')}        active={sel.italic}        onClick={() => set({ fontStyle: sel.italic ? 'normal' : 'italic' })} />
          <Btn icon={Underline}     title={t('text.underline')}     active={sel.underline}     onClick={() => set({ underline: !sel.underline })} />
          <Btn icon={Strikethrough} title={t('text.strikethrough', 'Strikethrough')} active={sel.linethrough} onClick={() => set({ linethrough: !sel.linethrough })} />
          <Sep />
          {/* Alignment */}
          <TextAlignGroup value={sel.textAlign} onChange={(a) => set({ textAlign: a })} />
          <Sep />
          {/* Text case — implemented via CSS text-transform on the canvas element (visual only) */}
          <TextCaseBtn value={sel.textTransform} />
          {/* Spacing / curve popover */}
          <TextAdvancedPopover />
          <Sep />
        </>
      )}

      {/* ── IMAGE CONTEXT ──────────────────────────────────────────────── */}
      {isImage && (
        <>
          <button className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition hover:border-gaia-400 hover:bg-gaia-50"
            onClick={() => editor.startCrop()}>
            <Crop className="h-3.5 w-3.5" /> {t('editor.crop')}
          </button>
          <Btn icon={FlipHorizontal2} title={t('editor.flipH')} onClick={() => editor.flip('h')} />
          <Btn icon={FlipVertical2}   title={t('editor.flipV')} onClick={() => editor.flip('v')} />
          <Sep />
        </>
      )}

      {/* ── SHAPE CONTEXT ──────────────────────────────────────────────── */}
      {isShape && !isText && (
        <>
          <ColorSwatch
            size="sm"
            label="Fill"
            value={/^#/.test(sel.fill) ? sel.fill : '#a7c4a0'}
            onChange={(c) => set({ fill: c })}
            brandColors={brandColors}
          />
          <div className="mx-1" />
          <ColorSwatch
            size="sm"
            label="Outline"
            value={/^#/.test(sel.stroke) ? sel.stroke : '#6b7c66'}
            onChange={(c) => set({ stroke: c })}
            brandColors={brandColors}
          />
          <div className="mx-1" />
          <StrokeWidthInput value={sel.strokeWidth} onChange={(v) => set({ strokeWidth: v })} />
          {sel.hasCornerRadius && (
            <>
              <Sep />
              <Popover
                trigger={(open, toggle) => (
                  <button onClick={toggle}
                    className={`flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs text-slate-500 transition hover:bg-slate-100 ${open ? 'bg-slate-100' : ''}`}>
                    Corners <ChevronDown className="h-3 w-3" />
                  </button>
                )}
              >
                <SliderRow label="Corner radius" value={sel.cornerRadius} min={0} max={120} step={1}
                  format={(v) => String(Math.round(v))} onChange={(v) => set({ cornerRadius: v })} />
              </Popover>
            </>
          )}
          <Sep />
        </>
      )}

      {/* ── NOTHING SELECTED ───────────────────────────────────────────── */}
      {!has && (
        <p className="text-xs text-slate-400 select-none">{t('editor.emptyCanvas')}</p>
      )}

      {/* ── SPACER pushes right cluster to the far right ──────────────── */}
      <div className="flex-1" />

      {/* ── RIGHT CLUSTER — visible when something is selected ─────────── */}
      {has && (
        <>
          {/* Opacity */}
          <OpacityInput value={sel.opacity} onChange={(v) => set({ opacity: v })} />
          <Sep />
          {/* Position */}
          <Btn icon={MoveUp}   title={t('editor.bringForward')} onClick={() => editor.stack('forward')} />
          <Btn icon={MoveDown} title={t('editor.sendBackward')} onClick={() => editor.stack('backward')} />
          <Sep />
          {/* Align */}
          <AlignPopover disabled={!has} />
          {/* Group */}
          {isMulti && <Btn icon={Group}   title={t('editor.group')}   onClick={() => editor.group()} />}
          {isGroup  && <Btn icon={Ungroup} title={t('editor.ungroup')} onClick={() => editor.ungroup()} />}
          <Sep />
          {/* Copy style / paste style */}
          <Btn icon={Paintbrush}    title={t('editor.copyStyle', 'Copy style')}  active={hasStyleCopied} onClick={() => { editor.copyStyle(); }} />
          <Btn icon={ClipboardPaste} title={t('editor.pasteStyle', 'Paste style')} disabled={!hasStyleCopied} onClick={() => editor.pasteStyle()} />
          <Sep />
          {/* Duplicate + Delete */}
          <Btn icon={Copy}   title={t('editor.duplicate')} onClick={() => void editor.duplicateSelected()} />
          <Btn icon={Trash2} title={t('editor.delete')}    onClick={() => editor.deleteSelected()} danger />
          <Sep />
        </>
      )}

      {/* ── GLOBAL — always visible ─────────────────────────────────────── */}
      <Btn icon={Undo2} title={t('editor.undo')} disabled={!canUndo} onClick={() => void editor.undo()} />
      <Btn icon={Redo2} title={t('editor.redo')} disabled={!canRedo} onClick={() => void editor.redo()} />
      <Sep />
      <Btn icon={Magnet}       title={t('editor.toggleGuides')}            active={guidesEnabled}            onClick={() => editor.setGuidesEnabled(!guidesEnabled)} />
      <Btn icon={SquareDashed} title={overlayVis ? t('editor.guidesOn', 'Guides On') : t('editor.guidesOff', 'Guides Off')} active={overlayVis} onClick={() => editor.setOverlayVisible(!overlayVis)} />
      <Btn icon={Eye}          title={t('editor.toggleLegibilityOverlay', 'Legibility overlay')} active={legibilityOverlayVisible} onClick={() => editor.toggleLegibilityOverlay()} />
      <Btn icon={Ruler}        title={t('editor.toggleRuler', 'Ruler (inches)')} active={rulerVisible} onClick={() => useEditorStore.getState().set({ rulerVisible: !rulerVisible })} />
    </div>
  );
}
