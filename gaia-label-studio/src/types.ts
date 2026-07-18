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

export interface Ingredient {
  id: string;
  name: string;
  /** Plain-English benefit statement shown to shoppers. */
  benefit: string;
  /** INCI / scientific name printed on the back label. */
  inci?: string;
  /** Flags a soap / cleansing base so recipes can be validated. */
  isSoapBase: boolean;
  createdAt: number;
  updatedAt: number;
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
}
