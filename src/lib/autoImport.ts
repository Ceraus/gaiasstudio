// ---------------------------------------------------------------------------
// Auto-import — listens for images downloaded from the embedded AI webview
// and saves them directly to the Dexie asset library.
//
// Only active when running inside Electron (window.electronAPI is injected
// by electron/preload.cjs via contextBridge). In a plain browser build this
// module is a no-op.
// ---------------------------------------------------------------------------

import { useLibraryStore } from '@/store/useLibraryStore';

interface ElectronAPI {
  onImageDownloaded(
    cb: (payload: { dataUrl: string; filename: string }) => void,
  ): () => void;
  getDownloadsPath(): Promise<string>;
}

function getElectronAPI(): ElectronAPI | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  return api ?? null;
}

/** True when running inside Electron with the preload bridge available. */
export function isElectronWithBridge(): boolean {
  return getElectronAPI() !== null;
}

// ---------------------------------------------------------------------------
// Toast state — a simple module-level signal read by the AutoImportToast
// component rendered in Shell.tsx.
// ---------------------------------------------------------------------------

type ToastListener = (message: string) => void;
const toastListeners = new Set<ToastListener>();

function emitToast(message: string) {
  toastListeners.forEach((fn) => fn(message));
}

/** Subscribe to toast events. Returns an unsubscribe function. */
export function onAutoImportToast(fn: ToastListener): () => void {
  toastListeners.add(fn);
  return () => toastListeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

let started = false;

/**
 * Start listening for AI-webview image downloads and auto-importing them.
 * Safe to call multiple times — only the first call has any effect.
 * Returns a cleanup function (for React strict-mode / hot-reload).
 */
export function startAutoImport(): () => void {
  const api = getElectronAPI();
  if (!api || started) return () => {};

  started = true;

  const unsubscribe = api.onImageDownloaded(async ({ dataUrl, filename }) => {
    try {
      const { addFromDataUrl } = useLibraryStore.getState();
      await addFromDataUrl(dataUrl, 'ai', filename);
      emitToast(`Image "${filename}" imported from AI!`);
    } catch (err) {
      console.error('[Gaia] Auto-import failed:', err);
    }
  });

  return () => {
    unsubscribe();
    started = false;
  };
}
