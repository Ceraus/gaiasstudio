// Gaia's Label Studio — desktop shell (loads the Vite production build).
// CommonJS on purpose: package.json uses "type":"module" for the web app.
const { app, BrowserWindow, dialog, ipcMain, net, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Accessibility: the entire UI renders 25% larger (Chromium page zoom — the
// same mechanism as Ctrl+'+' — so all responsive breakpoints, canvas pointer
// math and floating panels keep working with no horizontal scrolling).
const UI_ZOOM_FACTOR = 1.25;

// ── Portable save-system path ────────────────────────────────────────────────
// For portable builds, electron-builder sets PORTABLE_EXECUTABLE_DIR to the
// folder that contains the .exe.  Fall back to the directory of the process
// executable so the same logic works in development.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  || path.dirname(process.execPath);

const saveSystemDir = path.join(portableDir, "Gaia's Save System");

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

function distIndex() {
  return path.join(app.getAppPath(), 'dist', 'index.html');
}

/** Convert a local file to a base64 data URL. */
function fileToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'png'  ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : ext === 'gif'  ? 'image/gif'
    : 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/** Attach the will-download listener to the default session. */
function attachDownloadInterceptor() {
  session.defaultSession.on('will-download', (_event, item) => {
    const filename = item.getFilename();
    const ext = path.extname(filename).toLowerCase();

    // Route PDF exports into the portable save-system exports folder.
    if (ext === '.pdf') {
      const exportsDir = path.join(saveSystemDir, 'exports');
      fs.mkdirSync(exportsDir, { recursive: true });
      item.setSavePath(path.join(exportsDir, filename));
      item.once('done', (_e, state) => {
        if (state === 'completed') {
          mainWindow?.webContents.send('gaia:pdf-exported', { filename });
        }
      });
      return;
    }

    if (!IMAGE_EXTS.has(ext)) return; // ignore other non-image downloads

    // Save into the portable save-system downloads folder.
    const downloadsDir = path.join(saveSystemDir, 'downloads');
    fs.mkdirSync(downloadsDir, { recursive: true });
    const tmpPath = path.join(downloadsDir, `gaia-ai-${Date.now()}${ext}`);
    item.setSavePath(tmpPath);

    item.once('done', (_e, state) => {
      if (state !== 'completed') return;
      try {
        const dataUrl = fileToDataUrl(tmpPath);
        mainWindow?.webContents.send('gaia:image-downloaded', { dataUrl, filename });
      } catch (err) {
        console.error('[Gaia] Failed to read downloaded image:', err);
      } finally {
        // Clean up temp file asynchronously; ignore errors.
        fs.unlink(tmpPath, () => {});
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Gaia's Label Studio — Rosa's Workshop",
    show: false,
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

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      event.sender.toggleDevTools();
    }
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

app.whenReady().then(() => {
  // Configure the isolated session used by the AI Studio webview.
  // The `persist:aistudio` partition gives the webview its own persistent
  // cookie/storage context so Google sign-in survives restarts.
  const aiSession = session.fromPartition('persist:aistudio');
  aiSession.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Route image downloads from the AI Studio session through the same
  // auto-import interceptor as the main session.
  aiSession.on('will-download', (_event, item) => {
    const filename = item.getFilename();
    const ext = path.extname(filename).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) return; // only images from the AI session

    const downloadsDir = path.join(saveSystemDir, 'downloads');
    fs.mkdirSync(downloadsDir, { recursive: true });
    const tmpPath = path.join(downloadsDir, `gaia-ai-${Date.now()}${ext}`);
    item.setSavePath(tmpPath);

    item.once('done', (_e, state) => {
      if (state !== 'completed') return;
      try {
        const dataUrl = fileToDataUrl(tmpPath);
        mainWindow?.webContents.send('gaia:image-downloaded', { dataUrl, filename });
      } catch (err) {
        console.error('[Gaia] Failed to read downloaded image:', err);
      } finally {
        fs.unlink(tmpPath, () => {});
      }
    });
  });

  // IPC helpers exposed to the renderer via preload.
  ipcMain.handle('gaia:get-downloads-path', () => app.getPath('downloads'));
  ipcMain.handle('gaia:get-save-path', () => saveSystemDir);

  // PDF Vault — list all exported PDFs in the exports sub-folder.
  ipcMain.handle('gaia:list-pdfs', async () => {
    const saveDir = path.join(saveSystemDir, 'exports');
    try {
      const files = await fs.promises.readdir(saveDir);
      const pdfs = files.filter((f) => f.endsWith('.pdf'));
      return await Promise.all(
        pdfs.map(async (f) => {
          const fp = path.join(saveDir, f);
          const stat = await fs.promises.stat(fp);
          return { name: f, path: fp, size: stat.size, modified: stat.mtime.toISOString() };
        }),
      );
    } catch { return []; }
  });

  // Supplier price importer — fetch a product page from the main process so
  // the renderer is never blocked by shop CORS policies. Read-only GET.
  ipcMain.handle('gaia:fetch-url', async (_event, url) => {
    try {
      const parsed = new URL(String(url));
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
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
  });

  // Silent PDF save — writes base64 PDF bytes into a sub-folder of the
  // portable save system (e.g. work_orders/Maria_Lopez_ORD-003.pdf) without
  // any "Save As" dialog. Returns the absolute path for the success toast.
  ipcMain.handle('gaia:save-pdf', async (_event, { base64, folder, filename }) => {
    // Never allow path traversal out of the save system.
    const safeFolder = String(folder || 'exports').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = String(filename || 'document.pdf').replace(/[\\/:*?"<>|]/g, '_');
    const dir = path.join(saveSystemDir, safeFolder);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
    await fs.promises.writeFile(filePath, Buffer.from(String(base64), 'base64'));
    return { path: filePath };
  });

  // Open a file with the system default application.
  ipcMain.handle('gaia:open-file', (_event, filePath) => shell.openPath(filePath));

  // Reveal a file in Explorer / Finder.
  ipcMain.handle('gaia:open-folder', (_event, filePath) => shell.showItemInFolder(filePath));

  // File picker — opens a native multi-file dialog for image import.
  ipcMain.handle('gaia:pick-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Images',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths.length) return [];
    return filePaths.map((fp) => {
      const dataUrl = fileToDataUrl(fp);
      const stat = fs.statSync(fp);
      return { dataUrl, name: path.basename(fp), size: stat.size };
    });
  });

  // Opens a dedicated BrowserWindow for AI tools (AI Studio, Gemini) that
  // supports full Google sign-in via a real browser session.
  ipcMain.handle('gaia:open-ai-browser', async (_event, { url }) => {
    if (aiBrowserWindow && !aiBrowserWindow.isDestroyed()) {
      aiBrowserWindow.loadURL(url);
      aiBrowserWindow.focus();
      return;
    }
    aiBrowserWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      title: "Gaia's AI Studio",
      webPreferences: {
        // Reuse the same persistent partition so Google sign-in cookies are
        // shared with the main window's aiSession (will-download already wired).
        partition: 'persist:aistudio',
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    aiBrowserWindow.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    aiBrowserWindow.loadURL(url);
    aiBrowserWindow.on('closed', () => { aiBrowserWindow = null; });
  });

  attachDownloadInterceptor();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
