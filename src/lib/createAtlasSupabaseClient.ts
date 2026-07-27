// ============================================================================
// Atlas Studio — Factory client Supabase (frontend) HARMONISÉE
// ----------------------------------------------------------------------------
// Config d'auth normalisée pour toutes les apps satellites : persistance
// localStorage + storageKey explicite par app, lock no-op, fetch résilient,
// autoRefresh/persist/detectSessionInUrl activés.
//
// Contrat unique destiné à devenir un paquet partagé (une seule source). Chaque
// app fournit son url / anonKey / storageKey ; le reste est identique partout.
// ============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface AtlasSupabaseOptions {
  url: string;
  anonKey: string;
  storageKey: string;
  fetchMaxRetries?: number;
}

const noopLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => fn();

function makeResilientFetch(maxRetries: number) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetch(input, init);
      } catch (err) {
        lastErr = err;
        const aborted =
          (err instanceof DOMException && err.name === 'AbortError') ||
          Boolean(init?.signal?.aborted);
        if (aborted || attempt === maxRetries) break;
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    throw lastErr;
  };
}

export function createAtlasSupabaseClient<DB = any>(
  opts: AtlasSupabaseOptions,
): SupabaseClient<DB> {
  return createClient<DB>(opts.url, opts.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      storageKey: opts.storageKey,
      lock: noopLock,
    },
    global: {
      fetch: makeResilientFetch(opts.fetchMaxRetries ?? 2),
    },
  });
}
