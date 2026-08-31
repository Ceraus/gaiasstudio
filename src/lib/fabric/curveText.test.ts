import { describe, expect, it } from 'vitest';
import { util } from 'fabric';
import {
  buildCirclePath,
  buildCurvePath,
  CIRCLE_BOTTOM_INSET,
  CIRCLE_GLYPH_INSET,
  circleSideOffsetFraction,
  circleSidePathConfig,
  curveCharSpacing,
  curvePathArcLength,
  flattenLinesForCircle,
  resolveCirclePathRadius,
  resolveCurvePathWidth,
  splitCurveLines,
} from './curveText';

describe('splitCurveLines', () => {
  it('keeps hard-broken lines separate instead of joining them', () => {
    expect(splitCurveLines('Your product\nname here')).toEqual(['Your product', 'name here']);
    expect(splitCurveLines('a\r\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('drops blank lines and extra whitespace', () => {
    expect(splitCurveLines('  foo   bar  \n\n  baz ')).toEqual(['foo bar', 'baz']);
  });
});

describe('curveCharSpacing', () => {
  it('adds tracking as the arc tightens so glyphs stay readable', () => {
    expect(curveCharSpacing(0)).toBe(0);
    expect(curveCharSpacing(66)).toBeGreaterThan(curveCharSpacing(40));
  });
});

describe('curve path vs text width', () => {
  it('sizes each path to at least the line width so glyphs cannot pile', () => {
    const boxWidth = 180;
    const textWidth = 240;
    const pathWidth = resolveCurvePathWidth(boxWidth, textWidth);
    expect(pathWidth).toBeGreaterThanOrEqual(textWidth);
    expect(curvePathArcLength(pathWidth, 66)).toBeGreaterThanOrEqual(textWidth);
  });

  it('keeps a wider box so circle-ring layouts hold their sweep', () => {
    expect(resolveCurvePathWidth(320, 180)).toBeGreaterThanOrEqual(320);
  });

  it('buildCurvePath polyline is at least as long as the text width', () => {
    const textWidth = 240;
    const pathWidth = resolveCurvePathWidth(180, textWidth);
    const path = buildCurvePath(pathWidth, 66);
    expect(path).not.toBeNull();
    const segs = util.getPathSegmentsInfo(path!.path);
    const length = segs[segs.length - 1]?.length ?? 0;
    expect(length).toBeGreaterThanOrEqual(textWidth - 1);
    expect(buildCurvePath(pathWidth, 0)).toBeNull();
  });
});

describe('circle-path helpers', () => {
  it('flattens wrap lines so they cannot share one path', () => {
    expect(flattenLinesForCircle(['Your product', 'name here'])).toBe('Your product name here');
  });

  it('places each cardinal side at a quarter-turn from path center', () => {
    expect(circleSideOffsetFraction('left')).toBe(0);
    expect(circleSideOffsetFraction('top')).toBe(0.25);
    expect(circleSideOffsetFraction('bottom')).toBe(0.25);
    expect(circleSideOffsetFraction('right')).toBe(-0.5);
    expect(circleSidePathConfig('top').pathSide).toBe('left');
    expect(circleSidePathConfig('bottom').pathSide).toBe('left');
    expect(circleSidePathConfig('bottom').clockwise).toBe(false);
    expect(circleSidePathConfig('top').clockwise).toBe(true);
    expect(circleSidePathConfig('left').pathSide).toBe('left');
    expect(circleSidePathConfig('right').pathSide).toBe('left');
  });

  it('uses the safety ring minus a font inset — never the text bbox or cut radius', () => {
    const labelW = 375;
    const labelH = 375;
    const safePx = 18.75;
    const fontSize = 40;
    const safeR = Math.min(labelW, labelH) / 2 - safePx;
    const radius = resolveCirclePathRadius(labelW, labelH, safePx, fontSize);
    expect(radius).toBeCloseTo(safeR - fontSize * CIRCLE_GLYPH_INSET);
    expect(radius).toBeLessThan(safeR);
    expect(radius).toBeLessThan(labelW / 2);
    expect(resolveCirclePathRadius(80, 80, 0, 20)).toBeCloseTo(80 / 2 - 20 * CIRCLE_GLYPH_INSET);
    expect(resolveCirclePathRadius(labelW, labelH, safePx, fontSize, 'bottom')).toBeCloseTo(
      safeR - fontSize * CIRCLE_BOTTOM_INSET,
    );
  });

  it('buildCirclePath is a closed clockwise loop ~2πr long', () => {
    const radius = 80;
    const path = buildCirclePath(radius);
    const segs = util.getPathSegmentsInfo(path.path);
    const length = segs[segs.length - 1]?.length ?? 0;
    expect(length).toBeGreaterThan(2 * Math.PI * radius * 0.95);
    expect(length).toBeLessThan(2 * Math.PI * radius * 1.05);
  });
});
