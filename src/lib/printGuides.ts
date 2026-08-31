import type { AveryTemplate, LabelShape } from '@/types';
import { EDITOR_PPI } from '@/lib/units';

/**
 * Avery Design & Print (letter-sheet products) uses 1/8" bleed past the die-cut
 * and a 1/8" safety inset. Downloaded templates tell designers the same:
 * https://www.avery.com/help/article/what-are-the-bleed-and-the-safe-areas
 *
 * Roll / WePrint artwork guidelines use 1/16":
 * https://www.avery.com/custom-printing/resources/artwork-guidelines
 *
 * Regular address labels cannot print to the edge; only named PTE products can:
 * https://www.avery.com/help/article/can-a-regular-address-label-print-to-the-edge
 *
 * App settings.bleedIn / settings.safeIn are legacy (some IndexedDB installs
 * still store 0.0625) and must not override template-accurate guides.
 */
export const AVERY_SHEET_BLEED_IN = 0.125;
export const AVERY_SHEET_SAFE_IN = 0.125;
export const AVERY_ROLL_BLEED_IN = 0.0625;
export const AVERY_ROLL_SAFE_IN = 0.0625;
export const AVERY_SMALL_SAFE_IN = 0.0625;
export const AVERY_TINY_SAFE_IN = 0.03125;

/** Labels shorter than this use a tighter safety so text is not crushed. */
const SMALL_LABEL_IN = 1;
const TINY_LABEL_IN = 0.5;

/**
 * Avery sticker rounds / squares / ovals at or above this size are the
 * print-to-the-edge product line (22562, 22807, …). Smaller dots are
 * color-coding labels, not full-bleed art.
 */
const STICKER_PTE_MIN_IN = 0.75;

const LETTER_W = 8.5;
const LETTER_H = 11;
const A4_W = 210 / 25.4;
const A4_H = 297 / 25.4;

const PTE_NAME_RE = /print[\s-]*to[\s-]*(the[\s-]*)?edge/i;
const ROLL_NAME_RE = /\b(roll|weprint)\b/i;
const MAILING_NAME_RE =
  /\b(address|shipping|return address|file folder|binder|spine)\b/i;
const FULL_PAGE_NAME_RE = /\bfull[- ]?page\b/i;

/**
 * Sheet PTE codes whose catalog name does not say "print-to-the-edge".
 * 8257 is the inkjet twin of 6870 (Avery help: PTE addressing).
 */
const EXPLICIT_PTE_CODES = new Set(['8257']);

/**
 * Classic tiled mailing / filing SKUs. Rows often touch (gutterY = 0), so a
 * 1/8" bleed ring would be a fake guide Avery would not show.
 */
const EXPLICIT_NON_PTE_CODES = new Set([
  '5160',
  '5161',
  '5162',
  '5163',
  '5164',
  '5165',
  '5167',
  '5168',
  '5260',
  '5261',
  '5262',
  '5263',
  '5264',
  '5267',
  '8160',
  '8161',
  '8162',
  '8163',
  '8164',
  '8167',
  '8168',
  '5660',
  '5661',
  '5662',
  '5663',
  '5664',
  '5667',
  '8460',
  '8461',
  '8462',
  '8463',
  '8464',
  '5352',
  '18163',
]);

export interface PrintGuidesIn {
  bleedIn: number;
  safeIn: number;
  printToTheEdge: boolean;
}

export interface GuideRectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PrintGuideLayoutPx {
  bleedPx: number;
  safePx: number;
  canvasW: number;
  canvasH: number;
  /** Outer print-to-edge ring (art should reach this). */
  bleed: GuideRectPx;
  /** Die-cut / trim. */
  cut: GuideRectPx;
  /** Keep logos and text inside this. */
  safe: GuideRectPx;
}

function approx(a: number, b: number, eps = 0.06): boolean {
  return Math.abs(a - b) <= eps;
}

function finiteInches(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function templateCodes(template: AveryTemplate): string[] {
  return [template.id, template.averyCode]
    .filter((code): code is string => !!code)
    .map((code) => String(code).trim().toUpperCase());
}

function numericSku(code: string): string | null {
  const match = code.match(/(\d{3,6})$/);
  return match ? match[1] : null;
}

function skuNumbers(template: AveryTemplate): string[] {
  const out: string[] = [];
  for (const code of templateCodes(template)) {
    out.push(code);
    const numeric = numericSku(code);
    if (numeric && numeric !== code) out.push(numeric);
  }
  return out;
}

function is687PteFamily(sku: string): boolean {
  const n = Number(sku);
  return Number.isInteger(n) && n >= 6870 && n <= 6879;
}

function minLabelIn(template: AveryTemplate): number {
  return Math.min(template.labelWidthIn, template.labelHeightIn);
}

function isLetterOrA4Sheet(template: AveryTemplate): boolean {
  const w = template.pageWidthIn;
  const h = template.pageHeightIn;
  return (
    (approx(w, LETTER_W) && approx(h, LETTER_H)) ||
    (approx(w, LETTER_H) && approx(h, LETTER_W)) ||
    (approx(w, A4_W) && approx(h, A4_H)) ||
    (approx(w, A4_H) && approx(h, A4_W))
  );
}

/** Continuous / roll stock — WePrint artwork uses 1/16" bleed and safety. */
export function isRollTemplate(template: AveryTemplate): boolean {
  if (ROLL_NAME_RE.test(template.name) && !isLetterOrA4Sheet(template)) return true;
  if (/\broll\b/i.test(template.name) && !isLetterOrA4Sheet(template)) return true;
  return !isLetterOrA4Sheet(template) && template.pageHeightIn > 14;
}

function isFullSheetLabel(template: AveryTemplate): boolean {
  if (FULL_PAGE_NAME_RE.test(template.name)) return true;
  return (
    template.perSheet === 1 &&
    template.labelWidthIn >= template.pageWidthIn - 0.15 &&
    template.labelHeightIn >= template.pageHeightIn - 0.15
  );
}

/**
 * True when adjacent labels leave enough gap for Avery's 1/8" sheet bleed
 * on every side (0.125" from each neighbor ⇒ 0.25" gutter).
 */
function hasSheetBleedRoom(template: AveryTemplate): boolean {
  const gx = template.gutterXIn ?? 0;
  const gy = template.gutterYIn ?? 0;
  const cols = template.columns || 1;
  const rows = template.rows || 1;
  const xRoom = cols <= 1 ? template.marginLeftIn >= AVERY_SHEET_BLEED_IN : gx >= AVERY_SHEET_BLEED_IN * 2;
  const yRoom = rows <= 1 ? template.marginTopIn >= AVERY_SHEET_BLEED_IN : gy >= AVERY_SHEET_BLEED_IN * 2;
  return xRoom && yRoom;
}

/**
 * Whether this SKU is a print-to-the-edge product (cyan bleed ring).
 * Deterministic from name, code families, shape/size, and gutters —
 * inferred gx=0 on circles is still PTE (22562-style touching rounds).
 */
export function isPrintToTheEdge(template: AveryTemplate): boolean {
  if (PTE_NAME_RE.test(template.name)) return true;

  for (const sku of skuNumbers(template)) {
    if (EXPLICIT_PTE_CODES.has(sku) || is687PteFamily(sku)) return true;
    if (EXPLICIT_NON_PTE_CODES.has(sku)) return false;
  }

  if (MAILING_NAME_RE.test(template.name)) return false;
  if (template.rotateForPrint) return false;
  if (isFullSheetLabel(template)) return false;
  if (isRollTemplate(template)) return true;

  const minDim = minLabelIn(template);
  const shape = template.shape;

  // Circles / ovals only kiss at a point, so gutterX === 0 still allows PTE.
  if (shape === 'circle' || shape === 'oval') {
    return minDim >= STICKER_PTE_MIN_IN;
  }

  if (shape === 'square' || shape === 'rounded-rectangle') {
    return minDim >= STICKER_PTE_MIN_IN;
  }

  return hasSheetBleedRoom(template);
}

function defaultSafeIn(template: AveryTemplate, roll: boolean): number {
  if (roll) return AVERY_ROLL_SAFE_IN;
  const minDim = minLabelIn(template);
  if (minDim < TINY_LABEL_IN) return AVERY_TINY_SAFE_IN;
  if (minDim < SMALL_LABEL_IN) return AVERY_SMALL_SAFE_IN;
  return AVERY_SHEET_SAFE_IN;
}

function defaultBleedIn(_template: AveryTemplate, roll: boolean, pte: boolean): number {
  if (!pte) return 0;
  if (roll) return AVERY_ROLL_BLEED_IN;
  return AVERY_SHEET_BLEED_IN;
}

function clampGuides(template: AveryTemplate, bleedIn: number, safeIn: number): PrintGuidesIn {
  const minDim = minLabelIn(template);
  const maxSafe = Math.max(0, minDim / 2 - 1e-6);
  return {
    bleedIn: Math.max(0, bleedIn),
    safeIn: Math.min(Math.max(0, safeIn), maxSafe),
    printToTheEdge: isPrintToTheEdge(template),
  };
}

/** Bleed and safety in inches for the selected Avery SKU. */
export function resolvePrintGuides(template: AveryTemplate): PrintGuidesIn {
  const roll = isRollTemplate(template);
  const pte = isPrintToTheEdge(template);
  const bleedIn = finiteInches(template.bleedIn) ?? defaultBleedIn(template, roll, pte);
  const safeIn = finiteInches(template.safeIn) ?? defaultSafeIn(template, roll);
  return clampGuides(template, bleedIn, safeIn);
}

/** Pixel layout of the three Avery rings on the editor artboard. */
export function printGuideLayoutPx(
  template: AveryTemplate,
  ppi = EDITOR_PPI,
): PrintGuideLayoutPx {
  const { bleedIn, safeIn } = resolvePrintGuides(template);
  const bleedPx = bleedIn * ppi;
  const safePx = safeIn * ppi;
  const labelW = template.labelWidthIn * ppi;
  const labelH = template.labelHeightIn * ppi;
  const canvasW = labelW + bleedPx * 2;
  const canvasH = labelH + bleedPx * 2;
  return {
    bleedPx,
    safePx,
    canvasW,
    canvasH,
    bleed: { x: 0, y: 0, w: canvasW, h: canvasH },
    cut: { x: bleedPx, y: bleedPx, w: labelW, h: labelH },
    safe: {
      x: bleedPx + safePx,
      y: bleedPx + safePx,
      w: Math.max(0, labelW - safePx * 2),
      h: Math.max(0, labelH - safePx * 2),
    },
  };
}

/**
 * Inscribed radius of the inner safety ellipse (circle / oval).
 * Same as `min(layout.safe.w, layout.safe.h) / 2`.
 */
export function safetyRingRadiusPx(labelW: number, labelH: number, safePx: number): number {
  return Math.max(0, Math.min(labelW, labelH) / 2 - Math.max(0, safePx));
}

export interface GuideBBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GuideHitState {
  /** Artwork reaches/crosses the outer print-to-the-edge ring. */
  bleed: boolean;
  /** Artwork leaves the inner safety ellipse/rect. */
  safety: boolean;
}

function isRoundShape(shape: LabelShape): boolean {
  return shape === 'circle' || shape === 'oval';
}

function bboxCorners(b: GuideBBox): Array<[number, number]> {
  return [
    [b.left, b.top],
    [b.left + b.width, b.top],
    [b.left, b.top + b.height],
    [b.left + b.width, b.top + b.height],
  ];
}

/** Squared ellipse norm; >= 1 is on or outside the ring. */
function ellipseNorm(x: number, y: number, rect: GuideRectPx): number {
  const rx = rect.w / 2;
  const ry = rect.h / 2;
  if (!(rx > 0) || !(ry > 0)) return Infinity;
  const nx = (x - (rect.x + rx)) / rx;
  const ny = (y - (rect.y + ry)) / ry;
  return nx * nx + ny * ny;
}

/** True when the AABB is not strictly inside the ellipse (touches or crosses). */
function bboxReachesEllipse(b: GuideBBox, rect: GuideRectPx): boolean {
  return bboxCorners(b).some(([x, y]) => ellipseNorm(x, y, rect) >= 1 - 1e-6);
}

/** True when the AABB touches or crosses the outer edge of `rect`. */
function bboxReachesRect(b: GuideBBox, rect: GuideRectPx): boolean {
  return (
    b.left <= rect.x + 1e-6 ||
    b.top <= rect.y + 1e-6 ||
    b.left + b.width >= rect.x + rect.w - 1e-6 ||
    b.top + b.height >= rect.y + rect.h - 1e-6
  );
}

/**
 * Whether a dragged object's bounding box has reached the bleed ring
 * (print to the edge) or left the safety ring.
 */
export function guideHitsFromBBox(
  bbox: GuideBBox,
  layout: PrintGuideLayoutPx,
  shape: LabelShape,
): GuideHitState {
  if (!(bbox.width >= 0) || !(bbox.height >= 0)) return { bleed: false, safety: false };

  if (isRoundShape(shape)) {
    return {
      bleed: layout.bleedPx > 0.5 && bboxReachesEllipse(bbox, layout.bleed),
      safety: layout.safePx > 0.5 && bboxReachesEllipse(bbox, layout.safe),
    };
  }

  return {
    bleed: layout.bleedPx > 0.5 && bboxReachesRect(bbox, layout.bleed),
    safety: layout.safePx > 0.5 && bboxReachesRect(bbox, layout.safe),
  };
}
