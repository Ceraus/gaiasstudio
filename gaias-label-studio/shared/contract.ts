/**
 * Shared type contract between the Electron main process and the React renderer.
 * This file has no runtime side effects beyond plain constant objects, so it can
 * be compiled independently by both the CommonJS (electron) and ESM (vite) toolchains.
 */

export type LabelShape = "circle" | "oval" | "square" | "rectangle" | "other";

export interface AveryTemplate {
  sku: string;
  brand: "Avery";
  name: string;
  shape: LabelShape;
  /** Sheet size the template is designed for, e.g. "Letter (8.5 x 11 in)" */
  sheetSize: string;
  /** Label width in inches */
  widthIn: number;
  /** Label height in inches (equal to widthIn for circle/square) */
  heightIn: number;
  /** Corner radius in inches, 0 for sharp corners, ignored for circle/oval */
  cornerRadiusIn: number;
  /** Number of label columns per sheet */
  columns: number;
  /** Number of label rows per sheet */
  rows: number;
  /** Distance in inches from the left edge of the sheet to the first column */
  marginLeftIn: number;
  /** Distance in inches from the top edge of the sheet to the first row */
  marginTopIn: number;
  /** Horizontal distance in inches between the start of one label and the next (pitch) */
  pitchXIn: number;
  /** Vertical distance in inches between the start of one label and the next (pitch) */
  pitchYIn: number;
  /** Recommended bleed / safe-zone inset in inches */
  bleedIn: number;
  category?: string;
}

export type LabelContext = "front" | "back" | "side";

export interface Ingredient {
  id: number;
  name: string;
  benefit: string;
  isSoapBase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredientRef {
  ingredientId: number;
  note?: string;
}

export interface Recipe {
  id: number;
  name: string;
  benefit: string;
  ingredients: RecipeIngredientRef[];
  directions?: string;
  warnings?: string;
  netWeight?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeValidation {
  hasName: boolean;
  hasIngredients: boolean;
  hasSoapBase: boolean;
  hasBenefit: boolean;
  isComplete: boolean;
}

export interface ProjectVersion {
  id: number;
  projectId: number;
  canvasJson: string;
  createdAt: string;
  label?: string;
}

export interface Project {
  id: number;
  name: string;
  templateSku: string;
  context: LabelContext;
  recipeId: number | null;
  canvasJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryAsset {
  id: number;
  fileName: string;
  filePath: string;
  source: "upload" | "ai" | "stock" | "logo";
  createdAt: string;
}

export interface AppSettings {
  language: "en" | "es";
  filePrefix: string;
  googleAiStudioApiKey: string;
  unsplashApiKey: string;
  pixabayApiKey: string;
}

export const IPC = {
  DB_LIST_INGREDIENTS: "db:ingredients:list",
  DB_UPSERT_INGREDIENT: "db:ingredients:upsert",
  DB_DELETE_INGREDIENT: "db:ingredients:delete",

  DB_LIST_RECIPES: "db:recipes:list",
  DB_UPSERT_RECIPE: "db:recipes:upsert",
  DB_DELETE_RECIPE: "db:recipes:delete",

  DB_LIST_PROJECTS: "db:projects:list",
  DB_UPSERT_PROJECT: "db:projects:upsert",
  DB_DELETE_PROJECT: "db:projects:delete",

  DB_SAVE_VERSION: "db:versions:save",
  DB_LIST_VERSIONS: "db:versions:list",
  DB_RESTORE_VERSION: "db:versions:restore",

  DB_LIST_LIBRARY: "db:library:list",
  DB_ADD_LIBRARY_ASSET: "db:library:add",
  DB_DELETE_LIBRARY_ASSET: "db:library:delete",

  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",

  FILES_PICK_IMAGES: "files:pickImages",
  FILES_READ_AS_DATA_URL: "files:readAsDataUrl",
  FILES_SAVE_DESIGN_PDF: "files:saveDesignPdf",
  FILES_OPEN_DESIGNS_FOLDER: "files:openDesignsFolder",

  TEMPLATES_GET_ALL: "templates:getAll",
  TEMPLATES_REFRESH: "templates:refresh",

  STOCK_SEARCH: "stock:search",

  PDF_EXPORT: "pdf:export",

  AI_DOWNLOAD_SAVED: "ai:downloadSaved",
} as const;

export interface StockPhoto {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  provider: "unsplash" | "pixabay";
  credit: string;
}

export interface PdfExportRequest {
  templateSku: string;
  quantity: number;
  canvasDataUrl: string;
  canvasWidthPx: number;
  canvasHeightPx: number;
  fileBaseName: string;
}

export interface PdfExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  sheetsGenerated?: number;
}
