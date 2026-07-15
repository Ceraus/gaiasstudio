/// <reference types="vite/client" />

// three.js ships its own types via package.json#exports but the bare
// specifier 'three' and addon sub-paths are not always resolved by tsc
// without @types/three. Suppress implicit-any errors here.
declare module 'three' {
  const THREE: unknown
  export = THREE
  export as namespace THREE
}
declare module 'three/addons/controls/OrbitControls.js' {
  export class OrbitControls {
    constructor(camera: unknown, domElement?: HTMLElement)
    update(): void
    dispose(): void
    enableDamping: boolean
    dampingFactor: number
    enableZoom: boolean
    autoRotate: boolean
    autoRotateSpeed: number
    [key: string]: unknown
  }
}

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_DEV_OFFLINE_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistration {
  sync?: SyncManager;
}
