/**
 * paramService — Socle de résolution des paramètres (CDC Paramètres §1, §22).
 *
 * Point d'accès unique à la configuration gouvernée (remplace la lecture directe
 * de `settings`). La résolution suit la portée la plus spécifique à la date
 * (param_resolve côté SQL) ; le repli sur la valeur par défaut du catalogue est
 * géré ici.
 *
 * `pickParamValue` est une fonction PURE qui reproduit la logique de résolution
 * SQL — testable sans base.
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export type Portee = 'plateforme' | 'groupe' | 'societe' | 'module' | 'user';
export type ParamStatut = 'brouillon' | 'soumis' | 'actif' | 'historise';

export interface ParamDefinition {
  id: string; cle: string; module: string; libelle: string | null;
  type_valeur: string | null; type_gouvernance: string | null;
  valeur_defaut: any; actif: boolean;
}

export interface ParamValeurRow {
  portee: Portee; effet_du: string; effet_au: string | null;
  valeur: any; statut: ParamStatut;
}

const PORTEE_RANK: Record<Portee, number> = { user: 1, module: 2, societe: 3, groupe: 4, plateforme: 5 };

/**
 * Résolution pure : parmi les valeurs ACTIVES et en vigueur à `asOf`, retient la
 * portée la plus spécifique (user < module < societe < groupe < plateforme),
 * puis la plus récente. Renvoie undefined si aucune. Dates au format ISO.
 */
export function pickParamValue(rows: ParamValeurRow[], asOf: string): any {
  const eligible = rows.filter(r =>
    r.statut === 'actif' && r.effet_du <= asOf && (r.effet_au == null || r.effet_au > asOf));
  if (eligible.length === 0) return undefined;
  eligible.sort((a, b) => {
    const pr = PORTEE_RANK[a.portee] - PORTEE_RANK[b.portee];
    return pr !== 0 ? pr : (a.effet_du < b.effet_du ? 1 : a.effet_du > b.effet_du ? -1 : 0);
  });
  return eligible[0].valeur;
}

/** Résout une clé à une date donnée (défaut aujourd'hui) ; repli sur la valeur par défaut du catalogue. */
export async function resolveParam<T = any>(adapter: DataAdapter, cle: string, asOf?: string): Promise<T | undefined> {
  const client = getClient(adapter);
  if (!client) return undefined;
  const { data, error } = await client.rpc('param_resolve', { p_cle: cle, p_as_of: asOf ?? new Date().toISOString().slice(0, 10) });
  if (!error && data !== null && data !== undefined) return data as T;
  // Repli : valeur par défaut du catalogue.
  const { data: def } = await client.from('param_definition').select('valeur_defaut').eq('cle', cle).limit(1);
  return (def?.[0]?.valeur_defaut ?? undefined) as T | undefined;
}

export async function listDefinitions(adapter: DataAdapter, module?: string): Promise<ParamDefinition[]> {
  const client = getClient(adapter);
  if (!client) return [];
  let q = client.from('param_definition').select('id,cle,module,libelle,type_valeur,type_gouvernance,valeur_defaut,actif').eq('actif', true);
  if (module) q = q.eq('module', module);
  const { data } = await q.order('module').order('cle');
  return (data ?? []) as ParamDefinition[];
}

/** Historique des valeurs d'une clé (toutes portées/statuts) pour « comparer à date ». */
export async function listHistory(adapter: DataAdapter, cle: string): Promise<ParamValeurRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data: def } = await client.from('param_definition').select('id').eq('cle', cle).limit(1);
  const defId = def?.[0]?.id;
  if (!defId) return [];
  const { data } = await client.from('param_valeur')
    .select('portee,effet_du,effet_au,valeur,statut').eq('definition_id', defId).order('effet_du', { ascending: false });
  return (data ?? []) as ParamValeurRow[];
}

/**
 * Pose une nouvelle valeur active pour une clé (portée société par défaut).
 * Historise les valeurs actives antérieures de même portée. L'écriture est
 * journalisée automatiquement (trigger param_audit).
 */
export async function setParamValue(adapter: DataAdapter, cle: string, valeur: any, opts?: { portee?: Portee; effet_du?: string; motif?: string; userId?: string }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data: def } = await client.from('param_definition').select('id').eq('cle', cle).limit(1);
  const defId = def?.[0]?.id;
  if (!defId) throw new Error(`Paramètre inconnu : ${cle}`);
  const portee: Portee = opts?.portee ?? 'societe';
  const tenantId = tenantOf(adapter);
  // Historise les valeurs actives antérieures de même définition/portée.
  await client.from('param_valeur').update({ statut: 'historise', updated_at: new Date().toISOString() })
    .eq('definition_id', defId).eq('tenant_id', tenantId).eq('portee', portee).eq('statut', 'actif');
  const { error } = await client.from('param_valeur').insert({
    definition_id: defId, tenant_id: tenantId, portee, valeur,
    effet_du: opts?.effet_du ?? new Date().toISOString().slice(0, 10),
    statut: 'actif', motif: opts?.motif ?? null, cree_par: opts?.userId ?? null,
  });
  if (error) throw new Error(error.message);
}

export interface ParamAuditRow {
  definition_cle: string | null; avant: any; apres: any;
  par: string | null; le: string; hash: string | null; hash_precedent: string | null;
}

/**
 * Résout un compte par défaut (namespace `compte.<clé>`) via le socle — remplace
 * les codes de comptes en dur. Ex. resolveCompteDefaut(adapter, 'client_collectif').
 * Repli automatique sur la valeur par défaut SYSCOHADA du catalogue.
 */
export async function resolveCompteDefaut(adapter: DataAdapter, key: string, asOf?: string): Promise<string | undefined> {
  return resolveParam<string>(adapter, `compte.${key}`, asOf);
}

// ── Compat `settings` → socle (namespace settings.<clé>) ─────────────────────

/**
 * Lit une ancienne clé `settings` via le socle (param_resolve du namespace
 * `settings.<clé>`), avec repli sur la table `settings` legacy. Permet aux
 * consommateurs de migrer sans big-bang.
 */
export async function resolveSetting<T = any>(adapter: DataAdapter, key: string, asOf?: string): Promise<T | undefined> {
  const v = await resolveParam<T>(adapter, `settings.${key}`, asOf);
  if (v !== undefined && v !== null) return v;
  const client = getClient(adapter);
  if (!client) return undefined;
  const { data } = await client.from('settings').select('value').eq('key', key).limit(1);
  const raw = data?.[0]?.value;
  if (raw == null) return undefined;
  try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
}

/**
 * Écrit une clé `settings` via le socle ET la table legacy (miroir), pour que
 * les lecteurs non encore migrés voient la mise à jour. La définition est créée
 * à la volée si absente.
 */
export async function setSetting(adapter: DataAdapter, key: string, value: any, module = 'societe'): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const cle = `settings.${key}`;
  const { data: def } = await client.from('param_definition').select('id').eq('cle', cle).limit(1);
  if (!def?.[0]?.id) {
    await client.from('param_definition').insert({ cle, module, libelle: key, type_valeur: 'json', type_gouvernance: 'operationnel', portee_min: 'societe', portee_max: 'societe' });
  }
  await setParamValue(adapter, cle, value, { portee: 'societe' });
  // Miroir legacy (RPC gère le tenant en interne).
  try { await client.rpc('upsert_setting', { p_key: key, p_value: JSON.stringify(value) }); } catch { /* legacy best-effort */ }
}

/** Journal des paramètres (changements chaînés par hash). */
export async function listParamAudit(adapter: DataAdapter, limit = 100): Promise<ParamAuditRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('param_audit')
    .select('definition_cle,avant,apres,par,le,hash,hash_precedent').order('le', { ascending: false }).limit(limit);
  return (data ?? []) as ParamAuditRow[];
}
