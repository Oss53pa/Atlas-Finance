import type { DataAdapter } from '@atlas/data';
import { computeCapexMetrics } from '../../../utils/capexMetrics';

/**
 * Business Case CAPEX structuré (refonte OPEX/CAPEX — Lot 5, §16).
 * Satellites de capex_requests : lignes de coût, cashflows prévisionnels, risques.
 * L'évaluation financière (VAN/TRI/payback/PI/ROI) est recalculée 100 % code
 * (capexMetrics), jamais saisie — PROPH3T ne produit aucun chiffre.
 * Tenancy = tenant_id (nouvelles tables), RLS get_user_company_id().
 */

export type TypeCout = 'acquisition' | 'travaux_installation' | 'transport_douane' | 'etudes_ingenierie'
  | 'formation' | 'logiciel_licences' | 'contingence' | 'autres' | 'opex_induit';
export type TypeCashflow = 'economie' | 'revenu' | 'cout_evite' | 'valeur_residuelle' | 'autre';

export interface BcCostLine { id: string; request_id: string; type_cout: TypeCout; designation: string; montant: number; capitalisable: boolean; exercice_id: string | null; periode_prevue: string | null; }
export interface BcCashflow { id: string; request_id: string; annee: number; type: TypeCashflow; libelle: string | null; montant: number; }
export interface BcRisque { id: string; request_id: string; risque: string; probabilite: number; impact: number; mitigation: string | null; }

export interface BcMetrics { van: number; tri: number | null; paybackSimpleMois: number | null; paybackActualiseMois: number | null; pi: number | null; roi: number | null; investment: number; }

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}
const num = (v: any) => Number(v) || 0;

// ── Lignes de coût ───────────────────────────────────────────────────────────
export async function listCostLines(adapter: DataAdapter, requestId: string): Promise<BcCostLine[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('capex_bc_lignes_cout').select('*').eq('request_id', requestId).order('created_at');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ ...r, montant: num(r.montant) }));
}
export async function upsertCostLine(adapter: DataAdapter, requestId: string, line: Partial<BcCostLine> & { type_cout: TypeCout; designation: string; montant: number }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const tenant = await tenantOf(client);
  const row: any = {
    tenant_id: tenant, request_id: requestId, type_cout: line.type_cout, designation: line.designation.trim(),
    montant: Math.round(line.montant * 100) / 100, capitalisable: line.capitalisable ?? true,
    exercice_id: line.exercice_id ?? null, periode_prevue: line.periode_prevue ?? null,
  };
  if (line.id) row.id = line.id;
  const { error } = await client.from('capex_bc_lignes_cout').upsert(row);
  if (error) throw new Error(error.message);
}
export async function deleteCostLine(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const { error } = await client.from('capex_bc_lignes_cout').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Cashflows ────────────────────────────────────────────────────────────────
export async function listCashflows(adapter: DataAdapter, requestId: string): Promise<BcCashflow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('capex_bc_cashflows').select('*').eq('request_id', requestId).order('annee');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ ...r, montant: num(r.montant), annee: Number(r.annee) }));
}
export async function upsertCashflow(adapter: DataAdapter, requestId: string, cf: Partial<BcCashflow> & { annee: number; type: TypeCashflow; montant: number }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const tenant = await tenantOf(client);
  const row: any = { tenant_id: tenant, request_id: requestId, annee: cf.annee, type: cf.type, libelle: cf.libelle ?? null, montant: Math.round(cf.montant * 100) / 100 };
  if (cf.id) row.id = cf.id;
  const { error } = await client.from('capex_bc_cashflows').upsert(row);
  if (error) throw new Error(error.message);
}
export async function deleteCashflow(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const { error } = await client.from('capex_bc_cashflows').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Risques ──────────────────────────────────────────────────────────────────
export async function listRisques(adapter: DataAdapter, requestId: string): Promise<BcRisque[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('capex_bc_risques').select('*').eq('request_id', requestId).order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}
export async function upsertRisque(adapter: DataAdapter, requestId: string, r: Partial<BcRisque> & { risque: string; probabilite: number; impact: number }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const tenant = await tenantOf(client);
  const row: any = { tenant_id: tenant, request_id: requestId, risque: r.risque.trim(), probabilite: r.probabilite, impact: r.impact, mitigation: r.mitigation ?? null };
  if (r.id) row.id = r.id;
  const { error } = await client.from('capex_bc_risques').upsert(row);
  if (error) throw new Error(error.message);
}
export async function deleteRisque(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('SaaS uniquement.');
  const { error } = await client.from('capex_bc_risques').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** WACC du tenant (settings 'wacc', défaut 0.12). */
export async function getWacc(adapter: DataAdapter): Promise<number> {
  const client = getClient(adapter);
  if (!client) return 0.12;
  const { data } = await client.from('settings').select('value').eq('key', 'wacc').limit(1);
  const v = Number(data?.[0]?.value);
  return Number.isFinite(v) && v > 0 ? v : 0.12;
}

/**
 * Agrège cashflows par année (net) — fonction pure, testable.
 * flows[i] = Σ montants de l'année (i+1). Année 0 = investissement (non inclus ici).
 */
export function aggregateCashflows(cashflows: Pick<BcCashflow, 'annee' | 'montant'>[]): number[] {
  const maxAnnee = cashflows.reduce((m, c) => Math.max(m, c.annee), 0);
  const flows = new Array(maxAnnee).fill(0);
  for (const c of cashflows) if (c.annee >= 1) flows[c.annee - 1] += c.montant;
  return flows;
}

/**
 * Recalcule l'évaluation financière du BC et la persiste sur capex_requests
 * (van, tri, paybacks, indice_profitabilite, roi). Investissement = Σ lignes de coût.
 */
export async function recomputeBcMetrics(adapter: DataAdapter, requestId: string): Promise<BcMetrics> {
  const client = getClient(adapter);
  const [costs, cashflows, rate] = await Promise.all([
    listCostLines(adapter, requestId), listCashflows(adapter, requestId), getWacc(adapter),
  ]);
  // taux propre au BC s'il est renseigné, sinon WACC tenant
  let taux = rate;
  if (client) {
    const { data } = await client.from('capex_requests').select('taux_actualisation').eq('id', requestId).single();
    const t = Number(data?.taux_actualisation);
    if (Number.isFinite(t) && t > 0) taux = t;
  }
  const investment = costs.reduce((s, c) => s + c.montant, 0);
  const flows = aggregateCashflows(cashflows);
  const m = computeCapexMetrics({ investment, flows, rate: taux });
  if (client) {
    await client.from('capex_requests').update({
      van: Math.round(m.npv), tri: m.irr, payback_simple_mois: m.paybackSimpleMonths,
      payback_actualise_mois: m.paybackActualiseMonths, indice_profitabilite: m.pi, roi: m.roi,
      cashflows: flows, montant: investment,
    }).eq('id', requestId);
  }
  return {
    van: m.npv, tri: m.irr, paybackSimpleMois: m.paybackSimpleMonths, paybackActualiseMois: m.paybackActualiseMonths,
    pi: m.pi, roi: m.roi, investment,
  };
}
