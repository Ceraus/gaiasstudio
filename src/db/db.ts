import Dexie, { type Table } from 'dexie';
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
  EtsyListing,
  EtsySyncLog,
  Ingredient,
  LabelSet,
  PendingComfyIcon,
  LotCode,
  ProductListing,
  Receipt,
  Recipe,
  SetPurchase,
  VaultPdf,
  WorkOrder,
  WorkOrderItem,
} from '@/types';
import { canonicalIngredientKey } from '@/lib/ingredientResolution';

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
  collections!: Table<Collection, string>;
  customMaterials!: Table<CustomMaterial, string>;
  receipts!: Table<Receipt, string>;
  clients!: Table<Client, string>;
  workOrders!: Table<WorkOrder, string>;
  workOrderItems!: Table<WorkOrderItem, string>;
  etsyListings!: Table<EtsyListing, string>;
  productListings!: Table<ProductListing, string>;
  etsySyncLogs!: Table<EtsySyncLog, string>;
  lotCodes!: Table<LotCode, string>;
  pdfVault!: Table<VaultPdf, string>;
  customAffirmations!: Table<CustomAffirmation, string>;
  favoriteAffirmations!: Table<FavoriteAffirmation, string>;
  pendingComfyIcons!: Table<PendingComfyIcon, string>;

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

    // Version 9 — adds colour-coded Collections and indexes the two new draft
    // foreign keys so the Workspace can filter by collection and search by
    // recipe. Both draft fields are optional; existing rows need no migration.
    this.version(9).stores({
      collections: 'id, name, createdAt',
      drafts: 'id, name, templateId, collectionId, recipeId, createdAt, updatedAt',
    });

    // Version 10 — indexes recipe COGS/revenue fields for reporting queries.
    // Fields are optional; no data migration required.
    this.version(10).stores({
      recipes: 'id, name, createdAt, cogsTotal, retailPrice',
    });

    // Version 11 — adds the Custom Materials & Packaging library, a reusable
    // set of packaging/materials costs shared between Inventory and the
    // Recipe Builder (mirrors the Ingredients active/inactive pattern).
    this.version(11).stores({
      customMaterials: 'id, name, category, active, createdAt',
    });

    // Version 12 — adds Receipts, an automated expense ledger for finances.
    // Logging a receipt line item can optionally sync its price back into
    // Ingredients or Custom Materials.
    this.version(12).stores({
      receipts: 'id, vendor, date, category, createdAt',
    });

    // Version 13 — Clients & Work Orders (the SALES side; Receipts above are
    // the expense side). Items live in their own table so the shape maps 1:1
    // onto the better-sqlite3 schema in electron/schema.sql. New Ingredient
    // fields (supplierUrl, stockOnHand) and the Recipe field (barsPerBatch)
    // are optional non-indexed properties — no data migration required.
    this.version(13).stores({
      clients: 'id, name, createdAt',
      workOrders: 'id, orderNumber, clientId, status, createdAt',
      workOrderItems: 'id, workOrderId, recipeId, createdAt',
    });

    // Version 14 — Etsy integration, unified product catalog, lot codes.
    this.version(14).stores({
      etsyListings: 'id, etsyListingId, recipeId, state, createdAt',
      productListings: 'id, name, recipeId, draftId, etsyListingId, active, createdAt',
      etsySyncLogs: 'id, direction, entity, timestamp',
      lotCodes: 'id, code, recipeId, productionDate, createdAt',
    });

    // Version 15 — reset the initial workspace. Keep the full ingredient
    // catalog and user assets, but let each user activate ingredients and
    // create recipes as part of their own setup.
    this.version(15).upgrade(async (tx) => {
      await tx.table('recipes').clear();
      await tx.table('ingredients').toCollection().modify({ active: false });
    });

    // Version 16 — Glycerin Base (Clear) stays active as the default soap base.
    this.version(16).upgrade(async (tx) => {
      await tx.table('ingredients').toCollection().modify((ing: { name?: string; active?: boolean }) => {
        if (typeof ing.name === 'string' && ing.name.toLowerCase().trim() === 'glycerin base (clear)') {
          ing.active = true;
        }
      });
    });

    // Version 17 — canonical identity metadata for safe online autocomplete.
    // The index is intentionally non-unique: old databases may already contain
    // duplicates and must continue to open so the user can review/merge them.
    this.version(17).stores({
      ingredients: 'id, name, canonicalKey, isSoapBase, active, createdAt, fractionalCost',
    }).upgrade(async (tx) => {
      await tx.table('ingredients').toCollection().modify((ing: Ingredient) => {
        if (!ing.canonicalKey) {
          ing.canonicalKey = canonicalIngredientKey(ing);
        }
        if (!ing.sourceRefs?.length) {
          ing.sourceRefs = [{ provider: 'seed', id: ing.canonicalKey }];
        }
      });
    });

    // Version 18 — start from an empty user library. Icon artwork stays in
    // the bundled map and is reattached when the same ingredient is added later.
    this.version(18).upgrade(async (tx) => {
      await tx.table('ingredients').clear();
      await tx.table('recipes').toCollection().modify((recipe: Recipe) => {
        recipe.ingredientIds = [];
        recipe.ingredientAmounts = {};
      });
    });

    // Version 19 — recipe trash (soft delete).
    this.version(19).stores({
      recipes: 'id, name, createdAt, deletedAt',
    });

    // Version 20 — empty leftover Saved Designs (autosaved Avery test labels).
    // Recipes, ingredients, inventory, collections, and settings are untouched.
    this.version(20).upgrade(async (tx) => {
      await tx.table('drafts').clear();
    });

    // Version 21 — PDF Vault records so print-ready exports show in-app even
    // when the Electron filesystem list is unavailable or stale.
    this.version(21).stores({
      pdfVault: 'id, name, createdAt',
    });

    // Version 22 — Affirmation Center: user-written lines and hearted favorites.
    this.version(22).stores({
      customAffirmations: 'id, createdAt',
      favoriteAffirmations: 'id, source, refId, createdAt',
    });

    // Version 23 — ComfyUI icon jobs that failed while the host was offline.
    this.version(23).stores({
      pendingComfyIcons: 'id, ingredientId, createdAt',
    });
  }
}

export const db = new GaiaDatabase();

/** Default Ollama endpoint (Tailscale HTTPS on the AI gaming PC). */
export const DEFAULT_OLLAMA_URL = 'https://alaster.tail18528d.ts.net';

/** Seeded Unsplash demo app — Access Key is the Client-ID used for photo search. */
export const DEFAULT_UNSPLASH_APP_ID = '1039698';
export const DEFAULT_UNSPLASH_KEY = '012nArdZHVt27gGE6LZF1Dwr0czF7VC6lAJ6V-vH2gQ';
export const DEFAULT_UNSPLASH_SECRET = '2Vt_LD_iyx_C2XYqqIQXaydiyYc-Pw4zATHTN3hJlys';
export const DEFAULT_PIXABAY_KEY = '41419466-07b32c90ecd4a748aaf401ebd';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  language: 'es',
  filenamePrefix: "Gaia's Essences",
  bleedIn: 0.125,
  safeIn: 0.125,
  onboarded: false,
  favoriteTemplateIds: [],
  templateFavoritesConfigured: false,
  templateUsageCounts: {},
  uiScale: 1,
  localAiEnabled: true,
  comfyUiEnabled: true,
  comfyUiUrl: 'http://100.90.140.100:8188',
  localAiBackend: 'ollama',
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: 'gpt-oss:20b',
  ollamaModelText: 'qwen2.5:7b-instruct',
  ollamaModelJson: 'gpt-oss:20b',
  ollamaModelVision: 'llama3.2-vision',
  businessName: "Gaia's Essences",
  businessAddress: "1836 Westchester Ave, Unit #282, Bronx, NY 10472",
  baseLaborRate: 20,
  contact: 'customercare@gaiasessences.com · https://www.gaiasessences.com/',
  isTrainingMode: true,
  hasSeenTrainingWelcome: false,
  unsplashAppId: DEFAULT_UNSPLASH_APP_ID,
  unsplashKey: DEFAULT_UNSPLASH_KEY,
  unsplashSecretKey: DEFAULT_UNSPLASH_SECRET,
  pixabayKey: DEFAULT_PIXABAY_KEY,
};
