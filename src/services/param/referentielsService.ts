/**
 * referentielsService — référentiels gouvernés (CDC Paramètres §8, §3).
 *
 * Conditions de paiement et sites, rapatriés du Dexie/JSON vers PostgreSQL.
 * `computeEcheance` est PURE (testable) : calcule une date d'échéance à partir
 * d'un délai (jours + option « fin de mois »).
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export interface ConditionPaiement {
  id: string; code: string; libelle: string; jours: number; fin_de_mois: boolean; actif: boolean;
}
export interface Site {
  id: string; code: string; libelle: string; adresse: string | null; responsable: string | null; actif: boolean;
}

/**
 * Date d'échéance = date de base + `jours`, éventuellement reportée en fin de
 * mois. Dates ISO (YYYY-MM-DD), calcul en UTC pour éviter les dérives de fuseau.
 * Fonction pure.
 */
export function computeEcheance(baseISO: string, jours: number, finDeMois: boolean): string {
  const d = new Date(`${baseISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (Number(jours) || 0));
  if (finDeMois) d.setUTCMonth(d.getUTCMonth() + 1, 0); // dernier jour du mois courant
  return d.toISOString().slice(0, 10);
}

// ── Conditions de paiement ───────────────────────────────────────────────────
export async function listConditionsPaiement(adapter: DataAdapter): Promise<ConditionPaiement[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('condition_paiement').select('id,code,libelle,jours,fin_de_mois,actif').order('jours');
  return (data ?? []) as ConditionPaiement[];
}
export async function createConditionPaiement(adapter: DataAdapter, c: { code: string; libelle: string; jours: number; fin_de_mois?: boolean }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('condition_paiement').insert({
    tenant_id: tenantOf(adapter), code: c.code.trim().toUpperCase(), libelle: c.libelle.trim(),
    jours: Number(c.jours) || 0, fin_de_mois: !!c.fin_de_mois,
  });
  if (error) throw new Error(error.message);
}
export async function deleteConditionPaiement(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('condition_paiement').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Sites ────────────────────────────────────────────────────────────────────
export async function listSites(adapter: DataAdapter): Promise<Site[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('site').select('id,code,libelle,adresse,responsable,actif').order('code');
  return (data ?? []) as Site[];
}
export async function createSite(adapter: DataAdapter, s: { code: string; libelle: string; adresse?: string; responsable?: string }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('site').insert({
    tenant_id: tenantOf(adapter), code: s.code.trim().toUpperCase(), libelle: s.libelle.trim(),
    adresse: s.adresse?.trim() || null, responsable: s.responsable?.trim() || null,
  });
  if (error) throw new Error(error.message);
}
export async function deleteSite(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('site').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
