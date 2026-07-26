import type { Ingredient, Recipe } from '@/types';

/** 1 fluid ounce → grams (weight inventory). */
export const OZ_TO_GRAMS = 28.35;

/** 1 pound → grams (weight inventory). */
export const LBS_TO_GRAMS = 453.59;

/** Drops per milliliter (essential oil inventory). */
export const DROPS_PER_ML = 20;

export type PurchaseUnit = 'oz' | 'lbs' | 'ml' | 'g';

/** Convert a purchase size to grams for weight-based costing. */
export function purchaseSizeToGrams(size: number, unit?: PurchaseUnit): number {
  if (unit === 'oz') return size * OZ_TO_GRAMS;
  if (unit === 'lbs') return size * LBS_TO_GRAMS;
  return size;
}

/** Convert a purchase size to drops for volume-based costing. */
export function purchaseSizeToDrops(sizeMl: number): number {
  return sizeMl * DROPS_PER_ML;
}

/**
 * Calculates fractional cost per gram (weight) or per drop (volume).
 * Returns `undefined` when required fields are missing or invalid.
 */
export function calculateFractionalCost(ing: Partial<Ingredient>): number | undefined {
  const { measurementType, purchaseSize, purchaseUnit, purchasePrice } = ing;
  if (!purchaseSize || !purchasePrice || purchaseSize <= 0) return undefined;

  if (measurementType === 'volume') {
    return purchasePrice / purchaseSizeToDrops(purchaseSize);
  }

  const grams = purchaseSizeToGrams(purchaseSize, purchaseUnit);
  if (grams <= 0) return undefined;
  return purchasePrice / grams;
}

export function isVolumeIngredient(ing: Pick<Ingredient, 'measurementType' | 'category'>): boolean {
  if (ing.measurementType === 'volume') return true;
  if (ing.measurementType === 'weight') return false;
  return ing.category === 'essential-oil' || ing.category === 'fragrance';
}

export function fractionalCostLabel(ing: Pick<Ingredient, 'measurementType' | 'category'>): '/g' | '/drop' {
  return isVolumeIngredient(ing) ? '/drop' : '/g';
}

/** Base unit an ingredient is measured (and stocked) in: grams or drops. */
export function baseUnitOf(ing: Pick<Ingredient, 'measurementType' | 'category'>): 'g' | 'drops' {
  return isVolumeIngredient(ing) ? 'drops' : 'g';
}

/**
 * Converts one purchase container into base units (grams or drops) — used by
 * the "+1 container" stock shortcut and low-stock detection.
 */
export function containerBaseUnits(
  ing: Pick<Ingredient, 'measurementType' | 'category' | 'purchaseSize' | 'purchaseUnit'>,
): number | null {
  if (!ing.purchaseSize || ing.purchaseSize <= 0) return null;
  if (isVolumeIngredient(ing)) return purchaseSizeToDrops(ing.purchaseSize);
  return purchaseSizeToGrams(ing.purchaseSize, ing.purchaseUnit);
}

/** Sum raw material COGS for a recipe from ingredient amounts × fractional costs. */
export function calculateRecipeMaterialCogs(
  recipe: Pick<Recipe, 'ingredientIds' | 'ingredientAmounts' | 'customCosts'>,
  ingredients: Ingredient[],
): number {
  const amounts = recipe.ingredientAmounts ?? {};
  let total = 0;

  for (const id of recipe.ingredientIds) {
    const amount = amounts[id];
    const ing = ingredients.find((i) => i.id === id);
    if (!amount || !ing?.fractionalCost) continue;
    total += amount * ing.fractionalCost;
  }

  for (const item of recipe.customCosts ?? []) {
    total += item.cost;
  }

  return total;
}

/** Gross profit margin % from retail price and COGS: ((retail - cogs) / retail) × 100. */
export function calculateProfitMargin(retailPrice: number, cogsTotal: number): number | undefined {
  if (!retailPrice || retailPrice <= 0) return undefined;
  return ((retailPrice - cogsTotal) / retailPrice) * 100;
}

export type MarginHealth = 'healthy' | 'moderate' | 'low';

export function marginHealth(margin?: number): MarginHealth {
  if (margin === undefined || Number.isNaN(margin)) return 'low';
  if (margin > 50) return 'healthy';
  if (margin >= 30) return 'moderate';
  return 'low';
}

export const MARGIN_HEALTH_CLASSES: Record<MarginHealth, string> = {
  healthy: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  moderate: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-rose-50 text-rose-800 ring-rose-200',
};
