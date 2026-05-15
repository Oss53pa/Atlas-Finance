/**
 * Atlas F&A service worker — SELF-DESTRUCT.
 *
 * Le SW v1 (cache-first sur tous les GET) cassait les déploiements en servant
 * indéfiniment des chunks aux hashes périmés. Pour purger TOUS les SW déjà
 * installés sur les navigateurs des utilisateurs, ce fichier remplace
 * l'ancien et :
 *   1. Skip waiting au plus tôt
 *   2. À l'activation, vide tous les caches + se désinscrit
 *   3. Recharge tous les clients pour qu'ils repartent SANS service worker
 *   4. Pour toute requête fetch, passe en transparent (pas de cache)
 *
 * Les navigateurs vérifient automatiquement /service-worker.js tous les ~24h
 * (et à chaque update() côté client) -- donc ce fichier va finir par
 * remplacer le v1 de tout le monde, naturellement.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Vider tous les caches
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_e) { /* ignore */ }

    // 2. Se désinscrire
    try {
      await self.registration.unregister();
    } catch (_e) { /* ignore */ }

    // 3. Recharger tous les onglets ouverts pour qu'ils repartent propres
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    } catch (_e) { /* ignore */ }
  })());
});

// Pendant la transition (avant désinscription), passer toutes les fetch en
// transparent : aucun cache, aucune interception. Le navigateur fait
// directement la requête réseau.
self.addEventListener('fetch', (_event) => {
  // No respondWith() -> le navigateur gère la requête normalement.
  return;
});
