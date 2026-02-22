/**
 * Headers CORS partagés pour toutes les Edge Functions
 *
 * L'origine autorisée est lue depuis la variable d'environnement ALLOWED_ORIGIN.
 * Par défaut, seul le domaine de production est autorisé.
 */

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://atlas-finance.app';

export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

/**
 * Gère la requête preflight OPTIONS
 * A appeler en tout début de chaque Edge Function
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
