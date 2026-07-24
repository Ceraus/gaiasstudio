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
  customCosts?: Array<{ id: string; name: string; cost: number; unit?: string }>;
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
  /** Contact info (email, phone, or website) printed on back labels. */
  contact?: string;
  /** Enables the floating debug panel in production builds. */
  debugMode?: boolean;
  /** Show/hide the Label Sets tab in navigation (default: false). */
  showLabelSets?: boolean;
  /**
   * Global UI zoom for accessibility, applied as a root font-scale multiplier.
   * 1 = 100% (default), 1.25 = 125% larger. Kept between 1 and 1.5.
   */
  uiScale?: number;
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
  /**
   * Optional collection / product line this design belongs to (e.g. "Oily Skin",
   * "Holiday 2025"). Used by the Workspace dashboard for grouping and filtering.
   */
  collection?: string;
  /**
   * Optional hex accent color for the collection (e.g. "#a7d3a0"). Drives the
   * color-coded card border/header so a maker can spot a product line at a glance.
   */
  color?: string;
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
// Label Sets — groups front, back, and side designs for a product line.
// ---------------------------------------------------------------------------

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
