import type { Ingredient } from '@/types';

function isRecipeBaseIngredient(ing: Pick<Ingredient, 'isSoapBase' | 'category'>): boolean {
  return ing.isSoapBase === true || ing.category === 'base';
}

/**
 * Ingredient whose icon should appear as the recipe-card hero.
 *
 * Prefers extras (non-base) in recipe order. If any extra has a Comfy-generated
 * `asset_*` icon, that one wins so a refresh updates both the row and the hero.
 * Base-only recipes fall back to the first ingredient.
 */
export function pickRecipeHeroIngredient(recipeIngredients: Ingredient[]): Ingredient | undefined {
  const extras = recipeIngredients.filter((ing) => !isRecipeBaseIngredient(ing));
  const pool = extras.length > 0 ? extras : recipeIngredients;
  if (pool.length === 0) return undefined;
  return pool.find((ing) => ing.iconKey?.startsWith('asset_')) ?? pool[0];
}
