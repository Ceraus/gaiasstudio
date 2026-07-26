// ---------------------------------------------------------------------------
// Service Worker — offline-first caching for Gaia's Studio PWA.
//
// Strategy: Cache the app shell (HTML, JS, CSS, icons) on install so the app
// loads instantly even offline. Dynamic data stays in IndexedDB (Dexie).
// ---------------------------------------------------------------------------

const CACHE_NAME = 'gaias-studio-v3';

// App shell files to pre-cache on install.
// Vite hashes filenames, so we cache the root entry point and let the
// browser cache hashed assets via their immutable URLs.
const SHELL_FILES = [
  './',
  './index.html',
  './icon.png',
  './manifest.json',
];

// Install: pre-cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first (app shell), then network.
// For hashed Vite assets (contain a hash in the filename), cache on first fetch.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and cross-origin requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip Etsy API calls and other API requests
  if (url.pathname.startsWith('/api/') || url.hostname.includes('etsy.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful responses for JS/CSS/image assets
        if (response.ok && (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.woff2') ||
          url.pathname.endsWith('.svg')
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // If both cache and network fail, return the cached index.html for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
