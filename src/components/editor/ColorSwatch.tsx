/**
 * ColorSwatch — a small color tile that opens a Canva-style color picker
 * popover. Uses the native <input type="color"> for the actual hue/sat wheel
 * so there's zero extra dependency, plus a hex text field and an opacity
 * slider. Recent colors are stored in module-level memory (not persisted).
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, Pipette } from 'lucide-react';

// ── Recent colour memory ──────────────────────────────────────────────────────
const MAX_RECENT = 14;
const recentColors: string[] = [];
function rememberColor(hex: string) {
  const norm = hex.toUpperCase();
  const idx = recentColors.indexOf(norm);
  if (idx !== -1) recentColors.splice(idx, 1);
  recentColors.unshift(norm);
  if (recentColors.length > MAX_RECENT) recentColors.pop();
}

// ── Preset palette (Canva-style neutrals + vivid row) ────────────────────────
const PRESETS: string[] = [
  '#FFFFFF', '#F2F2F2', '#E0E0E0', '#BDBDBD', '#9E9E9E',
  '#757575', '#616161', '#424242', '#212121', '#000000',
  '#EF9A9A', '#F48FB1', '#CE93D8', '#9FA8DA', '#81D4FA',
  '#80DEEA', '#A5D6A7', '#E6EE9C', '#FFE082', '#FFCC80',
  '#EF5350', '#E91E63', '#9C27B0', '#3F51B5', '#03A9F4',
  '#00BCD4', '#4CAF50', '#CDDC39', '#FFC107', '#FF9800',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Ensure a colour value has a leading # and is a 6-char hex. */
function normalise(c: string): string {
  if (!c) return '#000000';
  if (c.startsWith('#')) return c.slice(0, 7);
  if (/^[0-9a-fA-F]{6}$/.test(c)) return `#${c}`;
  return '#000000';
}

/** Perceived lightness — decides text-on-swatch colour. */
function isDark(hex: string): boolean {
  const h = normalise(hex).replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  value: string;
  opacity?: number;          // 0–1; pass undefined to hide the slider
  onChange: (hex: string) => void;
  onOpacityChange?: (v: number) => void;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  brandColors?: string[];
}

export default function ColorSwatch({
  value,
  opacity,
  onChange,
  onOpacityChange,
  label,
  size = 'md',
  disabled = false,
  brandColors,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => normalise(value));
  const nativeRef = useRef<HTMLInputElement>(null);
  const popRef   = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  // sync external value → draft
  useEffect(() => { setDraft(normalise(value)); }, [value]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !popRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        commit(draft);
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler, true);
    return () => window.removeEventListener('mousedown', handler, true);
  }, [open, draft]);

  const commit = (hex: string) => {
    const n = normalise(hex);
    rememberColor(n);
    onChange(n);
    setDraft(n);
  };

  const pick = (hex: string) => { commit(hex); };

  const swatchSz: CSSProperties =
    size === 'sm'
      ? { width: 20, height: 20, borderRadius: 4 }
      : { width: 26, height: 26, borderRadius: 6 };

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {label && <span className="text-[10px] text-slate-400">{label}</span>}

      {/* The swatch tile */}
      <button
        ref={btnRef}
        disabled={disabled}
        title={value}
        className="ring-1 ring-slate-300 hover:ring-gaia-400 disabled:opacity-40 transition focus-visible:ring-2 focus-visible:ring-gaia-500"
        style={{ ...swatchSz, backgroundColor: normalise(value) }}
        onClick={() => setOpen((o) => !o)}
      />

      {/* Popover */}
      {open && (
        <div
          ref={popRef}
          className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Big preview + native colour wheel (hidden) */}
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-slate-200"
              style={{ backgroundColor: draft }}
              title="Open full colour wheel"
              onClick={() => nativeRef.current?.click()}
            >
              {isDark(draft)
                ? <Pipette className="h-3.5 w-3.5 text-white/70" />
                : <Pipette className="h-3.5 w-3.5 text-black/40" />
              }
            </button>
            <input
              ref={nativeRef}
              type="color"
              className="sr-only"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }}
              onBlur={(e)  => commit(e.target.value)}
            />
            {/* Hex field */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">#</span>
              <input
                type="text"
                maxLength={6}
                className="input w-full py-1.5 pl-5 pr-2 font-mono text-xs"
                value={draft.replace('#', '')}
                onChange={(e) => {
                  const v = `#${e.target.value}`;
                  setDraft(v);
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
                }}
                onBlur={() => commit(draft)}
              />
            </div>
          </div>

          {/* Opacity slider */}
          {opacity !== undefined && onOpacityChange && (
            <div className="mt-2">
              <div className="mb-0.5 flex justify-between text-[10px] text-slate-400">
                <span>Opacity</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                className="w-full accent-gaia-600"
                value={opacity}
                onChange={(e) => onOpacityChange(Number(e.target.value))}
              />
            </div>
          )}

          {/* Brand colors */}
          {brandColors && brandColors.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gaia-600">Brand Colors</p>
              <div className="flex flex-wrap gap-1">
                {brandColors.map((c) => (
                  <SwatchTile key={c} color={c} active={normalise(value) === normalise(c)} onClick={() => pick(c)} />
                ))}
              </div>
            </div>
          )}

          {/* Presets */}
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Colours</p>
            <div className="grid grid-cols-10 gap-1">
              {PRESETS.map((c) => (
                <SwatchTile key={c} color={c} active={normalise(value) === c} onClick={() => pick(c)} />
              ))}
            </div>
          </div>

          {/* Recent */}
          {recentColors.length > 0 && (
            <div className="mt-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Recent</p>
              <div className="flex flex-wrap gap-1">
                {recentColors.map((c) => (
                  <SwatchTile key={c} color={c} active={normalise(value) === c} onClick={() => pick(c)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SwatchTile({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="relative h-5 w-5 rounded transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500"
      style={{ backgroundColor: color, boxShadow: active ? '0 0 0 2px #fff, 0 0 0 3.5px #6b7c66' : '0 0 0 1px rgba(0,0,0,0.12)' }}
      onClick={onClick}
      title={color}
    >
      {active && <Check className={`absolute inset-0 m-auto h-3 w-3 ${isDark(color) ? 'text-white' : 'text-black'}`} />}
    </button>
  );
}
