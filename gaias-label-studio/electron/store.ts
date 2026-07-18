import Store from "electron-store";
import type { AppSettings } from "../shared/contract";

const defaults: AppSettings = {
  language: "en",
  filePrefix: "LABEL",
  googleAiStudioApiKey: "",
  unsplashApiKey: "",
  pixabayApiKey: "",
};

// electron-store persists to the OS user-data directory and is only ever
// read/written from the main process, so API keys never touch the renderer's
// JS context directly except through the explicit, narrow preload bridge.
const store = new Store<AppSettings>({
  name: "settings",
  defaults,
  encryptionKey: "gaias-label-studio-local-only",
});

export function getSettings(): AppSettings {
  return { ...defaults, ...(store.store as Partial<AppSettings>) };
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  for (const [key, value] of Object.entries(partial)) {
    store.set(key as keyof AppSettings, value as never);
  }
  return getSettings();
}
