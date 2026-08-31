import type { AveryTemplate } from '@/types';

// ---------------------------------------------------------------------------
// Unit helpers. Print truth lives in inches; the editor works in on-screen
// pixels; PDF export works in points (72 per inch).
// ---------------------------------------------------------------------------

/** On-screen pixels per inch used to size the editing canvas (crisp but light). */
export const EDITOR_PPI = 150;

/** Pixels per inch used when rasterizing the label for PDF export. */
export const EXPORT_PPI = 300;

export const inToPt = (inches: number) => inches * 72;

/** Typographic points <-> editor canvas pixels (font sizes are shown in pt). */
export const ptToPx = (pt: number, ppi = EDITOR_PPI) => (pt / 72) * ppi;
export const pxToPt = (px: number, ppi = EDITOR_PPI) => (px / ppi) * 72;

/** Physical position (inches, from page top-left) of one label slot. */
export function slotPositionIn(t: AveryTemplate, col: number, row: number) {
  return {
    xIn: t.marginLeftIn + col * (footprintWidthIn(t) + t.gutterXIn),
    yIn: t.marginTopIn + row * (footprintHeightIn(t) + t.gutterYIn),
  };
}

/** The on-sheet footprint accounts for ribbons that print rotated 90°. */
export function footprintWidthIn(t: AveryTemplate) {
  return t.rotateForPrint ? t.labelHeightIn : t.labelWidthIn;
}
export function footprintHeightIn(t: AveryTemplate) {
  return t.rotateForPrint ? t.labelWidthIn : t.labelHeightIn;
}

/** Human friendly size string, e.g. `2" round` or `2.375" × 1.25"`. */
export function describeSize(t: AveryTemplate): string {
  if (t.shape === 'circle') return `${t.labelWidthIn}" round`;
  return `${t.labelWidthIn}" × ${t.labelHeightIn}"`;
}
