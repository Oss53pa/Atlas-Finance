/**
 * budgetService — Budget & Réalisé Atlas FNA (CDC V3 §2/§4/§6).
 *
 * Lit les VUES LIVE recalculées depuis journal_lines (zéro mock) :
 *   - v_actual_exploitation : réalisé CR (classes 6/7) par compte × mois
 *   - v_actual_investment   : réalisé CAPEX (classe 2)
 *   - v_actual_treasury     : cash réalisé (classe 5)
 *   - v_budget_vs_actual    : budget (version active) vs réalisé + écart
 * et les tables budget (budget_versions / budget_lines / budget_line_periods).
 *
 * Tenancy = `societes` (RLS via get_user_company_id(), security_invoker sur les
 * vues). On passe par le client Supabase authentifié porté par l'adapter.
 */
import type { DataAdapter } from '@atlas/data';

export interface ActualExploitationRow {
  tenant_id: string;
  annee: string;
  period: number;
  account_code: string;
  classe: string;
  account_name: string;
  montant_realise: number;
}

export interface BudgetVsActualRow {
  tenant_id: string;
  fiscal_year_id: string;
  annee: string;
  budget_type: 'exploitation' | 'investissement';
  account_code: string;
  section_id: string | null;
  period: number;
  budget: number;
  realise: number;
  ecart: number;
  ecart_pct: number | null;
}

export interface TreasuryActualRow {
  tenant_id: string;
  annee: string;
  period: number;
  encaissements: number;
  decaissements: number;
  flux_net: number;
}

export interface BudgetVersion {
  id: string;
  fiscal_year_id: string;
  libelle: string;
  type: 'initial' | 'revise' | 'atterrissage';
  statut: 'brouillon' | 'valide' | 'verrouille';
  is_active: boolean;
}

function getClient(adapter: DataAdapter): any | null {
  // L'adapter SaaS porte le client Supabase authentifié (cf. DataContext).
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

/** Année (exercice) par défaut : la plus récente présente dans le réalisé, sinon année courante. */
export async function getDefaultAnnee(adapter: DataAdapter): Promise<string> {
  const client = getClient(adapter);
  const fallback = String(new Date().getFullYear());
  if (!client) return fallback;
  const { data } = await client
    .from('v_actual_exploitation')
    .select('annee')
    .order('annee', { ascending: false })
    .limit(1);
  return data?.[0]?.annee || fallback;
}

export async function getActiveBudgetVersion(adapter: DataAdapter): Promise<BudgetVersion | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data } = await client
    .from('budget_versions')
    .select('id,fiscal_year_id,libelle,type,statut,is_active')
    .eq('is_active', true)
    .limit(1);
  return data?.[0] ?? null;
}

export async function getActualExploitation(adapter: DataAdapter, annee: string): Promise<ActualExploitationRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client
    .from('v_actual_exploitation')
    .select('*')
    .eq('annee', annee);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ ...r, montant_realise: Number(r.montant_realise) || 0, period: Number(r.period) }));
}

export async function getTreasuryActual(adapter: DataAdapter, annee: string): Promise<TreasuryActualRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client
    .from('v_actual_treasury')
    .select('*')
    .eq('annee', annee)
    .order('period', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    ...r,
    encaissements: Number(r.encaissements) || 0,
    decaissements: Number(r.decaissements) || 0,
    flux_net: Number(r.flux_net) || 0,
    period: Number(r.period),
  }));
}

export async function getBudgetVsActual(adapter: DataAdapter): Promise<BudgetVsActualRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('v_budget_vs_actual').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    ...r,
    budget: Number(r.budget) || 0,
    realise: Number(r.realise) || 0,
    ecart: Number(r.ecart) || 0,
    ecart_pct: r.ecart_pct == null ? null : Number(r.ecart_pct),
    period: Number(r.period),
  }));
}

// ── Agrégats prêts à afficher ────────────────────────────────────────────────

export interface ExploitationSummary {
  caRealise: number;          // produits (classe 7)
  chargesRealise: number;     // charges (classe 6)
  resultatRealise: number;    // CA - charges
  caBudget: number;
  chargesBudget: number;
  resultatBudget: number;
  tauxRealisationResultat: number | null; // %
  /** Par nature (2 premiers chiffres de compte) cumulé sur l'année. */
  parNature: Array<{ code: string; classe: string; label: string; realise: number; budget: number; ecart: number }>;
  /** Mensuel : produits / charges / résultat par mois (1..12). */
  mensuel: Array<{ period: number; produits: number; charges: number; resultat: number }>;
}

export async function getExploitationSummary(adapter: DataAdapter, annee: string): Promise<ExploitationSummary> {
  const [rows, bva] = await Promise.all([
    getActualExploitation(adapter, annee),
    getBudgetVsActual(adapter),
  ]);

  const caRealise = rows.filter(r => r.classe === '7').reduce((s, r) => s + r.montant_realise, 0);
  const chargesRealise = rows.filter(r => r.classe === '6').reduce((s, r) => s + r.montant_realise, 0);
  const resultatRealise = caRealise - chargesRealise;

  const expBudget = bva.filter(b => b.budget_type === 'exploitation' && b.annee === annee);
  const caBudget = expBudget.filter(b => b.account_code.startsWith('7')).reduce((s, b) => s + b.budget, 0);
  const chargesBudget = expBudget.filter(b => b.account_code.startsWith('6')).reduce((s, b) => s + b.budget, 0);
  const resultatBudget = caBudget - chargesBudget;
  const tauxRealisationResultat = resultatBudget !== 0
    ? Math.round((resultatRealise / resultatBudget) * 100)
    : null;

  // Par nature (2 chiffres) cumulé
  const natureMap = new Map<string, { code: string; classe: string; label: string; realise: number; budget: number }>();
  for (const r of rows) {
    const code = r.account_code.slice(0, 2);
    if (!natureMap.has(code)) natureMap.set(code, { code, classe: r.classe, label: r.account_name, realise: 0, budget: 0 });
    natureMap.get(code)!.realise += r.montant_realise;
  }
  for (const b of expBudget) {
    const code = b.account_code.slice(0, 2);
    if (!natureMap.has(code)) natureMap.set(code, { code, classe: code[0], label: code, realise: 0, budget: 0 });
    natureMap.get(code)!.budget += b.budget;
  }
  const parNature = Array.from(natureMap.values())
    .map(n => ({ ...n, ecart: n.realise - n.budget }))
    .sort((a, b) => Math.abs(b.realise) - Math.abs(a.realise));

  // Mensuel
  const mensuel: Array<{ period: number; produits: number; charges: number; resultat: number }> = [];
  for (let p = 1; p <= 12; p++) {
    const produits = rows.filter(r => r.period === p && r.classe === '7').reduce((s, r) => s + r.montant_realise, 0);
    const charges = rows.filter(r => r.period === p && r.classe === '6').reduce((s, r) => s + r.montant_realise, 0);
    mensuel.push({ period: p, produits, charges, resultat: produits - charges });
  }

  return {
    caRealise, chargesRealise, resultatRealise,
    caBudget, chargesBudget, resultatBudget, tauxRealisationResultat,
    parNature, mensuel,
  };
}
