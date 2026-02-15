/**
 * Module d'authentification pour les Edge Functions
 *
 * Extrait et vérifie le JWT utilisateur depuis le header Authorization.
 * Récupère le company_id (workspace) pour l'isolation multi-tenant.
 */

import { createAdminClient } from './supabase-client.ts'

/**
 * Informations extraites du JWT utilisateur
 */
export interface AuthUser {
  /** UUID de l'utilisateur (auth.users.id) */
  id: string
  /** Email de l'utilisateur */
  email: string
  /** UUID de la société (company_id) pour l'isolation multi-tenant */
  companyId: string
  /** Code du rôle (admin, manager, accountant, user) */
  role: string
}

/**
 * Vérifie le token JWT et retourne les informations utilisateur.
 *
 * Étapes :
 * 1. Extraire le token du header Authorization: Bearer <token>
 * 2. Vérifier le token via supabase.auth.getUser()
 * 3. Charger le profil (company_id, role) depuis la table profiles
 *
 * @throws Error si le token est absent, invalide ou si le profil est introuvable
 */
export async function authenticateUser(req: Request): Promise<AuthUser> {
  // 1. Extraire le token Bearer
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Token d\'authentification requis', 401)
  }

  const token = authHeader.replace('Bearer ', '')

  // 2. Vérifier le token via Supabase Auth
  const adminClient = createAdminClient()
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)

  if (authError || !user) {
    throw new AuthError('Token invalide ou expiré', 401)
  }

  // 3. Charger le profil utilisateur (company_id + role)
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select(`
      company_id,
      role:roles(code)
    `)
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new AuthError('Profil utilisateur introuvable', 403)
  }

  if (!profile.company_id) {
    throw new AuthError('Aucune société associée à cet utilisateur', 403)
  }

  return {
    id: user.id,
    email: user.email || '',
    companyId: profile.company_id,
    role: (profile.role as any)?.code || 'user',
  }
}

/**
 * Erreur d'authentification avec status HTTP
 */
export class AuthError extends Error {
  public status: number

  constructor(message: string, status: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

/**
 * Helper : crée une réponse JSON d'erreur
 */
export function errorResponse(
  message: string,
  status: number = 500,
  headers: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    }
  )
}
