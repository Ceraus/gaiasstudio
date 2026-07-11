/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistration {
  sync?: SyncManager;
}
