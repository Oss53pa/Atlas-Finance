import type { DataAdapter } from '@atlas/data';

/**
 * Budget revenus par volumes × prix (refonte OPEX/CAPEX — Lot 4, §14.1).
 * Satellite budget_lignes_volumes (quantité, prix unitaire par mois). Le montant
 * budgété (budget_line_periods.montant_prevu) est RECALCULÉ serveur = quantité ×
 * prix unitaire — jamais saisi directement en mode volumes.
 */

export interface VolumeRow { period: number; quantite: number; prix_unitaire: number; }

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

/** Montant d'une ligne volume (pur, testable). */
export const volumeMontant = (quantite: number, prix: number): number => Math.round((quantite || 0) * (prix || 0) * 100) / 100;

export async function listVolumes(adapter: DataAdapter, budgetLineId: string): Promise<Record<number, VolumeRow>> {
  const client = getClient(adapter);
  if (!client) return {};
  const { data, error } = await client.from('budget_lignes_volumes').select('period,quantite,prix_unitaire').eq('budget_line_id', budgetLineId);
  if (error) throw new Error(error.message);
  const out: Record<number, VolumeRow> = {};
  for (const r of (data || [])) out[Number(r.period)] = { period: Number(r.period), quantite: Number(r.quantite) || 0, prix_unitaire: Number(r.prix_unitaire) || 0 };
  return out;
}

/**
 * Enregistre les volumes d'une ligne (12 mois) ET recalcule le phasage
 * (budget_line_periods.montant_prevu = quantité × prix). Atomicité applicative.
 */
export async function saveVolumesForLine(
  adapter: DataAdapter, budgetLineId: string, entries: VolumeRow[],
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');

  const volRows = entries.map((e) => ({
    tenant_id: tenant, budget_line_id: budgetLineId, period: e.period,
    quantite: e.quantite || 0, prix_unitaire: e.prix_unitaire || 0,
  }));
  const { error: ev } = await client.from('budget_lignes_volumes').upsert(volRows, { onConflict: 'budget_line_id,period' });
  if (ev) throw new Error(ev.message);

  const perRows = entries.map((e) => ({
    tenant_id: tenant, budget_line_id: budgetLineId, period: e.period, montant_prevu: volumeMontant(e.quantite, e.prix_unitaire),
  }));
  const { error: ep } = await client.from('budget_line_periods').upsert(perRows, { onConflict: 'budget_line_id,period' });
  if (ep) throw new Error(ep.message);
}
