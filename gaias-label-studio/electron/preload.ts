import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/contract";
import type {
  AppSettings,
  Ingredient,
  PdfExportRequest,
  Project,
  Recipe,
  RecipeIngredientRef,
} from "../shared/contract";

contextBridge.exposeInMainWorld("api", {
  ingredients: {
    list: () => ipcRenderer.invoke(IPC.DB_LIST_INGREDIENTS),
    upsert: (input: Partial<Ingredient> & { name: string; benefit: string; isSoapBase: boolean }) =>
      ipcRenderer.invoke(IPC.DB_UPSERT_INGREDIENT, input),
    delete: (id: number) => ipcRenderer.invoke(IPC.DB_DELETE_INGREDIENT, id),
  },
  recipes: {
    list: () => ipcRenderer.invoke(IPC.DB_LIST_RECIPES),
    upsert: (
      input: Partial<Recipe> & { name: string; benefit: string; ingredients: RecipeIngredientRef[] }
    ) => ipcRenderer.invoke(IPC.DB_UPSERT_RECIPE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC.DB_DELETE_RECIPE, id),
  },
  projects: {
    list: () => ipcRenderer.invoke(IPC.DB_LIST_PROJECTS),
    upsert: (input: Partial<Project> & { name: string; templateSku: string; context: string }) =>
      ipcRenderer.invoke(IPC.DB_UPSERT_PROJECT, input),
    delete: (id: number) => ipcRenderer.invoke(IPC.DB_DELETE_PROJECT, id),
  },
  versions: {
    save: (projectId: number, canvasJson: string, label?: string) =>
      ipcRenderer.invoke(IPC.DB_SAVE_VERSION, projectId, canvasJson, label),
    list: (projectId: number) => ipcRenderer.invoke(IPC.DB_LIST_VERSIONS, projectId),
    restore: (versionId: number) => ipcRenderer.invoke(IPC.DB_RESTORE_VERSION, versionId),
  },
  library: {
    list: () => ipcRenderer.invoke(IPC.DB_LIST_LIBRARY),
    add: (input: { fileName: string; filePath: string; source: string }) =>
      ipcRenderer.invoke(IPC.DB_ADD_LIBRARY_ASSET, input),
    delete: (id: number) => ipcRenderer.invoke(IPC.DB_DELETE_LIBRARY_ASSET, id),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (partial: Partial<AppSettings>) => ipcRenderer.invoke(IPC.SETTINGS_SET, partial),
  },
  files: {
    pickImages: () => ipcRenderer.invoke(IPC.FILES_PICK_IMAGES),
    readAsDataUrl: (filePath: string) => ipcRenderer.invoke(IPC.FILES_READ_AS_DATA_URL, filePath),
    openDesignsFolder: () => ipcRenderer.invoke(IPC.FILES_OPEN_DESIGNS_FOLDER),
  },
  templates: {
    getAll: () => ipcRenderer.invoke(IPC.TEMPLATES_GET_ALL),
    refresh: () => ipcRenderer.invoke(IPC.TEMPLATES_REFRESH),
  },
  stock: {
    search: (query: string, provider: "unsplash" | "pixabay") =>
      ipcRenderer.invoke(IPC.STOCK_SEARCH, query, provider),
  },
  pdf: {
    export: (req: PdfExportRequest) => ipcRenderer.invoke(IPC.PDF_EXPORT, req),
  },
  ai: {
    onDownloadSaved: (callback: (payload: { fileName: string; filePath: string }) => void) => {
      const listener = (_event: unknown, payload: { fileName: string; filePath: string }) => callback(payload);
      ipcRenderer.on(IPC.AI_DOWNLOAD_SAVED, listener);
      return () => ipcRenderer.removeListener(IPC.AI_DOWNLOAD_SAVED, listener);
    },
  },
});
