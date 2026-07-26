// Gaia's Label Studio — desktop shell (loads the Vite production build).
// CommonJS on purpose: package.json uses "type":"module" for the web app.
const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
const MAX_SUPPLIER_PAGE_BYTES = 2 * 1024 * 1024;

function assertSafeSupplierUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Enter a valid supplier URL.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Supplier links must use HTTPS.');
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  const blockedHost = host === 'localhost'
    || host.endsWith('.localhost')
    || host === '0.0.0.0'
    || host === '::1'
    || /^127\./.test(host)
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^169\.254\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blockedHost) throw new Error('Local and private network URLs are not allowed.');
  return parsed;
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function parseSupplierPage(html, sourceUrl) {
  const plainText = decodeHtml(
    html
      .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  );
  const title = decodeHtml(
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '',
  );

  const pricePatterns = [
    /<meta[^>]+(?:property|itemprop)=["'](?:product:price:amount|price)["'][^>]+content=["']\$?([\d,]+(?:\.\d{1,2})?)/i,
    /<meta[^>]+content=["']\$?([\d,]+(?:\.\d{1,2})?)["'][^>]+(?:property|itemprop)=["'](?:product:price:amount|price)["']/i,
    /"price"\s*:\s*["']?\$?([\d,]+(?:\.\d{1,2})?)/i,
    /(?:price|our price|sale price)\s*[:\-]?\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\$\s*([\d,]+(?:\.\d{1,2})?)/,
  ];
  const priceMatch = pricePatterns.map((pattern) => html.match(pattern)).find(Boolean);
  const totalPrice = Number(priceMatch?.[1]?.replace(/,/g, ''));

  // Prefer title/structured text because navigation commonly contains other
  // product sizes. Supports "16 oz", "1 lb", "30 mL", and "4 fl oz".
  const sizeText = `${title} ${plainText}`;
  const sizeMatch = sizeText.match(
    /\b(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|fluid\s*ounces?|ounces?|oz|pounds?|lbs?|lb|millilit(?:er|re)s?|ml|grams?|g)\b/i,
  );
  if (!Number.isFinite(totalPrice) || totalPrice <= 0 || !sizeMatch) {
    throw new Error('The page did not expose a clear price and container size. Use manual entry.');
  }

  const containerSize = Number(sizeMatch[1]);
  const rawUnit = sizeMatch[2].toLowerCase().replace(/\./g, '');
  const unit = /ml|millilit/.test(rawUnit)
    ? 'ml'
    : /lb|pound/.test(rawUnit)
      ? 'lbs'
      : /\bg\b|gram/.test(rawUnit)
        ? 'g'
        : 'oz';
  return { title: title || undefined, totalPrice, containerSize, unit, sourceUrl };
}

async function fetchSupplierPage(rawUrl) {
  let url = assertSafeSupplierUrl(rawUrl);
  for (let redirect = 0; redirect <= 3; redirect++) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; GaiaLabelStudio/1.0)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirect === 3) throw new Error('Supplier page redirected too many times.');
      url = assertSafeSupplierUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Supplier page returned HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error('Supplier link is not an HTML product page.');
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_SUPPLIER_PAGE_BYTES) throw new Error('Supplier page is too large to import safely.');
    const html = await response.text();
    if (Buffer.byteLength(html) > MAX_SUPPLIER_PAGE_BYTES) {
      throw new Error('Supplier page is too large to import safely.');
    }
    return parseSupplierPage(html, url.toString());
  }
  throw new Error('Unable to load supplier page.');
}

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
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
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

  // Smart Pantry supplier importer. Fetching in the main process avoids browser
  // CORS limitations; the URL and response are tightly validated before the
  // renderer receives only the extracted product fields.
  ipcMain.handle('gaia:parse-supplier-url', (_event, { url }) => fetchSupplierPage(url));

  // Save generated receipts without a native "Save As" prompt.
  ipcMain.handle('gaia:save-work-order-receipt', async (_event, { filename, base64 }) => {
    const safeName = path.basename(String(filename)).replace(/[^\w.-]/g, '_');
    if (!safeName.toLowerCase().endsWith('.pdf')) throw new Error('Receipt must be a PDF.');
    const bytes = Buffer.from(String(base64), 'base64');
    if (bytes.length < 5 || bytes.subarray(0, 4).toString() !== '%PDF') {
      throw new Error('Receipt data is not a valid PDF.');
    }
    const receiptDir = path.join(saveSystemDir, 'work_orders');
    await fs.promises.mkdir(receiptDir, { recursive: true });
    const outputPath = path.join(receiptDir, safeName);
    await fs.promises.writeFile(outputPath, bytes);
    return outputPath;
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
