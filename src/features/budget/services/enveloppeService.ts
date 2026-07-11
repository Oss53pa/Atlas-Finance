import type { DataAdapter } from '@atlas/data';
import { listCapexRequests } from './budgetService';

/**
 * Enveloppe CAPEX annuelle (refonte OPEX/CAPEX — Lot 5, §17.3).
 * votée = réservée + appropriée + disponible + réserve (invariant 11).
 *   réservée  = BC approuvés sans CAR
 *   appropriée = BC dont le CAR est émis (car_emis / fonds_disponibles / clos)
 *   réserve   = votée × reserve_pct (pool de contingence)
 * Calcul 100 % code.
 */

export interface Enveloppe {
  id: string; fiscal_year_id: string; direction_section_id: string | null;
  montant_vote: number; reserve_pct: number;
}
export interface EnveloppeState { votee: number; reservee: number; appropriee: number; reserve: number; disponible: number; }

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}
const num = (v: any) => Number(v) || 0;

export async function listEnveloppes(adapter: DataAdapter, fiscalYearId: string): Promise<Enveloppe[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('capex_enveloppes').select('*').eq('fiscal_year_id', fiscalYearId).order('created_at');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ ...r, montant_vote: num(r.montant_vote), reserve_pct: num(r.reserve_pct) }));
}

export async function upsertEnveloppe(adapter: DataAdapter, env: { id?: string; fiscalYearId: string; directionSectionId?: string | null; montantVote: number; reservePct: number }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const tenant = await tenantOf(client);
  const row: any = {
    tenant_id: tenant, fiscal_year_id: env.fiscalYearId, direction_section_id: env.directionSectionId ?? null,
    montant_vote: Math.round(env.montantVote * 100) / 100, reserve_pct: env.reservePct,
  };
  if (env.id) row.id = env.id;
  const { error } = await client.from('capex_enveloppes').upsert(row);
  if (error) throw new Error(error.message);
}

export async function deleteEnveloppe(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const { error } = await client.from('capex_enveloppes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** État global de l'enveloppe (société) pour un exercice. */
export async function computeEnveloppeGlobal(adapter: DataAdapter, fiscalYearId: string): Promise<EnveloppeState> {
  const [envs, bcs] = await Promise.all([listEnveloppes(adapter, fiscalYearId), listCapexRequests(adapter)]);
  const votee = envs.reduce((s, e) => s + e.montant_vote, 0);
  const reserve = envs.reduce((s, e) => s + e.montant_vote * e.reserve_pct, 0);
  const reservee = bcs.filter((b) => ['approuve', 'approuve_avec_conditions'].includes(b.statut as string)).reduce((s, b) => s + (b.montant || 0), 0);
  const appropriee = bcs.filter((b) => ['car_emis', 'fonds_disponibles', 'clos'].includes(b.statut as string)).reduce((s, b) => s + (b.montant || 0), 0);
  const disponible = votee - reservee - appropriee - reserve;
  return { votee, reservee, appropriee, reserve, disponible };
}
