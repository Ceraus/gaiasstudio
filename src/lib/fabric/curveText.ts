import * as fabric from 'fabric';
import { safetyRingRadiusPx } from '@/lib/printGuides';

export type CurveMode = 'wave' | 'circle';
export type CircleSide = 'top' | 'bottom' | 'left' | 'right';

/** Cap-height inset so outward glyphs stay inside the red safety ring. */
export const CIRCLE_GLYPH_INSET = 0.85;
/** Bottom smile grows inward; keep descenders inside the safety line. */
export const CIRCLE_BOTTOM_INSET = 0.35;

export type CurveApplyOptions = {
  mode?: CurveMode;
  side?: CircleSide;
  /** Trim width/height in canvas px. Circle path uses the safety ring, not the cut. */
  labelW?: number;
  labelH?: number;
  /** Safety inset in canvas px (`editor.safePx`). */
  safePx?: number;
  /** Path center — label trim center (`editor.trim.cx/cy`). */
  centerX?: number;
  centerY?: number;
};

/** Saved so un-curving can restore the original wrapping textbox. */
export type CurveTextObject = fabric.FabricObject & {
  gaiaCurve?: number;
  gaiaCurveWrapWidth?: number;
  gaiaCurveSourceText?: string;
  gaiaCurveLines?: string[];
  gaiaCurveCharSpacing?: number;
  gaiaCurveMode?: CurveMode;
  gaiaCircleSide?: CircleSide;
  gaiaCircleDiameter?: number;
  gaiaCircleLabelW?: number;
  gaiaCircleLabelH?: number;
  gaiaCircleSafePx?: number;
};

type Textish = fabric.Textbox | fabric.IText | fabric.FabricText;

/**
 * Hard line breaks stay as separate curve lines. Soft-wrap lines are captured
 * from the live Textbox (`textLines`) before any width change.
 */
export function splitCurveLines(value: string): string[] {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

/**
 * Path width must be at least the line's measured width (plus padding so the
 * last glyph cannot modulo-wrap to the start) and may stay as wide as the
 * original box so circle-ring layouts keep their intended sweep.
 */
export function resolveCurvePathWidth(boxWidth: number, measuredTextWidth: number): number {
  return Math.max(1, boxWidth || 0, Math.ceil((measuredTextWidth || 0) + 8));
}

/**
 * Arc length of `buildCurvePath` — equal to `width` by construction
 * (`radius = width / θ`, so `radius · θ = width`).
 */
export function curvePathArcLength(width: number, amount: number): number {
  const a = Math.max(-100, Math.min(100, amount)) / 100;
  if (a === 0 || width <= 0) return 0;
  return width;
}

/**
 * Builds a smooth circular-arc path (approximated by a fine polyline so we never
 * fight SVG sweep-flag ambiguity). Positive amount arches the text upward
 * (a "smile"), negative arches it downward. Returns null for a straight line.
 */
export function buildCurvePath(width: number, amount: number): fabric.Path | null {
  const a = Math.max(-100, Math.min(100, amount)) / 100;
  if (a === 0 || width <= 0) return null;
  const dir = a < 0 ? -1 : 1;
  const theta = Math.abs(a) * Math.PI * 0.9; // total sweep, up to ~162°
  const radius = width / theta; // arc length ≈ width
  const steps = 72;
  const cosHalf = Math.cos(theta / 2);
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const ang = -theta / 2 + (theta * i) / steps;
    const x = radius * Math.sin(ang) + width / 2;
    const sag = radius * (Math.cos(ang) - cosHalf);
    const y = dir > 0 ? -sag : sag;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return new fabric.Path(d.trim(), { fill: '', stroke: '', strokeWidth: 0, visible: false });
}

/**
 * Offset added to Fabric's textAlign=center position (mid-path = 9 o'clock
 * on a circle that starts at 3 o'clock). Bottom uses a CCW path so pathSide
 * "left" sits on the inside of the lower arc without flipping glyphs.
 */
export function circleSidePathConfig(side: CircleSide): {
  offsetFraction: number;
  pathSide: 'left' | 'right';
  clockwise: boolean;
} {
  switch (side) {
    case 'top':
      return { offsetFraction: 0.25, pathSide: 'left', clockwise: true };
    case 'bottom':
      return { offsetFraction: 0.25, pathSide: 'left', clockwise: false };
    case 'right':
      return { offsetFraction: -0.5, pathSide: 'left', clockwise: true };
    case 'left':
    default:
      return { offsetFraction: 0, pathSide: 'left', clockwise: true };
  }
}

export function circleSideOffsetFraction(side: CircleSide): number {
  return circleSidePathConfig(side).offsetFraction;
}

/** Join wrap / hard-break lines into one string so they cannot share a path. */
export function flattenLinesForCircle(lines: string[]): string {
  return lines
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join(' ');
}

/**
 * Path radius for circle-path presets: safety ring minus a font-size inset
 * so the glyph body stays inside the red dashed ellipse.
 * Top/left/right: `pathR = safeR - fontSize * 0.85` (letters grow outward).
 * Bottom: `pathR = safeR - fontSize * 0.35` (upright smile, letters grow inward).
 */
export function resolveCirclePathRadius(
  labelW: number,
  labelH: number,
  safePx: number,
  fontSize: number,
  side?: CircleSide,
): number {
  const safeR = safetyRingRadiusPx(labelW, labelH, safePx);
  const factor = side === 'bottom' ? CIRCLE_BOTTOM_INSET : CIRCLE_GLYPH_INSET;
  const inset = Math.max(0, (fontSize || 0) * factor);
  return Math.max(12, safeR - inset);
}

/**
 * Full circle (or ellipse) starting at 3 o'clock. Clockwise: pathSide "left"
 * sits on the outside of the rim. Counter-clockwise: pathSide "left" sits
 * on the inside — used for an upright bottom smile.
 */
export function buildCirclePath(radiusX: number, radiusY = radiusX, clockwise = true): fabric.Path {
  const rx = Math.max(1, radiusX);
  const ry = Math.max(1, radiusY);
  const steps = 96;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps;
    const ang = clockwise ? t : -t;
    const x = rx + rx * Math.cos(ang);
    const y = ry + ry * Math.sin(ang);
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return new fabric.Path(d.trim(), { fill: '', stroke: '', strokeWidth: 0, visible: false });
}

export function isCurvedTextGroup(o: fabric.FabricObject): o is fabric.Group {
  const curve = (o as CurveTextObject).gaiaCurve;
  return o.type === 'group' && typeof curve === 'number' && curve !== 0;
}

function isTextish(o: fabric.FabricObject): o is Textish {
  return o.type === 'textbox' || o.type === 'i-text' || o.type === 'text';
}

function readStyle(src: Textish) {
  return {
    fontFamily: src.fontFamily,
    fontSize: src.fontSize,
    fontWeight: src.fontWeight,
    fontStyle: src.fontStyle,
    fill: src.fill,
    stroke: src.stroke,
    strokeWidth: src.strokeWidth,
    textAlign: (src.textAlign as string) || 'center',
    underline: src.underline,
    linethrough: (src as { linethrough?: boolean }).linethrough,
    charSpacing: src.charSpacing,
    lineHeight: src.lineHeight,
    originX: src.originX,
    originY: src.originY,
    left: src.left,
    top: src.top,
    angle: src.angle,
    scaleX: src.scaleX,
    scaleY: src.scaleY,
    opacity: src.opacity,
  };
}

function firstTextish(obj: fabric.FabricObject): Textish | null {
  if (isTextish(obj)) return obj;
  if (obj.type === 'group') {
    const child = (obj as fabric.Group).getObjects().find(isTextish);
    return child ?? null;
  }
  return null;
}

/** Extra tracking (1/1000 em) so rotated glyphs on a tight arc do not collide. */
export function curveCharSpacing(amount: number, base = 0): number {
  return (base || 0) + Math.round(Math.abs(amount) * 2.5);
}

function measureLineWidth(style: ReturnType<typeof readStyle>, line: string, spacing: number): number {
  const probe = new fabric.Text(line, {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    charSpacing: spacing,
  });
  return Math.max(1, probe.calcTextWidth());
}

/** Visual wrap lines from the current box — never joined into one string. */
export function captureCurveLines(obj: fabric.FabricObject): string[] {
  const g = obj as CurveTextObject;
  if (g.gaiaCurveLines && g.gaiaCurveLines.length > 0) return [...g.gaiaCurveLines];

  if (isCurvedTextGroup(obj)) {
    const fromKids = obj
      .getObjects()
      .filter(isTextish)
      .map((t) => (t.text ?? '').trim())
      .filter(Boolean);
    if (fromKids.length) return fromKids;
  }

  if (isTextish(obj)) {
    const wrap = g.gaiaCurveWrapWidth;
    if (obj.type === 'textbox' && typeof wrap === 'number' && wrap > 0 && obj.width !== wrap) {
      obj.set('width', wrap);
    }
    if (typeof (obj as fabric.Textbox).initDimensions === 'function') {
      (obj as fabric.Textbox).initDimensions();
    }
    const visual = (obj.textLines ?? []).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (visual.length > 0) return visual;
    return splitCurveLines(obj.text ?? '');
  }

  return [];
}

function applyPathToLine(text: Textish, amount: number, pathWidth: number) {
  const path = buildCurvePath(pathWidth, amount);
  if (!path) return;
  path.set({ visible: false, fill: '', stroke: '', strokeWidth: 0 });
  text.set({
    path,
    pathAlign: 'center',
    pathStartOffset: 0,
    pathSide: 'left',
    objectCaching: false,
    // Avoid a leftover stroke sitting on top of the path glyphs.
    strokeWidth: text.strokeWidth && text.stroke ? text.strokeWidth : 0,
  } as never);
  if (typeof text.setPathInfo === 'function') text.setPathInfo();
  if (typeof text.initDimensions === 'function') text.initDimensions();
  text.setCoords();
}

function stampCurveMeta(
  dest: CurveTextObject,
  amount: number,
  wrapWidth: number,
  sourceText: string,
  lines: string[],
  baseSpacing = 0,
  extra?: { mode?: CurveMode; side?: CircleSide; labelW?: number; labelH?: number; safePx?: number },
) {
  dest.gaiaCurve = amount;
  dest.gaiaCurveWrapWidth = wrapWidth;
  dest.gaiaCurveSourceText = sourceText;
  dest.gaiaCurveLines = lines;
  dest.gaiaCurveCharSpacing = baseSpacing;
  dest.gaiaCurveMode = extra?.mode ?? 'wave';
  if (extra?.mode === 'circle') {
    dest.gaiaCircleSide = extra.side ?? 'top';
    if (typeof extra.labelW === 'number' && extra.labelW > 0) dest.gaiaCircleLabelW = extra.labelW;
    if (typeof extra.labelH === 'number' && extra.labelH > 0) dest.gaiaCircleLabelH = extra.labelH;
    if (typeof extra.safePx === 'number' && extra.safePx >= 0) dest.gaiaCircleSafePx = extra.safePx;
    delete dest.gaiaCircleDiameter;
  } else {
    delete dest.gaiaCircleSide;
    delete dest.gaiaCircleDiameter;
    delete dest.gaiaCircleLabelW;
    delete dest.gaiaCircleLabelH;
    delete dest.gaiaCircleSafePx;
  }
}

function readPlacement(obj: fabric.FabricObject) {
  return {
    originX: obj.originX,
    originY: obj.originY,
    left: obj.left,
    top: obj.top,
    angle: obj.angle,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    opacity: obj.opacity,
  };
}

function clearCurveMeta(g: CurveTextObject) {
  g.gaiaCurve = 0;
  delete g.gaiaCurveWrapWidth;
  delete g.gaiaCurveSourceText;
  delete g.gaiaCurveLines;
  delete g.gaiaCurveCharSpacing;
  delete g.gaiaCurveMode;
  delete g.gaiaCircleSide;
  delete g.gaiaCircleDiameter;
  delete g.gaiaCircleLabelW;
  delete g.gaiaCircleLabelH;
  delete g.gaiaCircleSafePx;
}

function restoreTextbox(obj: fabric.FabricObject): fabric.Textbox {
  const g = obj as CurveTextObject;
  const sample = firstTextish(obj);
  const style = sample ? readStyle(sample) : {};
  const width = g.gaiaCurveWrapWidth || (sample?.width ?? 200);
  const source = g.gaiaCurveSourceText ?? sample?.text ?? '';
  const box = new fabric.Textbox(source, {
    ...style,
    width,
    charSpacing: g.gaiaCurveCharSpacing ?? 0,
    objectCaching: true,
  });
  (box as { path?: unknown }).path = undefined;
  const out = box as fabric.Textbox & CurveTextObject;
  clearCurveMeta(out);
  box.set('dirty', true);
  return box;
}

function makeCurvedLine(
  style: ReturnType<typeof readStyle>,
  line: string,
  amount: number,
  pathWidth: number,
  top: number,
  spacing: number,
) {
  const t = new fabric.IText(line, {
    ...style,
    text: line,
    originX: 'center',
    originY: 'center',
    left: 0,
    top,
    textAlign: 'center',
    charSpacing: spacing,
    objectCaching: false,
  });
  applyPathToLine(t, amount, pathWidth);
  return t;
}

function applyCirclePathToLine(
  text: Textish,
  side: CircleSide,
  radiusX: number,
  radiusY: number,
) {
  const { offsetFraction, pathSide, clockwise } = circleSidePathConfig(side);
  const path = buildCirclePath(radiusX, radiusY, clockwise);
  path.set({ visible: false, fill: '', stroke: '', strokeWidth: 0 });
  text.set({
    path,
    pathAlign: 'baseline',
    pathStartOffset: 0,
    pathSide,
    textAlign: 'center',
    objectCaching: false,
    strokeWidth: text.strokeWidth && text.stroke ? text.strokeWidth : 0,
  } as never);
  if (typeof text.setPathInfo === 'function') text.setPathInfo();
  const segs = path.segmentsInfo;
  const circ = segs?.[segs.length - 1]?.length ?? 2 * Math.PI * radiusX;
  text.set({ pathStartOffset: circ * offsetFraction } as never);
  if (typeof text.setPathInfo === 'function') text.setPathInfo();
  if (typeof text.initDimensions === 'function') text.initDimensions();
  text.setCoords();
}

function applyCircleCurve(
  text: fabric.FabricObject,
  side: CircleSide,
  wrapWidth: number,
  sourceText: string,
  lines: string[],
  style: ReturnType<typeof readStyle>,
  baseSpacing: number,
  layout: { labelW?: number; labelH?: number; safePx?: number; centerX?: number; centerY?: number },
): fabric.FabricObject {
  const flat = flattenLinesForCircle(lines);
  if (!flat) return text;
  const fontSize = (style.fontSize as number) || 20;
  const labelW = layout.labelW ?? wrapWidth;
  const labelH = layout.labelH ?? wrapWidth;
  const safePx = layout.safePx ?? 0;
  const radius = resolveCirclePathRadius(labelW, labelH, safePx, fontSize, side);
  // Milder tracking than a tight wave — the rim radius is large.
  const spacing = curveCharSpacing(24, baseSpacing);
  const placement = readPlacement(text);
  const snapCenter = typeof layout.centerX === 'number' && typeof layout.centerY === 'number';
  const next = new fabric.IText(flat, {
    ...style,
    text: flat,
    originX: 'center',
    originY: 'center',
    left: snapCenter ? layout.centerX : placement.left,
    top: snapCenter ? layout.centerY : placement.top,
    angle: snapCenter ? 0 : placement.angle,
    scaleX: snapCenter ? 1 : placement.scaleX,
    scaleY: snapCenter ? 1 : placement.scaleY,
    opacity: placement.opacity,
    textAlign: 'center',
    charSpacing: spacing,
    objectCaching: false,
  });
  applyCirclePathToLine(next, side, radius, radius);
  if (snapCenter) {
    next.set({ originX: 'center', originY: 'center', left: layout.centerX, top: layout.centerY });
    next.setCoords();
  }
  stampCurveMeta(next as CurveTextObject, 100, wrapWidth, sourceText || flat, lines, baseSpacing, {
    mode: 'circle',
    side,
    labelW,
    labelH,
    safePx,
  });
  return next;
}

/**
 * Applies (or clears) curved-text paths. Wave mode: multi-line boxes become a
 * group of IText objects — one path per visual line — so lines never share an
 * arc. Circle mode: wrap is flattened onto one rim path (one line only).
 * Returns the object that should sit on the canvas (may be a replacement).
 */
export function applyCurveToText(
  text: fabric.Textbox | fabric.FabricObject,
  amount: number,
  options?: CurveApplyOptions,
): fabric.FabricObject {
  const clamped = Math.max(-100, Math.min(100, Math.round(amount)));
  const g = text as CurveTextObject;
  const mode = options?.mode ?? g.gaiaCurveMode ?? 'wave';
  const side = options?.side ?? g.gaiaCircleSide ?? 'top';
  const labelW = options?.labelW ?? g.gaiaCircleLabelW;
  const labelH = options?.labelH ?? g.gaiaCircleLabelH;
  const safePx = options?.safePx ?? g.gaiaCircleSafePx;

  if (clamped === 0) {
    if (isTextish(text) && text.type === 'textbox') {
      (text as { path?: unknown }).path = undefined;
      const restore = g.gaiaCurveWrapWidth;
      clearCurveMeta(g);
      text.set('objectCaching', true);
      if (typeof restore === 'number' && restore > 0) text.set('width', restore);
      else if (typeof text.initDimensions === 'function') {
        text.initDimensions();
        text.setCoords();
      }
      text.set('dirty', true);
      return text;
    }
    return restoreTextbox(text);
  }

  const sample = firstTextish(text);
  if (!sample) return text;

  const style = readStyle(sample);
  const wrapWidth = g.gaiaCurveWrapWidth ?? (text.type === 'textbox' ? text.width || 200 : sample.width || 200);
  const sourceText = g.gaiaCurveSourceText ?? (isTextish(text) && text.type === 'textbox' ? (text.text ?? '') : sample.text ?? '');
  const lines = captureCurveLines(text);
  if (!lines.length) return text;

  const baseSpacing = g.gaiaCurveCharSpacing ?? ((style.charSpacing as number) || 0);

  if (mode === 'circle') {
    return applyCircleCurve(text, side, wrapWidth, sourceText, lines, style, baseSpacing, {
      labelW,
      labelH,
      safePx,
      centerX: options?.centerX,
      centerY: options?.centerY,
    });
  }

  const spacing = curveCharSpacing(clamped, baseSpacing);
  const lineWidths = lines.map((line) => measureLineWidth(style, line, spacing));
  const shared = resolveCurvePathWidth(wrapWidth, Math.max(...lineWidths));
  const fontPx = (style.fontSize as number) || 20;
  const lh = (style.lineHeight as number) || 1.16;
  const theta = (Math.abs(clamped) / 100) * Math.PI * 0.9;
  const sag = theta > 0 ? (shared / theta) * (1 - Math.cos(theta / 2)) : 0;
  // Each smile rises by `sag`; stack lines far enough that the lower arc
  // cannot sit inside the upper one (that reads as one black clump).
  const gap = Math.max(fontPx * lh * 1.2, sag + fontPx * 0.95);
  const placement = readPlacement(text);
  const waveMeta = { mode: 'wave' as const };

  if (lines.length === 1 && isTextish(text) && text.type !== 'textbox') {
    stampCurveMeta(g, clamped, wrapWidth, sourceText || lines[0], lines, baseSpacing, waveMeta);
    text.set('charSpacing', spacing);
    applyPathToLine(text, clamped, shared);
    g.gaiaCurve = clamped;
    text.set('objectCaching', false);
    text.set('dirty', true);
    return text;
  }

  if (lines.length === 1) {
    const next = makeCurvedLine(style, lines[0], clamped, shared, 0, spacing);
    next.set(placement);
    stampCurveMeta(next as CurveTextObject, clamped, wrapWidth, sourceText || lines[0], lines, baseSpacing, waveMeta);
    return next;
  }

  const items = lines.map((line, i) =>
    makeCurvedLine(style, line, clamped, shared, (i - (lines.length - 1) / 2) * gap, spacing),
  );
  const group = new fabric.Group(items, {
    ...placement,
    objectCaching: false,
  });
  stampCurveMeta(group as CurveTextObject, clamped, wrapWidth, sourceText || lines.join('\n'), lines, baseSpacing, waveMeta);
  return group;
}
