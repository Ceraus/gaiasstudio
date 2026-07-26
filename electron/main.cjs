// Gaia's Label Studio — desktop shell (loads the Vite production build).
// CommonJS on purpose: package.json uses "type":"module" for the web app.
const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const bundledAi = require('./bundledAi.cjs');

// ── Portable save-system path ────────────────────────────────────────────────
// For portable builds, electron-builder sets PORTABLE_EXECUTABLE_DIR to the
// folder that contains the .exe.  Fall back to the directory of the process
// executable so the same logic works in development.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  || path.dirname(process.execPath);

const saveSystemDir = path.join(portableDir, "Gaia's Save System");
const exportsDir = path.join(saveSystemDir, 'exports');
const downloadsDir = path.join(saveSystemDir, 'downloads');

// Must be called before app.ready so Chromium uses these paths for IndexedDB,
// localStorage, cookies, session data, and all other user-data storage.
app.setPath('userData', saveSystemDir);
app.setPath('logs', path.join(saveSystemDir, 'logs'));
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

/** @type {import('electron').BrowserWindow | null} */
let aiBrowserWindow = null;

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Auto-imported images are base64-encoded into a data URL and pushed through
 * IPC, which costs roughly 2.4× the file size in main-process memory before
 * the renderer even sees it. Anything larger than this is far bigger than a
 * label needs, so we refuse it instead of stalling the app.
 */
const MAX_AUTO_IMPORT_BYTES = 24 * 1024 * 1024;

/** Hosts the in-app AI browser window is allowed to navigate to. */
const AI_HOST_ALLOWLIST = new Set([
  'aistudio.google.com',
  'gemini.google.com',
  'accounts.google.com',
  'accounts.youtube.com',
  'myaccount.google.com',
  'ssl.gstatic.com',
]);

function distIndex() {
  return path.join(app.getAppPath(), 'dist', 'index.html');
}

/**
 * Strips any directory component from a download-supplied filename. Chromium
 * generally sanitizes these already, but `setSavePath` writes wherever it is
 * told, so a crafted `../..` name must never reach path.join.
 */
function safeBasename(filename) {
  const base = path.basename(String(filename || '')).replace(/[\\/:*?"<>|]/g, '_');
  return base && base !== '.' && base !== '..' ? base : `download-${Date.now()}`;
}

/** True when `target` resolves to `root` itself or something inside it. */
function isInsideDir(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Convert a local file to a base64 data URL without blocking the main process. */
async function fileToDataUrl(filePath) {
  const stat = await fs.promises.stat(filePath);
  if (stat.size > MAX_AUTO_IMPORT_BYTES) {
    throw new Error(`image too large to import (${Math.round(stat.size / 1024 / 1024)} MB)`);
  }
  const buf = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Routes downloads into the portable save system.
 *
 * PDFs land in `exports/` (the PDF Vault reads that folder). Images are staged
 * in `downloads/`, converted to a data URL for the renderer's auto-import, then
 * deleted. Both the default session and the isolated AI-Studio session share
 * this handler so the two paths can never drift apart.
 *
 * @param {import('electron').Session} sess
 * @param {{ allowPdf?: boolean }} [opts]
 */
function attachDownloadInterceptor(sess, { allowPdf = false } = {}) {
  sess.on('will-download', (_event, item) => {
    const filename = safeBasename(item.getFilename());
    const ext = path.extname(filename).toLowerCase();

    if (allowPdf && ext === '.pdf') {
      fs.mkdirSync(exportsDir, { recursive: true });
      item.setSavePath(path.join(exportsDir, filename));
      item.once('done', (_e, state) => {
        if (state === 'completed' && !mainWindow?.isDestroyed()) {
          mainWindow?.webContents.send('gaia:pdf-exported', { filename });
        }
      });
      return;
    }

    if (!IMAGE_EXTS.has(ext)) return; // ignore other non-image downloads

    fs.mkdirSync(downloadsDir, { recursive: true });
    const tmpPath = path.join(downloadsDir, `gaia-ai-${Date.now()}${ext}`);
    item.setSavePath(tmpPath);

    item.once('done', (_e, state) => {
      if (state !== 'completed') return;
      fileToDataUrl(tmpPath)
        .then((dataUrl) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('gaia:image-downloaded', { dataUrl, filename });
          }
        })
        .catch((err) => console.error('[Gaia] Failed to read downloaded image:', err))
        .finally(() => fs.promises.unlink(tmpPath).catch(() => {}));
    });
  });
}

/** Denies every permission request — nothing here needs camera/mic/geolocation. */
function lockDownPermissions(sess) {
  sess.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  sess.setPermissionCheckHandler(() => false);
}

function isAllowedAiUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl));
    return url.protocol === 'https:' && AI_HOST_ALLOWLIST.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Opens (or reuses) the dedicated AI browser window. It shares the
 * `persist:aistudio` partition with the in-app <webview>, so signing in here
 * also signs in there.
 */
function openAiWindow(url) {
  if (!isAllowedAiUrl(url)) return;
  if (aiBrowserWindow && !aiBrowserWindow.isDestroyed()) {
    void aiBrowserWindow.loadURL(url);
    aiBrowserWindow.focus();
    return;
  }
  aiBrowserWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    title: "Gaia's AI Studio",
    webPreferences: {
      partition: 'persist:aistudio',
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  aiBrowserWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  aiBrowserWindow.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
    if (isAllowedAiUrl(popupUrl)) void aiBrowserWindow?.loadURL(popupUrl);
    else if (popupUrl.startsWith('https://')) void shell.openExternal(popupUrl);
    return { action: 'deny' };
  });
  void aiBrowserWindow.loadURL(url);
  aiBrowserWindow.on('closed', () => { aiBrowserWindow = null; });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Gaia's Label Studio — Rosa's Workshop",
    show: process.env.GAIA_MAINTENANCE !== '1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      event.sender.toggleDevTools();
    }
  });

  // The AI tab embeds a <webview>. Chromium hands us its webPreferences before
  // it attaches, which is the only place we can guarantee it never inherits our
  // preload bridge or gains Node access.
  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    if (typeof params.src === 'string' && !params.src.startsWith('https://')) {
      _event.preventDefault();
    }
  });

  // A guest <webview> that opens a popup must not spawn a window with default
  // (unaudited) webPreferences. Google sign-in relies on popups, so allowlisted
  // hosts are re-hosted in the dedicated AI window, which shares the same
  // `persist:aistudio` partition and therefore the same cookie jar.
  mainWindow.webContents.on('did-attach-webview', (_event, guestContents) => {
    guestContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedAiUrl(url)) openAiWindow(url);
      else if (url.startsWith('https://')) void shell.openExternal(url);
      return { action: 'deny' };
    });
  });

  // External links (AI generator, stock APIs docs, etc.) open in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  void mainWindow.loadFile(distIndex());
}

/** Headless maintenance: deactivate ingredients + restore Rosa's 28 recipes. */
async function runMaintenanceAndQuit(win) {
  win.webContents.once('did-finish-load', () => {
    void (async () => {
      try {
        const result = await win.webContents.executeJavaScript(
          `(async () => window.gaiaMaintenance.runRosaMaintenance())()`,
          true,
        );
        console.log('[Gaia] Maintenance complete:', JSON.stringify(result, null, 2));
        app.exit(0);
      } catch (err) {
        console.error('[Gaia] Maintenance failed:', err);
        app.exit(1);
      }
    })();
  });
}

app.whenReady().then(() => {
  // Configure the isolated session used by the AI Studio webview.
  // The `persist:aistudio` partition gives the webview its own persistent
  // cookie/storage context so Google sign-in survives restarts.
  const aiSession = session.fromPartition('persist:aistudio');
  aiSession.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  lockDownPermissions(session.defaultSession);
  lockDownPermissions(aiSession);

  attachDownloadInterceptor(session.defaultSession, { allowPdf: true });
  attachDownloadInterceptor(aiSession);

  // IPC helpers exposed to the renderer via preload.
  ipcMain.handle('gaia:get-downloads-path', () => app.getPath('downloads'));
  ipcMain.handle('gaia:get-save-path', () => saveSystemDir);

  // PDF Vault — list all exported PDFs in the exports sub-folder.
  ipcMain.handle('gaia:list-pdfs', async () => {
    try {
      const files = await fs.promises.readdir(exportsDir);
      const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'));
      return await Promise.all(
        pdfs.map(async (f) => {
          const fp = path.join(exportsDir, f);
          const stat = await fs.promises.stat(fp);
          return { name: f, path: fp, size: stat.size, modified: stat.mtime.toISOString() };
        }),
      );
    } catch { return []; }
  });

  // Open a file with the system default application. Scoped to the save system
  // so a compromised renderer cannot launch arbitrary files off the disk.
  ipcMain.handle('gaia:open-file', (_event, filePath) => {
    if (typeof filePath !== 'string' || !isInsideDir(saveSystemDir, filePath)) return '';
    return shell.openPath(filePath);
  });

  // Reveal a file in Explorer / Finder (same scoping as open-file).
  ipcMain.handle('gaia:open-folder', (_event, filePath) => {
    if (typeof filePath !== 'string' || !isInsideDir(saveSystemDir, filePath)) return;
    shell.showItemInFolder(filePath);
  });

  // File picker — opens a native multi-file dialog for image import.
  ipcMain.handle('gaia:pick-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Images',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths.length) return [];
    const picked = await Promise.all(
      filePaths.map(async (fp) => {
        try {
          const [dataUrl, stat] = await Promise.all([fileToDataUrl(fp), fs.promises.stat(fp)]);
          return { dataUrl, name: path.basename(fp), size: stat.size };
        } catch (err) {
          console.error('[Gaia] Skipped unreadable image:', fp, err);
          return null;
        }
      }),
    );
    return picked.filter(Boolean);
  });

  // Opens a dedicated BrowserWindow for AI tools (AI Studio, Gemini) that
  // supports full Google sign-in via a real browser session.
  ipcMain.handle('gaia:open-ai-browser', (_event, { url }) => openAiWindow(url));

  /** Opens an allowlisted AI URL in the user's default system browser. */
  ipcMain.handle('gaia:open-external-url', async (_event, { url }) => {
    if (!isAllowedAiUrl(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  // Bundled local AI (copywriting assist) — runs entirely in this process via
  // node-llama-cpp against the model shipped in resources/models. Zero setup,
  // 100% offline. See electron/bundledAi.cjs.
  ipcMain.handle('gaia:bundled-ai-status', () => bundledAi.getBundledAiStatus());
  ipcMain.handle('gaia:bundled-ai-generate', (_event, prompt) => bundledAi.generateBundledAi(String(prompt || '')));

  createWindow();

  if (process.env.GAIA_MAINTENANCE === '1') {
    void runMaintenanceAndQuit(mainWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
