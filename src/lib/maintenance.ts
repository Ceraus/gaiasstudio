import { db } from '@/db/db';

export interface InitialSetupResetResult {
  ingredientsDeactivated: number;
  recipesRemoved: number;
}

/** Returns the recipe and ingredient library to the first-run setup state. */
export async function resetInitialSetup(): Promise<InitialSetupResetResult> {
  const recipesRemoved = await db.recipes.count();
  const ingredientsDeactivated = await db.ingredients.count();
  await db.recipes.clear();
  await db.ingredients.clear();
  return { ingredientsDeactivated, recipesRemoved };
}
