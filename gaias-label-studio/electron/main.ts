import { app, BrowserWindow, ipcMain, dialog, shell, session } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  initDatabase,
  listIngredients,
  upsertIngredient,
  deleteIngredient,
  listRecipes,
  upsertRecipe,
  deleteRecipe,
  listProjects,
  upsertProject,
  deleteProject,
  saveVersion,
  listVersions,
  getVersion,
  listLibraryAssets,
  addLibraryAsset,
  deleteLibraryAsset,
} from "./db";
import { getSettings, setSettings } from "./store";
import { scrapeAveryTemplates, mergeAndPersist } from "./averyScraper";
import { exportLabelsToPdf } from "./pdfExport";
import { IPC } from "../shared/contract";
import type { AveryTemplate, PdfExportRequest } from "../shared/contract";

// This file is compiled to CommonJS (see electron/tsconfig.json), where
// __dirname is provided natively by Node.
const dirname = __dirname;

const isDev = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | null = null;

function resourcesTemplatesPath(): string {
  // electron/ compiles to dist-electron/electron/main.js, so the project
  // root (where resources/ and dist/ live) is two levels up from __dirname.
  // When packaged, electron-builder copies resources/ into the app's
  // resources dir instead, exposed via process.resourcesPath.
  const devPath = path.join(dirname, "..", "..", "resources", "avery_templates_offline.json");
  const packagedPath = path.join(process.resourcesPath ?? "", "avery_templates_offline.json");
  return fs.existsSync(devPath) ? devPath : packagedPath;
}

function userTemplatesOverridePath(): string {
  return path.join(app.getPath("userData"), "data", "avery_templates_offline.json");
}

function loadTemplateCatalog(): AveryTemplate[] {
  const overridePath = userTemplatesOverridePath();
  const sourcePath = fs.existsSync(overridePath) ? overridePath : resourcesTemplatesPath();
  const raw = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
  return raw.templates as AveryTemplate[];
}

function ensureUserTemplatesSeeded() {
  const overridePath = userTemplatesOverridePath();
  if (!fs.existsSync(overridePath)) {
    fs.mkdirSync(path.dirname(overridePath), { recursive: true });
    fs.copyFileSync(resourcesTemplatesPath(), overridePath);
  }
}

function designsDir(): string {
  return path.join(app.getPath("documents"), "Gaia's Label Studio", "designs");
}

function aiLibraryDir(): string {
  return path.join(app.getPath("userData"), "library", "ai_generated");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#f4f7f5",
    webPreferences: {
      preload: path.join(dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(dirname, "..", "..", "dist", "index.html"));
  }
}

function registerAiDownloadInterceptor() {
  // The AI-generation tab renders a <webview partition="persist:ai-studio">.
  // Any file it downloads (e.g. a generated background image) is silently
  // captured here instead of showing a save dialog, written into the local
  // AI asset library, and announced to the renderer so it appears instantly
  // in the "AI" tab of the asset sidebar.
  const aiSession = session.fromPartition("persist:ai-studio");
  aiSession.on("will-download", (_event, item) => {
    const dir = aiLibraryDir();
    fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(item.getFilename()) || ".png";
    const fileName = `ai_${Date.now()}${ext}`;
    const destPath = path.join(dir, fileName);
    item.setSavePath(destPath);

    item.once("done", (_doneEvent, state) => {
      if (state !== "completed") return;
      addLibraryAsset({ fileName, filePath: destPath, source: "ai" });
      mainWindow?.webContents.send(IPC.AI_DOWNLOAD_SAVED, { fileName, filePath: destPath });
    });
  });
}

function registerIpcHandlers() {
  ipcMain.handle(IPC.DB_LIST_INGREDIENTS, () => listIngredients());
  ipcMain.handle(IPC.DB_UPSERT_INGREDIENT, (_e, input) => upsertIngredient(input));
  ipcMain.handle(IPC.DB_DELETE_INGREDIENT, (_e, id) => deleteIngredient(id));

  ipcMain.handle(IPC.DB_LIST_RECIPES, () => listRecipes());
  ipcMain.handle(IPC.DB_UPSERT_RECIPE, (_e, input) => upsertRecipe(input));
  ipcMain.handle(IPC.DB_DELETE_RECIPE, (_e, id) => deleteRecipe(id));

  ipcMain.handle(IPC.DB_LIST_PROJECTS, () => listProjects());
  ipcMain.handle(IPC.DB_UPSERT_PROJECT, (_e, input) => upsertProject(input));
  ipcMain.handle(IPC.DB_DELETE_PROJECT, (_e, id) => deleteProject(id));

  ipcMain.handle(IPC.DB_SAVE_VERSION, (_e, projectId, canvasJson, label) => saveVersion(projectId, canvasJson, label));
  ipcMain.handle(IPC.DB_LIST_VERSIONS, (_e, projectId) => listVersions(projectId));
  ipcMain.handle(IPC.DB_RESTORE_VERSION, (_e, versionId) => getVersion(versionId));

  ipcMain.handle(IPC.DB_LIST_LIBRARY, () => listLibraryAssets());
  ipcMain.handle(IPC.DB_ADD_LIBRARY_ASSET, (_e, input) => addLibraryAsset(input));
  ipcMain.handle(IPC.DB_DELETE_LIBRARY_ASSET, (_e, id) => deleteLibraryAsset(id));

  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings());
  ipcMain.handle(IPC.SETTINGS_SET, (_e, partial) => setSettings(partial));

  ipcMain.handle(IPC.FILES_PICK_IMAGES, async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose photos",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "svg"] }],
    });
    if (result.canceled) return [];
    return result.filePaths.map((filePath) => ({ filePath, fileName: path.basename(filePath) }));
  });

  ipcMain.handle(IPC.FILES_READ_AS_DATA_URL, (_e, filePath: string) => {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return `data:${mime};base64,${buf.toString("base64")}`;
  });

  ipcMain.handle(IPC.FILES_OPEN_DESIGNS_FOLDER, () => {
    const dir = designsDir();
    fs.mkdirSync(dir, { recursive: true });
    shell.openPath(dir);
  });

  ipcMain.handle(IPC.TEMPLATES_GET_ALL, () => loadTemplateCatalog());

  ipcMain.handle(IPC.TEMPLATES_REFRESH, async () => {
    try {
      const fresh = await scrapeAveryTemplates();
      if (!fresh.length) {
        return { success: false, error: "Avery returned no templates (likely blocked by bot protection).", count: 0 };
      }
      const { count } = mergeAndPersist(userTemplatesOverridePath(), fresh);
      return { success: true, count };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err), count: 0 };
    }
  });

  ipcMain.handle(IPC.STOCK_SEARCH, async (_e, query: string, provider: "unsplash" | "pixabay") => {
    const settings = getSettings();
    try {
      if (provider === "unsplash") {
        if (!settings.unsplashApiKey) return { success: false, error: "No Unsplash API key set in Settings.", results: [] };
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=24`,
          { headers: { Authorization: `Client-ID ${settings.unsplashApiKey}` } }
        );
        const json: any = await res.json();
        const results = (json.results ?? []).map((r: any) => ({
          id: r.id,
          thumbUrl: r.urls.small,
          fullUrl: r.urls.regular,
          provider: "unsplash",
          credit: r.user?.name ?? "Unsplash",
        }));
        return { success: true, results };
      } else {
        if (!settings.pixabayApiKey) return { success: false, error: "No Pixabay API key set in Settings.", results: [] };
        const res = await fetch(
          `https://pixabay.com/api/?key=${settings.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=24`
        );
        const json: any = await res.json();
        const results = (json.hits ?? []).map((r: any) => ({
          id: String(r.id),
          thumbUrl: r.previewURL,
          fullUrl: r.largeImageURL,
          provider: "pixabay",
          credit: r.user ?? "Pixabay",
        }));
        return { success: true, results };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err), results: [] };
    }
  });

  ipcMain.handle(IPC.PDF_EXPORT, async (_e, req: PdfExportRequest) => {
    const templates = loadTemplateCatalog();
    const template = templates.find((t) => t.sku === req.templateSku);
    if (!template) return { success: false, error: `Unknown template SKU: ${req.templateSku}` };
    const settings = getSettings();
    return exportLabelsToPdf(template, req, designsDir(), settings.filePrefix);
  });
}

app.whenReady().then(() => {
  initDatabase(app.getPath("userData"));
  ensureUserTemplatesSeeded();
  registerAiDownloadInterceptor();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// AI-generation webviews should only ever navigate within Google's AI Studio
// domains; block anything else at the app level as a defense-in-depth measure.
app.on("web-contents-created", (_event, contents) => {
  if (contents.getType() !== "webview") return;
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});
