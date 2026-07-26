import { forceRestoreSeedRecipes } from '@/data/recipeSeed';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';

export interface RosaMaintenanceResult {
  ingredientsDeactivated: number;
  recipesRestored: number;
  recipeNames: string[];
}

/** Deactivates all ingredients and restores Rosa's 28 seed recipes. */
export async function runRosaMaintenance(): Promise<RosaMaintenanceResult> {
  const ingredientsDeactivated = await ingredientsRepo.deactivateAll();
  const recipesRestored = await forceRestoreSeedRecipes();
  const recipeNames = (await recipesRepo.all()).map((r) => r.name);
  return { ingredientsDeactivated, recipesRestored, recipeNames };
}
