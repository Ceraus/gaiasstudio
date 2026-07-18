/** Pixels-per-inch used for the on-screen Fabric.js editing canvas. Print
 * export renders at a higher effective DPI via a canvas.toDataURL multiplier,
 * so this only needs to be sharp enough for comfortable on-screen editing. */
export const PX_PER_IN = 200;

export const inToPx = (inches: number) => inches * PX_PER_IN;
export const pxToIn = (px: number) => px / PX_PER_IN;
