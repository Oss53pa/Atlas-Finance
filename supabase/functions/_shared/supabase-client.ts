/**
 * Client Supabase côté serveur (Edge Functions)
 *
 * Utilise la clé service_role pour bypasser les RLS policies.
 * Ce client ne doit JAMAIS être exposé côté frontend.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Crée un client Supabase admin avec la service_role_key
 * Bypass complet des RLS policies - la sécurité est gérée
 * manuellement via les filtres workspace_id dans chaque fonction.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises. ' +
      'Vérifiez votre configuration supabase/.env'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Crée un client Supabase authentifié avec le token de l'utilisateur
 * Respecte les RLS policies - utile pour les opérations qui doivent
 * respecter les permissions utilisateur.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Variables SUPABASE_URL et SUPABASE_ANON_KEY requises.'
    )
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
