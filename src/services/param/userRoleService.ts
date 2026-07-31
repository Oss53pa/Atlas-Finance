/**
 * userRoleService — affectation de rôles multi + portée + délégation, avec
 * BLOCAGE SoD DUR côté serveur (CDC Paramètres §13).
 *
 * PHASE 1-2 : modèle canonique `user_role` + garde SoD à l'affectation +
 * observabilité (dérogations, rôles). L'enforcement RBAC (RBACGuard) N'EST PAS
 * basculé ici (phase 3, après observation à écart nul).
 *
 * `wouldViolateSod` est PURE (miroir client du contrôle serveur).
 */
import type { DataAdapter } from '@atlas/data';
import { detectSodViolations, type SodRule } from './sodService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

/** Vrai s'il y aurait un conflit SoD après ajout des permissions. Fonction pure. */
export function wouldViolateSod(existing: string[], added: string[], rules: SodRule[]): SodRule[] {
  return detectSodViolations([...existing, ...added], rules);
}

export interface UserRoleRow {
  id: string; user_id: string; role_code: string; portee: any;
  delegue_de: string | null; valide_du: string; valide_au: string | null; actif: boolean;
}

export async function listUserRoles(adapter: DataAdapter): Promise<UserRoleRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('user_role')
    .select('id,user_id,role_code,portee,delegue_de,valide_du,valide_au,actif')
    .order('user_id').order('role_code');
  return (data ?? []) as UserRoleRow[];
}

export interface DerogationRow { user_id: string; permission_a: string; permission_b: string; motif: string; valide_par: string | null; le: string; }

export async function listDerogations(adapter: DataAdapter): Promise<DerogationRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('sod_derogation')
    .select('user_id,permission_a,permission_b,motif,valide_par,le').order('le', { ascending: false }).limit(200);
  return (data ?? []) as DerogationRow[];
}

/**
 * Affecte un rôle à un utilisateur — REJETÉ côté serveur si un conflit SoD
 * bloquant apparaît, sauf dérogation motivée fournie (map {"permA|permB":true, "motif":"…"}).
 */
export async function assignRole(adapter: DataAdapter, userId: string, roleCode: string, portee?: any, derogation?: Record<string, any>): Promise<any> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data, error } = await client.rpc('assign_user_role', {
    p_user: userId, p_role: roleCode, p_portee: portee ?? null, p_derogation: derogation ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Permissions effectives d'un utilisateur (union des rôles actifs & dans la fenêtre). */
export async function effectivePermissions(adapter: DataAdapter, userId: string, tenantId: string): Promise<string[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.rpc('effective_permissions', { p_user: userId, p_tenant: tenantId });
  return (data ?? []) as string[];
}
