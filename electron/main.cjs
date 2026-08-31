// Gaia's Label Studio — desktop shell (loads the Vite production build).
// CommonJS on purpose: package.json uses "type":"module" for the web app.
const { app, BrowserWindow, dialog, ipcMain, net, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Accessibility: the entire UI renders 25% larger (Chromium page zoom — the
// same mechanism as Ctrl+'+' — so all responsive breakpoints, canvas pointer
// math and floating panels keep working with no horizontal scrolling).
const UI_ZOOM_FACTOR = 1.25;

// ── Portable save-system path ────────────────────────────────────────────────
// The live database is Chromium IndexedDB (Dexie). Backups, PDFs, and exports
// live in the same accompanying folder so Rosa has one place to copy.
//
// Packaged Windows zip / portable: folder that contains the .exe
// Packaged macOS: folder that contains the .app (not Contents/MacOS)
// `electron .` (dev): the project root — never node_modules/electron/dist
function resolvePortableDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  if (app.isPackaged) {
    if (process.platform === 'darwin') {
      return path.resolve(path.dirname(process.execPath), '..', '..', '..');
    }
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, '..');
}

const portableDir = resolvePortableDir();
const oldDir = path.join(portableDir, "Gaia's Save System");
const newDir = path.join(portableDir, "Gaia's Essences Save");
if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
  fs.renameSync(oldDir, newDir);
}
const saveSystemDir = newDir;
const exportsDir = path.join(saveSystemDir, 'exports');
const downloadsDir = path.join(saveSystemDir, 'downloads');
const backupsDir = path.join(saveSystemDir, 'backups');
const workOrdersDir = path.join(saveSystemDir, 'work_orders');
const logsDir = path.join(saveSystemDir, 'logs');

for (const dir of [saveSystemDir, backupsDir, exportsDir, downloadsDir, workOrdersDir, logsDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

// App/window icon — Gaia's Essences mark. electron-builder's win.icon
// (`build/icon.ico`) stamps the packaged .exe; this PNG copy ships inside
// the app for the runtime BrowserWindow / dock icon on every platform.
const appIconPath = path.join(__dirname, 'icon.png');

// Must be called before app.ready so Chromium uses these paths for IndexedDB,
// localStorage, cookies, session data, and all other user-data storage.
app.setPath('userData', saveSystemDir);
app.setPath('sessionData', saveSystemDir);
app.setPath('logs', logsDir);
// Windows taskbar grouping — matches build.appId so the running window
// uses our exe icon instead of a generic Electron entry.
app.setAppUserModelId('com.gaiasessences.studio');

console.log("[Gaia] Save system:", saveSystemDir);
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

/** Block SSRF to localhost, private networks, and cloud metadata endpoints. */
function isAllowedSupplierFetchUrl(parsed) {
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
    return false;
  }
  if (host === 'metadata.google.internal' || host.startsWith('169.254.')) return false;
  // IPv4 private / link-local ranges
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  // Tailscale CGNAT (100.64.0.0/10) — block supplier fetches into private tailnet
  if (/^100\./.test(host)) return false;
  return true;
}

/** Local AI / ComfyUI hosts — Tailscale, loopback, and private LAN only. */
function isAllowedLanFetchUrl(parsed) {
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.endsWith('.ts.net') || host.endsWith('.tailscale.net')) return true;
  if (host === 'metadata.google.internal' || host.startsWith('169.254.')) return false;
  // Tailscale CGNAT 100.64.0.0/10
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

async function fetchLanFromMain(url, init = {}) {
  try {
    const parsed = new URL(String(url));
    if (!isAllowedLanFetchUrl(parsed)) {
      return { ok: false, status: 0, error: 'Host is not a local or Tailscale address.', contentType: '', base64: '' };
    }
    const method = typeof init.method === 'string' ? init.method.toUpperCase() : 'GET';
    const headers = init.headers && typeof init.headers === 'object' ? init.headers : {};
    const controller = new AbortController();
    const timeoutMs = Number(init.timeoutMs) > 0 ? Number(init.timeoutMs) : 8000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await net.fetch(parsed.toString(), {
        method,
        headers,
        body: typeof init.body === 'string' ? init.body : undefined,
        signal: controller.signal,
      });
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type') || '',
        base64: buf.toString('base64'),
        error: '',
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      contentType: '',
      base64: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function fetchSupplierPageFromMain(url) {
  try {
    const parsed = new URL(String(url));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, status: 0, text: '' };
    }
    if (!isAllowedSupplierFetchUrl(parsed)) {
      console.warn('[Gaia] Blocked supplier fetch to disallowed host:', parsed.hostname);
      return { ok: false, status: 0, text: '' };
    }
    const res = await net.fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    console.error('[Gaia] gaia:fetch-url failed:', err);
    return { ok: false, status: 0, text: '' };
  }
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
 * Opens (or reuses) the dedicated Gemini browser window. It shares the
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
    title: "Gaia's Essences — Gemini",
    icon: appIconPath,
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
    title: "Gaia's Essences — Rosa's Label Studio",
    icon: appIconPath,
    show: process.env.GAIA_MAINTENANCE !== '1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      zoomFactor: UI_ZOOM_FACTOR,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
    // Re-assert the zoom after show — some platforms reset it on maximize.
    mainWindow?.webContents.setZoomFactor(UI_ZOOM_FACTOR);
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

app.whenReady().then(async () => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath);
  }

  // Isolated Gemini webview session. The partition name is historical
  // (`persist:aistudio`) so existing Google sign-ins keep working.
  const aiSession = session.fromPartition('persist:aistudio');
  aiSession.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  lockDownPermissions(session.defaultSession);
  lockDownPermissions(aiSession);

  attachDownloadInterceptor(session.defaultSession, { allowPdf: true });
  attachDownloadInterceptor(aiSession);
  // Older Prompt Builder builds used persist:gemini — keep intercepting it
  // so leftover signed-in sessions still auto-import downloads.
  attachDownloadInterceptor(session.fromPartition('persist:gemini'));

  // IPC helpers exposed to the renderer via preload.
  ipcMain.handle('gaia:get-downloads-path', () => downloadsDir);
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

  // Supplier price importer — fetch a product page from the main process so
  // the renderer is never blocked by shop CORS policies. Read-only GET.
  ipcMain.handle('gaia:fetch-url', (_event, url) => fetchSupplierPageFromMain(url));
  ipcMain.handle('gaia:fetch-lan', (_event, url, init) => fetchLanFromMain(url, init));
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

  // Opens a dedicated BrowserWindow for Gemini that
  // supports full Google sign-in via a real browser session.
  ipcMain.handle('gaia:open-ai-browser', (_event, { url }) => openAiWindow(url));

  /** Opens an allowlisted AI URL in the user's default system browser. */
  ipcMain.handle('gaia:open-external-url', async (_event, { url }) => {
    if (!isAllowedAiUrl(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  // Full-database backup — writes the JSON into the portable save system's
  // backups/ folder and prunes to the newest 14 files, so daily auto-backups
  // never eat the disk. Returns the absolute path for the success message.
  ipcMain.handle('gaia:save-backup', async (_event, { json, filename }) => {
    fs.mkdirSync(backupsDir, { recursive: true });
    const safeName = safeBasename(filename || `Gaia_Backup_${Date.now()}.json`);
    const filePath = path.join(backupsDir, safeName.toLowerCase().endsWith('.json') ? safeName : `${safeName}.json`);
    await fs.promises.writeFile(filePath, String(json), 'utf8');
    try {
      const files = (await fs.promises.readdir(backupsDir)).filter((f) => f.toLowerCase().endsWith('.json'));
      const stats = await Promise.all(
        files.map(async (f) => ({ f, m: (await fs.promises.stat(path.join(backupsDir, f))).mtimeMs })),
      );
      stats.sort((a, b) => b.m - a.m);
      for (const old of stats.slice(14)) {
        await fs.promises.unlink(path.join(backupsDir, old.f)).catch(() => {});
      }
    } catch { /* pruning is best-effort */ }
    return { path: filePath };
  });

  // Silent PDF save — writes base64 PDF bytes into a sub-folder of the
  // portable save system (e.g. work_orders/Maria_Lopez_ORD-003.pdf) without
  // any "Save As" dialog. Returns the absolute path for the success toast.
  ipcMain.handle('gaia:save-pdf', async (_event, { base64, folder, filename }) => {
    // Never allow path traversal out of the save system.
    const safeFolder = String(folder || 'exports').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = safeBasename(filename || 'document.pdf');
    const dir = path.join(saveSystemDir, safeFolder);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`);
    await fs.promises.writeFile(filePath, Buffer.from(String(base64), 'base64'));
    if (safeFolder === 'exports' && !mainWindow?.isDestroyed()) {
      mainWindow?.webContents.send('gaia:pdf-exported', { filename: path.basename(filePath) });
    }
    return { path: filePath };
  });

  // Headless check: confirm the accompanying folder exists and a backup write
  // lands there, then exit. Used by `GAIA_SAVE_SMOKE=1 electron .`
  if (process.env.GAIA_SAVE_SMOKE === '1') {
    const smokePath = path.join(backupsDir, 'Gaia_SmokeTest.json');
    await fs.promises.writeFile(
      smokePath,
      JSON.stringify({
        app: 'gaia-label-studio',
        format: 1,
        exportedAt: new Date().toISOString(),
        smoke: true,
        saveSystemDir,
      }),
      'utf8',
    );
    console.log('[Gaia] Smoke backup written:', smokePath);
    app.exit(0);
    return;
  }

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
