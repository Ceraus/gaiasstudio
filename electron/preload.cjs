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
});
