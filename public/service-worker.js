/**
 * Atlas F&A service worker
 * v2 — Network-first pour HTML/JS/JSON, cache-first pour assets hashés.
 *
 * Le SW v1 cassait les déploiements car cache-first sur TOUS les GET :
 * les anciens chunks (hashes périmés) étaient servis indéfiniment, alors
 * que l'index.html pointait vers de nouveaux hashes -> 404 vendors.
 */

const CACHE_NAME = 'atlas-finance-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
];

// Détection : fichier hashé long-cacheable (ex: vendor-charts-737AVlYc.js)
const HASHED_ASSET_RE = /\/assets\/.+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2?|png|jpg|svg|ico)(?:\?.*)?$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Forcer l'activation immédiate du nouveau SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorer toutes les URLs cross-origin (api Supabase, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // Navigation HTML -> network-first (toujours fetch frais, sinon offline page)
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mise à jour du cache pour usage offline
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Asset hashé immuable -> cache-first
  if (HASHED_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Tout le reste (JS non hashé, JSON, fonts publiques) -> network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
