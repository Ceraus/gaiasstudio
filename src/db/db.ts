import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  AssetRecord,
  DesignVersion,
  Draft,
  Ingredient,
  LabelSet,
  Recipe,
  SetPurchase,
} from '@/types';

// ---------------------------------------------------------------------------
// Local, offline-first database.
//
// This is the browser-native equivalent of the requested better-sqlite3 setup:
// IndexedDB via Dexie. The table shapes map 1:1 to SQLite tables and can be
// mirrored to better-sqlite3 without changing app code if this is later wrapped
// in Electron (see README "SQLite <-> Dexie mapping").
//
// IMPORTANT: the database ships completely EMPTY. There is no seed data — the
// user builds their own ingredient library, recipes and asset library.
// ---------------------------------------------------------------------------

export class GaiaDatabase extends Dexie {
  ingredients!: Table<Ingredient, string>;
  recipes!: Table<Recipe, string>;
  assets!: Table<AssetRecord, string>;
  versions!: Table<DesignVersion, string>;
  settings!: Table<AppSettings, string>;
  labelSets!: Table<LabelSet, string>;
  drafts!: Table<Draft, string>;
  setPurchases!: Table<SetPurchase, string>;

  constructor() {
    super('gaia-label-studio');

    // Version 1 — initial schema.
    this.version(1).stores({
      ingredients: 'id, name, isSoapBase, createdAt',
      recipes: 'id, name, createdAt',
      assets: 'id, kind, createdAt',
      versions: 'id, designId, templateId, context, createdAt',
      settings: 'id',
    });

    // Version 2 — adds `active` index to ingredients so we can query by status.
    // Existing rows that predate this migration are treated as active=true so
    // nothing disappears for users who already have data.
    this.version(2).stores({
      ingredients: 'id, name, isSoapBase, active, createdAt',
    }).upgrade(async (tx) => {
      await tx.table('ingredients').toCollection().modify((ing) => {
        if (ing.active === undefined) {
          ing.active = true; // legacy rows treated as active
        }
      });
    });

    // Version 3 — adds Label Sets for grouping front/back/side designs.
    this.version(3).stores({
      labelSets: 'id, name, recipeId, createdAt',
    });

    // Version 4 — adds Drafts (work-in-progress scratchpad).
    this.version(4).stores({
      drafts: 'id, name, templateId, createdAt',
    });

    // Version 5 — adds fractionalCost index to ingredients for COGS queries.
    // All new pricing fields are optional — no data migration required.
    this.version(5).stores({
      ingredients: 'id, name, isSoapBase, active, createdAt, fractionalCost',
    });

    // Version 6 — adds updatedAt index to drafts so the Workspace screen can
    // sort by most-recently-saved. Without this index Dexie throws on
    // orderBy('updatedAt'), which caused the Workspace screen to always appear
    // empty. No data migration needed — all existing rows already carry the
    // updatedAt field; we're just making it queryable.
    this.version(6).stores({
      drafts: 'id, name, templateId, createdAt, updatedAt',
    });

    // Version 7 — adds `archived` index to assets so photos can be moved to
    // an archive state without deletion. Existing rows default to archived=false.
    this.version(7).stores({
      assets: 'id, kind, archived, createdAt',
    }).upgrade(async (tx) => {
      await tx.table('assets').toCollection().modify((asset) => {
        if (asset.archived === undefined) {
          asset.archived = false;
        }
      });
    });

    // Version 8 — adds SetPurchases table for "bought as a set" pricing
    // (e.g., YumCraft 20-color dye set, Smalltongue 36-color mica set).
    this.version(8).stores({
      setPurchases: 'id, name, createdAt',
    });

    // Version 9 — adds a `collection` index to drafts so the Workspace dashboard
    // can group/filter designs by product line. `color` is a plain (unindexed)
    // field, so no data migration is required for existing rows.
    this.version(9).stores({
      drafts: 'id, name, templateId, collection, createdAt, updatedAt',
    });
  }
}

export const db = new GaiaDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  language: 'en',
  filenamePrefix: 'ROSA',
  bleedIn: 0.0625,
  safeIn: 0.0625,
  onboarded: false,
};
