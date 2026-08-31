import { FabricObject, InteractiveFabricObject, Textbox, type Control } from 'fabric';

// Custom properties that must survive canvas serialization (save/restore/history).
export const CUSTOM_PROPS = [
  'id',
  'name',
  'gaiaKind',
  'locked',
  // Curved-text amount (-100…100). The Fabric `path` itself is rebuilt from this
  // on load so serialized JSON stays portable (see editorController.load).
  'gaiaCurve',
  // Textbox width before curving, so slider 0 can wrap again.
  'gaiaCurveWrapWidth',
  'gaiaCurveSourceText',
  'gaiaCurveLines',
  'gaiaCurveCharSpacing',
  'gaiaCurveMode',
  'gaiaCircleSide',
  'gaiaCircleDiameter',
  'gaiaCircleLabelW',
  'gaiaCircleLabelH',
  'gaiaCircleSafePx',
  // Whether numeric width/height edits keep the original proportions.
  'gaiaLockAspect',
  // Text-case transform ('uppercase'|'lowercase'|'capitalize'|'none').
  // We store the pre-transform text so the user can revert to 'none'.
  'gaiaTextCase',
  'gaiaOriginalText',
  // Image adjustment amounts (-1…1). Fabric serializes the derived `filters`
  // array too, but keeping the raw amounts means the sliders can be restored
  // exactly rather than reverse-engineered from filter instances.
  'gaiaAdjust',
  // Combined QR builder fields + encoded payload (URL / vCard / labeled text).
  'gaiaQrFields',
  'gaiaQrPayload',
  'selectable',
  'evented',
  'editable',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
  'hasControls',
  // Marks the auto-generated legibility overlay rect so it can be found/toggled.
  'isLegibilityOverlay',
  // Marks the empty "Background" slot rect created by the strict 4-layer init;
  // it is swapped out in place when a real background image arrives.
  'gaiaPlaceholder',
];

let configured = false;

/** Avery-style rotate handle: larger than the 10px scale dots so the arrows read. */
const AVERY_ROTATE_SIZE = 18;
/** Stem length from the top-middle of the box to the icon center (CSS px). */
const AVERY_ROTATE_OFFSET_Y = -26;
const AVERY_ROTATE_FILL = '#111111';

/**
 * Generic rotate cursor: two bold circular arrows around a pivot.
 * Thick strokes + large heads so it stays readable at 32px — not a
 * miniature of the on-canvas Avery handle.
 * Fabric applies `mtr.cursorStyle` on hover and keeps it while rotate
 * is active (only `drag` overrides the cursor mid-gesture).
 * White halo so the icon reads on gray canvas and dark objects.
 */
const ROTATE_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="#fff" stroke-width="6" d="M7.6 14.5A8.5 8.5 0 0 1 22.5 10.5"/>
    <path stroke="#fff" stroke-width="6" d="M24.4 17.5A8.5 8.5 0 0 1 9.5 21.5"/>
    <path fill="#fff" stroke="#fff" stroke-width="2.4" d="M24.8 13.2l-3.9-1.3 1.6-2.4z"/>
    <path fill="#fff" stroke="#fff" stroke-width="2.4" d="M7.2 18.8l3.9 1.3-1.6 2.4z"/>
    <path stroke="#111" stroke-width="2.6" d="M7.6 14.5A8.5 8.5 0 0 1 22.5 10.5"/>
    <path stroke="#111" stroke-width="2.6" d="M24.4 17.5A8.5 8.5 0 0 1 9.5 21.5"/>
    <path fill="#111" d="M24.8 13.2l-3.2-1.1 1.3-2z"/>
    <path fill="#111" d="M7.2 18.8l3.2 1.1-1.3 2z"/>
    <circle cx="16" cy="16" r="2.1" fill="#111" stroke="#fff" stroke-width="1.5"/>
  </g>
</svg>`;
export const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(ROTATE_CURSOR_SVG)}") 16 16, alias`;

/**
 * Device-pixel-aligned CSS length so 1px strokes stay crisp under retina / zoom.
 * Fabric's control canvas is unscaled and unrotated — only retina-scaled.
 */
function snapCss(n: number, scale: number) {
  if (!scale || !Number.isFinite(scale)) return n;
  return Math.round(n * scale) / scale;
}

/** Clockwise tangent unit vector at canvas angle `theta` (y-down). */
function clockwiseTangent(theta: number) {
  return { x: -Math.sin(theta), y: Math.cos(theta) };
}

function drawClockwiseArrow(
  ctx: CanvasRenderingContext2D,
  radius: number,
  start: number,
  sweep: number,
  size: number,
) {
  const headLen = size * 0.24;
  const headW = size * 0.16;
  const end = start + sweep;
  const tipX = radius * Math.cos(end);
  const tipY = radius * Math.sin(end);
  const tan = clockwiseTangent(end);
  // Shorten the stroke so the filled head covers the arc end cleanly.
  const arcEnd = end - headLen * 0.45 / radius;

  ctx.beginPath();
  ctx.arc(0, 0, radius, start, arcEnd, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tipX + tan.x * headLen * 0.12, tipY + tan.y * headLen * 0.12);
  ctx.lineTo(tipX - tan.x * headLen + tan.y * headW, tipY - tan.y * headLen - tan.x * headW);
  ctx.lineTo(tipX - tan.x * headLen - tan.y * headW, tipY - tan.y * headLen + tan.x * headW);
  ctx.closePath();
  ctx.fill();
}

/** Outer radius of the circular-arrow path, plus a hairline so the stem never nibbles it. */
function averyRotateIconOuter(size: number, stroke: number, scale: number) {
  return size * 0.34 + stroke / 2 + snapCss(1, scale);
}

/**
 * Top-middle of the selection box in the same (unrotated, retina-scaled) space
 * as the mtr control's `left`/`top`. Prefers Fabric's `mt` coord so the stem
 * tracks object rotation; falls back to subtracting the control offset.
 */
function rotateStemAttach(
  control: Control,
  left: number,
  top: number,
  fabricObject?: { oCoords?: Record<string, { x: number; y: number }> },
) {
  const mt = fabricObject?.oCoords?.mt;
  if (mt && Number.isFinite(mt.x) && Number.isFinite(mt.y)) {
    return { x: mt.x, y: mt.y };
  }
  return { x: left - (control.offsetX || 0), y: top - (control.offsetY || 0) };
}

/**
 * Avery Design & Print rotate icon: center dot + two clockwise curved arrows.
 * Drawn screen-upright (Fabric already gives an unrotated control context).
 * We draw the stem ourselves so it stops at the icon's outer edge — Fabric's
 * default `withConnection` line always runs into the control center.
 */
function renderAveryRotateControl(
  this: Control,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride?: unknown,
  fabricObject?: InteractiveFabricObject,
) {
  const size = this.sizeX || AVERY_ROTATE_SIZE;
  const { a: sx, d: sy } = ctx.getTransform();
  const scale = sy || sx;
  const x = snapCss(left, sx);
  const y = snapCss(top, scale);
  const stroke = Math.max(1, snapCss(size * 0.12, sx));
  const radius = size * 0.34;
  const dot = Math.max(1, snapCss(size * 0.085, sx));
  const iconOuter = averyRotateIconOuter(size, stroke, sx);

  ctx.save();

  // Stem: bbox top-middle → outer bottom of the circular-arrow path (not through it).
  const attach = rotateStemAttach(this, left, top, fabricObject);
  const dx = x - attach.x;
  const dy = y - attach.y;
  const dist = Math.hypot(dx, dy);
  if (dist > iconOuter) {
    const t = (dist - iconOuter) / dist;
    ctx.beginPath();
    ctx.moveTo(attach.x, attach.y);
    ctx.lineTo(attach.x + dx * t, attach.y + dy * t);
    ctx.strokeStyle = fabricObject?.borderColor || '#a1a1aa';
    ctx.lineWidth = fabricObject?.borderScaleFactor || 1;
    ctx.lineCap = 'butt';
    ctx.stroke();
  }

  ctx.translate(x, y);
  ctx.fillStyle = AVERY_ROTATE_FILL;
  ctx.strokeStyle = AVERY_ROTATE_FILL;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Two opposite clockwise arcs (~145°) forming a near-circle with arrowheads.
  const sweep = Math.PI * 0.8;
  const start = -Math.PI * 0.28;
  drawClockwiseArrow(ctx, radius, start, sweep, size);
  drawClockwiseArrow(ctx, radius, start + Math.PI, sweep, size);

  ctx.beginPath();
  ctx.arc(0, 0, dot, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function styleAveryRotateHandle(mtr: Control | undefined) {
  if (!mtr) return;
  mtr.render = renderAveryRotateControl;
  mtr.sizeX = AVERY_ROTATE_SIZE;
  mtr.sizeY = AVERY_ROTATE_SIZE;
  mtr.touchSizeX = 28;
  mtr.touchSizeY = 28;
  mtr.offsetY = AVERY_ROTATE_OFFSET_Y;
  // Fabric's connector always ends at the control center (through the icon).
  mtr.withConnection = false;
  // rotationStyleHandler returns this (or not-allowed when lockRotation).
  mtr.cursorStyle = ROTATE_CURSOR;
}

function patchCreateControls(Ctor: typeof InteractiveFabricObject | typeof Textbox) {
  const original = Ctor.createControls.bind(Ctor);
  Ctor.createControls = (() => {
    const result = original();
    styleAveryRotateHandle(result.controls.mtr);
    return result;
  }) as typeof Ctor.createControls;
}

/** Applies global Fabric defaults once (control styling + serialization props). */
export function configureFabricOnce() {
  if (configured) return;
  configured = true;

  FabricObject.customProperties = CUSTOM_PROPS;

  // A clean, Canva-like selection style. Rotate uses the Avery icon below;
  // scale corners stay white circles with a gray outline.
  InteractiveFabricObject.ownDefaults = {
    ...InteractiveFabricObject.ownDefaults,
    cornerColor: '#ffffff',
    cornerStrokeColor: '#a1a1aa',
    cornerStyle: 'circle',
    cornerSize: 10,
    transparentCorners: false,
    borderColor: '#a1a1aa',
    borderScaleFactor: 1,
    padding: 0,
  };

  // Each object builds a fresh control set in createControls(); patch both
  // the shared object set and Textbox's own set so mtr is the Avery icon.
  patchCreateControls(InteractiveFabricObject);
  patchCreateControls(Textbox);
}
