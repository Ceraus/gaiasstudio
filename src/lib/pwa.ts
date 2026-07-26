/** Register the service worker for PWA offline shell caching (browser builds only). */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // Electron ships its own runtime — skip SW there.
  if ((window as unknown as { electronAPI?: unknown }).electronAPI) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('./sw.js')
      .catch((err) => console.warn('[PWA] Service worker registration failed:', err));
  });
}

/** OAuth redirect URI for Etsy — must match what you register in the Etsy developer app. */
export function getOAuthRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname.replace(/\/index\.html$/, '');
  const base = path.endsWith('/') ? path : `${path}/`;
  return `${window.location.origin}${base}`;
}
