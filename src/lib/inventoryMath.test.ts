import { describe, expect, it } from 'vitest';
import {
  DROPS_PER_ML,
  OZ_TO_GRAMS,
  amountInBaseUnits,
  amountToGrams,
  calculateRecipeMaterialCogs,
  defaultRecipeAmountUnit,
  ingredientAmountInGrams,
  resolveRecipeAmountUnit,
} from '@/lib/inventoryMath';
import type { Ingredient } from '@/types';

const oil = { category: 'oil' as const, measurementType: 'volume' as const, name: 'Olive Oil' };
const essential = { category: 'essential-oil' as const, measurementType: 'volume' as const, name: 'Lavender Essential Oil' };
const butter = { category: 'butter' as const, measurementType: 'weight' as const, name: 'Shea Butter' };

describe('recipe amount units', () => {
  it('defaults oils and essential oils to drops, solids to grams', () => {
    expect(defaultRecipeAmountUnit(oil)).toBe('drops');
    expect(defaultRecipeAmountUnit(essential)).toBe('drops');
    expect(defaultRecipeAmountUnit(butter)).toBe('g');
  });

  it('keeps a saved unit and falls back when missing', () => {
    expect(resolveRecipeAmountUnit(oil, 'g')).toBe('g');
    expect(resolveRecipeAmountUnit(oil, undefined)).toBe('drops');
    expect(resolveRecipeAmountUnit(butter, 'oz')).toBe('oz');
    expect(resolveRecipeAmountUnit(butter, 'nope')).toBe('g');
  });

  it('converts display units to grams with existing inventory constants', () => {
    expect(amountToGrams(10, 'g')).toBe(10);
    expect(amountToGrams(1, 'oz')).toBe(OZ_TO_GRAMS);
    expect(amountToGrams(DROPS_PER_ML, 'drops')).toBeCloseTo(0.95);
    expect(amountToGrams(1, 'ml')).toBeCloseTo(0.95);
  });

  it('converts oil grams into drops for base-unit costing', () => {
    const drops = amountInBaseUnits(0.95, 'g', oil);
    expect(drops).toBeCloseTo(DROPS_PER_ML);
  });

  it('leaves default-unit amounts unchanged so existing recipes keep COGS', () => {
    expect(amountInBaseUnits(12, 'drops', oil)).toBe(12);
    expect(amountInBaseUnits(40, 'g', butter)).toBe(40);
  });

  it('uses the display unit for INCI gram weights', () => {
    expect(ingredientAmountInGrams(20, oil)).toBeCloseTo(0.95);
    expect(ingredientAmountInGrams(1, oil, 'ml')).toBeCloseTo(0.95);
    expect(ingredientAmountInGrams(1, butter, 'oz')).toBe(OZ_TO_GRAMS);
  });

  it('converts oil grams before multiplying fractional drop cost', () => {
    const lavender: Ingredient = {
      id: 'eo-1',
      name: 'Lavender Essential Oil',
      benefit: '',
      isSoapBase: false,
      active: true,
      category: 'essential-oil',
      measurementType: 'volume',
      fractionalCost: 0.02,
      createdAt: 0,
      updatedAt: 0,
    };
    const sameDrops = calculateRecipeMaterialCogs(
      { ingredientIds: ['eo-1'], ingredientAmounts: { 'eo-1': 20 }, customCosts: [] },
      [lavender],
    );
    const asMl = calculateRecipeMaterialCogs(
      {
        ingredientIds: ['eo-1'],
        ingredientAmounts: { 'eo-1': 1 },
        ingredientUnits: { 'eo-1': 'ml' },
        customCosts: [],
      },
      [lavender],
    );
    expect(sameDrops).toBeCloseTo(0.4);
    expect(asMl).toBeCloseTo(0.4);
  });
});
