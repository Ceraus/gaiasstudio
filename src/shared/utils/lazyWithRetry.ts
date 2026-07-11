import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_KEY = 'cvg-chunk-reload'

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    // Private browsing / blocked storage.
  }
}

export function isLazyModuleResolutionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    if (typeof error === 'string') {
      return isLazyModuleResolutionError(new Error(error))
    }
    return false
  }
  const msg = error.message.toLowerCase()
  return (
    msg.includes('_result is undefined') ||
    msg.includes(`can't access property "default"`) ||
    (msg.includes('cannot read properties of undefined') && msg.includes('default')) ||
    (msg.includes('cannot read property') && msg.includes('default')) ||
    msg.includes('missing default export')
  )
}

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    if (typeof error === 'string') {
      return isChunkLoadError(new Error(error))
    }
    return false
  }
  if (isLazyModuleResolutionError(error)) return true
  const msg = error.message.toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('failed to load module script') ||
    msg.includes('application update required') ||
    (msg.includes('failed to fetch') && msg.includes('/assets/'))
  )
}

function validateLazyModule<T>(mod: { default: T } | null | undefined): { default: T } {
  if (!mod || typeof mod !== 'object' || mod.default == null) {
    throw new Error('error loading dynamically imported module: missing default export')
  }
  return mod
}

function stallUntilReload(): Promise<never> {
  return new Promise(() => {
    // Intentionally pending until navigation completes.
  })
}

export function recoverFromChunkLoadError(error?: unknown): boolean {
  if (error != null && !isChunkLoadError(error)) return false
  try {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      window.location.reload()
      return true
    }
  } catch {
    // Private browsing / blocked storage.
  }
  return false
}

function handleChunkLoadFailure(): Promise<never> {
  if (recoverFromChunkLoadError()) {
    return stallUntilReload()
  }
  return Promise.reject(new Error('Application update required — please reload the page.'))
}

function loadWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): Promise<{ default: T }> {
  return factory()
    .then((mod) => validateLazyModule(mod))
    .catch((error) => {
      if (!isChunkLoadError(error)) throw error
      return factory()
        .then((mod) => validateLazyModule(mod))
        .catch((retryError) => {
          if (!isChunkLoadError(retryError)) throw retryError
          return handleChunkLoadFailure()
        })
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => loadWithRetry(factory))
}
