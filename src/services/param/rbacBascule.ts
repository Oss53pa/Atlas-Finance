/**
 * rbacBascule — PRÉPARATION de la bascule RBAC phase 3 (CDC Paramètres §13).
 *
 * Contexte (prouvé en base) : l'enforcement des routes est PAR RÔLE
 * (`RBACGuard allowedRoles` sur `profiles.role`). Les permissions sont mortes
 * (`profiles.role_id`/`role_permissions` absents → getUserPermissions()=[]). La
 * phase 3 = enforcer sur le modèle MULTI-rôles `user_role` (délégation, fenêtre)
 * au lieu du `profiles.role` mono-valué.
 *
 * Ce module N'ACTIVE RIEN par défaut :
 *  - `effectiveEnforcementEnabled()` lit `VITE_RBAC_SOURCE` (défaut 'legacy').
 *    Choix d'un flag BUILD (pas un param runtime) : (a) l'enforcement d'auth doit
 *    passer par un déploiement + rollback traçables, pas par une ligne de données
 *    éditable ; (b) zéro `await` ajouté au chemin chaud d'auth quand 'legacy'.
 *  - `diffRoles` est PURE (miroir client de `rbac_role_delta`), pour observer
 *    l'« écart nul » avant de basculer.
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

export type RbacSource = 'legacy' | 'effective';

/** Source d'enforcement de rôle, gouvernée au build. Défaut sûr = 'legacy'. */
export function effectiveEnforcementEnabled(): boolean {
  try {
    return (import.meta as any).env?.VITE_RBAC_SOURCE === 'effective';
  } catch { return false; }
}

export interface RoleDelta {
  legacy: string | null;
  effective: string[];
  perd: string[];     // rôles legacy perdus à la bascule (verrouillage → danger)
  gagne: string[];    // rôles gagnés à la bascule (nouvel accès)
  aligned: boolean;   // legacy couvert par l'effectif → aucun verrouillage
}

/**
 * Delta legacy↔effectif. Fonction PURE (mêmes règles que `rbac_role_delta`).
 *  - `perd`   : le rôle legacy n'est pas dans l'effectif → l'utilisateur PERDRAIT son accès.
 *  - `gagne`  : rôles effectifs au-delà du legacy → accès ÉLARGI.
 *  - `aligned`: legacy absent (rien à préserver) OU présent dans l'effectif.
 */
export function diffRoles(legacy: string | null, effective: string[]): RoleDelta {
  const eff = Array.from(new Set(effective.filter(Boolean)));
  const inEff = legacy != null && eff.includes(legacy);
  return {
    legacy,
    effective: eff,
    perd: legacy != null && !inEff ? [legacy] : [],
    gagne: eff.filter(r => r !== legacy),
    aligned: legacy == null || inEff,
  };
}

/** Vrai si la bascule ne verrouillerait AUCUN des utilisateurs observés. */
export function safeToSwitch(deltas: RoleDelta[]): boolean {
  return deltas.length > 0 && deltas.every(d => d.aligned);
}

/** Rôles effectifs de l'utilisateur courant (self, sans param). [] hors-ligne. */
export async function myEffectiveRoles(adapter: DataAdapter): Promise<string[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.rpc('my_effective_roles');
  return (data ?? []) as string[];
}

/** Observation du delta legacy↔effectif pour un utilisateur (self ou admin). */
export async function rbacRoleDelta(adapter: DataAdapter, userId: string): Promise<RoleDelta | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data, error } = await client.rpc('rbac_role_delta', { p_user: userId });
  if (error || !data) return null;
  const d = data as any;
  return {
    legacy: d.legacy ?? null,
    effective: Array.isArray(d.effective) ? d.effective : [],
    perd: Array.isArray(d.perd) ? d.perd : [],
    gagne: Array.isArray(d.gagne) ? d.gagne : [],
    aligned: !!d.aligned,
  };
}
