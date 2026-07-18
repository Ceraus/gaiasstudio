import type { GaiaApi } from "../types/window";
import { webFallbackApi } from "./webFallbackApi";

/**
 * Single import point for the app <-> backend bridge. Inside the packaged
 * Electron app this is the real `window.api` exposed by electron/preload.ts
 * (better-sqlite3 + electron-store + pdf-lib, all running in the main
 * process). If the app happens to be opened in a plain browser tab (e.g.
 * `npm run dev` without Electron) it transparently falls back to an
 * in-memory/localStorage implementation so the UI can still be developed
 * and previewed.
 */
export const api: GaiaApi = typeof window !== "undefined" && window.api ? window.api : webFallbackApi;

export const isElectron = typeof window !== "undefined" && !!window.api;
