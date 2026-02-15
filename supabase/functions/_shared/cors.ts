/**
 * Headers CORS partagés pour toutes les Edge Functions
 *
 * Permet au frontend (localhost en dev, domaine prod) d'appeler les fonctions.
 * En production, remplacer '*' par le domaine exact du frontend.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
