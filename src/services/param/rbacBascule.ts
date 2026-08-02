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
  legacyRaw: string | null;  // valeur brute profiles.role (avant canonicalisation)
  legacy: string | null;     // rôle legacy canonicalisé
  effective: string[];       // rôles effectifs canonicalisés
  perd: string[];     // rôles legacy perdus à la bascule (verrouillage → danger)
  gagne: string[];    // rôles gagnés à la bascule (nouvel accès)
  aligned: boolean;   // legacy couvert par l'effectif → aucun verrouillage
}

export type RoleVocab = 'profiles' | 'roles_name' | 'user_role';

export interface RoleCrosswalkRow {
  source_vocab: RoleVocab;
  source_value: string;
  canonical_role: string;
  statut: 'confirme' | 'a_trancher';
  note: string | null;
}

/**
 * Normalise une valeur source vers son rôle canonique. Fonction PURE (miroir de
 * `canonical_role` SQL) : d'abord le crosswalk confirmé, sinon la valeur elle-même
 * si déjà canonique, sinon null (non résolu → aucun accès accordé par défaut).
 */
export function canonicalRole(
  vocab: RoleVocab, value: string | null,
  crosswalk: RoleCrosswalkRow[], canonicalCodes: string[],
): string | null {
  if (value == null) return null;
  const hit = crosswalk.find(r => r.source_vocab === vocab && r.source_value === value && r.statut === 'confirme');
  if (hit) return hit.canonical_role;
  return canonicalCodes.includes(value) ? value : null;
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
    legacyRaw: legacy,
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
    legacyRaw: d.legacy_raw ?? null,
    legacy: d.legacy ?? null,
    effective: Array.isArray(d.effective) ? d.effective : [],
    perd: Array.isArray(d.perd) ? d.perd : [],
    gagne: Array.isArray(d.gagne) ? d.gagne : [],
    aligned: !!d.aligned,
  };
}

/** Liste le crosswalk de réconciliation des rôles (référence, lecture ouverte). */
export async function listRoleCrosswalk(adapter: DataAdapter): Promise<RoleCrosswalkRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('role_crosswalk')
    .select('source_vocab,source_value,canonical_role,statut,note')
    .order('source_vocab').order('source_value');
  return (data ?? []) as RoleCrosswalkRow[];
}
