import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  AssetRecord,
  DesignVersion,
  Ingredient,
  Recipe,
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

  constructor() {
    super('gaia-label-studio');
    this.version(1).stores({
      ingredients: 'id, name, isSoapBase, createdAt',
      recipes: 'id, name, createdAt',
      assets: 'id, kind, createdAt',
      versions: 'id, designId, templateId, context, createdAt',
      settings: 'id',
    });
  }
}

export const db = new GaiaDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  language: 'en',
  filenamePrefix: 'GAIA',
  bleedIn: 0.0625,
  safeIn: 0.0625,
  onboarded: false,
};
