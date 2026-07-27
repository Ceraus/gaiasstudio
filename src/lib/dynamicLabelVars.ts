// ---------------------------------------------------------------------------
// Dynamic label text variables — resolved at print/export time.
// Example: {{LOT_CODE}} in a Fabric textbox → latest FDA lot code for the recipe.
// ---------------------------------------------------------------------------

import { buildSortedInciList } from '@/lib/inventoryMath';
import { lotCodesRepo } from '@/lib/lotCodes';
import type { Ingredient, Recipe } from '@/types';

/** Placeholder Rosa can type or insert in the label editor. */
export const LOT_CODE_VARIABLE = '{{LOT_CODE}}';
export const INGREDIENTS_VARIABLE = '{{INGREDIENTS}}';

const LOT_CODE_PATTERN = /\{\{LOT_CODE\}\}/g;
const INGREDIENTS_PATTERN = /\{\{INGREDIENTS\}\}/g;

/** Most recently generated lot code for a recipe (from completed work orders). */
export async function resolveLatestLotCodeForRecipe(recipeId: string | undefined): Promise<string | undefined> {
  if (!recipeId) return undefined;
  const codes = await lotCodesRepo.byRecipe(recipeId);
  return codes[0]?.code;
}

/** FDA-ordered INCI ingredient list for a recipe. */
export function resolveIngredientsForRecipe(
  recipe: Recipe | undefined,
  ingredients: Ingredient[],
): string | undefined {
  if (!recipe) return undefined;
  const text = buildSortedInciList(recipe, ingredients);
  return text || undefined;
}

/** Replace dynamic variables in serialized Fabric canvas JSON. */
export function applyDynamicVariablesToCanvasJson(
  canvasJson: string,
  vars: { lotCode?: string; ingredients?: string },
): string {
  try {
    const parsed = JSON.parse(canvasJson) as {
      objects?: Array<{ type?: string; text?: string; [key: string]: unknown }>;
    };
    const lot = vars.lotCode?.trim() ?? '';
    const ingredients = vars.ingredients?.trim() ?? '';
    for (const obj of parsed.objects ?? []) {
      const type = obj.type ?? '';
      if (type !== 'textbox' && type !== 'i-text' && type !== 'text') continue;
      if (typeof obj.text !== 'string' || !obj.text.includes('{{')) continue;
      obj.text = obj.text
        .replace(LOT_CODE_PATTERN, lot)
        .replace(INGREDIENTS_PATTERN, ingredients);
    }
    return JSON.stringify(parsed);
  } catch {
    return canvasJson;
  }
}

/** True when canvas JSON contains unresolved dynamic placeholders. */
export function canvasJsonHasLotCodeVariable(canvasJson: string): boolean {
  return canvasJson.includes(LOT_CODE_VARIABLE);
}

export function canvasJsonHasIngredientsVariable(canvasJson: string): boolean {
  return canvasJson.includes(INGREDIENTS_VARIABLE);
}
