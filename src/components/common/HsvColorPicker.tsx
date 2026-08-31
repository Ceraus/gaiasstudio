import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function hueColor(h: number): string {
  return `hsl(${h}, 100%, 50%)`;
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
  /** Smaller square + hex row for editor popovers. Prompt Builder stays full size. */
  compact?: boolean;
};

export default function HsvColorPicker({ value, onChange, compact = false }: Props) {
  const { t } = useTranslation();
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const drag = useRef<'sv' | 'hue' | null>(null);
  const hsvRef = useRef({ h: 36, s: 0.12, v: 0.91 });
  const [hsv, setHsv] = useState(() => {
    const rgb = parseHex(value);
    const next = rgb ? rgbToHsv(...rgb) : { h: 36, s: 0.12, v: 0.91 };
    hsvRef.current = next;
    return next;
  });
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());

  useEffect(() => {
    const rgb = parseHex(value);
    if (!rgb) return;
    const next = rgbToHsv(...rgb);
    hsvRef.current = next;
    setHsv((prev) => (
      Math.abs(prev.h - next.h) < 0.5 && Math.abs(prev.s - next.s) < 0.01 && Math.abs(prev.v - next.v) < 0.01
        ? prev
        : next
    ));
    setHexDraft(value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`);
  }, [value]);

  const commit = useCallback((next: { h: number; s: number; v: number }) => {
    hsvRef.current = next;
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexDraft(hex);
    onChange(hex);
  }, [onChange]);

  const readSv = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    commit({ ...hsvRef.current, s, v });
  }, [commit]);

  const readHue = useCallback((clientY: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = clamp(((clientY - rect.top) / rect.height) * 360, 0, 359.99);
    commit({ ...hsvRef.current, h });
  }, [commit]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (drag.current === 'sv') readSv(e.clientX, e.clientY);
      if (drag.current === 'hue') readHue(e.clientY);
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [readHue, readSv]);

  const applyHexDraft = (raw: string) => {
    setHexDraft(raw);
    const rgb = parseHex(raw);
    if (!rgb) return;
    const next = rgbToHsv(...rgb);
    hsvRef.current = next;
    setHsv(next);
    onChange(hsvToHex(next.h, next.s, next.v));
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className={compact ? 'flex gap-2' : 'flex gap-3'}>
        <div
          ref={svRef}
          className={`relative min-w-0 flex-1 cursor-crosshair overflow-hidden rounded-xl ring-1 ring-slate-200 ${compact ? 'h-36' : 'h-72'}`}
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor(hsv.h)})`,
          }}
          onPointerDown={(e) => {
            drag.current = 'sv';
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            readSv(e.clientX, e.clientY);
          }}
          role="slider"
          aria-label={t('common.saturationBrightness')}
          tabIndex={0}
        >
          <span
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
          />
        </div>
        <div
          ref={hueRef}
          className={`relative shrink-0 cursor-ns-resize overflow-hidden rounded-xl ring-1 ring-slate-200 ${compact ? 'w-7' : 'w-10'}`}
          style={{
            background: 'linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
          onPointerDown={(e) => {
            drag.current = 'hue';
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            readHue(e.clientY);
          }}
          role="slider"
          aria-label={t('common.hue')}
          tabIndex={0}
        >
          <span
            className="pointer-events-none absolute left-1/2 h-2.5 w-full -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow"
            style={{ top: `${(hsv.h / 360) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`shrink-0 ring-1 ring-slate-200 ${compact ? 'h-10 w-10 rounded-lg' : 'h-16 w-16 rounded-xl'}`}
          style={{ backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v) }}
          aria-hidden
        />
        <input
          type="text"
          spellCheck={false}
          className={`input min-w-0 flex-1 font-mono uppercase ${compact ? 'h-10 text-sm' : 'h-16 text-lg'}`}
          value={hexDraft}
          onChange={(e) => applyHexDraft(e.target.value)}
          aria-label={t('common.hexColor')}
        />
      </div>
    </div>
  );
}
