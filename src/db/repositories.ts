import { db, DEFAULT_OLLAMA_URL, DEFAULT_PIXABAY_KEY, DEFAULT_SETTINGS, DEFAULT_UNSPLASH_APP_ID, DEFAULT_UNSPLASH_KEY, DEFAULT_UNSPLASH_SECRET } from './db';
import type {
  AppSettings,
  AssetRecord,
  Client,
  Collection,
  CustomAffirmation,
  CustomMaterial,
  FavoriteAffirmation,
  DesignVersion,
  Draft,
  ExpenseCategory,
  Ingredient,
  LabelSet,
  ProductListing,
  Receipt,
  ReceiptLineItem,
  Recipe,
  SetPurchase,
  VaultPdf,
  WorkOrder,
  WorkOrderItem,
  WorkOrderUsageLine,
} from '@/types';

import {
  calculateFractionalCost,
  calculateProfitMargin,
  calculateRecipeMaterialCogs,
  calculateRecipeUnitCogs,
  DEFAULT_BASE_LABOR_RATE,
  VOLUME_CATEGORIES,
  isVolumeIngredient,
  baseUnitOf,
  recipeLineAmountInBaseUnits,
} from '@/lib/inventoryMath';

export { VOLUME_CATEGORIES, isVolumeIngredient, baseUnitOf };
import { uid } from '@/lib/id';
import { createLotCodeForRecipe, lotCodesRepo } from '@/lib/lotCodes';
import {
  hydrateSettingsFromStorage,
  prepareSettingsForStorage,
} from '@/lib/secretVault';
import {
  decryptSettingsFromStorage,
  encryptSettingsForStorage,
} from '@/lib/crypto';
import { migrateTrainingSettings } from '@/lib/trainingMode';
import {
  canonicalIngredientKey,
  mergeSourceRefs,
  resolveIngredientCandidate,
  type IngredientCandidate,
  type IngredientResolution,
} from '@/lib/ingredientResolution';
import { registerIngredientIconAlias, resolveIngredientIconKey } from '@/data/ingredientIconPaths';
import { nextLibraryAccentIndex } from '@/lib/libraryIngredientAccent';
import {
  ensureDefaultSoapBase,
  isDefaultSoapBaseName,
  withDefaultSoapBaseIds,
} from '@/data/ingredientSeed';
import { applyGlossarySpanishName, isRealSpanishIngredientName } from '@/lib/ingredientNameTranslate';

function recipeFinancials(recipe: Recipe, ingredients: Ingredient[], baseLaborRate = DEFAULT_BASE_LABOR_RATE) {
  const cogsTotal = calculateRecipeMaterialCogs(recipe, ingredients);
  const unitCogs = calculateRecipeUnitCogs(recipe, ingredients, baseLaborRate);
  const profitMargin =
    recipe.retailPrice !== undefined
      ? calculateProfitMargin(recipe.retailPrice, unitCogs)
      : undefined;
  return { cogsTotal, profitMargin };
}

// --- Ingredients -----------------------------------------------------------

export const ingredientsRepo = {
  all: async () => {
    const items = await db.ingredients.orderBy('name').toArray();
    for (const item of items) {
      if (item.iconKey?.startsWith('asset_')) {
        const bundled = resolveIngredientIconKey(item.name);
        if (bundled && !bundled.startsWith('asset_')) {
          item.iconKey = bundled;
          void db.ingredients.update(item.id, { iconKey: bundled });
        }
      }
      if (item.iconKey) registerIngredientIconAlias(item.name, item.iconKey);
    }
    return items;
  },
  active: () =>
    db.ingredients
      .filter((i) => i.active === true)
      .sortBy('name'),
  async create(
    input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Ingredient> {
    const now = Date.now();
    const canonicalKey = input.canonicalKey || canonicalIngredientKey(input);
    const existing = await db.ingredients.where('canonicalKey').equals(canonicalKey).first()
      ?? (await db.ingredients.toArray()).find(
        (ingredient) => canonicalIngredientKey(ingredient) === canonicalKey,
      );
    if (existing) {
      const nameEs = !isRealSpanishIngredientName(existing.nameEs, existing.name, existing.inci)
        ? applyGlossarySpanishName({
          name: existing.name,
          nameEs: input.nameEs ?? existing.nameEs,
          inci: existing.inci ?? input.inci,
        })
        : undefined;
      const patch: Partial<Ingredient> = {
        canonicalKey,
        aliases: [...new Set([...(existing.aliases ?? []), ...(input.aliases ?? [])])],
        sourceRefs: mergeSourceRefs(existing.sourceRefs, input.sourceRefs),
        active: existing.active || input.active,
        ...(nameEs ? { nameEs } : {}),
        updatedAt: now,
      };
      await db.ingredients.update(existing.id, patch);
      return { ...existing, ...patch };
    }
    const fractionalCost = calculateFractionalCost(input);
    const iconKey = input.iconKey || resolveIngredientIconKey(input.name);
    const libraryAccent = input.libraryAccent ?? nextLibraryAccentIndex(await db.ingredients.toArray());
    const nameEs = applyGlossarySpanishName(input);
    const rec: Ingredient = {
      ...input,
      ...(nameEs ? { nameEs } : {}),
      measurementType: input.measurementType ?? (isVolumeIngredient(input) ? 'volume' : 'weight'),
      active: input.active ?? false,
      canonicalKey,
      iconKey,
      fractionalCost,
      libraryAccent,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    if (iconKey) registerIngredientIconAlias(rec.name, iconKey);
    await db.ingredients.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Ingredient>) {
    const existing = await db.ingredients.get(id);
    const merged = existing ? { ...existing, ...patch } : patch;
    const fractionalCost = calculateFractionalCost(merged);
    const canonicalKey = existing && (patch.name !== undefined || patch.inci !== undefined)
      ? canonicalIngredientKey(merged as Ingredient)
      : patch.canonicalKey;
    await db.ingredients.update(id, {
      ...patch,
      ...(canonicalKey ? { canonicalKey } : {}),
      fractionalCost,
      updatedAt: Date.now(),
    });
  },
  async resolveCandidate(candidate: IngredientCandidate): Promise<IngredientResolution> {
    return resolveIngredientCandidate(candidate, await db.ingredients.toArray());
  },
  async resolveOrCreate(
    input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<{ ingredient: Ingredient; created: boolean; resolution: IngredientResolution }> {
    const all = await db.ingredients.toArray();
    const resolution = resolveIngredientCandidate(input, all);
    if (resolution.decision === 'reuse' && resolution.match) {
      const sourceRefs = mergeSourceRefs(resolution.match.sourceRefs, input.sourceRefs);
      const aliases = [...new Set([
        ...(resolution.match.aliases ?? []),
        ...(input.aliases ?? []),
        input.name,
      ])].filter((name) => name !== resolution.match?.name);
      const nameEs = !isRealSpanishIngredientName(resolution.match.nameEs, resolution.match.name, resolution.match.inci)
        ? applyGlossarySpanishName({
          name: resolution.match.name,
          nameEs: input.nameEs ?? resolution.match.nameEs,
          inci: resolution.match.inci ?? input.inci,
        })
        : undefined;
      await this.update(resolution.match.id, {
        active: resolution.match.active || input.active,
        sourceRefs,
        aliases,
        ...(nameEs ? { nameEs } : {}),
      });
      return {
        ingredient: {
          ...resolution.match,
          active: resolution.match.active || input.active,
          sourceRefs,
          aliases,
          ...(nameEs ? { nameEs } : {}),
        },
        created: false,
        resolution,
      };
    }
    const ingredient = await this.create({
      ...input,
      canonicalKey: input.canonicalKey || canonicalIngredientKey(input),
    });
    return { ingredient, created: true, resolution };
  },
  async mergeIngredients(keepId: string, dropId: string): Promise<Ingredient> {
    if (keepId === dropId) {
      const same = await db.ingredients.get(keepId);
      if (!same) throw new Error('Ingredient not found.');
      return same;
    }
    const [keep, drop] = await Promise.all([
      db.ingredients.get(keepId),
      db.ingredients.get(dropId),
    ]);
    if (!keep || !drop) throw new Error('Ingredient not found.');

    const now = Date.now();
    const mergedStock = keep.stockOnHand !== undefined || drop.stockOnHand !== undefined
      ? (keep.stockOnHand ?? 0) + (drop.stockOnHand ?? 0)
      : undefined;
    const mergedNameEs = applyGlossarySpanishName(keep) ?? applyGlossarySpanishName(drop);
    const merged: Ingredient = {
      ...keep,
      ...(mergedNameEs ? { nameEs: mergedNameEs } : {}),
      benefit: keep.benefit || drop.benefit,
      inci: keep.inci || drop.inci,
      category: keep.category ?? drop.category,
      measurementType: keep.measurementType ?? drop.measurementType,
      active: keep.active || drop.active,
      isSoapBase: keep.isSoapBase || drop.isSoapBase,
      aliases: [...new Set([...(keep.aliases ?? []), ...(drop.aliases ?? []), drop.name])],
      sourceRefs: mergeSourceRefs(keep.sourceRefs, drop.sourceRefs),
      stockOnHand: mergedStock,
      updatedAt: now,
    };

    await db.transaction(
      'rw',
      db.ingredients,
      db.recipes,
      db.receipts,
      db.setPurchases,
      async () => {
        await db.ingredients.put(merged);

        const recipes = await db.recipes.filter((recipe) => recipe.ingredientIds.includes(dropId)).toArray();
        for (const recipe of recipes) {
          const ingredientIds = [...new Set(recipe.ingredientIds.map((id) => id === dropId ? keepId : id))];
          const ingredientAmounts = { ...(recipe.ingredientAmounts ?? {}) };
          if (ingredientAmounts[dropId] !== undefined) {
            ingredientAmounts[keepId] = (ingredientAmounts[keepId] ?? 0) + ingredientAmounts[dropId];
            delete ingredientAmounts[dropId];
          }
          const ingredientUnits = { ...(recipe.ingredientUnits ?? {}) };
          if (ingredientUnits[dropId] !== undefined) {
            if (ingredientUnits[keepId] === undefined) ingredientUnits[keepId] = ingredientUnits[dropId];
            delete ingredientUnits[dropId];
          }
          await db.recipes.update(recipe.id, { ingredientIds, ingredientAmounts, ingredientUnits, updatedAt: now });
        }

        const receipts = await db.receipts
          .filter((receipt) => receipt.lineItems.some((line) => line.ingredientId === dropId))
          .toArray();
        for (const receipt of receipts) {
          await db.receipts.update(receipt.id, {
            lineItems: receipt.lineItems.map((line) => (
              line.ingredientId === dropId ? { ...line, ingredientId: keepId } : line
            )),
            updatedAt: now,
          });
        }

        const purchases = await db.setPurchases
          .filter((purchase) => purchase.assignedIngredientIds.includes(dropId))
          .toArray();
        for (const purchase of purchases) {
          await db.setPurchases.update(purchase.id, {
            assignedIngredientIds: [
              ...new Set(purchase.assignedIngredientIds.map((id) => id === dropId ? keepId : id)),
            ],
          });
        }
        await db.ingredients.delete(dropId);
      },
    );
    return merged;
  },
  async toggleActive(id: string) {
    const ing = await db.ingredients.get(id);
    if (!ing) return;
    await db.ingredients.update(id, { active: !ing.active, updatedAt: Date.now() });
  },
  /** Deactivates every active ingredient whose id is not in `keepIds`. */
  async deactivateExcept(keepIds: Set<string>): Promise<number> {
    const active = await db.ingredients.filter((i) => i.active === true).toArray();
    const now = Date.now();
    let count = 0;
    for (const ing of active) {
      if (!keepIds.has(ing.id)) {
        await db.ingredients.update(ing.id, { active: false, updatedAt: now });
        count++;
      }
    }
    return count;
  },
  /** Deactivates every currently active ingredient. */
  async deactivateAll(): Promise<number> {
    return this.deactivateExcept(new Set());
  },
  async remove(id: string) {
    const ing = await db.ingredients.get(id);
    if (ing && isDefaultSoapBaseName(ing.name)) return;
    await db.ingredients.delete(id);
  },
};

// --- Custom Materials & Packaging --------------------------------------------

export const customMaterialsRepo = {
  all: () => db.customMaterials.orderBy('name').toArray(),
  active: () =>
    db.customMaterials
      .filter((m) => m.active === true)
      .sortBy('name'),
  inactive: () =>
    db.customMaterials
      .filter((m) => m.active !== true)
      .sortBy('name'),
  async create(
    input: Omit<CustomMaterial, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CustomMaterial> {
    const now = Date.now();
    const rec: CustomMaterial = {
      ...input,
      active: input.active ?? true,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.customMaterials.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<CustomMaterial>) {
    await db.customMaterials.update(id, { ...patch, updatedAt: Date.now() });
  },
  async toggleActive(id: string) {
    const material = await db.customMaterials.get(id);
    if (!material) return;
    await db.customMaterials.update(id, { active: !material.active, updatedAt: Date.now() });
  },
  remove: (id: string) => db.customMaterials.delete(id),
};

// --- Recipes ---------------------------------------------------------------

export const recipesRepo = {
  async all() {
    const base = await ensureDefaultSoapBase();
    const rows = await db.recipes.orderBy('name').toArray();
    for (const row of rows) {
      const footer = (row.footer ?? '').replace(/^Rosa Suarez\s*·\s*/i, '');
      if (row.footer && footer !== row.footer) {
        row.footer = footer;
        void db.recipes.update(row.id, { footer });
      }
      if (base) {
        const ingredientIds = withDefaultSoapBaseIds(row.ingredientIds ?? [], base.id);
        if (ingredientIds.join('\0') !== (row.ingredientIds ?? []).join('\0')) {
          row.ingredientIds = ingredientIds;
          void db.recipes.update(row.id, { ingredientIds });
        }
      }
    }
    return rows.filter((row) => !row.deletedAt);
  },
  async trashed() {
    const rows = await db.recipes.toArray();
    return rows
      .filter((row) => !!row.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
  },
  get: (id: string) => db.recipes.get(id),
  async create(
    input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Recipe> {
    const now = Date.now();
    const base = await ensureDefaultSoapBase();
    const ingredients = await db.ingredients.toArray();
    const settings = await settingsRepo.get();
    const draft: Recipe = {
      ...input,
      ingredientIds: withDefaultSoapBaseIds(input.ingredientIds ?? [], base?.id),
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    const { cogsTotal, profitMargin } = recipeFinancials(draft, ingredients, settings.baseLaborRate ?? DEFAULT_BASE_LABOR_RATE);
    const rec: Recipe = { ...draft, cogsTotal, profitMargin };
    await db.recipes.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Recipe>) {
    const existing = await db.recipes.get(id);
    if (existing) {
      const base = await ensureDefaultSoapBase();
      const merged = {
        ...existing,
        ...patch,
        ingredientIds: withDefaultSoapBaseIds(
          patch.ingredientIds ?? existing.ingredientIds ?? [],
          base?.id,
        ),
      };
      const ingredients = await db.ingredients.toArray();
      const settings = await settingsRepo.get();
      const { cogsTotal, profitMargin } = recipeFinancials(merged, ingredients, settings.baseLaborRate ?? DEFAULT_BASE_LABOR_RATE);
      await db.recipes.update(id, {
        ...patch,
        ingredientIds: merged.ingredientIds,
        cogsTotal,
        profitMargin,
        updatedAt: Date.now(),
      });
      return;
    }
    await db.recipes.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.recipes.update(id, { deletedAt: Date.now(), updatedAt: Date.now() }),
  async restore(id: string) {
    await db.recipes.where('id').equals(id).modify((row) => {
      delete row.deletedAt;
      row.updatedAt = Date.now();
    });
  },
  purge: (id: string) => db.recipes.delete(id),
};

// --- Assets ----------------------------------------------------------------

export const assetsRepo = {
  get: (id: string) => db.assets.get(id),
  all: () => db.assets.orderBy('createdAt').reverse().toArray(),
  async create(input: Omit<AssetRecord, 'id' | 'createdAt'>): Promise<AssetRecord> {
    const rec: AssetRecord = { ...input, archived: false, id: uid(), createdAt: Date.now() };
    await db.assets.add(rec);
    return rec;
  },
  archive: (id: string) => db.assets.update(id, { archived: true }),
  unarchive: (id: string) => db.assets.update(id, { archived: false }),
  remove: (id: string) => db.assets.delete(id),
  bulkRemove: (ids: string[]) => db.assets.bulkDelete(ids),
};

// --- Versions (non-destructive history) ------------------------------------

export const versionsRepo = {
  /** Returns versions newest-first. (Dexie's .reverse() is ignored by .sortBy, so we reverse in JS.) */
  forDesign: async (designId: string) => {
    const asc = await db.versions.where('designId').equals(designId).sortBy('createdAt');
    return asc.reverse();
  },
  async create(input: Omit<DesignVersion, 'id' | 'createdAt'>): Promise<DesignVersion> {
    const rec: DesignVersion = { ...input, id: uid(), createdAt: Date.now() };
    await db.versions.add(rec);
    // Keep history bounded per design (latest 40 snapshots).
    // sortBy('createdAt') returns ASCENDING (oldest first), so we delete
    // the first (oldest) entries beyond the cap, not the newest.
    const all = await db.versions
      .where('designId')
      .equals(input.designId)
      .sortBy('createdAt');
    if (all.length > 40) {
      await db.versions.bulkDelete(all.slice(0, all.length - 40).map((v) => v.id));
    }
    return rec;
  },
};

// --- Label Sets ------------------------------------------------------------

export const setsRepo = {
  all: () => db.labelSets.orderBy('name').toArray(),
  get: (id: string) => db.labelSets.get(id),
  async create(name: string, recipeId?: string): Promise<LabelSet> {
    const now = Date.now();
    const rec: LabelSet = { id: uid(), name, recipeId, createdAt: now, updatedAt: now };
    await db.labelSets.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<LabelSet>) {
    await db.labelSets.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.labelSets.delete(id),
};

// --- Drafts ----------------------------------------------------------------

export const draftsRepo = {
  all: () => db.drafts.orderBy('updatedAt').reverse().toArray(),
  get: (id: string) => db.drafts.get(id),
  async save(patch: Partial<Draft> & { id?: string }): Promise<Draft> {
    const now = Date.now();
    if (patch.id) {
      const existing = await db.drafts.get(patch.id);
      if (existing) {
        // Autosave sends optional fields as undefined when they aren't known
        // right now; those must not wipe values the user already set.
        const defined = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined),
        ) as Partial<Draft>;
        const updated: Draft = { ...existing, ...defined, updatedAt: now };
        await db.drafts.put(updated);
        return updated;
      }
    }
    const rec: Draft = {
      id: uid(),
      name: patch.name ?? 'Untitled Draft',
      designJson: patch.designJson ?? '{}',
      templateId: patch.templateId ?? '',
      context: patch.context ?? 'front',
      thumb: patch.thumb,
      notes: patch.notes,
      collectionId: patch.collectionId,
      recipeId: patch.recipeId,
      createdAt: now,
      updatedAt: now,
    };
    await db.drafts.add(rec);
    return rec;
  },
  async rename(id: string, name: string) {
    await db.drafts.update(id, { name, updatedAt: Date.now() });
  },
  /** Moves a design into a collection, or out of every collection when null. */
  async setCollection(id: string, collectionId: string | null) {
    await db.drafts.update(id, { collectionId: collectionId ?? undefined, updatedAt: Date.now() });
  },
  /**
   * Copies a design, keeping the artwork, template and collection but giving it
   * a fresh identity. Used by "Duplicate" so a scent variant can start from a
   * finished label instead of a blank canvas.
   */
  async duplicate(id: string): Promise<Draft | undefined> {
    const source = await db.drafts.get(id);
    if (!source) return undefined;
    const now = Date.now();
    const copy: Draft = { ...source, id: uid(), name: copyName(source.name), createdAt: now, updatedAt: now };
    await db.drafts.add(copy);
    return copy;
  },
  remove: (id: string) => db.drafts.delete(id),
  /** Empties Saved Designs only. Leaves recipes, ingredients, collections, settings. */
  async clear(): Promise<number> {
    const count = await db.drafts.count();
    await db.drafts.clear();
    return count;
  },
};

/** "Rose Bar" → "Rose Bar copy" → "Rose Bar copy 2" … */
function copyName(name: string): string {
  const match = /^(.*?) copy(?: (\d+))?$/.exec(name);
  if (!match) return `${name} copy`;
  return `${match[1]} copy ${Number(match[2] ?? 1) + 1}`;
}

// --- Collections -----------------------------------------------------------

export const collectionsRepo = {
  all: () => db.collections.orderBy('name').toArray(),
  get: (id: string) => db.collections.get(id),
  async create(name: string, color: string): Promise<Collection> {
    const now = Date.now();
    const rec: Collection = { id: uid(), name, color, createdAt: now, updatedAt: now };
    await db.collections.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Pick<Collection, 'name' | 'color'>>) {
    await db.collections.update(id, { ...patch, updatedAt: Date.now() });
  },
  /** Deleting a collection un-files its designs rather than deleting them. */
  async remove(id: string) {
    await db.transaction('rw', db.collections, db.drafts, async () => {
      await db.drafts.where('collectionId').equals(id).modify((d) => {
        d.collectionId = undefined;
      });
      await db.collections.delete(id);
    });
  },
};

// --- Set Purchases ---------------------------------------------------------

export const setPurchasesRepo = {
  all: () => db.setPurchases.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.setPurchases.get(id),
  async create(
    input: Omit<SetPurchase, 'id' | 'createdAt'>,
  ): Promise<SetPurchase> {
    const rec: SetPurchase = { ...input, id: uid(), createdAt: Date.now() };
    await db.setPurchases.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<SetPurchase, 'id' | 'createdAt'>>) {
    await db.setPurchases.update(id, patch);
  },
  remove: (id: string) => db.setPurchases.delete(id),
};

// --- Receipts ----------------------------------------------------------------

function computeReceiptTotals(lineItems: ReceiptLineItem[], tax?: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal + (tax ?? 0);
  return { subtotal, total };
}

/**
 * Pushes each line item's unitCost back into the Ingredient or Custom
 * Material it's linked to, when the line item opts in via `syncPrice`.
 * Ingredients store the *total* paid for a purchase (purchasePrice) plus the
 * quantity (purchaseSize), so a receipt line syncs quantity → purchaseSize
 * and lineTotal → purchasePrice. Custom Materials store a flat per-unit
 * cost, so a receipt line syncs unitCost → cost directly.
 */
async function syncLineItemPrices(lineItems: ReceiptLineItem[]) {
  for (const item of lineItems) {
    if (!item.syncPrice) continue;
    if (item.ingredientId) {
      const ing = await db.ingredients.get(item.ingredientId);
      if (ing) {
        await ingredientsRepo.update(item.ingredientId, {
          purchaseSize: item.quantity,
          purchasePrice: item.lineTotal,
        });
      }
    } else if (item.materialId) {
      const material = await db.customMaterials.get(item.materialId);
      if (material) {
        await customMaterialsRepo.update(item.materialId, { cost: item.unitCost });
      }
    }
  }
}

export const receiptsRepo = {
  all: async () => {
    const asc = await db.receipts.orderBy('date').toArray();
    return asc.reverse();
  },
  get: (id: string) => db.receipts.get(id),
  async create(
    input: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'subtotal' | 'total'>,
  ): Promise<Receipt> {
    const now = Date.now();
    const { subtotal, total } = computeReceiptTotals(input.lineItems, input.tax);
    const rec: Receipt = { ...input, subtotal, total, id: uid(), createdAt: now, updatedAt: now };
    await db.receipts.add(rec);
    await syncLineItemPrices(rec.lineItems);
    return rec;
  },
  async update(
    id: string,
    patch: Partial<Omit<Receipt, 'id' | 'createdAt' | 'subtotal' | 'total'>>,
  ) {
    const existing = await db.receipts.get(id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    const { subtotal, total } = computeReceiptTotals(merged.lineItems, merged.tax);
    await db.receipts.update(id, { ...patch, subtotal, total, updatedAt: Date.now() });
    if (patch.lineItems) await syncLineItemPrices(patch.lineItems);
  },
  remove: (id: string) => db.receipts.delete(id),
  /** Totals for this month / this year / all time, plus a spend-by-category breakdown. */
  summarize(receipts: Receipt[]) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const year = now.getFullYear();

    let thisMonth = 0;
    let thisYear = 0;
    let allTime = 0;
    const byCategory = new Map<ExpenseCategory, number>();

    for (const r of receipts) {
      const d = new Date(r.date);
      allTime += r.total;
      if (d.getFullYear() === year) {
        thisYear += r.total;
        if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) thisMonth += r.total;
      }
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.total);
    }

    return {
      thisMonth,
      thisYear,
      allTime,
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
    };
  },
};

// --- Clients ----------------------------------------------------------------

export const clientsRepo = {
  all: () => db.clients.orderBy('name').toArray(),
  get: (id: string) => db.clients.get(id),
  async create(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const now = Date.now();
    const rec: Client = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.clients.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Client>) {
    await db.clients.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.clients.delete(id),
  /**
   * Returns the existing client with this name (case-insensitive) or creates
   * one. Keeps the client list free of "Maria" / "maria" duplicates when the
   * user types a name into the New Order form.
   */
  async findOrCreateByName(name: string): Promise<Client> {
    const needle = name.trim().toLowerCase();
    const existing = (await db.clients.toArray()).find(
      (c) => c.name.trim().toLowerCase() === needle,
    );
    if (existing) return existing;
    return this.create({ name: name.trim() });
  },
};

// --- Work Orders -------------------------------------------------------------
//
// The pipeline: New Order (open) → Mark Completed → ingredient stock deducted
// + COGS snapshot stored → PDF receipt. "Reopen" restores exactly the stock
// that was deducted (from the usage snapshot), so mistakes are reversible.
// ---------------------------------------------------------------------------

export interface OrderUsageShortfall {
  ingredientId: string;
  name: string;
  needed: number;
  onHand: number;
  unit: 'g' | 'drops';
}

export interface OrderUsageComputation {
  lines: WorkOrderUsageLine[];
  /** Total raw-material cost of all priced lines (USD). */
  materialCost: number;
  /** Tracked ingredients whose stock would drop below zero. */
  shortfalls: OrderUsageShortfall[];
}

/**
 * Computes the exact fractional ingredient usage for a set of order items.
 *
 * Per-unit usage = recipe amount ÷ barsPerBatch (default 1), then × quantity.
 * Weight ingredients are in grams, volume ingredients in drops — the same
 * base units as `Ingredient.fractionalCost`, so cost is a simple multiply.
 */
export function computeOrderUsage(
  items: Array<Pick<WorkOrderItem, 'recipeId' | 'quantity'>>,
  recipes: Recipe[],
  ingredients: Ingredient[],
): OrderUsageComputation {
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
  const totals = new Map<string, number>(); // ingredientId → base-unit amount

  for (const item of items) {
    const recipe = recipeById.get(item.recipeId);
    if (!recipe || item.quantity <= 0) continue;
    const amounts = recipe.ingredientAmounts ?? {};
    const units = recipe.ingredientUnits ?? {};
    const perBatch = recipe.barsPerBatch && recipe.barsPerBatch > 0 ? recipe.barsPerBatch : 1;
    for (const [ingredientId, batchAmount] of Object.entries(amounts)) {
      if (!batchAmount || batchAmount <= 0) continue;
      const ing = ingredientById.get(ingredientId);
      const baseAmount = ing ? recipeLineAmountInBaseUnits(batchAmount, ing, units[ingredientId]) : batchAmount;
      const used = (baseAmount / perBatch) * item.quantity;
      totals.set(ingredientId, (totals.get(ingredientId) ?? 0) + used);
    }
  }

  const lines: WorkOrderUsageLine[] = [];
  const shortfalls: OrderUsageShortfall[] = [];
  let materialCost = 0;

  for (const [ingredientId, rawAmount] of totals) {
    const ing = ingredientById.get(ingredientId);
    const amount = Math.round(rawAmount * 1000) / 1000; // avoid float dust
    const unit = ing ? baseUnitOf(ing) : 'g';
    const cost = ing?.fractionalCost !== undefined ? amount * ing.fractionalCost : undefined;
    if (cost !== undefined) materialCost += cost;
    const tracked = ing?.stockOnHand !== undefined;
    lines.push({
      ingredientId,
      ingredientName: ing?.name ?? 'Unknown ingredient',
      amount,
      unit,
      cost,
      deducted: tracked,
    });
    if (ing && tracked && (ing.stockOnHand ?? 0) < amount) {
      shortfalls.push({
        ingredientId,
        name: ing.name,
        needed: amount,
        onHand: ing.stockOnHand ?? 0,
        unit,
      });
    }
  }

  lines.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
  return { lines, materialCost, shortfalls };
}

export interface NewWorkOrderItemInput {
  recipeId: string;
  recipeName: string;
  quantity: number;
  unitPrice: number;
}

export const workOrdersRepo = {
  /** All orders, newest first. */
  async all(): Promise<WorkOrder[]> {
    const asc = await db.workOrders.orderBy('createdAt').toArray();
    return asc.reverse();
  },
  get: (id: string) => db.workOrders.get(id),
  items: (workOrderId: string) =>
    db.workOrderItems.where('workOrderId').equals(workOrderId).sortBy('createdAt'),
  /** Every item row across all orders (one query for the dashboard). */
  allItems: () => db.workOrderItems.toArray(),

  /** Next sequential human-friendly number: ORD-001, ORD-002, … (delete-safe). */
  async nextOrderNumber(): Promise<string> {
    const all = await db.workOrders.toArray();
    const maxN = all.reduce((max, o) => {
      const m = /^ORD-(\d+)$/.exec(o.orderNumber ?? '');
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `ORD-${String(maxN + 1).padStart(3, '0')}`;
  },

  /**
   * Creates an open order plus its item rows in one transaction.
   * The client is resolved (or created) from the typed name.
   */
  async create(input: {
    clientName: string;
    notes?: string;
    items: NewWorkOrderItemInput[];
    type?: 'client' | 'internal';
  }): Promise<{ order: WorkOrder; items: WorkOrderItem[] }> {
    const client = await clientsRepo.findOrCreateByName(input.clientName);
    const orderNumber = await this.nextOrderNumber();
    const now = Date.now();
    const orderId = uid();
    const orderType = input.type ?? 'client';

    const items: WorkOrderItem[] = input.items
      .filter((i) => i.quantity > 0)
      .map((i, idx) => ({
        id: uid(),
        workOrderId: orderId,
        recipeId: i.recipeId,
        recipeName: i.recipeName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: Math.round(i.quantity * i.unitPrice * 100) / 100,
        createdAt: now + idx, // preserves row order on sortBy('createdAt')
      }));

    const subtotal = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
    const order: WorkOrder = {
      id: orderId,
      orderNumber,
      type: orderType,
      clientId: client.id,
      clientName: client.name,
      status: 'open',
      notes: input.notes?.trim() || undefined,
      subtotal,
      total: subtotal,
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', db.workOrders, db.workOrderItems, async () => {
      await db.workOrders.add(order);
      await db.workOrderItems.bulkAdd(items);
    });
    return { order, items };
  },

  async update(id: string, patch: Partial<WorkOrder>) {
    await db.workOrders.update(id, { ...patch, updatedAt: Date.now() });
  },

  /** Deletes the order and its item rows. */
  async remove(id: string) {
    await db.transaction('rw', db.workOrders, db.workOrderItems, async () => {
      const itemIds = (await db.workOrderItems.where('workOrderId').equals(id).toArray()).map(
        (i) => i.id,
      );
      await db.workOrderItems.bulkDelete(itemIds);
      await db.workOrders.delete(id);
    });
  },

  /**
   * Marks an order Completed: computes the exact fractional ingredient usage,
   * deducts every TRACKED ingredient's stockOnHand (clamped at 0), and stores
   * the usage snapshot + material-cost (COGS) on the order.
   */
  async complete(id: string): Promise<OrderUsageComputation | null> {
    const order = await db.workOrders.get(id);
    if (!order || order.status === 'completed') return null;

    const [items, recipes, ingredients] = await Promise.all([
      this.items(id),
      db.recipes.toArray(),
      db.ingredients.toArray(),
    ]);
    const usage = computeOrderUsage(items, recipes, ingredients);
    const now = Date.now();

    const lotCodesByRecipe = new Map<string, string>();
    const seenRecipeIds = new Set<string>();
    for (const item of items) {
      if (seenRecipeIds.has(item.recipeId)) continue;
      seenRecipeIds.add(item.recipeId);
      const recipe = recipes.find((r) => r.id === item.recipeId);
      if (!recipe) continue;
      const lotRec = await createLotCodeForRecipe(recipe, undefined, { productionDate: new Date(now) });
      await lotCodesRepo.linkOrder(lotRec.id, id);
      lotCodesByRecipe.set(item.recipeId, lotRec.code);
    }
    const orderLotCode = [...lotCodesByRecipe.values()].join(', ') || undefined;
    const isInternal = order.type === 'internal';

    await db.transaction('rw', db.workOrders, db.workOrderItems, db.ingredients, db.productListings, async () => {
      for (const line of usage.lines) {
        if (!line.deducted) continue;
        const ing = await db.ingredients.get(line.ingredientId);
        if (!ing || ing.stockOnHand === undefined) continue;
        const next = Math.max(0, Math.round((ing.stockOnHand - line.amount) * 1000) / 1000);
        await db.ingredients.update(line.ingredientId, { stockOnHand: next, updatedAt: now });
      }
      if (isInternal) {
        for (const item of items) {
          let listing = await db.productListings.where('recipeId').equals(item.recipeId).first();
          if (!listing) {
            listing = {
              id: uid(),
              name: item.recipeName,
              recipeId: item.recipeId,
              active: true,
              inventoryCount: item.quantity,
              createdAt: now,
              updatedAt: now,
            };
            await db.productListings.add(listing);
          } else {
            await db.productListings.update(listing.id, {
              inventoryCount: (listing.inventoryCount ?? 0) + item.quantity,
              updatedAt: now,
            });
          }
        }
      }
      for (const item of items) {
        const code = lotCodesByRecipe.get(item.recipeId);
        if (code) await db.workOrderItems.update(item.id, { lotCode: code });
      }
      await db.workOrders.update(id, {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
        materialCost: Math.round(usage.materialCost * 100) / 100,
        usageSnapshot: usage.lines,
        lotCode: orderLotCode,
      });
    });
    return usage;
  },

  /**
   * Reverts a completed order to open and restores exactly the stock that the
   * completion deducted (using the stored snapshot — recipe edits made in the
   * meantime cannot corrupt the restore).
   */
  async reopen(id: string) {
    const order = await db.workOrders.get(id);
    if (!order || order.status !== 'completed') return;
    const now = Date.now();
    const isInternal = order.type === 'internal';

    await db.transaction('rw', db.workOrders, db.workOrderItems, db.ingredients, db.productListings, async () => {
      for (const line of order.usageSnapshot ?? []) {
        if (!line.deducted) continue;
        const ing = await db.ingredients.get(line.ingredientId);
        if (!ing || ing.stockOnHand === undefined) continue;
        const next = Math.round((ing.stockOnHand + line.amount) * 1000) / 1000;
        await db.ingredients.update(line.ingredientId, { stockOnHand: next, updatedAt: now });
      }
      if (isInternal) {
        const itemRows = await db.workOrderItems.where('workOrderId').equals(id).toArray();
        for (const item of itemRows) {
          const listing = await db.productListings.where('recipeId').equals(item.recipeId).first();
          if (!listing) continue;
          await db.productListings.update(listing.id, {
            inventoryCount: Math.max(0, (listing.inventoryCount ?? 0) - item.quantity),
            updatedAt: now,
          });
        }
      }
      const itemRows = await db.workOrderItems.where('workOrderId').equals(id).toArray();
      for (const row of itemRows) {
        if (row.lotCode) await db.workOrderItems.update(row.id, { lotCode: undefined });
      }
      const linkedLots = await db.lotCodes
        .filter((lc) => (lc.linkedOrderIds ?? []).includes(id))
        .toArray();
      for (const lc of linkedLots) {
        await lotCodesRepo.unlinkOrder(lc.id, id);
      }
      await db.workOrders.update(id, {
        status: 'open',
        completedAt: undefined,
        materialCost: undefined,
        usageSnapshot: undefined,
        lotCode: undefined,
        updatedAt: now,
      });
    });
  },
};

// --- Settings --------------------------------------------------------------

export const productListingsRepo = {
  all: () => db.productListings.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.productListings.get(id),
  byRecipe: (recipeId: string) =>
    db.productListings.where('recipeId').equals(recipeId).first(),

  async create(input: Omit<ProductListing, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductListing> {
    const now = Date.now();
    const rec: ProductListing = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.productListings.add(rec);
    return rec;
  },

  async update(id: string, patch: Partial<ProductListing>) {
    await db.productListings.update(id, { ...patch, updatedAt: Date.now() });
  },

  remove: (id: string) => db.productListings.delete(id),
};

export const pdfVaultRepo = {
  all: () => db.pdfVault.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.pdfVault.get(id),
  async add(record: VaultPdf): Promise<VaultPdf> {
    await db.pdfVault.put(record);
    return record;
  },
  remove: (id: string) => db.pdfVault.delete(id),
};

export const customAffirmationsRepo = {
  all: () => db.customAffirmations.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.customAffirmations.get(id),
  async create(textEn: string, textEs: string): Promise<CustomAffirmation> {
    const rec: CustomAffirmation = {
      id: uid(),
      textEn: textEn.trim(),
      textEs: textEs.trim() || textEn.trim(),
      createdAt: Date.now(),
    };
    await db.customAffirmations.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Pick<CustomAffirmation, 'textEn' | 'textEs'>>) {
    await db.customAffirmations.update(id, patch);
  },
  async remove(id: string) {
    await db.transaction('rw', db.customAffirmations, db.favoriteAffirmations, async () => {
      await db.favoriteAffirmations.where('refId').equals(id).delete();
      await db.customAffirmations.delete(id);
    });
  },
};

export function favoriteAffirmationId(source: FavoriteAffirmation['source'], refId: string): string {
  return `${source}:${refId}`;
}

export const favoriteAffirmationsRepo = {
  all: () => db.favoriteAffirmations.orderBy('createdAt').reverse().toArray(),
  async isFavorite(source: FavoriteAffirmation['source'], refId: string): Promise<boolean> {
    const row = await db.favoriteAffirmations.get(favoriteAffirmationId(source, refId));
    return !!row;
  },
  async toggle(source: FavoriteAffirmation['source'], refId: string): Promise<boolean> {
    const id = favoriteAffirmationId(source, refId);
    const existing = await db.favoriteAffirmations.get(id);
    if (existing) {
      await db.favoriteAffirmations.delete(id);
      return false;
    }
    const rec: FavoriteAffirmation = { id, source, refId, createdAt: Date.now() };
    await db.favoriteAffirmations.add(rec);
    return true;
  },
};

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    const existing = await db.settings.get('app');
    let merged = migrateTrainingSettings(
      existing ? { ...DEFAULT_SETTINGS, ...existing } : DEFAULT_SETTINGS,
    );
    if (!merged.ollamaUrl?.trim()) {
      merged = { ...merged, ollamaUrl: DEFAULT_OLLAMA_URL };
    }
    if (!merged.unsplashKey?.trim() || merged.unsplashKey === '012nArdZHVt27ggE6LZF1Dwr0czF7VC6lAJ6V-vH2gQ') {
      merged = { ...merged, unsplashKey: DEFAULT_UNSPLASH_KEY };
    }
    if (!merged.unsplashSecretKey?.trim()) {
      merged = { ...merged, unsplashSecretKey: DEFAULT_UNSPLASH_SECRET };
    }
    if (!merged.unsplashAppId?.trim()) {
      merged = { ...merged, unsplashAppId: DEFAULT_UNSPLASH_APP_ID };
    }
    if (!merged.pixabayKey?.trim()) {
      merged = { ...merged, pixabayKey: DEFAULT_PIXABAY_KEY };
    }
    if (!existing) await db.settings.put(DEFAULT_SETTINGS);
    const decrypted = await decryptSettingsFromStorage(merged);
    return hydrateSettingsFromStorage(decrypted);
  },
  async update(patch: Partial<AppSettings>) {
    const current = await this.get();
    const next = { ...current, ...patch, id: 'app' as const };
    const pinPrepared = await prepareSettingsForStorage(next);
    const stored = await encryptSettingsForStorage(pinPrepared);
    await db.settings.put(stored);
    const decrypted = await decryptSettingsFromStorage(stored);
    return hydrateSettingsFromStorage(decrypted);
  },
};
