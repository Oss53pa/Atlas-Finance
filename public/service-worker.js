/**
 * Atlas FnA service worker — NO-OP + auto-guérison ONE-SHOT.
 *
 * L'app ne fait PLUS appel au service worker (le SW v1 cache-first cassait
 * les déploiements). Ce fichier est conservé pour les navigateurs qui ont
 * encore l'URL en cache et qui essaient de le fetcher : il n'intercepte rien.
 *
 * Si un navigateur active encore ce SW (legacy registration), il :
 *   1. Skip waiting immédiatement
 *   2. Vide tous les caches (sauf le marqueur d'auto-guérison)
 *   3. Se désinscrit
 *   4. Recharge chaque client UNE SEULE FOIS (auto-guérison), afin de
 *      remplacer le bundle périmé servi par le legacy SW — sinon
 *      l'utilisateur resterait bloqué sur l'ancienne version (features
 *      manquantes, ex. Analytique) jusqu'à un hard-reload manuel.
 *   5. Pour toute requête, passe au réseau sans interception.
 *
 * Le reload est protégé par un marqueur persistant en Cache Storage
 * (survit au purge de l'étape 2) : il ne se déclenche donc JAMAIS deux fois,
 * ce qui évite la boucle de reload qui avait motivé la version précédente.
 */

const HEAL_CACHE = 'atlas-sw-selfheal-v1';
const HEAL_MARKER = 'healed';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 0. A-t-on déjà auto-guéri ce navigateur ? (garde-fou anti-boucle)
    let alreadyHealed = false;
    try {
      const marker = await caches.open(HEAL_CACHE);
      alreadyHealed = Boolean(await marker.match(HEAL_MARKER));
    } catch (_e) { /* ignore */ }

    // 1. Purge tous les caches SAUF le marqueur d'auto-guérison.
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== HEAL_CACHE).map((k) => caches.delete(k)),
      );
    } catch (_e) { /* ignore */ }

    // 2. Désinscription : l'app n'enregistre plus ce SW.
    try {
      await self.registration.unregister();
    } catch (_e) { /* ignore */ }

    // 3. Auto-guérison ONE-SHOT : pose le marqueur PUIS recharge les clients.
    //    Le marqueur est écrit avant le reload → si l'activate se rejoue, le
    //    garde-fou de l'étape 0 court-circuite tout nouveau reload.
    if (!alreadyHealed) {
      try {
        const marker = await caches.open(HEAL_CACHE);
        await marker.put(HEAL_MARKER, new Response('1'));
      } catch (_e) { /* ignore */ }
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        await Promise.all(
          clients.map((c) => c.navigate(c.url).catch(() => {})),
        );
      } catch (_e) { /* ignore */ }
    }
  })());
});

self.addEventListener('fetch', () => {
  // No-op : le navigateur fait la requête directement.
  return;
});
