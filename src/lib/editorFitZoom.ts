/**
 * Editor Fit zoom: scale the artboard (label + bleed) to fill the workspace
 * with a modest gap for rulers / the zoom HUD. Physical inch size must not
 * cap zoom — a 1/4" sticker should enlarge to the same on-screen presence as
 * a 2.5" round.
 */

export const FIT_MIN_PAD = 48;
export const FIT_HUD_INSET = 72;
export const FIT_HUD_GAP = 8;
/** Workspace between the ruler bars and the outer bleed ring. */
export const RULER_WELL_PAD = 16;

export function computeEditorFitZoom(opts: {
  containerW: number;
  containerH: number;
  artboardW: number;
  artboardH: number;
  rulersVisible: boolean;
  rulerSize: number;
  hudInset?: number;
  minZoom: number;
  maxZoom: number;
}): number {
  const {
    containerW,
    containerH,
    artboardW,
    artboardH,
    rulersVisible,
    rulerSize,
    minZoom,
    maxZoom,
  } = opts;
  if (!(containerW > 0) || !(containerH > 0) || !(artboardW > 0) || !(artboardH > 0)) {
    return 1;
  }
  const hudInset = opts.hudInset ?? FIT_HUD_INSET;
  const pad = rulersVisible ? FIT_MIN_PAD + (rulerSize + RULER_WELL_PAD) * 2 : FIT_MIN_PAD;
  const availableW = (containerW - pad) / artboardW;
  const availableH = (containerH - pad - hudInset) / artboardH;
  const raw = Math.min(availableW, availableH);
  const snapped = snapUniformZoom(raw, artboardW, artboardH);
  return Math.max(minZoom, Math.min(maxZoom, snapped));
}

/** Integer CSS pixels on the long side so circles stay circular (not 37.5×2 ovals). */
export function snapUniformZoom(raw: number, artboardW: number, artboardH: number): number {
  const side = Math.max(artboardW, artboardH);
  if (!(side > 0) || !(raw > 0)) return raw;
  const px = Math.max(1, Math.round(side * raw));
  return px / side;
}
