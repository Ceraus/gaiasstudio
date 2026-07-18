import { db, DEFAULT_SETTINGS } from './db';
import type {
  AppSettings,
  AssetRecord,
  DesignVersion,
  Ingredient,
  Recipe,
} from '@/types';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// --- Ingredients -----------------------------------------------------------

export const ingredientsRepo = {
  all: () => db.ingredients.orderBy('name').toArray(),
  async create(
    input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Ingredient> {
    const now = Date.now();
    const rec: Ingredient = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.ingredients.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Ingredient>) {
    await db.ingredients.update(id, { ...patch, updatedAt: Date.now() });
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
    const rec: Recipe = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.recipes.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Recipe>) {
    await db.recipes.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.recipes.delete(id),
};

// --- Assets ----------------------------------------------------------------

export const assetsRepo = {
  all: () => db.assets.orderBy('createdAt').reverse().toArray(),
  byKind: (kind: AssetRecord['kind']) =>
    db.assets.where('kind').equals(kind).reverse().sortBy('createdAt'),
  async create(input: Omit<AssetRecord, 'id' | 'createdAt'>): Promise<AssetRecord> {
    const rec: AssetRecord = { ...input, id: uid(), createdAt: Date.now() };
    await db.assets.add(rec);
    return rec;
  },
  remove: (id: string) => db.assets.delete(id),
};

// --- Versions (non-destructive history) ------------------------------------

export const versionsRepo = {
  forDesign: (designId: string) =>
    db.versions.where('designId').equals(designId).reverse().sortBy('createdAt'),
  async create(input: Omit<DesignVersion, 'id' | 'createdAt'>): Promise<DesignVersion> {
    const rec: DesignVersion = { ...input, id: uid(), createdAt: Date.now() };
    await db.versions.add(rec);
    // Keep history bounded per design (latest 40 snapshots).
    const all = await db.versions
      .where('designId')
      .equals(input.designId)
      .reverse()
      .sortBy('createdAt');
    if (all.length > 40) {
      await db.versions.bulkDelete(all.slice(40).map((v) => v.id));
    }
    return rec;
  },
  remove: (id: string) => db.versions.delete(id),
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
