import { db, DEFAULT_SETTINGS } from './db';
import type {
  AppSettings,
  AssetRecord,
  Collection,
  DesignVersion,
  Draft,
  Ingredient,
  LabelSet,
  Recipe,
  SetPurchase,
} from '@/types';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

import { calculateFractionalCost, calculateProfitMargin, calculateRecipeMaterialCogs } from '@/lib/inventoryMath';

export {
  calculateFractionalCost,
  calculateProfitMargin,
  calculateRecipeMaterialCogs,
} from '@/lib/inventoryMath';

function recipeFinancials(recipe: Recipe, ingredients: Ingredient[]) {
  const cogsTotal = calculateRecipeMaterialCogs(recipe, ingredients);
  const profitMargin =
    recipe.retailPrice !== undefined
      ? calculateProfitMargin(recipe.retailPrice, cogsTotal)
      : undefined;
  return { cogsTotal, profitMargin };
}

// --- Ingredients -----------------------------------------------------------

export const ingredientsRepo = {
  all: () => db.ingredients.orderBy('name').toArray(),
  active: () =>
    db.ingredients
      .filter((i) => i.active === true)
      .sortBy('name'),
  inactive: () =>
    db.ingredients
      .filter((i) => i.active !== true)
      .sortBy('name'),
  async create(
    input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Ingredient> {
    const now = Date.now();
    const fractionalCost = calculateFractionalCost(input);
    const rec: Ingredient = {
      ...input,
      active: input.active ?? false,
      fractionalCost,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.ingredients.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Ingredient>) {
    const existing = await db.ingredients.get(id);
    const merged = existing ? { ...existing, ...patch } : patch;
    const fractionalCost = calculateFractionalCost(merged);
    await db.ingredients.update(id, { ...patch, fractionalCost, updatedAt: Date.now() });
  },
  async toggleActive(id: string) {
    const ing = await db.ingredients.get(id);
    if (!ing) return;
    await db.ingredients.update(id, { active: !ing.active, updatedAt: Date.now() });
  },
  remove: (id: string) => db.ingredients.delete(id),
};

// --- Recipes ---------------------------------------------------------------

export const recipesRepo = {
  all: () => db.recipes.orderBy('name').toArray(),
  get: (id: string) => db.recipes.get(id),
  async create(
    input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Recipe> {
    const now = Date.now();
    const ingredients = await db.ingredients.toArray();
    const draft: Recipe = { ...input, id: uid(), createdAt: now, updatedAt: now };
    const { cogsTotal, profitMargin } = recipeFinancials(draft, ingredients);
    const rec: Recipe = { ...draft, cogsTotal, profitMargin };
    await db.recipes.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Recipe>) {
    const existing = await db.recipes.get(id);
    if (existing) {
      const merged = { ...existing, ...patch };
      const ingredients = await db.ingredients.toArray();
      const { cogsTotal, profitMargin } = recipeFinancials(merged, ingredients);
      await db.recipes.update(id, {
        ...patch,
        cogsTotal,
        profitMargin,
        updatedAt: Date.now(),
      });
      return;
    }
    await db.recipes.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.recipes.delete(id),
};

// --- Assets ----------------------------------------------------------------

export const assetsRepo = {
  all: () => db.assets.orderBy('createdAt').reverse().toArray(),
  active: () =>
    db.assets
      .filter((a) => !a.archived)
      .sortBy('createdAt')
      .then((arr) => arr.reverse()),
  archived: () =>
    db.assets
      .filter((a) => !!a.archived)
      .sortBy('createdAt')
      .then((arr) => arr.reverse()),
  byKind: (kind: AssetRecord['kind']) =>
    db.assets.where('kind').equals(kind).reverse().sortBy('createdAt'),
  async create(input: Omit<AssetRecord, 'id' | 'createdAt'>): Promise<AssetRecord> {
    const rec: AssetRecord = { ...input, archived: false, id: uid(), createdAt: Date.now() };
    await db.assets.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<AssetRecord>) {
    await db.assets.update(id, patch);
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
  remove: (id: string) => db.versions.delete(id),
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

// --- Settings --------------------------------------------------------------

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    const existing = await db.settings.get('app');
    if (existing) return { ...DEFAULT_SETTINGS, ...existing };
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },
  async update(patch: Partial<AppSettings>) {
    const current = await this.get();
    const next = { ...current, ...patch, id: 'app' as const };
    await db.settings.put(next);
    return next;
  },
};
