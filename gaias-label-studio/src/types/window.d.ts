import type {
  AppSettings,
  Ingredient,
  LibraryAsset,
  PdfExportRequest,
  PdfExportResult,
  Project,
  ProjectVersion,
  Recipe,
  RecipeIngredientRef,
  StockPhoto,
} from "../../shared/contract";

export interface GaiaApi {
  ingredients: {
    list: () => Promise<Ingredient[]>;
    upsert: (
      input: Partial<Ingredient> & { name: string; benefit: string; isSoapBase: boolean }
    ) => Promise<Ingredient>;
    delete: (id: number) => Promise<void>;
  };
  recipes: {
    list: () => Promise<Recipe[]>;
    upsert: (
      input: Partial<Recipe> & { name: string; benefit: string; ingredients: RecipeIngredientRef[] }
    ) => Promise<Recipe>;
    delete: (id: number) => Promise<void>;
  };
  projects: {
    list: () => Promise<Project[]>;
    upsert: (input: Partial<Project> & { name: string; templateSku: string; context: string }) => Promise<Project>;
    delete: (id: number) => Promise<void>;
  };
  versions: {
    save: (projectId: number, canvasJson: string, label?: string) => Promise<ProjectVersion>;
    list: (projectId: number) => Promise<ProjectVersion[]>;
    restore: (versionId: number) => Promise<ProjectVersion>;
  };
  library: {
    list: () => Promise<LibraryAsset[]>;
    add: (input: { fileName: string; filePath: string; source: string }) => Promise<LibraryAsset>;
    delete: (id: number) => Promise<void>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    set: (partial: Partial<AppSettings>) => Promise<AppSettings>;
  };
  files: {
    pickImages: () => Promise<{ filePath: string; fileName: string }[]>;
    readAsDataUrl: (filePath: string) => Promise<string>;
    openDesignsFolder: () => Promise<void>;
  };
  templates: {
    getAll: () => Promise<import("../../shared/contract").AveryTemplate[]>;
    refresh: () => Promise<{ success: boolean; count: number; error?: string }>;
  };
  stock: {
    search: (
      query: string,
      provider: "unsplash" | "pixabay"
    ) => Promise<{ success: boolean; results: StockPhoto[]; error?: string }>;
  };
  pdf: {
    export: (req: PdfExportRequest) => Promise<PdfExportResult>;
  };
  ai: {
    onDownloadSaved: (callback: (payload: { fileName: string; filePath: string }) => void) => () => void;
  };
}

declare global {
  interface Window {
    api: GaiaApi;
  }
}
