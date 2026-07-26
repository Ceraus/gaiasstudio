// ---------------------------------------------------------------------------
// Lot Codes — FDA-compliant batch traceability for cosmetic products.
//
// Format: GE-[RECIPE_INITIALS]-[YYMMDD]-[BATCH#]
// Example: GE-LB-260726-001 (Lavender Bliss, July 26, 2026, batch 1)
// ---------------------------------------------------------------------------

import type { LotCode, Recipe } from '@/types';
import { db } from '@/db/db';
import { uid } from '@/lib/id';

/**
 * Extract initials from a recipe name for the lot code prefix.
 * "Lavender Bliss" → "LB", "Oatmeal Honey" → "OH", "Rose" → "RO"
 */
function recipeInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

/** Format a date as YYMMDD. */
function dateCode(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Generate the next lot code for a recipe.
 * Checks existing codes for the same recipe+date and increments the batch number.
 */
export async function generateLotCode(recipe: Recipe, productionDate?: Date): Promise<string> {
  const date = productionDate ?? new Date();
  const prefix = `GE-${recipeInitials(recipe.name)}-${dateCode(date)}`;

  // Find existing codes with the same prefix to determine the next batch number
  const existing = await db.lotCodes
    .where('recipeId')
    .equals(recipe.id)
    .toArray();

  const sameDayCodes = existing.filter((lc) => lc.code.startsWith(prefix));
  const batchNum = sameDayCodes.length + 1;

  return `${prefix}-${String(batchNum).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Lot code CRUD
// ---------------------------------------------------------------------------

export const lotCodesRepo = {
  all: () => db.lotCodes.orderBy('productionDate').reverse().toArray(),
  get: (id: string) => db.lotCodes.get(id),
  byRecipe: (recipeId: string) =>
    db.lotCodes.where('recipeId').equals(recipeId).reverse().sortBy('productionDate'),

  async create(input: Omit<LotCode, 'id' | 'createdAt'>): Promise<LotCode> {
    const rec: LotCode = { ...input, id: uid(), createdAt: Date.now() };
    await db.lotCodes.add(rec);
    return rec;
  },

  async update(id: string, patch: Partial<LotCode>) {
    await db.lotCodes.update(id, patch);
  },

  remove: (id: string) => db.lotCodes.delete(id),

  /** Link a work order to a lot code (adds orderId to linkedOrderIds). */
  async linkOrder(lotCodeId: string, orderId: string) {
    const lc = await db.lotCodes.get(lotCodeId);
    if (!lc) return;
    const ids = new Set(lc.linkedOrderIds ?? []);
    ids.add(orderId);
    await db.lotCodes.update(lotCodeId, { linkedOrderIds: [...ids] });
  },

  /** Unlink a work order from a lot code. */
  async unlinkOrder(lotCodeId: string, orderId: string) {
    const lc = await db.lotCodes.get(lotCodeId);
    if (!lc) return;
    const ids = (lc.linkedOrderIds ?? []).filter((id) => id !== orderId);
    await db.lotCodes.update(lotCodeId, { linkedOrderIds: ids });
  },
};

/**
 * Create a new lot code for a recipe and return both the code string and
 * the persisted record. Convenience wrapper over generateLotCode + create.
 */
export async function createLotCodeForRecipe(
  recipe: Recipe,
  _batchSize?: number,
  opts?: { productionDate?: Date },
): Promise<LotCode> {
  const date = opts?.productionDate ?? new Date();
  const code = await generateLotCode(recipe, date);
  return lotCodesRepo.create({
    code,
    recipeId: recipe.id,
    productionDate: date.getTime(),
  });
}
