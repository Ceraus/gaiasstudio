import type { Canvas } from 'fabric';
import type { LabelShape } from '@/types';

export interface OverlayConfig {
  shape: LabelShape;
  /** Bleed thickness in canvas pixels (the ring outside the trim/cut line). */
  bleedPx: number;
  /** Safe margin in canvas pixels (inside the trim line). */
  safePx: number;
  cornerRadiusPx: number;
  visible: boolean;
}

// Colors chosen to read clearly over any artwork.
const CUT_COLOR = 'rgba(236, 72, 153, 0.95)'; // magenta trim / die line
const SAFE_COLOR = 'rgba(37, 99, 235, 0.55)'; // blue safe zone
const MASK_COLOR = 'rgba(30, 30, 34, 0.45)'; // dimmed bleed area

/** Path the trim (cut) outline for the current shape into ctx. */
function traceTrim(
  ctx: CanvasRenderingContext2D,
  shape: LabelShape,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (shape === 'circle' || shape === 'oval') {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape === 'rounded-rectangle') {
    roundedRectPath(ctx, x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.closePath();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
}

/**
 * Draws the "visual bleed mask": a dimmed ring outside the cut line, a magenta
 * cut line, and a dashed blue safe zone. Call from the canvas 'after:render'
 * handler where the context is in identity (screen) space.
 */
export function drawBleedOverlay(canvas: Canvas, cfg: OverlayConfig) {
  if (!cfg.visible) return;
  const ctx = canvas.getContext();
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();

  const tx = cfg.bleedPx;
  const ty = cfg.bleedPx;
  const tw = cw - cfg.bleedPx * 2;
  const th = ch - cfg.bleedPx * 2;

  ctx.save();

  // 1) Dim everything, then punch out the trim shape so only the bleed ring stays dim.
  if (cfg.bleedPx > 0.5) {
    ctx.fillStyle = MASK_COLOR;
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    traceTrim(ctx, cfg.shape, tx, ty, tw, th, cfg.cornerRadiusPx);
    ctx.fill('evenodd');
  }

  // 2) Trim / die-cut line.
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeStyle = CUT_COLOR;
  traceTrim(ctx, cfg.shape, tx, ty, tw, th, cfg.cornerRadiusPx);
  ctx.stroke();

  // 3) Safe zone (keep important text inside this).
  if (cfg.safePx > 0.5) {
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = SAFE_COLOR;
    traceTrim(
      ctx,
      cfg.shape,
      tx + cfg.safePx,
      ty + cfg.safePx,
      tw - cfg.safePx * 2,
      th - cfg.safePx * 2,
      Math.max(0, cfg.cornerRadiusPx - cfg.safePx),
    );
    ctx.stroke();
  }

  ctx.restore();
}
