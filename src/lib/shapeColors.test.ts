import { describe, expect, it } from 'vitest';
import {
  SHAPE_COLORS,
  SHAPE_COLOR_TOKENS,
  shapeColor,
  shapeColorKey,
  shapeColorTokens,
} from './shapeColors';

const TAKEN = new Set([
  '#0d9488',
  '#0f766e',
  '#5b4b8a',
  '#4a3d70',
  '#0369a1',
  '#0e7490',
  '#334155',
  '#7c3aed',
]);

describe('shapeColors', () => {
  it('maps each Avery shape to a unique unused hex', () => {
    const hexes = Object.values(SHAPE_COLORS);
    expect(new Set(hexes).size).toBe(hexes.length);
    for (const hex of hexes) {
      expect(TAKEN.has(hex.toLowerCase())).toBe(false);
    }
    expect(shapeColor('circle')).toBe(SHAPE_COLORS.circle);
    expect(shapeColor('oval')).toBe(SHAPE_COLORS.oval);
    expect(shapeColor('square')).toBe(SHAPE_COLORS.square);
    expect(shapeColor('rectangle')).toBe(SHAPE_COLORS.rectangle);
    expect(shapeColor('rounded-rectangle')).toBe(SHAPE_COLORS.rounded);
    expect(shapeColorKey('rounded-rectangle')).toBe('rounded');
    expect(shapeColorTokens('circle')).toBe(SHAPE_COLOR_TOKENS.circle);
  });
});
