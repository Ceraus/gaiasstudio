import type { Canvas } from 'fabric';
import type { LabelShape } from '@/types';
import { EDITOR_PPI } from '@/lib/units';

export interface OverlayConfig {
  shape: LabelShape;
  /** Bleed thickness in canvas pixels (the ring outside the trim/cut line). */
  bleedPx: number;
  /** Safe margin in canvas pixels (inside the trim line). */
  safePx: number;
  cornerRadiusPx: number;
  /** When false, the die-cut mask still hides the square plate; dashed rings hide. */
  visible: boolean;
  /** Avery alignment grid over the trim (die-cut) area. */
  gridVisible?: boolean;
  /** Grid spacing in canvas pixels. Defaults to 1/8" at EDITOR_PPI. */
  gridSpacingPx?: number;
  /** Drag-only: object bbox reached the outer bleed ring. */
  bleedHit?: boolean;
  /** Drag-only: object bbox reached/left the safety ring. */
  safeHit?: boolean;
}

/** Avery-style square alignment grid: 1/8" reads cleanly on a 2.5" round. */
export const ALIGNMENT_GRID_IN = 0.125;
export const ALIGNMENT_GRID_PX = ALIGNMENT_GRID_IN * EDITOR_PPI;

/** Matches the editor workspace so punched-out corners disappear. */
export const EDITOR_WORKSPACE_BG = '#e9ecef';

// Rest: cyan bleed, gray cut, red safety. Hit rings switch to warning-red (drag-only).
const BLEED_COLOR = '#55c5d9';
const CUT_COLOR = 'rgba(107, 114, 128, 0.92)';
const SAFE_COLOR = '#f45c61';
const HIT_COLOR = '#e11d2e';
const STICKER_SHADOW = 'rgba(15, 23, 42, 0.2)';
const GRID_COLOR = 'rgba(148, 163, 184, 0.34)';

/** Append a trim outline. Does not call beginPath — needed for even-odd fills. */
function addTrimPath(
  ctx: CanvasRenderingContext2D,
  shape: LabelShape,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (shape === 'circle' || shape === 'oval') {
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, Math.PI * 2);
  } else if (shape === 'rounded-rectangle') {
    roundedRectPath(ctx, x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function strokeTrim(
  ctx: CanvasRenderingContext2D,
  shape: LabelShape,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  addTrimPath(ctx, shape, x, y, w, h, r);
  ctx.closePath();
  ctx.stroke();
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

/** Interior grid lines (skips the trim edges — the cut ring already marks those). */
export function alignmentGridLines(origin: number, size: number, spacing: number): number[] {
  const lines: number[] = [];
  if (!(spacing > 0) || !(size > spacing)) return lines;
  const end = origin + size;
  for (let p = origin + spacing; p < end - 0.5; p += spacing) {
    lines.push(p);
  }
  return lines;
}

function drawAlignmentGrid(
  ctx: CanvasRenderingContext2D,
  shape: LabelShape,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  spacing: number,
) {
  ctx.save();
  ctx.beginPath();
  addTrimPath(ctx, shape, x, y, w, h, r);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (const gx of alignmentGridLines(x, w, spacing)) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }
  for (const gy of alignmentGridLines(y, h, spacing)) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Avery-style artboard: hide the square canvas plate, sit the die-cut on the
 * workspace, and (when visible) draw bleed / cut / safety rings.
 */
export function drawBleedOverlay(canvas: Canvas, cfg: OverlayConfig) {
  const ctx = canvas.getContext();
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();

  const tx = cfg.bleedPx;
  const ty = cfg.bleedPx;
  const tw = cw - cfg.bleedPx * 2;
  const th = ch - cfg.bleedPx * 2;

  ctx.save();

  // Punch the die-cut out of a workspace fill so corners never read as a plate.
  ctx.fillStyle = EDITOR_WORKSPACE_BG;
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  addTrimPath(ctx, cfg.shape, tx, ty, tw, th, cfg.cornerRadiusPx);
  ctx.closePath();
  ctx.fill('evenodd');

  // Soft edge like a physical sticker on the desk.
  ctx.save();
  ctx.shadowColor = STICKER_SHADOW;
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);
  strokeTrim(ctx, cfg.shape, tx, ty, tw, th, cfg.cornerRadiusPx);
  ctx.restore();

  const spacing = cfg.gridSpacingPx ?? ALIGNMENT_GRID_PX;
  if (cfg.gridVisible && spacing > 0.5) {
    drawAlignmentGrid(ctx, cfg.shape, tx, ty, tw, th, cfg.cornerRadiusPx, spacing);
  }

  if (!cfg.visible) {
    ctx.restore();
    return;
  }

  if (cfg.bleedPx > 0.5) {
    const inset = 1;
    ctx.lineWidth = cfg.bleedHit ? 2.15 : 1.25;
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = cfg.bleedHit ? HIT_COLOR : BLEED_COLOR;
    strokeTrim(
      ctx,
      cfg.shape,
      inset,
      inset,
      cw - inset * 2,
      ch - inset * 2,
      cfg.cornerRadiusPx + cfg.bleedPx - inset,
    );
  }

  ctx.lineWidth = 1.35;
  ctx.setLineDash([]);
  ctx.strokeStyle = CUT_COLOR;
  strokeTrim(ctx, cfg.shape, tx, ty, tw, th, cfg.cornerRadiusPx);

  if (cfg.safePx > 0.5) {
    ctx.lineWidth = cfg.safeHit ? 2.15 : 1.25;
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = cfg.safeHit ? HIT_COLOR : SAFE_COLOR;
    strokeTrim(
      ctx,
      cfg.shape,
      tx + cfg.safePx,
      ty + cfg.safePx,
      tw - cfg.safePx * 2,
      th - cfg.safePx * 2,
      Math.max(0, cfg.cornerRadiusPx - cfg.safePx),
    );
  }

  ctx.restore();
}
