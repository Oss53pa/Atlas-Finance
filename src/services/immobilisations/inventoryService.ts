/**
 * inventoryService — inventaire physique des immobilisations.
 * Persiste les sessions de comptage et les comptages/résolutions par actif
 * (fna_inventory_session / fna_inventory_count). Tenancy = societes (RLS).
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export interface InventorySessionRow {
  id: string;
  nom: string;
  date_debut: string | null;
  date_fin_prevue: string | null;
  statut: string;
  responsable: string | null;
  perimetre: string | null;
  created_at: string;
}

export interface InventoryCountRow {
  id: string;
  session_id: string;
  asset_id: string | null;
  statut_comptage: string;
  localisation_reelle: string | null;
  compteur: string | null;
  etat_physique: string | null;
  date_comptage: string | null;
  notes: string | null;
  resolution_statut: string | null;
  action_corrective: string | null;
  responsable_resolution: string | null;
  date_resolution: string | null;
}

export async function listSessions(adapter: DataAdapter): Promise<InventorySessionRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_inventory_session').select('*').order('created_at', { ascending: false });
  return (data ?? []) as InventorySessionRow[];
}

export async function createSession(adapter: DataAdapter, s: {
  nom: string; date_debut?: string | null; date_fin_prevue?: string | null;
  responsable?: string | null; perimetre?: string | null;
}, createdBy?: string | null): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data, error } = await client.from('fna_inventory_session').insert({
    tenant_id: tenantOf(adapter), nom: s.nom.trim(), date_debut: s.date_debut || null,
    date_fin_prevue: s.date_fin_prevue || null, responsable: s.responsable || null,
    perimetre: s.perimetre || null, statut: 'en_cours', created_by: createdBy || null,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data?.id as string;
}

export async function setSessionStatut(adapter: DataAdapter, id: string, statut: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_inventory_session').update({ statut }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getCounts(adapter: DataAdapter, sessionId: string): Promise<InventoryCountRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_inventory_count').select('*').eq('session_id', sessionId);
  return (data ?? []) as InventoryCountRow[];
}

/** Enregistre/maj le comptage d'un actif dans une session (upsert). */
export async function upsertCount(adapter: DataAdapter, sessionId: string, assetId: string, c: Partial<InventoryCountRow>): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_inventory_count').upsert({
    tenant_id: tenantOf(adapter), session_id: sessionId, asset_id: assetId,
    statut_comptage: c.statut_comptage ?? 'compte',
    localisation_reelle: c.localisation_reelle ?? null, compteur: c.compteur ?? null,
    etat_physique: c.etat_physique ?? null, date_comptage: c.date_comptage ?? new Date().toISOString(),
    notes: c.notes ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'session_id,asset_id' });
  if (error) throw new Error(error.message);
}

/** Résout (ou met à jour) un écart d'inventaire. */
export async function resolveDiscrepancy(adapter: DataAdapter, sessionId: string, assetId: string, r: {
  resolution_statut: string; action_corrective?: string | null; responsable_resolution?: string | null;
}): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_inventory_count').upsert({
    tenant_id: tenantOf(adapter), session_id: sessionId, asset_id: assetId,
    statut_comptage: r.resolution_statut === 'resolu' ? 'resolu' : 'ecart',
    resolution_statut: r.resolution_statut, action_corrective: r.action_corrective ?? null,
    responsable_resolution: r.responsable_resolution ?? null, date_resolution: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'session_id,asset_id' });
  if (error) throw new Error(error.message);
}
