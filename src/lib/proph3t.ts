/**
 * proph3t.ts — Fédération Atlas Studio « Proph3t core » (mode B : hébergé).
 * ----------------------------------------------------------------------------
 * Ce module branche WiseBook sur le CORE IA mutualisé d'Atlas Studio
 * (projet Supabase `vgtmljfayiysuvrcmunt`) — PAS le Supabase de cette app.
 * Il vient EN COMPLÉMENT du Proph3t local (ProphetV2 + LLMProviderFactory) et
 * des imports Excel / saisies manuelles : c'est un chemin supplémentaire, pas
 * un remplacement.
 *
 * Mode implémenté : B (hébergé). On délègue tout le tour à l'orchestrateur
 * `proph3t-ask` du core, avec gouvernance par SENSIBILITÉ des données.
 *
 * Mode A (fédération via le SDK `@atlas-studio/proph3t-client`) est
 * VOLONTAIREMENT omis : le paquet n'est pas publié sur npm (404). À réactiver
 * quand le SDK sera disponible (registre privé ou tarball).
 *
 * Sécurité :
 *  - Aucune clé en dur ici : URL + anon key du core viennent de l'environnement
 *    (placeholders dans .env.example, vraie valeur dans .env.local non commité).
 *  - Le JWT de la session Supabase de l'app est passé en Authorization pour que
 *    la RLS du core s'applique ; sans session → endpoints publics seulement.
 *  - `sensitivity: 'confidential'` (défaut WiseBook) confine le routage du core
 *    à Ollama/Claude — jamais un provider à rétention (gemini/groq).
 */

// ⚠️ supabase = le client Supabase de CETTE app (pour récupérer le JWT user).
import { supabase } from './supabase';

/** Id de WiseBook au catalogue Atlas Studio (le core normalise atlas-compta→atlas-fa). */
const PRODUCT = 'atlas-compta';

// URL/clé du core : VITE_ATLAS_* si fournis, sinon FALLBACK sur le Supabase de l'app.
// Vérifié en prod : l'app tourne sur le MÊME projet que le core Atlas Studio
// (vgtmljfayiysuvrcmunt, où `proph3t-ask` est déployée) → le fallback rend Proph3t
// opérationnel sans aucune variable d'environnement supplémentaire. Si un jour le
// core est séparé de l'app, définir VITE_ATLAS_SUPABASE_URL/ANON_KEY reprend la main.
const ATLAS_CORE_URL =
  (import.meta.env.VITE_ATLAS_SUPABASE_URL as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  '';
const ATLAS_CORE_ANON =
  (import.meta.env.VITE_ATLAS_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  '';

export type Sensitivity = 'confidential' | 'internal' | 'public';

/**
 * Sensibilité par défaut de WiseBook. ERP manipulant paie, liasses fiscales,
 * relevés bancaires et contrats → on confine au routage sans rétention. Les
 * flux explicitement publics/internes (support, doc, brouillons) peuvent
 * surcharger via le paramètre `sensitivity`.
 */
export const DEFAULT_SENSITIVITY: Sensitivity = 'confidential';

export interface AskResult {
  conversation_id: string;
  answer: string;
  citations: unknown[];
  confidence: number;
  disclaimer?: string;
}

/** Vrai si le core Atlas Studio est configuré (URL + anon key présents). */
export function isProph3tCoreConfigured(): boolean {
  return !!ATLAS_CORE_URL && !!ATLAS_CORE_ANON;
}

/**
 * Pose une question à l'orchestrateur Proph3t hébergé (core Atlas Studio).
 *
 * `sensitivity` gouverne les providers autorisés côté core :
 *   - 'confidential' (défaut WiseBook) → Ollama + Claude uniquement, aucune
 *     rétention. À utiliser pour relevés bancaires, liasses fiscales, paie,
 *     contrats, due diligence.
 *   - 'internal' / 'public' → tous providers selon dispo.
 *
 * Refuse proprement (Error explicite) si le core n'est pas configuré : aucune
 * donnée ne peut alors fuiter.
 */
export async function askProph3t(params: {
  message: string;
  sensitivity?: Sensitivity;
  conversationId?: string;
  societyId?: string;
}): Promise<AskResult> {
  if (!isProph3tCoreConfigured()) {
    throw new Error(
      '[Proph3t] Core Atlas Studio non configuré : définir VITE_ATLAS_SUPABASE_URL ' +
        'et VITE_ATLAS_SUPABASE_ANON_KEY (projet core, PAS le Supabase de l\'app) ' +
        'dans .env.local.',
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${ATLAS_CORE_URL}/functions/v1/proph3t-ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ATLAS_CORE_ANON,
      Authorization: `Bearer ${session?.access_token ?? ATLAS_CORE_ANON}`,
    },
    body: JSON.stringify({
      message: params.message,
      product: PRODUCT,
      sensitivity: params.sensitivity ?? DEFAULT_SENSITIVITY,
      conversation_id: params.conversationId,
      society_id: params.societyId,
    }),
  });
  if (!res.ok) throw new Error(`proph3t-ask ${res.status}: ${await res.text()}`);
  return res.json() as Promise<AskResult>;
}
