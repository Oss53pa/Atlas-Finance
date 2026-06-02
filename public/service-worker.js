/**
 * Atlas FnA service worker — NO-OP.
 *
 * L'app ne fait PLUS appel au service worker (le SW v1 cache-first cassait
 * les déploiements). Ce fichier est conservé pour les navigateurs qui ont
 * encore l'URL en cache et qui essaient de le fetcher : il ne fait rien.
 *
 * Si jamais un navigateur active ce SW (legacy registration), il :
 *   1. Skip waiting immédiatement
 *   2. Vide tous les caches
 *   3. Se désinscrit
 *   4. Ne reload PAS les clients (sinon boucle de reload sur chaque navigation)
 *   5. Pour toute requête, passe au réseau sans interception
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_e) { /* ignore */ }
    try {
      await self.registration.unregister();
    } catch (_e) { /* ignore */ }
    // Volontairement : PAS de clients.navigate() ici.
    // Sinon chaque activate (mise a jour) force un reload de l'app,
    // ce qui obligeait l'utilisateur a hard-reload manuellement a chaque page.
  })());
});

self.addEventListener('fetch', () => {
  // No-op : le navigateur fait la requête directement.
  return;
});
