/**
 * sodService — Séparation des tâches (SoD) (CDC Paramètres §13, critère #4).
 *
 * Détecte les rôles qui cumulent deux permissions en CONFLIT (ex. saisir ET
 * valider une écriture). Lecture seule : n'altère pas l'enforcement d'auth.
 *
 * `detectSodViolations` est PURE (testable). Le rapport lit les rôles
 * relationnels (roles → role_permissions → permissions.code).
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

export type SodSeverite = 'faible' | 'moyen' | 'eleve';

export interface SodRule {
  permission_a: string;
  permission_b: string;
  severite: SodSeverite;
  libelle: string | null;
}

export interface SodRoleReport {
  role_id: string;
  role_name: string;
  nb_users: number;
  permissions: string[];
  violations: SodRule[];
}

/**
 * Renvoie les règles de conflit dont LES DEUX permissions sont présentes dans
 * l'ensemble fourni. Fonction pure.
 */
export function detectSodViolations(permissions: string[], rules: SodRule[]): SodRule[] {
  const set = new Set(permissions);
  return rules.filter(r => set.has(r.permission_a) && set.has(r.permission_b));
}

export async function listSodRules(adapter: DataAdapter): Promise<SodRule[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('sod_conflit').select('permission_a,permission_b,severite,libelle').order('severite', { ascending: false });
  return (data ?? []) as SodRule[];
}

/**
 * Rapport SoD par rôle. Source des rôles = `settings.roles_config` (le store réel
 * de l'éditeur RBAC /security/roles). Robuste : renvoie une liste vide si aucun
 * rôle n'est configuré (les tables `roles`/`role_permissions` relationnelles sont
 * un échafaudage non peuplé — cf. audit RBAC).
 */
export async function getSodReport(adapter: DataAdapter): Promise<SodRoleReport[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const rules = await listSodRules(adapter);

  let rolesCfg: any[] = [];
  try {
    const rs = await adapter.getById<any>('settings', 'roles_config');
    if (rs?.value) rolesCfg = JSON.parse(rs.value);
  } catch { /* roles_config absent → aucun rôle configuré */ }

  const usersByRole = new Map<string, number>();
  try {
    const { data: profs } = await client.from('profiles').select('role');
    for (const p of (profs ?? [])) { const k = String(p.role || ''); usersByRole.set(k, (usersByRole.get(k) || 0) + 1); }
  } catch { /* best-effort */ }

  return rolesCfg.map((r: any) => {
    const perms: string[] = Array.isArray(r.permissions) ? r.permissions.map(String) : [];
    const name = r.name || r.code || r.id;
    return {
      role_id: String(r.id || r.code || name),
      role_name: name,
      nb_users: usersByRole.get(r.code) || usersByRole.get(name) || Number(r.usersCount) || 0,
      permissions: perms,
      violations: detectSodViolations(perms, rules),
    };
  }).sort((a, b) => b.violations.length - a.violations.length);
}
