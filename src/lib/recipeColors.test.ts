import { describe, expect, it } from 'vitest';
import { getIngredientLookTheme, getIngredientPillStroke } from './recipeColors';

describe('getIngredientLookTheme', () => {
  it('uses the natural color of the ingredient', () => {
    expect(getIngredientLookTheme('Mango').key).toBe('mango-peach');
    expect(getIngredientLookTheme('Watermelon').key).toBe('watermelon');
    expect(getIngredientLookTheme('Lavender Essential Oil').key).toBe('lavender');
  });

  it('outlines each pill with a complementary stroke', () => {
    expect(getIngredientPillStroke(getIngredientLookTheme('Mango'))).toBe('border-teal-500');
    expect(getIngredientPillStroke(getIngredientLookTheme('Watermelon'))).toBe('border-rose-400');
  });
});
