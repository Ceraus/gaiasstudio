import { useEffect, useRef } from 'react';
import { EDITOR_PPI } from '@/lib/units';

export const RULER_SIZE = 24;

interface Props {
  /** On-screen size of the ruler well (artboard + optional pad). */
  widthPx: number;
  heightPx: number;
  /** Current view zoom, so tick density can adapt. */
  zoom: number;
  /** Bleed margin in canvas pixels — the 0" mark sits at the trim edge. */
  bleedPx: number;
  /** Screen pixels of workspace between this ruler and the artboard edge. */
  padPx?: number;
}

const BG = '#f8fafc';
const LINE = '#94a3b8';
const TEXT = '#475569';
const TRIM = '#ec4899';

/**
 * Physical inch rulers along the top and left edges of the artboard.
 *
 * Zero is the label's trim edge (not the bleed edge), so what the ruler reads
 * is what will physically measure on the printed sticker.
 */
export default function CanvasRulers({ widthPx, heightPx, zoom, bleedPx, padPx = 0 }: Props) {
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawRuler(topRef.current, widthPx, zoom, bleedPx, true, padPx);
    drawRuler(leftRef.current, heightPx, zoom, bleedPx, false, padPx);
  }, [widthPx, heightPx, zoom, bleedPx, padPx]);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-tl-md ring-1 ring-slate-300"
        style={{ left: -RULER_SIZE, top: -RULER_SIZE, width: RULER_SIZE, height: RULER_SIZE, background: BG }}
      />
      <canvas
        ref={topRef}
        aria-hidden="true"
        className="pointer-events-none absolute ring-1 ring-slate-300"
        style={{ left: 0, top: -RULER_SIZE, width: widthPx, height: RULER_SIZE }}
      />
      <canvas
        ref={leftRef}
        aria-hidden="true"
        className="pointer-events-none absolute ring-1 ring-slate-300"
        style={{ left: -RULER_SIZE, top: 0, width: RULER_SIZE, height: heightPx }}
      />
    </>
  );
}

function drawRuler(
  el: HTMLCanvasElement | null,
  lengthPx: number,
  zoom: number,
  bleedPx: number,
  horizontal: boolean,
  padPx = 0,
) {
  if (!el || lengthPx <= 0) return;
  const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const w = horizontal ? lengthPx : RULER_SIZE;
  const h = horizontal ? RULER_SIZE : lengthPx;
  el.width = Math.ceil(w * dpr);
  el.height = Math.ceil(h * dpr);

  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const pxPerInch = EDITOR_PPI * zoom;
  // Below ~28 px/inch eighth-inch ticks turn into a grey smear.
  const stepIn = pxPerInch >= 110 ? 1 / 8 : pxPerInch >= 55 ? 1 / 4 : 1 / 2;
  const origin = padPx + bleedPx * zoom;

  ctx.font = '9px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.strokeStyle = LINE;
  ctx.fillStyle = TEXT;
  ctx.lineWidth = 1;

  const firstIn = Math.floor(-origin / pxPerInch / stepIn) * stepIn;
  const lastIn = (lengthPx - origin) / pxPerInch;

  ctx.beginPath();
  for (let inch = firstIn; inch <= lastIn + 1e-6; inch += stepIn) {
    const pos = Math.round(origin + inch * pxPerInch) + 0.5;
    if (pos < 0 || pos > (horizontal ? w : h)) continue;
    const isWhole = Math.abs(inch - Math.round(inch)) < 1e-6;
    const isHalf = Math.abs(inch * 2 - Math.round(inch * 2)) < 1e-6;
    const tick = isWhole ? RULER_SIZE : isHalf ? RULER_SIZE * 0.55 : RULER_SIZE * 0.35;

    if (horizontal) {
      ctx.moveTo(pos, RULER_SIZE - tick);
      ctx.lineTo(pos, RULER_SIZE);
    } else {
      ctx.moveTo(RULER_SIZE - tick, pos);
      ctx.lineTo(RULER_SIZE, pos);
    }

    if (isWhole && pxPerInch >= 26) {
      const label = String(Math.round(inch));
      if (horizontal) ctx.fillText(label, pos + 2, 2);
      else ctx.fillText(label, 2, pos + 2);
    }
  }
  ctx.stroke();

  // The trim edge (0") gets the same magenta as the cut line on the canvas.
  ctx.beginPath();
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = 1.5;
  const zero = Math.round(origin) + 0.5;
  if (horizontal) {
    ctx.moveTo(zero, 0);
    ctx.lineTo(zero, RULER_SIZE);
  } else {
    ctx.moveTo(0, zero);
    ctx.lineTo(RULER_SIZE, zero);
  }
  ctx.stroke();
}
