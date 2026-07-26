// Gaia's Label Studio — preload script.
// Runs in the renderer's context but with access to Node.js APIs.
// Exposes a minimal, safe IPC surface via contextBridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Register a callback for images downloaded from the embedded AI webview.
   * @param {function({ dataUrl: string, filename: string }): void} cb
   * @returns {function(): void} unsubscribe function
   */
  onImageDownloaded(cb) {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on('gaia:image-downloaded', listener);
    return () => ipcRenderer.removeListener('gaia:image-downloaded', listener);
  },

  /** Returns the user's downloads folder path. */
  getDownloadsPath() {
    return ipcRenderer.invoke('gaia:get-downloads-path');
  },

  /** Returns the portable save-system directory path. */
  getSavePath() {
    return ipcRenderer.invoke('gaia:get-save-path');
  },

  /**
   * Opens a URL in the user's default system browser (Chrome, Edge, etc.).
   * @param {string} url
   */
  openExternalUrl(url) {
    return ipcRenderer.invoke('gaia:open-external-url', { url });
  },

  /**
   * Opens the given URL in a dedicated Electron BrowserWindow with full
   * Google sign-in support (uses the persist:aistudio session).
   * @param {string} url
   */
  openAiBrowser(url) {
    return ipcRenderer.invoke('gaia:open-ai-browser', { url });
  },

  /**
   * Returns an array of exported PDF metadata objects from the exports folder.
   * @returns {Promise<Array<{name: string, path: string, size: number, modified: string}>>}
   */
  listPdfs() {
    return ipcRenderer.invoke('gaia:list-pdfs');
  },

  /**
   * Opens a file with the system default application.
   * @param {string} filePath
   */
  openFile(filePath) {
    return ipcRenderer.invoke('gaia:open-file', filePath);
  },

  /**
   * Reveals a file in Explorer / Finder.
   * @param {string} filePath
   */
  openFolder(filePath) {
    return ipcRenderer.invoke('gaia:open-folder', filePath);
  },

  /**
   * Opens a native file picker for image files and returns an array of
   * { dataUrl, name, size } objects for the selected files.
   * @returns {Promise<Array<{dataUrl: string, name: string, size: number}>>}
   */
  pickFiles() {
    return ipcRenderer.invoke('gaia:pick-files');
  },

  /**
   * Register a callback for PDFs that were successfully saved to the exports
   * folder by the download interceptor.
   * @param {function({ filename: string }): void} cb
   * @returns {function(): void} unsubscribe function
   */
  onPdfExported(cb) {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on('gaia:pdf-exported', listener);
    return () => ipcRenderer.removeListener('gaia:pdf-exported', listener);
  },

  /**
   * Checks whether the bundled in-app AI model (copywriting assist) is ready.
   * @returns {Promise<{ state: 'connected'|'loading'|'unreachable', message?: string }>}
   */
  bundledAiStatus() {
    return ipcRenderer.invoke('gaia:bundled-ai-status');
  },

  /**
   * Asks the bundled in-app AI model to complete the given prompt. Runs
   * entirely offline, in the main process (never the network).
   * @param {string} prompt
   * @returns {Promise<{ ok: boolean, text?: string, error?: string }>}
   */
  bundledAiGenerate(prompt) {
    return ipcRenderer.invoke('gaia:bundled-ai-generate', prompt);
  },

  /**
   * Asks the bundled in-app AI model to extract product info (name, price,
   * container size + unit) from supplier product-page text. Grammar-enforced
   * JSON output; runs entirely offline in the main process.
   * @param {string} pageText
   * @returns {Promise<{ ok: boolean, result?: { productName: string, price: number, size: number, unit: string }, error?: string }>}
   */
  bundledAiExtract(pageText) {
    return ipcRenderer.invoke('gaia:bundled-ai-extract', pageText);
  },

  /**
   * Fetches a URL from the main process (bypasses renderer CORS).
   * Used by the supplier price importer.
   * @param {string} url
   * @returns {Promise<{ok: boolean, status: number, text: string}>}
   */
  fetchUrl(url) {
    return ipcRenderer.invoke('gaia:fetch-url', url);
  },

  /**
   * Silently saves a PDF (base64 bytes) into a sub-folder of the portable
   * save system, e.g. savePdf(b64, 'work_orders', 'Maria_ORD-003.pdf').
   * @param {string} base64
   * @param {string} folder
   * @param {string} filename
   * @returns {Promise<{path: string}>}
   */
  savePdf(base64, folder, filename) {
    return ipcRenderer.invoke('gaia:save-pdf', { base64, folder, filename });
  },

  /**
   * Writes a full-database backup (JSON string) into the save system's
   * backups/ folder; the main process prunes to the newest 14 files.
   * @param {string} json
   * @param {string} filename
   * @returns {Promise<{path: string}>}
   */
  saveBackup(json, filename) {
    return ipcRenderer.invoke('gaia:save-backup', { json, filename });
  },
});
