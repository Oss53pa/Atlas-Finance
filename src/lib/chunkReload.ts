/**
 * Garde-fou partagé contre les chunks obsolètes (« stale chunks »).
 *
 * Après un déploiement, l'index.html déjà chargé par un onglet ouvert référence
 * des chunks qui n'existent plus sur le CDN. Le seul remède côté client est un
 * rechargement dur — mais il doit être plafonné, sinon la page boucle.
 *
 * Ce module centralise cette logique pour `lazyRetry` (App) et le filet de
 * sécurité `unhandledrejection` (main), qui la dupliquaient.
 */

const TS_KEY = 'chunk-reload-ts';

/** Un seul rechargement automatique par fenêtre glissante. */
export const RELOAD_WINDOW_MS = 30_000;

/** Lecture tolérante : navigation privée / cookies bloqués → 0. */
function readLastReload(): number {
  try {
    return Number(sessionStorage.getItem(TS_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** Écriture tolérante : renvoie false si le stockage est indisponible. */
function writeLastReload(ts: number): boolean {
  try {
    sessionStorage.setItem(TS_KEY, String(ts));
    return true;
  } catch {
    return false;
  }
}

const STALE_CHUNK_MESSAGES = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'error loading dynamically imported module',
  'unable to preload css',
];

/** Vrai si l'erreur ressemble à un chunk introuvable / non chargeable. */
export function isStaleChunkError(reason: unknown): boolean {
  const message =
    typeof reason === 'object' && reason !== null && 'message' in reason
      ? String((reason as { message?: unknown }).message ?? '')
      : String(reason ?? '');
  const normalized = message.toLowerCase();
  return STALE_CHUNK_MESSAGES.some((needle) => normalized.includes(needle));
}

/**
 * Recharge la page au plus une fois par fenêtre de {@link RELOAD_WINDOW_MS}.
 * Renvoie `true` si le rechargement a effectivement été déclenché — l'appelant
 * doit alors suspendre plutôt que de propager l'erreur.
 *
 * Si sessionStorage est indisponible (mode privé strict, cookies bloqués), on
 * refuse de recharger : sans mémoire de la tentative précédente le garde-fou
 * n'existe plus et la page bouclerait. L'erreur remonte alors à
 * l'ErrorBoundary, ce qui reste préférable à un rechargement infini.
 */
export function reloadForStaleChunk(now: number = Date.now()): boolean {
  const last = readLastReload();
  if (last && now - last <= RELOAD_WINDOW_MS) return false;
  if (!writeLastReload(now)) return false;
  window.location.reload();
  return true;
}
