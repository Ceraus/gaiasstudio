import type { Ingredient, IngredientCategory, Recipe, RecipeAmountUnit } from '@/types';

export type { RecipeAmountUnit };

/** Liquids dosed by drop in melt-and-pour recipes. */
export const VOLUME_CATEGORIES: ReadonlySet<IngredientCategory> = new Set([
  'oil',
  'essential-oil',
  'fragrance',
  'colorant',
]);

const SOLID_NAME = /\b(butter|wax|base|powder|clay|oatmeal|salt|beeswax)\b/i;
const LIQUID_NAME = /\b(oil|fragrance|perfume|scent|\beo\b|colorant|dye)\b/i;

/** 1 fluid ounce → grams (weight inventory). */
export const OZ_TO_GRAMS = 28.35;

/** 1 pound → grams (weight inventory). */
export const LBS_TO_GRAMS = 453.59;

/** Drops per milliliter (essential oil inventory). */
export const DROPS_PER_ML = 20;

export type PurchaseUnit = 'oz' | 'lbs' | 'ml' | 'g';

/** Recipe-line units already used in inventory / recipe math. */
export const RECIPE_AMOUNT_UNITS: readonly RecipeAmountUnit[] = ['g', 'oz', 'ml', 'drops'];

export function isRecipeAmountUnit(value: unknown): value is RecipeAmountUnit {
  return value === 'g' || value === 'oz' || value === 'ml' || value === 'drops';
}

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
  const { purchaseSize, purchaseUnit, purchasePrice } = ing;
  if (!purchaseSize || !purchasePrice || purchaseSize <= 0) return undefined;

  if (isVolumeIngredient(ing)) {
    return purchasePrice / purchaseSizeToDrops(purchaseSize);
  }

  const grams = purchaseSizeToGrams(purchaseSize, purchaseUnit);
  if (grams <= 0) return undefined;
  return purchasePrice / grams;
}

export function isVolumeIngredient(
  ing: Pick<Ingredient, 'measurementType' | 'category'> & { name?: string },
): boolean {
  if (ing.category && VOLUME_CATEGORIES.has(ing.category)) return true;
  if (ing.measurementType === 'volume') return true;
  if (ing.measurementType === 'weight') return false;
  return !!ing.name && !SOLID_NAME.test(ing.name) && LIQUID_NAME.test(ing.name);
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

/** Approximate density (g/ml) for volume ingredients when sorting by weight predominance. */
const VOLUME_DENSITY_G_PER_ML = 0.95;

/** Oils / volume ingredients default to drops; everything else to grams. */
export function defaultRecipeAmountUnit(
  ing: Pick<Ingredient, 'measurementType' | 'category'> & { name?: string },
): RecipeAmountUnit {
  return isVolumeIngredient(ing) ? 'drops' : 'g';
}

/** Saved unit if valid; otherwise the ingredient default. */
export function resolveRecipeAmountUnit(
  ing: Pick<Ingredient, 'measurementType' | 'category'> & { name?: string },
  saved?: string,
): RecipeAmountUnit {
  return isRecipeAmountUnit(saved) ? saved : defaultRecipeAmountUnit(ing);
}

/** Convert a recipe-line amount from its display unit into grams. */
export function amountToGrams(amount: number, unit: RecipeAmountUnit): number {
  if (unit === 'g') return amount;
  if (unit === 'oz') return amount * OZ_TO_GRAMS;
  if (unit === 'ml') return amount * VOLUME_DENSITY_G_PER_ML;
  return (amount / DROPS_PER_ML) * VOLUME_DENSITY_G_PER_ML;
}

/** Convert a recipe-line amount into the ingredient's stocked base unit (g or drops). */
export function amountInBaseUnits(
  amount: number,
  unit: RecipeAmountUnit,
  ing: Pick<Ingredient, 'measurementType' | 'category'> & { name?: string },
): number {
  const base = baseUnitOf(ing);
  if (unit === base) return amount;
  const grams = amountToGrams(amount, unit);
  if (base === 'g') return grams;
  return (grams / VOLUME_DENSITY_G_PER_ML) * DROPS_PER_ML;
}

export function recipeLineAmountInBaseUnits(
  amount: number,
  ing: Pick<Ingredient, 'measurementType' | 'category'> & { name?: string },
  savedUnit?: string,
): number {
  return amountInBaseUnits(amount, resolveRecipeAmountUnit(ing, savedUnit), ing);
}

/** Convert a recipe ingredient amount to grams for FDA predominance sorting. */
export function ingredientAmountInGrams(
  amount: number,
  ing: Pick<Ingredient, 'measurementType' | 'category'> & { name?: string },
  unit?: RecipeAmountUnit,
): number {
  return amountToGrams(amount, unit ?? defaultRecipeAmountUnit(ing));
}

/** Ingredient IDs sorted by descending weight predominance (FDA label order). */
export function sortedIngredientIdsByPredominance(
  recipe: Pick<Recipe, 'ingredientIds' | 'ingredientAmounts' | 'ingredientUnits'>,
  ingredients: Ingredient[],
): string[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const amounts = recipe.ingredientAmounts ?? {};
  const units = recipe.ingredientUnits ?? {};
  const ids = recipe.ingredientIds.filter((id) => {
    const amt = amounts[id];
    return amt !== undefined && amt > 0;
  });
  return ids.sort((a, b) => {
    const ingA = byId.get(a);
    const ingB = byId.get(b);
    const gA = ingA ? ingredientAmountInGrams(amounts[a]!, ingA, resolveRecipeAmountUnit(ingA, units[a])) : 0;
    const gB = ingB ? ingredientAmountInGrams(amounts[b]!, ingB, resolveRecipeAmountUnit(ingB, units[b])) : 0;
    return gB - gA;
  });
}

/** Comma-separated INCI list in FDA descending-weight order. */
export function buildSortedInciList(
  recipe: Pick<Recipe, 'ingredientIds' | 'ingredientAmounts' | 'ingredientUnits'>,
  ingredients: Ingredient[],
): string {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  return sortedIngredientIdsByPredominance(recipe, ingredients)
    .map((id) => byId.get(id))
    .filter((i): i is Ingredient => !!i)
    .map((i) => (i.inci?.trim() ? i.inci : i.name))
    .join(', ');
}

export const DEFAULT_BASE_LABOR_RATE = 20;

/** Labor cost per finished unit: (rate/60 × minutes) ÷ batch yield. */
export function calculateLaborCostPerUnit(
  recipe: Pick<Recipe, 'laborMinutes' | 'barsPerBatch'>,
  baseLaborRate: number = DEFAULT_BASE_LABOR_RATE,
): number {
  const minutes = recipe.laborMinutes ?? 0;
  if (minutes <= 0 || baseLaborRate <= 0) return 0;
  const yieldCount = recipe.barsPerBatch && recipe.barsPerBatch > 0 ? recipe.barsPerBatch : 1;
  return ((baseLaborRate / 60) * minutes) / yieldCount;
}

/** Per-unit COGS: material (batch ÷ yield) + labor. */
export function calculateRecipeUnitCogs(
  recipe: Pick<Recipe, 'ingredientIds' | 'ingredientAmounts' | 'ingredientUnits' | 'customCosts' | 'laborMinutes' | 'barsPerBatch'>,
  ingredients: Ingredient[],
  baseLaborRate: number = DEFAULT_BASE_LABOR_RATE,
): number {
  const materialBatch = calculateRecipeMaterialCogs(recipe, ingredients);
  const yieldCount = recipe.barsPerBatch && recipe.barsPerBatch > 0 ? recipe.barsPerBatch : 1;
  const materialPerUnit = materialBatch / yieldCount;
  return materialPerUnit + calculateLaborCostPerUnit(recipe, baseLaborRate);
}

/** Sum raw material COGS for a recipe from ingredient amounts × fractional costs. */
export function calculateRecipeMaterialCogs(
  recipe: Pick<Recipe, 'ingredientIds' | 'ingredientAmounts' | 'ingredientUnits' | 'customCosts'>,
  ingredients: Ingredient[],
): number {
  const amounts = recipe.ingredientAmounts ?? {};
  const units = recipe.ingredientUnits ?? {};
  let total = 0;

  for (const id of recipe.ingredientIds) {
    const amount = amounts[id];
    const ing = ingredients.find((i) => i.id === id);
    if (!amount || !ing?.fractionalCost) continue;
    total += recipeLineAmountInBaseUnits(amount, ing, units[id]) * ing.fractionalCost;
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
