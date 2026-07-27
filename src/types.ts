// ---------------------------------------------------------------------------
// Shared domain types for Gaia's Label Studio.
// ---------------------------------------------------------------------------

export type LabelShape =
  | 'circle'
  | 'oval'
  | 'square'
  | 'rectangle'
  | 'rounded-rectangle';

export type LabelContext = 'front' | 'back' | 'side';

/** Fully explicit, print-ready sheet geometry (all values in inches). */
export interface AveryTemplate {
  id: string;
  name: string;
  brand: string;
  averyCode: string | null;
  shape: LabelShape;
  labelWidthIn: number;
  labelHeightIn: number;
  pageWidthIn: number;
  pageHeightIn: number;
  columns: number;
  rows: number;
  marginTopIn: number;
  marginLeftIn: number;
  gutterXIn: number;
  gutterYIn: number;
  cornerRadiusIn: number;
  perSheet: number;
  /** When true the design canvas is landscape but printed rotated 90° (wrap ribbons). */
  rotateForPrint: boolean;
  contexts: LabelContext[];
  geometrySource?: string;
}

export interface AveryDataset {
  generatedAt: string;
  note: string;
  count: number;
  templates: AveryTemplate[];
}

// --- Local database records (SQLite-equivalent tables backed by Dexie) ------

export type IngredientCategory =
  | 'oil'
  | 'butter'
  | 'clay'
  | 'botanical'
  | 'floral'
  | 'citrus'
  | 'exfoliant'
  | 'essential-oil'
  | 'fragrance'
  | 'colorant'
  | 'base'
  | 'wax'
  | 'additive'
  | 'milk'
  | 'seed'
  | 'spice'
  | 'other';

export interface Ingredient {
  id: string;
  name: string;
  /** Plain-English benefit statement shown to shoppers. */
  benefit: string;
  /** INCI / scientific name printed on the back label. */
  inci?: string;
  /** Flags a melt-and-pour / glycerin base so recipes can be validated. */
  isSoapBase: boolean;
  /** Cost per fluid/weight ounce (USD) — used by the batch cost calculator. */
  costPerOz?: number;
  /**
   * Active ingredients are shown at the top of the recipe builder.
   * New ingredients start as inactive so the list isn't overwhelming.
   * The user clicks to promote them to active when they're part of their
   * regular toolkit.
   */
  active: boolean;
  /** Visual grouping for the icon shown in the ingredient list. */
  category?: IngredientCategory;

  // ── Inventory / COGS fields ──────────────────────────────────────────────
  /** 'weight' = grams, 'volume' = drops. Determines the cost calculation unit. */
  measurementType?: 'weight' | 'volume';
  /** Numeric quantity of the purchase (e.g. 16 for a 16 oz bottle). */
  purchaseSize?: number;
  /** Unit of the purchase quantity. */
  purchaseUnit?: 'oz' | 'lbs' | 'ml' | 'g';
  /** What you paid for the purchase (USD). */
  purchasePrice?: number;
  /**
   * Auto-calculated from purchaseSize/purchaseUnit/purchasePrice.
   * Weight mode: cost per gram. Volume mode: cost per drop.
   */
  fractionalCost?: number;
  /** Supplier product page URL — used by the price importer to re-check pricing. */
  supplierUrl?: string;
  /**
   * Current stock on hand, in the ingredient's base unit
   * (grams for weight ingredients, drops for volume ingredients).
   * Undefined = not tracked; completed work orders only deduct tracked stock.
   */
  stockOnHand?: number;

  createdAt: number;
  updatedAt: number;
}

/**
 * Per-ingredient entry within a recipe, carrying both the reference and
 * an optional usage amount (grams for weight ingredients, drops for volume).
 */
export interface RecipeIngredient {
  ingredientId: string;
  amount?: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredientIds: string[];
  /** Headline benefit for the whole product. */
  benefit: string;
  netWeight?: string;
  directions?: string;
  warnings?: string;
  /** Business footer / contact line printed on every label. */
  footer?: string;
  /**
   * Per-ingredient usage amounts keyed by ingredient ID.
   * Weight ingredients: grams. Volume ingredients: drops.
   */
  ingredientAmounts?: Record<string, number>;
  /** Optional manual color override — a Tailwind color key like 'pink', 'green', etc. */
  color?: string;
  /** Per-bar packaging / materials costs added by the user (e.g. bags, boxes, labels). */
  customCosts?: Array<{ id: string; name: string; cost: number; unit?: string; materialId?: string }>;
  /** Planned retail price per bar (USD). */
  retailPrice?: number;
  /** Auto-calculated total raw material COGS when the recipe is saved. */
  cogsTotal?: number;
  /** Auto-calculated gross profit margin % when retail price is set. */
  profitMargin?: number;
  /**
   * How many bars/units one batch of `ingredientAmounts` yields.
   * Work orders divide the batch amounts by this to deduct per-unit usage.
   * Undefined/0 is treated as 1 (amounts are per single unit).
   */
  barsPerBatch?: number;
  /** Minutes Rosa spends producing one batch — used for labor COGS. */
  laborMinutes?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AssetRecord {
  id: string;
  name: string;
  /** 'photo' = user upload, 'logo' = brand mark, 'ai' = generated, 'stock' = free stock. */
  kind: 'photo' | 'logo' | 'ai' | 'stock' | 'background';
  /** Data URL so the asset stays fully offline. */
  dataUrl: string;
  width: number;
  height: number;
  /** Approximate file size in bytes derived from the data URL length. */
  fileSize?: number;
  /** When true the asset is hidden from the main grid but not deleted. */
  archived?: boolean;
  createdAt: number;
}

export interface DesignVersion {
  id: string;
  designId: string;
  templateId: string;
  context: LabelContext;
  /** Serialized Fabric canvas JSON. */
  canvasJson: string;
  /** Small preview thumbnail (data URL). */
  thumbnail?: string;
  label: string;
  createdAt: number;
}

export interface AppSettings {
  id: 'app';
  language: 'en' | 'es';
  filenamePrefix: string;
  googleAiApiKey?: string;
  unsplashKey?: string;
  pixabayKey?: string;
  bleedIn: number;
  safeIn: number;
  /** First-run coach marks are shown until the user dismisses them. */
  onboarded?: boolean;
  /**
   * Up to 8 brand hex colors shown at the top of every color picker.
   * Helps makers keep consistent brand colors across all label designs.
   */
  brandColors?: string[];
  /** Business / maker name — required on FDA-compliant cosmetic labels. */
  businessName?: string;
  /** Business address — required on FDA-compliant cosmetic labels. */
  businessAddress?: string;
  /** Hourly labor rate (USD) for COGS / margin calculations. Default 20. */
  baseLaborRate?: number;
  /** Contact info (email, phone, or website) printed on back labels. */
  contact?: string;
  /**
   * Interface zoom (1 = 100%). Defaults to 1.25 so every control and label is
   * 25% larger out of the box.
   */
  uiScale?: number;
  /** Enables the floating debug panel in production builds. */
  debugMode?: boolean;
  /** Show/hide the Label Sets tab in navigation (default: false). */
  showLabelSets?: boolean;

  /** Phone layout: streamlined bottom tabs vs full classic app. */
  mobileLayout?: 'classic' | 'streamlined' | 'auto';

  /** User-picked Avery template ids for quick access. */
  favoriteTemplateIds?: string[];
  templateFavoritesConfigured?: boolean;
  templateUsageCounts?: Record<string, number>;

  /** Cloud backup sync (Hostinger JSON endpoint). */
  cloudSyncEnabled?: boolean;
  cloudSyncUrl?: string;
  cloudSyncToken?: string;
  cloudSyncLastPushedAt?: string;
  cloudSyncLastPulledAt?: string;

  /**
   * Training Mode — simplified UI and sequential workflow enforcement.
   * ON by default for new installs; persisted so Rosa can turn it off later.
   */
  isTrainingMode?: boolean;
  /** First-run Training Mode welcome popup dismissed. */
  hasSeenTrainingWelcome?: boolean;

  // ── Local AI (optional, 100% offline) ────────────────────────────────────
  /**
   * Local AI copywriting assist. Enabled by default for new installs (bundled
   * backend). The user can turn it off here; it never calls out to the cloud.
   */
  localAiEnabled?: boolean;
  /** `bundled` = in-app model; `ollama` = network/local Ollama server. */
  localAiBackend?: 'bundled' | 'ollama';
  /** Ollama API base URL (e.g. http://192.168.1.10:11434 on your LAN). */
  ollamaUrl?: string;
  /** Model tag served by Ollama (e.g. llama3.2, qwen2.5). */
  ollamaModel?: string;

  // ── Guided tours & tips ───────────────────────────────────────────────────
  /** Tour ids the user finished (or skipped) — they stop auto-suggesting. */
  completedTours?: string[];
  /** Tip banner ids permanently dismissed with "Got it". */
  dismissedTips?: string[];

  // ── Etsy integration ─────────────────────────────────────────────────────
  /** Etsy shop connection credentials and config. */
  etsyShop?: EtsyShopConfig;

  // ── Social media (used on public site + marketing copy) ────────────────
  /** Instagram username without @, e.g. "gaiasessences". */
  instagramHandle?: string;
  /** TikTok username without @. */
  tiktokHandle?: string;

  // ── App lock (local PIN) ─────────────────────────────────────────────────
  /** PBKDF2 hash of the user's PIN (base64). */
  lockPinHash?: string;
  /** PBKDF2 salt (base64). */
  lockPinSalt?: string;
  lockPinIterations?: number;
  /** AES-GCM encrypted blob of API keys & OAuth tokens. */
  secretsEnc?: string;
}

// ---------------------------------------------------------------------------
// Drafts — work-in-progress label designs saved as a scratchpad.
// ---------------------------------------------------------------------------

export interface Draft {
  id: string;
  name: string;
  /** Serialized Fabric canvas JSON */
  designJson: string;
  /** Avery template ID */
  templateId: string;
  /** Label context (front/back/side) */
  context: LabelContext;
  /** Small thumbnail data URL */
  thumb?: string;
  /** Optional notes */
  notes?: string;
  /** Product line this design belongs to — drives the card colour. */
  collectionId?: string;
  /** Recipe the design was built from, so the workspace can search by it. */
  recipeId?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Collections — colour-coded product lines used to organise saved designs.
// ---------------------------------------------------------------------------

export interface Collection {
  id: string;
  /** e.g. "Oily Skin", "Holiday 2026", "Wedding Favours". */
  name: string;
  /** Hex colour (`#rrggbb`) painted onto every card in the collection. */
  color: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Set Purchases — items bought together in one purchase (e.g., dye sets).
// ---------------------------------------------------------------------------

export interface SetPurchase {
  id: string;
  name: string;
  totalPrice: number;
  itemCount: number;
  /** Auto-calculated: totalPrice / itemCount */
  pricePerItem: number;
  assignedIngredientIds: string[];
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Custom Materials & Packaging — a reusable library of packaging/materials
// costs (e.g. bags, boxes, labels) shared between Inventory and the Recipe
// Builder, mirroring the Ingredients active/inactive pattern.
// ---------------------------------------------------------------------------

export type MaterialCategory = 'packaging' | 'label' | 'bag' | 'box' | 'container' | 'other';

export interface CustomMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  cost: number;
  /** Free text, e.g. "per bar", "per item". Defaults to "per item" when blank. */
  unit?: string;
  /** Regularly-used materials are active; the rest sit in an inactive pool, like ingredients. */
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Receipts — an automated expense ledger for finances. Logging a receipt can
// optionally push its line-item prices back into Inventory / Custom Materials
// so pricing stays current without a separate manual edit.
// ---------------------------------------------------------------------------

export type ExpenseCategory = 'ingredients' | 'packaging' | 'shipping' | 'equipment' | 'other';

export interface ReceiptLineItem {
  id: string;
  description: string;
  /** Links back to the Ingredients library, when this line item is restocking an ingredient. */
  ingredientId?: string;
  /** Links back to the Custom Materials library, when this line item is restocking a material. */
  materialId?: string;
  quantity: number;
  unitCost: number;
  /** quantity * unitCost by default; the user can override it directly. */
  lineTotal: number;
  /** When true and ingredientId/materialId is set, saving the receipt pushes unitCost into that record's price. */
  syncPrice: boolean;
}

export interface Receipt {
  id: string;
  vendor: string;
  /** Purchase date (timestamp), user-editable — defaults to today. */
  date: number;
  category: ExpenseCategory;
  lineItems: ReceiptLineItem[];
  tax?: number;
  /** Auto-calculated: sum of lineItem.lineTotal. */
  subtotal: number;
  /** Auto-calculated: subtotal + (tax ?? 0). */
  total: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Clients & Work Orders — the SALES side of the business tracker.
//
// Note the split: `Receipt` (above) is the EXPENSE ledger (money Rosa spends
// at suppliers); a `WorkOrder` is money a client pays her. Completing a work
// order deducts tracked ingredient stock and produces a client-facing PDF
// receipt. Items live in their own table so the mapping to better-sqlite3
// stays 1:1 (see electron/schema.sql).
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type WorkOrderStatus = 'open' | 'completed';

/**
 * One recipe line inside a work order. The recipe name and unit price are
 * denormalized at order time so receipts stay correct even if the recipe is
 * later renamed, re-priced or deleted.
 */
export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  /** Retail price per unit at the time of sale (USD). */
  unitPrice: number;
  /** quantity × unitPrice, stored for cheap receipt/summary rendering. */
  lineTotal: number;
  /** FDA lot code assigned when the parent work order is completed. */
  lotCode?: string;
  createdAt: number;
}

/**
 * A single ingredient deduction recorded when an order is completed.
 * Stored on the order so "Reopen" can restore exactly what was deducted.
 */
export interface WorkOrderUsageLine {
  ingredientId: string;
  ingredientName: string;
  /** Amount used in the ingredient's base unit (grams or drops). */
  amount: number;
  unit: 'g' | 'drops';
  /** Material cost of this line (amount × fractionalCost), when priced. */
  cost?: number;
  /** True when stockOnHand was tracked and actually reduced. */
  deducted: boolean;
}

export type WorkOrderType = 'client' | 'internal';

export interface WorkOrder {
  id: string;
  /** Human-friendly sequential number, e.g. "ORD-007". */
  orderNumber: string;
  /** Client sale vs internal stock production (Etsy restock). */
  type?: WorkOrderType;
  clientId: string;
  /** Denormalized so the dashboard renders without a join. */
  clientName: string;
  status: WorkOrderStatus;
  notes?: string;
  /** Sum of item line totals (USD). */
  subtotal: number;
  /** Grand total (USD). Currently equals subtotal — no tax handling. */
  total: number;
  /** Raw-material cost snapshot computed at completion (COGS). */
  materialCost?: number;
  /** Exact ingredient deductions applied at completion. */
  usageSnapshot?: WorkOrderUsageLine[];
  /** FDA lot code(s) for this production batch (comma-separated when multi-recipe). */
  lotCode?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// Label Sets — groups front, back, and side designs for a product line.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Etsy Integration — connects soap recipes/products to an Etsy shop.
// ---------------------------------------------------------------------------

export type EtsyListingState = 'active' | 'inactive' | 'draft' | 'expired' | 'sold_out';

/** Local mirror of an Etsy listing — works offline between syncs. */
export interface EtsyListing {
  id: string;
  /** Etsy's listing ID (numeric string). Set after first push. */
  etsyListingId?: string;
  recipeId?: string;
  draftId?: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  imageUrl?: string;
  etsyUrl?: string;
  state: EtsyListingState;
  lastSyncedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** Etsy shop connection config, stored in AppSettings. */
export interface EtsyShopConfig {
  /** Etsy API keystring (OAuth2 client ID). */
  apiKey?: string;
  /** Etsy shared secret — required for token exchange. */
  sharedSecret?: string;
  /** Etsy shop ID (numeric string). */
  shopId?: string;
  /** Etsy shop name (display only). */
  shopName?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

export interface EtsySyncLog {
  id: string;
  direction: 'push' | 'pull';
  entity: 'listings' | 'orders';
  listingsCreated: number;
  listingsUpdated: number;
  ordersImported: number;
  errors: string[];
  timestamp: number;
}

/** Unified product record linking recipe, label design, and Etsy listing. */
export interface ProductListing {
  id: string;
  name: string;
  recipeId?: string;
  draftId?: string;
  etsyListingId?: string;
  description?: string;
  price?: number;
  /** Finished units on hand (incremented by internal production runs). */
  inventoryCount?: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Batch/lot code for FDA traceability. */
export interface LotCode {
  id: string;
  code: string;
  recipeId: string;
  productionDate: number;
  linkedOrderIds?: string[];
  createdAt: number;
}

export interface LabelSet {
  id: string;
  name: string;
  /** Optional recipe linked to this set. */
  recipeId?: string;
  /** Serialized Fabric canvas JSON for each context. */
  frontJson?: string;
  backJson?: string;
  sideJson?: string;
  /** Avery template ID used for each context. */
  frontTemplateId?: string;
  backTemplateId?: string;
  sideTemplateId?: string;
  /** Small preview thumbnail (data URL) for each context. */
  frontThumb?: string;
  backThumb?: string;
  sideThumb?: string;
  createdAt: number;
  updatedAt: number;
}
