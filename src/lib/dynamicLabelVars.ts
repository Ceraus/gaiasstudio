// ---------------------------------------------------------------------------
// Dynamic label text variables — resolved at print/export time.
// Example: {{LOT_CODE}} in a Fabric textbox → latest FDA lot code for the recipe.
// ---------------------------------------------------------------------------

import { lotCodesRepo } from '@/lib/lotCodes';

/** Placeholder Rosa can type or insert in the label editor. */
export const LOT_CODE_VARIABLE = '{{LOT_CODE}}';

const VARIABLE_PATTERN = /\{\{LOT_CODE\}\}/g;

/** Most recently generated lot code for a recipe (from completed work orders). */
export async function resolveLatestLotCodeForRecipe(recipeId: string | undefined): Promise<string | undefined> {
  if (!recipeId) return undefined;
  const codes = await lotCodesRepo.byRecipe(recipeId);
  return codes[0]?.code;
}

/** Replace dynamic variables in serialized Fabric canvas JSON. */
export function applyDynamicVariablesToCanvasJson(
  canvasJson: string,
  vars: { lotCode?: string },
): string {
  try {
    const parsed = JSON.parse(canvasJson) as {
      objects?: Array<{ type?: string; text?: string; [key: string]: unknown }>;
    };
    const lot = vars.lotCode?.trim() ?? '';
    for (const obj of parsed.objects ?? []) {
      const type = obj.type ?? '';
      if (type !== 'textbox' && type !== 'i-text' && type !== 'text') continue;
      if (typeof obj.text !== 'string' || !obj.text.includes('{{')) continue;
      obj.text = obj.text.replace(VARIABLE_PATTERN, lot);
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
