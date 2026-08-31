import type { LabelShape } from '@/types';

/**
 * Unique catalog hues for each Avery shape.
 * Reserved elsewhere (do not reuse): gaia green, Saved Designs teal #0d9488 /
 * hover #0f766e, AI Suggest green→violet, rose trash, sky EN, amber ES,
 * violet Recipe Name, recipe earth tones, Manage Collections plum #5B4B8A,
 * orange Selected, slate #334155.
 *
 * Circle is custom deep cerulean — not Tailwind sky-700 #0369A1 (EN labels)
 * and not cyan-700 #0e7490 (too close to Saved Designs teal).
 */
export const SHAPE_COLORS = {
  circle: '#0B6FA3',
  oval: '#A21CAF',
  square: '#1E3A5F',
  rectangle: '#9F1239',
  rounded: '#6366F1',
} as const;

export type ShapeColorKey = keyof typeof SHAPE_COLORS;

export interface ShapeColorTokens {
  hex: string;
  tint: string;
  text: string;
  border: string;
}

export const SHAPE_COLOR_TOKENS: Record<ShapeColorKey, ShapeColorTokens> = {
  circle: { hex: SHAPE_COLORS.circle, tint: '#E3F2FA', text: '#08547C', border: '#7BB4D4' },
  oval: { hex: SHAPE_COLORS.oval, tint: '#F8E7FB', text: '#86198F', border: '#E879F9' },
  square: { hex: SHAPE_COLORS.square, tint: '#E8EEF5', text: '#16304F', border: '#7C93B0' },
  rectangle: { hex: SHAPE_COLORS.rectangle, tint: '#FCE8EE', text: '#9F1239', border: '#E8A0B4' },
  rounded: { hex: SHAPE_COLORS.rounded, tint: '#E8E8FF', text: '#4338CA', border: '#A5B4FC' },
};

export function shapeColorKey(shape: LabelShape | ShapeColorKey): ShapeColorKey {
  return shape === 'rounded-rectangle' ? 'rounded' : shape;
}

export function shapeColor(shape: LabelShape | ShapeColorKey): string {
  return SHAPE_COLORS[shapeColorKey(shape)];
}

export function shapeColorTokens(shape: LabelShape | ShapeColorKey): ShapeColorTokens {
  return SHAPE_COLOR_TOKENS[shapeColorKey(shape)];
}
