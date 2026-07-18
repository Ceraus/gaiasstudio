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
} from "../../shared/contract";
import templatesData from "../../resources/avery_templates_offline.json";
import type { GaiaApi } from "../types/window";
import { PDFDocument } from "pdf-lib";

/**
 * A browser-only stand-in for the Electron `window.api` bridge, used when
 * this app is opened directly in a normal web browser during development
 * (`npm run dev`) instead of through the packaged Electron shell. It keeps
 * data in memory / localStorage for the current session only. The real,
 * persistent, offline-first experience always comes from the Electron main
 * process (better-sqlite3 + electron-store) — see electron/main.ts.
 */

const LS_KEY = "gaia-fallback-settings";

let ingredients: Ingredient[] = [];
let recipes: Recipe[] = [];
let projects: Project[] = [];
let versions: ProjectVersion[] = [];
let library: LibraryAsset[] = [];
let idCounter = 1;

function nextId() {
  return idCounter++;
}

function nowIso() {
  return new Date().toISOString();
}

function loadSettings(): AppSettings {
  const raw = localStorage.getItem(LS_KEY);
  const defaults: AppSettings = {
    language: "en",
    filePrefix: "LABEL",
    googleAiStudioApiKey: "",
    unsplashApiKey: "",
    pixabayApiKey: "",
  };
  if (!raw) return defaults;
  try {
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

async function pickImagesViaBrowser(): Promise<{ filePath: string; fileName: string }[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const results = await Promise.all(
        files.map(
          (file) =>
            new Promise<{ filePath: string; fileName: string }>((res) => {
              const reader = new FileReader();
              reader.onload = () => res({ filePath: String(reader.result), fileName: file.name });
              reader.readAsDataURL(file);
            })
        )
      );
      resolve(results);
    };
    input.click();
  });
}

export const webFallbackApi: GaiaApi = {
  ingredients: {
    list: async () => ingredients,
    upsert: async (input) => {
      if (input.id) {
        ingredients = ingredients.map((i) => (i.id === input.id ? { ...i, ...input, updatedAt: nowIso() } : i));
        return ingredients.find((i) => i.id === input.id)!;
      }
      const created: Ingredient = {
        id: nextId(),
        name: input.name,
        benefit: input.benefit,
        isSoapBase: input.isSoapBase,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      ingredients = [...ingredients, created];
      return created;
    },
    delete: async (id) => {
      ingredients = ingredients.filter((i) => i.id !== id);
    },
  },
  recipes: {
    list: async () => recipes,
    upsert: async (input) => {
      if (input.id) {
        recipes = recipes.map((r) => (r.id === input.id ? ({ ...r, ...input, updatedAt: nowIso() } as Recipe) : r));
        return recipes.find((r) => r.id === input.id)!;
      }
      const created: Recipe = {
        id: nextId(),
        name: input.name,
        benefit: input.benefit,
        ingredients: input.ingredients as RecipeIngredientRef[],
        directions: input.directions,
        warnings: input.warnings,
        netWeight: input.netWeight,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      recipes = [...recipes, created];
      return created;
    },
    delete: async (id) => {
      recipes = recipes.filter((r) => r.id !== id);
    },
  },
  projects: {
    list: async () => projects,
    upsert: async (input) => {
      if (input.id) {
        projects = projects.map((p) => (p.id === input.id ? ({ ...p, ...input, updatedAt: nowIso() } as Project) : p));
        return projects.find((p) => p.id === input.id)!;
      }
      const created: Project = {
        id: nextId(),
        name: input.name,
        templateSku: input.templateSku,
        context: input.context as Project["context"],
        recipeId: input.recipeId ?? null,
        canvasJson: input.canvasJson ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      projects = [...projects, created];
      return created;
    },
    delete: async (id) => {
      projects = projects.filter((p) => p.id !== id);
    },
  },
  versions: {
    save: async (projectId, canvasJson, label) => {
      const created: ProjectVersion = { id: nextId(), projectId, canvasJson, createdAt: nowIso(), label };
      versions = [created, ...versions];
      return created;
    },
    list: async (projectId) => versions.filter((v) => v.projectId === projectId),
    restore: async (versionId) => versions.find((v) => v.id === versionId)!,
  },
  library: {
    list: async () => library,
    add: async (input) => {
      const created: LibraryAsset = {
        id: nextId(),
        fileName: input.fileName,
        filePath: input.filePath,
        source: input.source as LibraryAsset["source"],
        createdAt: nowIso(),
      };
      library = [created, ...library];
      return created;
    },
    delete: async (id) => {
      library = library.filter((a) => a.id !== id);
    },
  },
  settings: {
    get: async () => loadSettings(),
    set: async (partial) => {
      const merged = { ...loadSettings(), ...partial };
      saveSettings(merged);
      return merged;
    },
  },
  files: {
    pickImages: () => pickImagesViaBrowser(),
    readAsDataUrl: async (filePath) => filePath,
    openDesignsFolder: async () => {
      // eslint-disable-next-line no-alert
      alert("Design export folder access is only available in the desktop app.");
    },
  },
  templates: {
    getAll: async () => (templatesData as any).templates,
    refresh: async () => ({ success: false, count: 0, error: "Live Avery refresh is only available in the desktop app." }),
  },
  stock: {
    search: async () => ({ success: false, results: [], error: "Stock photo search is only available in the desktop app." }),
  },
  pdf: {
    export: async (req: PdfExportRequest): Promise<PdfExportResult> => {
      const templates = (templatesData as any).templates as any[];
      const template = templates.find((t) => t.sku === req.templateSku);
      if (!template) return { success: false, error: `Unknown template SKU: ${req.templateSku}` };

      const PT_PER_IN = 72;
      const pdfDoc = await PDFDocument.create();
      const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(req.canvasDataUrl);
      if (!match) return { success: false, error: "Unsupported canvas image format." };
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      const image = match[1] === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

      const slotsPerSheet = Math.max(1, template.columns * template.rows);
      const quantity = Math.max(1, req.quantity);
      const sheetsNeeded = Math.ceil(quantity / slotsPerSheet);
      const labelWPt = template.widthIn * PT_PER_IN;
      const labelHPt = template.heightIn * PT_PER_IN;
      let remaining = quantity;

      for (let s = 0; s < sheetsNeeded; s++) {
        const page = pdfDoc.addPage([8.5 * PT_PER_IN, 11 * PT_PER_IN]);
        for (let row = 0; row < template.rows && remaining > 0; row++) {
          for (let col = 0; col < template.columns && remaining > 0; col++) {
            const xPt = (template.marginLeftIn + col * template.pitchXIn) * PT_PER_IN;
            const yFromTopPt = (template.marginTopIn + row * template.pitchYIn) * PT_PER_IN;
            const yPt = 11 * PT_PER_IN - yFromTopPt - labelHPt;
            page.drawImage(image, { x: xPt, y: yPt, width: labelWPt, height: labelHPt });
            remaining--;
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${req.fileBaseName || "label"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      return { success: true, filePath: "(downloaded via browser)", sheetsGenerated: sheetsNeeded };
    },
  },
  ai: {
    onDownloadSaved: () => () => {},
  },
};
