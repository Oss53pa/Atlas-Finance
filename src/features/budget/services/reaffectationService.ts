import type { DataAdapter } from '@atlas/data';
import { getDefaultAnnee } from './budgetService';
import { listProjets, getProjetExecution, type CapexProjet } from './carService';

/**
 * Réaffectation de fonds appropriés (refonte OPEX/CAPEX — Lot 5, §18.4).
 * Aucun recyclage silencieux : le montant réaffectable transite par l'enveloppe.
 *
 *   Montant réaffectable = Montant approprié − Engagé ferme − Réalisé (du CAR source)
 *
 * L'engagé ferme et le réalisé RESTENT au projet source (ils sont au GL ou
 * contractuels). Registre capex_reaffectations (proposée → approuvée / rejetée).
 * Calcul 100 % code.
 */

export interface Reaffectation {
  id: string; source_car_id: string | null; source_request_id: string | null; cible_request_id: string | null;
  montant: number; motif: string | null; avis_sponsor: string | null; statut: 'proposee' | 'approuvee' | 'rejetee'; created_at: string;
}

export interface ReaffectableInfo { approprie: number; engage: number; realise: number; reaffectable: number; projet: CapexProjet | null; }

/** Formule du réaffectable (pure, testable) — jamais négatif. */
export function reaffectableAmount(approprie: number, engage: number, realise: number): number {
  return Math.max(0, Math.round((approprie - engage - realise) * 100) / 100);
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

/** Réaffectable d'un CAR source (via son projet). */
export async function computeReaffectable(adapter: DataAdapter, sourceRequestId: string): Promise<ReaffectableInfo> {
  const projets = await listProjets(adapter);
  const projet = projets.find((p) => p.request_id === sourceRequestId) ?? null;
  if (!projet) return { approprie: 0, engage: 0, realise: 0, reaffectable: 0, projet: null };
  const annee = await getDefaultAnnee(adapter);
  const exec = await getProjetExecution(adapter, projet, annee);
  return { approprie: exec.approprie, engage: exec.engage, realise: exec.realise, reaffectable: reaffectableAmount(exec.approprie, exec.engage, exec.realise), projet };
}

export async function listReaffectations(adapter: DataAdapter): Promise<Reaffectation[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('capex_reaffectations').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ ...r, montant: Number(r.montant) || 0 }));
}

/** Propose une réaffectation ; refuse si montant > réaffectable du source. */
export async function createReaffectation(
  adapter: DataAdapter,
  input: { sourceRequestId: string; cibleRequestId?: string | null; montant: number; motif?: string; avisSponsor?: string },
): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const tenant = await tenantOf(client);
  const info = await computeReaffectable(adapter, input.sourceRequestId);
  if (input.montant <= 0) throw new Error('Montant invalide.');
  if (input.montant > info.reaffectable) {
    throw new Error(`Montant réaffectable dépassé : max ${info.reaffectable} (approprié − engagé ferme − réalisé).`);
  }
  const { data, error } = await client.from('capex_reaffectations').insert({
    tenant_id: tenant, source_request_id: input.sourceRequestId, cible_request_id: input.cibleRequestId ?? null,
    montant: Math.round(input.montant * 100) / 100, motif: input.motif ?? null, avis_sponsor: input.avisSponsor ?? null, statut: 'proposee',
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function setReaffectationStatut(adapter: DataAdapter, id: string, statut: 'approuvee' | 'rejetee'): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const { error } = await client.from('capex_reaffectations').update({ statut }).eq('id', id);
  if (error) throw new Error(error.message);
}
