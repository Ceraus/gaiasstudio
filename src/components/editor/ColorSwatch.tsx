/**
 * ColorSwatch — a small color tile that opens a floating HSV picker.
 * Portaled over the canvas so sidebar overflow cannot clip it.
 */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkPlus, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HsvColorPicker from '@/components/common/HsvColorPicker';
import {
  addSavedColor,
  loadSavedColors,
  removeSavedColor,
  seedSavedColors,
  subscribeSavedColors,
} from '@/lib/savedColors';
import { useAppStore } from '@/store/useAppStore';

const POP_W = 280;
const POP_H = 420;
const POP_PAD = 8;

const MAX_RECENT = 14;
const recentColors: string[] = [];
function rememberColor(hex: string) {
  const norm = hex.toUpperCase();
  const idx = recentColors.indexOf(norm);
  if (idx !== -1) recentColors.splice(idx, 1);
  recentColors.unshift(norm);
  if (recentColors.length > MAX_RECENT) recentColors.pop();
}

const PRESETS: string[] = [
  '#FFFFFF', '#F2F2F2', '#E0E0E0', '#BDBDBD', '#9E9E9E',
  '#757575', '#616161', '#424242', '#212121', '#000000',
  '#EF9A9A', '#F48FB1', '#CE93D8', '#9FA8DA', '#81D4FA',
  '#80DEEA', '#A5D6A7', '#E6EE9C', '#FFE082', '#FFCC80',
  '#EF5350', '#E91E63', '#9C27B0', '#3F51B5', '#03A9F4',
  '#00BCD4', '#4CAF50', '#CDDC39', '#FFC107', '#FF9800',
];

function normalise(c: string): string {
  if (!c) return '#000000';
  if (c.startsWith('#')) return c.slice(0, 7).toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(c)) return `#${c.toUpperCase()}`;
  return '#000000';
}

function isDark(hex: string): boolean {
  const h = normalise(hex).replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

interface Props {
  value: string;
  opacity?: number;
  onChange: (hex: string) => void;
  onOpacityChange?: (v: number) => void;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Leftover settings.brandColors — seeded into Saved once, never shown as a settings page. */
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
  const { t } = useTranslation();
  const settingsBrand = useAppStore((s) => s.settings.brandColors);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => normalise(value));
  const [saved, setSaved] = useState<string[]>(() => loadSavedColors());
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setDraft(normalise(value)); }, [value]);

  useEffect(() => {
    const seed = brandColors?.length ? brandColors : settingsBrand;
    if (seed?.length) seedSavedColors(seed);
    setSaved(loadSavedColors());
    return subscribeSavedColors(() => setSaved(loadSavedColors()));
  }, [brandColors, settingsBrand]);

  const placePopover = () => {
    const btn = btnRef.current?.getBoundingClientRect();
    if (!btn) return;
    const measuredH = popRef.current?.offsetHeight || POP_H;
    let left = btn.right + POP_PAD;
    let top = btn.top;
    if (left + POP_W > window.innerWidth - POP_PAD) left = btn.left - POP_W - POP_PAD;
    if (left < POP_PAD) left = POP_PAD;
    if (top + measuredH > window.innerHeight - POP_PAD) {
      top = Math.max(POP_PAD, window.innerHeight - measuredH - POP_PAD);
    }
    if (top < POP_PAD) top = POP_PAD;
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    placePopover();
    window.addEventListener('resize', placePopover);
    window.addEventListener('scroll', placePopover, true);
    return () => {
      window.removeEventListener('resize', placePopover);
      window.removeEventListener('scroll', placePopover, true);
    };
  }, [open, saved.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !popRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        commit(draft);
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        commit(draft);
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, draft]);

  const commit = (hex: string) => {
    const n = normalise(hex);
    rememberColor(n);
    onChange(n);
    setDraft(n);
  };

  const alreadySaved = saved.includes(normalise(draft));

  const swatchSz: CSSProperties =
    size === 'sm'
      ? { width: 20, height: 20, borderRadius: 4 }
      : { width: 26, height: 26, borderRadius: 6 };

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {label && <span className="text-[10px] text-slate-400">{label}</span>}

      <button
        ref={btnRef}
        type="button"
        data-testid="editor-color-swatch"
        disabled={disabled}
        title={value}
        className="ring-1 ring-slate-300 hover:ring-gaia-400 disabled:opacity-40 transition focus-visible:ring-2 focus-visible:ring-gaia-500"
        style={{ ...swatchSz, backgroundColor: normalise(value) }}
        onClick={() => {
          if (!open) {
            const btn = btnRef.current?.getBoundingClientRect();
            if (btn) {
              let left = btn.right + POP_PAD;
              if (left + POP_W > window.innerWidth - POP_PAD) left = btn.left - POP_W - POP_PAD;
              if (left < POP_PAD) left = POP_PAD;
              setPos({ top: btn.top, left });
            }
          }
          setOpen((o) => !o);
        }}
      />

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          data-testid="editor-color-popover"
          className="fixed z-[220] w-[280px] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200"
          style={{ top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <HsvColorPicker
            compact
            value={draft}
            onChange={(hex) => {
              setDraft(hex);
              onChange(hex);
            }}
          />

          {opacity !== undefined && onOpacityChange && (
            <div className="mt-2">
              <div className="mb-0.5 flex justify-between text-[10px] text-slate-400">
                <span>{t('editor.colorOpacity', 'Opacity')}</span>
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

          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gaia-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-gaia-700 disabled:opacity-50"
            disabled={alreadySaved}
            onClick={() => addSavedColor(draft)}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            {alreadySaved
              ? t('editor.colorAlreadySaved', 'Already saved')
              : t('editor.saveThisColor', 'Save This Color')}
          </button>

          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('editor.colorDefaults', 'Defaults')}
            </p>
            <div className="grid grid-cols-10 gap-1">
              {PRESETS.map((c) => (
                <SwatchTile key={c} color={c} active={normalise(draft) === c} onClick={() => commit(c)} />
              ))}
            </div>
          </div>

          <div className="mt-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('editor.colorSaved', 'Saved')}
            </p>
            {saved.length === 0 ? (
              <p className="text-[10px] text-slate-400">
                {t('editor.colorSavedEmpty', 'Save a color to keep it here.')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {saved.map((c) => (
                  <span key={c} className="relative">
                    <SwatchTile
                      color={c}
                      active={normalise(draft) === c}
                      onClick={() => commit(c)}
                    />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-700 text-white shadow"
                      title={t('editor.removeSavedColor', 'Remove Color')}
                      aria-label={t('editor.removeSavedColor', 'Remove Color')}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedColor(c);
                      }}
                    >
                      <X className="h-2 w-2" strokeWidth={3} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {recentColors.length > 0 && (
            <div className="mt-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t('editor.colorRecent', 'Recent')}
              </p>
              <div className="flex flex-wrap gap-1">
                {recentColors.map((c) => (
                  <SwatchTile key={c} color={c} active={normalise(draft) === c} onClick={() => commit(c)} />
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

function SwatchTile({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="relative h-5 w-5 rounded transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500"
      style={{ backgroundColor: color, boxShadow: active ? '0 0 0 2px #fff, 0 0 0 3.5px #6b7c66' : '0 0 0 1px rgba(0,0,0,0.12)' }}
      onClick={onClick}
      title={color}
    >
      {active && <Check className={`absolute inset-0 m-auto h-3 w-3 ${isDark(color) ? 'text-white' : 'text-black'}`} />}
    </button>
  );
}
