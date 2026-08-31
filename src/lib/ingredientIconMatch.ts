import type { AppSettings, Ingredient } from '@/types';
import { ingredientsRepo } from '@/db/repositories';
import {
  listIngredientIconKeys,
  registerIngredientIconAlias,
  resolveIngredientIconKey,
} from '@/data/ingredientIconPaths';
import { canonicalizeIngredientName } from '@/lib/ingredientResolution';
import { resolveBundledIngredientPngSlug } from '@/lib/ingredientCatalog';
import { matchIngredientIcon } from '@/lib/localAi';

function shortlistIconKeys(name: string): string[] {
  const tokens = new Set(canonicalizeIngredientName(name).split(' ').filter((token) => token.length > 2));
  const keys = listIngredientIconKeys();
  const scored = keys
    .map((key) => {
      const overlap = canonicalizeIngredientName(key).split(' ').filter((token) => tokens.has(token)).length;
      return { key, overlap };
    })
    .filter((row) => row.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((row) => row.key);
  return (scored.length ? scored : keys).slice(0, 40);
}

/** Attach a bundled icon to a new ingredient, using local AI only when the name is ambiguous. */
export async function attachIngredientIcon(
  ingredient: Ingredient,
  settings: AppSettings,
): Promise<Ingredient> {
  const pngSlug = resolveBundledIngredientPngSlug(ingredient.name, ingredient.iconKey);
  if (pngSlug) {
    if (ingredient.iconKey !== pngSlug) {
      await ingredientsRepo.update(ingredient.id, { iconKey: pngSlug });
    }
    registerIngredientIconAlias(ingredient.name, pngSlug);
    return { ...ingredient, iconKey: pngSlug };
  }
  if (ingredient.iconKey) {
    registerIngredientIconAlias(ingredient.name, ingredient.iconKey);
    return ingredient;
  }
  const deterministic = resolveIngredientIconKey(ingredient.name);
  if (deterministic) {
    await ingredientsRepo.update(ingredient.id, { iconKey: deterministic });
    registerIngredientIconAlias(ingredient.name, deterministic);
    return { ...ingredient, iconKey: deterministic };
  }
  // ComfyUI owns icon creation — do not load the 20B text model into VRAM first.
  if (settings.comfyUiEnabled) return ingredient;
  const result = await matchIngredientIcon(ingredient.name, shortlistIconKeys(ingredient.name), settings);
  if (!result.iconKey) return ingredient;
  await ingredientsRepo.update(ingredient.id, { iconKey: result.iconKey });
  registerIngredientIconAlias(ingredient.name, result.iconKey);
  return { ...ingredient, iconKey: result.iconKey };
}
