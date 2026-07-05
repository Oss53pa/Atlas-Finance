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

// Pagination par tranches : PostgREST tronque à 1000 lignes. Ces vues sont granulaires
// (compte × mois → potentiellement > 1000 lignes) → sans boucle range(), le réalisé/écart
// serait sous-évalué SILENCIEUSEMENT. Un tri stable est requis pour que le range soit fiable.
async function fetchAllRows(build: () => any, chunk = 1000): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + chunk - 1);
    if (error) throw new Error(error.message);
    const batch = (data || []) as any[];
    all.push(...batch);
    if (batch.length < chunk) break;
    from += chunk;
  }
  return all;
}

export async function getActualExploitation(adapter: DataAdapter, annee: string): Promise<ActualExploitationRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const data = await fetchAllRows(() => client
    .from('v_actual_exploitation')
    .select('*')
    .eq('annee', annee)
    .order('account_code', { ascending: true }).order('period', { ascending: true }));
  return data.map((r: any) => ({ ...r, montant_realise: Number(r.montant_realise) || 0, period: Number(r.period) }));
}

export async function getTreasuryActual(adapter: DataAdapter, annee: string): Promise<TreasuryActualRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const data = await fetchAllRows(() => client
    .from('v_actual_treasury')
    .select('*')
    .eq('annee', annee)
    .order('period', { ascending: true }));
  return data.map((r: any) => ({
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
  const data = await fetchAllRows(() => client.from('v_budget_vs_actual').select('*')
    .order('account_code', { ascending: true }).order('period', { ascending: true }));
  return data.map((r: any) => ({
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
  /** Par nature (2 premiers chiffres de compte) cumulé sur l'année + détail des comptes. */
  parNature: Array<{
    code: string; classe: string; label: string; realise: number; budget: number; ecart: number;
    comptes: Array<{ account_code: string; label: string; realise: number; budget: number; ecart: number }>;
  }>;
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

  // Par nature (2 chiffres) cumulé + détail des comptes agrégés
  const natureMap = new Map<string, { code: string; classe: string; label: string; realise: number; budget: number }>();
  const comptesMap = new Map<string, Map<string, { account_code: string; label: string; realise: number; budget: number }>>();
  const addCompte = (code2: string, account_code: string, label: string) => {
    if (!comptesMap.has(code2)) comptesMap.set(code2, new Map());
    const m = comptesMap.get(code2)!;
    if (!m.has(account_code)) m.set(account_code, { account_code, label, realise: 0, budget: 0 });
    return m.get(account_code)!;
  };
  for (const r of rows) {
    const code = r.account_code.slice(0, 2);
    if (!natureMap.has(code)) natureMap.set(code, { code, classe: r.classe, label: r.account_name, realise: 0, budget: 0 });
    natureMap.get(code)!.realise += r.montant_realise;
    addCompte(code, r.account_code, r.account_name).realise += r.montant_realise;
  }
  for (const b of expBudget) {
    const code = b.account_code.slice(0, 2);
    if (!natureMap.has(code)) natureMap.set(code, { code, classe: code[0], label: code, realise: 0, budget: 0 });
    natureMap.get(code)!.budget += b.budget;
    addCompte(code, b.account_code, b.account_code).budget += b.budget;
  }
  const parNature = Array.from(natureMap.values())
    .map(n => ({
      ...n,
      ecart: n.realise - n.budget,
      comptes: Array.from(comptesMap.get(n.code)?.values() || [])
        .map(c => ({ ...c, ecart: c.realise - c.budget }))
        .sort((a, b) => Math.abs(b.realise) - Math.abs(a.realise)),
    }))
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

// ── Investissement (CAPEX) ───────────────────────────────────────────────────

export interface InvestmentSummary {
  totalRealise: number;
  totalBudget: number;
  totalExistant: number;
  totalNouveau: number;
  parCompte: Array<{ account_code: string; label: string; existant: number; nouveau: number; realise: number; budget: number; ecart: number; resteAEngager: number }>;
  mensuel: Array<{ period: number; realise: number }>;
}

export async function getInvestmentSummary(adapter: DataAdapter, annee: string): Promise<InvestmentSummary> {
  const client = getClient(adapter);
  if (!client) return { totalRealise: 0, totalBudget: 0, totalExistant: 0, totalNouveau: 0, parCompte: [], mensuel: [] };
  // split : existant (À-Nouveaux) vs nouveau (acquisitions). Budget = CAR validées+.
  const [split, actual, { data: cars }] = await Promise.all([
    fetchAllRows(() => client.from('v_capex_by_account').select('*').eq('annee', annee).order('account_code', { ascending: true })),
    fetchAllRows(() => client.from('v_actual_investment').select('*').eq('annee', annee).order('account_code', { ascending: true }).order('period', { ascending: true })),
    client.from('capex_requests').select('account_code,montant,statut').in('statut', ['approuve', 'fonds_disponibles', 'clos']),
  ]);
  const rows = (actual ?? []).map((r: any) => ({ ...r, montant_realise: Number(r.montant_realise) || 0, period: Number(r.period) }));

  const map = new Map<string, { account_code: string; label: string; existant: number; nouveau: number; realise: number; budget: number }>();
  for (const r of (split ?? [])) {
    const code = String(r.account_code);
    map.set(code, { account_code: code, label: r.account_name || code, existant: Number(r.existant) || 0, nouveau: Number(r.nouveau) || 0, realise: Number(r.total) || 0, budget: 0 });
  }
  for (const c of (cars ?? [])) {
    const code = String(c.account_code);
    if (!map.has(code)) map.set(code, { account_code: code, label: code, existant: 0, nouveau: 0, realise: 0, budget: 0 });
    map.get(code)!.budget += Number(c.montant) || 0;
  }
  const parCompte = Array.from(map.values())
    .map(c => ({ ...c, ecart: c.nouveau - c.budget, resteAEngager: Math.max(0, c.budget - c.nouveau) }))
    .sort((a, b) => b.realise - a.realise);

  const mensuel: Array<{ period: number; realise: number }> = [];
  for (let p = 1; p <= 12; p++) mensuel.push({ period: p, realise: rows.filter((r: any) => r.period === p).reduce((s: number, r: any) => s + r.montant_realise, 0) });

  return {
    totalRealise: parCompte.reduce((s, c) => s + c.realise, 0),
    totalBudget: parCompte.reduce((s, c) => s + c.budget, 0),
    totalExistant: parCompte.reduce((s, c) => s + c.existant, 0),
    totalNouveau: parCompte.reduce((s, c) => s + c.nouveau, 0),
    parCompte, mensuel,
  };
}

// ── Capital Appropriation Request (CAR) — demandes CAPEX ─────────────────────

export type CapexStatut = 'demande' | 'approuve' | 'fonds_disponibles' | 'clos' | 'rejete';

export interface CapexRequest {
  id: string;
  libelle: string;
  account_code: string;
  section_id: string | null;
  montant: number;
  date_prevue: string | null;
  duree_amortissement: number;
  methode: 'lineaire' | 'degressif';
  valeur_residuelle: number;
  justification: string | null;
  statut: CapexStatut;
  montant_utilise: number;
  created_at?: string;
  // L3 — stage-gate / évaluation financière
  categorie?: string | null;
  business_case?: string | null;
  contingence_pct?: number | null;
  taux_actualisation?: number | null;
  cashflows?: number[] | null;
  van?: number | null;
  tri?: number | null;
  payback_simple_mois?: number | null;
  payback_actualise_mois?: number | null;
  indice_profitabilite?: number | null;
  roi?: number | null;
  test_capitalisation?: Record<string, boolean> | null;
}

/** Persiste l'évaluation financière (catégorie, flux, métriques, test IAS 16). */
export async function saveCapexEvaluation(adapter: DataAdapter, id: string, ev: {
  categorie?: string | null; business_case?: string | null; contingence_pct?: number | null;
  taux_actualisation?: number | null; cashflows?: number[] | null;
  van?: number | null; tri?: number | null; payback_simple_mois?: number | null;
  payback_actualise_mois?: number | null; indice_profitabilite?: number | null; roi?: number | null;
  test_capitalisation?: Record<string, boolean> | null;
}): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('capex_requests').update({
    categorie: ev.categorie ?? null,
    business_case: ev.business_case ?? null,
    contingence_pct: ev.contingence_pct ?? 0,
    taux_actualisation: ev.taux_actualisation ?? 0.1,
    cashflows: ev.cashflows ?? null,
    van: ev.van ?? null,
    tri: ev.tri ?? null,
    payback_simple_mois: ev.payback_simple_mois ?? null,
    payback_actualise_mois: ev.payback_actualise_mois ?? null,
    indice_profitabilite: ev.indice_profitabilite ?? null,
    roi: ev.roi ?? null,
    test_capitalisation: ev.test_capitalisation ?? null,
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listCapexRequests(adapter: DataAdapter): Promise<CapexRequest[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client
    .from('capex_requests')
    .select('id,libelle,account_code,section_id,montant,date_prevue,duree_amortissement,methode,valeur_residuelle,justification,statut,montant_utilise,created_at,categorie,business_case,contingence_pct,taux_actualisation,cashflows,van,tri,payback_simple_mois,payback_actualise_mois,indice_profitabilite,roi,test_capitalisation')
    .order('created_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    ...r,
    montant: Number(r.montant) || 0,
    duree_amortissement: Number(r.duree_amortissement) || 0,
    valeur_residuelle: Number(r.valeur_residuelle) || 0,
    montant_utilise: Number(r.montant_utilise) || 0,
    van: r.van != null ? Number(r.van) : null,
    tri: r.tri != null ? Number(r.tri) : null,
    roi: r.roi != null ? Number(r.roi) : null,
    indice_profitabilite: r.indice_profitabilite != null ? Number(r.indice_profitabilite) : null,
    cashflows: Array.isArray(r.cashflows) ? r.cashflows.map((x: any) => Number(x) || 0) : null,
  }));
}

export async function createCapexRequest(
  adapter: DataAdapter,
  req: { fiscalYearId?: string | null; libelle: string; account_code: string; section_id?: string | null; montant: number; date_prevue?: string | null; duree_amortissement: number; methode: 'lineaire' | 'degressif'; valeur_residuelle?: number; justification?: string | null },
): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const tenantId = (adapter as any).tenantId as string;
  const { data, error } = await client.from('capex_requests').insert({
    tenant_id: tenantId,
    fiscal_year_id: req.fiscalYearId || null,
    libelle: req.libelle.trim(),
    account_code: req.account_code.trim(),
    section_id: req.section_id || null,
    montant: req.montant,
    date_prevue: req.date_prevue || null,
    duree_amortissement: req.duree_amortissement,
    methode: req.methode,
    valeur_residuelle: req.valeur_residuelle ?? 0,
    justification: req.justification || null,
    statut: 'demande',
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data?.id as string;
}

export async function updateCapexRequest(
  adapter: DataAdapter,
  id: string,
  req: { libelle: string; account_code: string; section_id?: string | null; montant: number; date_prevue?: string | null; duree_amortissement: number; methode: 'lineaire' | 'degressif'; valeur_residuelle?: number; justification?: string | null },
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('capex_requests').update({
    libelle: req.libelle.trim(),
    account_code: req.account_code.trim(),
    section_id: req.section_id || null,
    montant: req.montant,
    date_prevue: req.date_prevue || null,
    duree_amortissement: req.duree_amortissement,
    methode: req.methode,
    valeur_residuelle: req.valeur_residuelle ?? 0,
    justification: req.justification || null,
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setCapexStatut(adapter: DataAdapter, id: string, statut: CapexStatut): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const patch: any = { statut };
  if (statut === 'fonds_disponibles') patch.fonds_dispo_at = new Date().toISOString();
  const { error } = await client.from('capex_requests').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Enregistre une utilisation (décaissement) des fonds appropriés. */
export async function setCapexUtilise(adapter: DataAdapter, id: string, montantUtilise: number): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('capex_requests').update({ montant_utilise: montantUtilise }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCapexRequest(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('capex_requests').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Dotation annuelle d'amortissement = (montant − valeur résiduelle) / durée. */
export function dotationAnnuelle(req: { montant: number; valeur_residuelle: number; duree_amortissement: number }): number {
  if (!req.duree_amortissement) return 0;
  return Math.round(((req.montant - req.valeur_residuelle) / req.duree_amortissement) * 100) / 100;
}

// ── Gestion des versions (validation DG → verrouillage) ──────────────────────

export interface BudgetVersionFull extends BudgetVersion {
  validated_at: string | null;
  created_at: string;
  fiscal_year_code?: string;
  nb_lignes?: number;
}

export async function listBudgetVersions(adapter: DataAdapter): Promise<BudgetVersionFull[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client
    .from('budget_versions')
    .select('id,fiscal_year_id,libelle,type,statut,is_active,validated_at,created_at')
    .order('created_at', { ascending: false });
  const versions = (data ?? []) as BudgetVersionFull[];
  // compteur de lignes par version
  const ids = versions.map(v => v.id);
  if (ids.length) {
    const { data: lignes } = await client.from('budget_lines').select('version_id').in('version_id', ids);
    const counts = new Map<string, number>();
    (lignes ?? []).forEach((l: any) => counts.set(l.version_id, (counts.get(l.version_id) || 0) + 1));
    versions.forEach(v => { v.nb_lignes = counts.get(v.id) || 0; });
  }
  return versions;
}

/** Transition de statut. validate => 'valide' (validated_at/by) ; lock => 'verrouille'. */
export async function setVersionStatut(
  adapter: DataAdapter,
  versionId: string,
  statut: 'brouillon' | 'valide' | 'verrouille',
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const patch: any = { statut };
  if (statut === 'valide') {
    patch.validated_at = new Date().toISOString();
    const { data: u } = await client.auth.getUser();
    if (u?.user?.id) patch.validated_by = u.user.id;
  }
  const { error } = await client.from('budget_versions').update(patch).eq('id', versionId);
  if (error) throw new Error(error.message);
}

export async function setVersionActive(adapter: DataAdapter, versionId: string, fiscalYearId: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  // au plus une active par exercice : désactiver les autres puis activer
  await client.from('budget_versions').update({ is_active: false }).eq('fiscal_year_id', fiscalYearId);
  const { error } = await client.from('budget_versions').update({ is_active: true }).eq('id', versionId);
  if (error) throw new Error(error.message);
}

// ── Saisie manuelle (édition ligne à ligne) ─────────────────────────────────

export interface BudgetLineEdit {
  id: string;
  budget_type: 'exploitation' | 'investissement';
  account_code: string;
  section_id: string | null;
  periods: Record<number, number>; // 1..12
}

/** Crée une version active pour l'exercice si aucune n'existe ; renvoie son id. */
export async function ensureActiveVersion(adapter: DataAdapter, fiscalYearId: string, libelle: string): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const tenantId = (adapter as any).tenantId as string;
  const { data: existing } = await client
    .from('budget_versions').select('id').eq('fiscal_year_id', fiscalYearId).eq('is_active', true).limit(1);
  if (existing?.[0]) return existing[0].id;
  const { data, error } = await client
    .from('budget_versions')
    .insert({ tenant_id: tenantId, fiscal_year_id: fiscalYearId, libelle, type: 'initial', statut: 'brouillon', is_active: true })
    .select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Lignes d'une version avec leur phasage mensuel. */
export async function getBudgetLinesWithPeriods(adapter: DataAdapter, versionId: string): Promise<BudgetLineEdit[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data: lines } = await client
    .from('budget_lines').select('id,budget_type,account_code,section_id').eq('version_id', versionId);
  const ids = (lines ?? []).map((l: any) => l.id);
  const periodsByLine = new Map<string, Record<number, number>>();
  if (ids.length) {
    const { data: periods } = await client
      .from('budget_line_periods').select('budget_line_id,period,montant_prevu').in('budget_line_id', ids);
    for (const p of (periods ?? [])) {
      if (!periodsByLine.has(p.budget_line_id)) periodsByLine.set(p.budget_line_id, {});
      periodsByLine.get(p.budget_line_id)![Number(p.period)] = Number(p.montant_prevu) || 0;
    }
  }
  return (lines ?? []).map((l: any) => ({
    id: l.id, budget_type: l.budget_type, account_code: l.account_code, section_id: l.section_id,
    periods: periodsByLine.get(l.id) || {},
  }));
}

/** Crée/MAJ une ligne + son phasage. Renvoie l'id de la ligne. */
export async function saveBudgetLine(
  adapter: DataAdapter,
  versionId: string,
  line: { id?: string; budget_type: 'exploitation' | 'investissement'; account_code: string; section_id: string | null; periods: Record<number, number> },
): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const tenantId = (adapter as any).tenantId as string;
  let lineId = line.id;
  if (lineId) {
    const { error } = await client.from('budget_lines').update({ budget_type: line.budget_type, account_code: line.account_code.trim(), section_id: line.section_id })
      .eq('id', lineId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await client.from('budget_lines')
      .upsert({ tenant_id: tenantId, version_id: versionId, budget_type: line.budget_type, account_code: line.account_code.trim(), section_id: line.section_id },
        { onConflict: 'version_id,budget_type,account_code,section_id' })
      .select('id').single();
    if (error) throw new Error(error.message);
    lineId = data.id;
  }
  const periodRecords: any[] = [];
  for (let p = 1; p <= 12; p++) periodRecords.push({ tenant_id: tenantId, budget_line_id: lineId, period: p, montant_prevu: Math.round((line.periods[p] || 0) * 100) / 100 });
  const { error: perErr } = await client.from('budget_line_periods').upsert(periodRecords, { onConflict: 'budget_line_id,period' });
  if (perErr) throw new Error(perErr.message);
  return lineId!;
}

export async function deleteBudgetLine(adapter: DataAdapter, lineId: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('budget_lines').delete().eq('id', lineId);
  if (error) throw new Error(error.message);
}

// ── Atterrissage (LFT budgétaire) ────────────────────────────────────────────

export interface AtterrissageRow {
  account_code: string;
  classe: string;
  realiseYTD: number;     // réalisé des mois écoulés
  budgetReste: number;    // budget des mois à venir
  atterrissage: number;   // = réalisé YTD + budget reste
  budgetTotal: number;
}

/**
 * Atterrissage = réalisé cumulé (mois <= moisCourant) + budget des mois restants.
 * moisCourant 1..12 (déduit de nowIso côté appelant).
 */
export async function getAtterrissage(adapter: DataAdapter, annee: string, moisCourant: number): Promise<{ rows: AtterrissageRow[]; resultatAtterrissage: number; resultatBudget: number }> {
  const [exploitation, bva] = await Promise.all([
    getActualExploitation(adapter, annee),
    getBudgetVsActual(adapter),
  ]);
  const exp = bva.filter(b => b.budget_type === 'exploitation' && b.annee === annee);
  const map = new Map<string, AtterrissageRow>();
  // réalisé YTD par compte
  for (const r of exploitation) {
    if (r.period > moisCourant) continue;
    if (!map.has(r.account_code)) map.set(r.account_code, { account_code: r.account_code, classe: r.classe, realiseYTD: 0, budgetReste: 0, atterrissage: 0, budgetTotal: 0 });
    map.get(r.account_code)!.realiseYTD += r.montant_realise;
  }
  // budget reste (mois > courant) + budget total par compte
  for (const b of exp) {
    if (!map.has(b.account_code)) map.set(b.account_code, { account_code: b.account_code, classe: b.account_code[0], realiseYTD: 0, budgetReste: 0, atterrissage: 0, budgetTotal: 0 });
    const row = map.get(b.account_code)!;
    row.budgetTotal += b.budget;
    if (b.period > moisCourant) row.budgetReste += b.budget;
  }
  const rows = Array.from(map.values()).map(r => ({ ...r, atterrissage: r.realiseYTD + r.budgetReste }))
    .sort((a, b) => Math.abs(b.atterrissage) - Math.abs(a.atterrissage));
  const sign = (c: string) => (c === '7' ? 1 : -1);
  const resultatAtterrissage = rows.reduce((s, r) => s + sign(r.classe) * r.atterrissage, 0);
  const resultatBudget = rows.reduce((s, r) => s + sign(r.classe) * r.budgetTotal, 0);
  return { rows, resultatAtterrissage, resultatBudget };
}

// ── Import de budget ─────────────────────────────────────────────────────────

export interface BudgetImportLine {
  account_code: string;
  budget_type: 'exploitation' | 'investissement';
  section_code?: string | null;
  /** Montants mensuels indexés 1..12. */
  periods: Record<number, number>;
}

export interface FiscalYearLite { id: string; code: string; name?: string }

/** Exercice actif (is_active) sinon le plus récent. */
export async function getActiveFiscalYear(adapter: DataAdapter): Promise<FiscalYearLite | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data: act } = await client
    .from('fiscal_years').select('id,code,name').eq('is_active', true).limit(1);
  if (act?.[0]) return act[0];
  const { data } = await client
    .from('fiscal_years').select('id,code,name').order('code', { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

/** Déduit le type budgétaire depuis le compte si non fourni (classe 2 = investissement). */
export function inferBudgetType(accountCode: string): 'exploitation' | 'investissement' {
  return accountCode.trim().startsWith('2') ? 'investissement' : 'exploitation';
}

/**
 * Importe des lignes budgétaires dans une version (créée si nécessaire).
 * mode 'replace' : vide les lignes existantes de la version avant insertion
 * (ré-import idempotent). Écrit en réel (tables budget_*, RLS par société).
 */
/** Crée une nouvelle version budgétaire. setActive = en faire la version de référence. */
export async function createBudgetVersion(
  adapter: DataAdapter,
  params: { fiscalYearId: string; libelle: string; type?: 'initial' | 'revise' | 'atterrissage'; setActive?: boolean },
): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const tenantId = (adapter as any).tenantId as string;
  if (params.setActive) {
    await client.from('budget_versions').update({ is_active: false }).eq('fiscal_year_id', params.fiscalYearId);
  }
  const { data, error } = await client
    .from('budget_versions')
    .insert({ tenant_id: tenantId, fiscal_year_id: params.fiscalYearId, libelle: params.libelle.trim(), type: params.type || 'initial', statut: 'brouillon', is_active: !!params.setActive })
    .select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function importBudget(
  adapter: DataAdapter,
  params: {
    fiscalYearId: string;
    versionLibelle: string;
    lines: BudgetImportLine[];
    replace: boolean;
    /** Version cible explicite (versioning). Sinon : version active, sinon création. */
    versionId?: string;
  },
): Promise<{ versionId: string; linesCreated: number; periodsCreated: number }> {
  const client = getClient(adapter);
  if (!client) throw new Error('Import budget indisponible (mode hors-ligne).');
  const tenantId = (adapter as any).tenantId as string;
  if (!tenantId) throw new Error('Société non résolue.');

  // 1) Version cible : explicite, sinon active, sinon création.
  let versionId: string;
  if (params.versionId) {
    const { data: v } = await client.from('budget_versions').select('id,statut').eq('id', params.versionId).single();
    if (!v) throw new Error('Version cible introuvable.');
    if (v.statut === 'verrouille') throw new Error('Version verrouillée : import impossible.');
    versionId = v.id;
    if (params.replace) await client.from('budget_lines').delete().eq('version_id', versionId);
  } else {
    const { data: existing } = await client
      .from('budget_versions')
      .select('id,statut')
      .eq('fiscal_year_id', params.fiscalYearId)
      .eq('is_active', true)
      .limit(1);
    if (existing?.[0]) {
      if (existing[0].statut === 'verrouille') throw new Error('La version active est verrouillée : import impossible.');
      versionId = existing[0].id;
      if (params.replace) {
        await client.from('budget_lines').delete().eq('version_id', versionId);
      }
    } else {
      const { data: created, error } = await client
        .from('budget_versions')
        .insert({ tenant_id: tenantId, fiscal_year_id: params.fiscalYearId, libelle: params.versionLibelle, type: 'initial', statut: 'brouillon', is_active: true })
        .select('id').single();
      if (error) throw new Error(error.message);
      versionId = created.id;
    }
  }

  // 2) Résoudre les sections par code (optionnel ; table vide aujourd'hui → null).
  const sectionCodes = [...new Set(params.lines.map(l => (l.section_code || '').trim()).filter(Boolean))];
  const sectionMap = new Map<string, string>();
  if (sectionCodes.length) {
    const { data: secs } = await client
      .from('sections_analytiques').select('id,code').in('code', sectionCodes);
    (secs ?? []).forEach((s: any) => sectionMap.set(String(s.code), s.id));
  }

  // 3) Dédupliquer par clé (version,type,compte,section) en fusionnant les périodes.
  const merged = new Map<string, BudgetImportLine>();
  for (const l of params.lines) {
    const sec = (l.section_code || '').trim();
    const key = `${l.budget_type}|${l.account_code.trim()}|${sec}`;
    if (!merged.has(key)) merged.set(key, { account_code: l.account_code.trim(), budget_type: l.budget_type, section_code: sec || null, periods: { ...l.periods } });
    else { const m = merged.get(key)!; for (let p = 1; p <= 12; p++) m.periods[p] = (m.periods[p] || 0) + (l.periods[p] || 0); }
  }
  const lines = [...merged.values()];

  // 4) Insérer les lignes puis leurs périodes.
  const lineRecords = lines.map(l => ({
    tenant_id: tenantId,
    version_id: versionId,
    budget_type: l.budget_type,
    account_code: l.account_code,
    section_id: l.section_code ? (sectionMap.get(l.section_code) ?? null) : null,
  }));
  if (lineRecords.length === 0) return { versionId, linesCreated: 0, periodsCreated: 0 };

  const { error: insErr } = await client
    .from('budget_lines')
    .upsert(lineRecords, { onConflict: 'version_id,budget_type,account_code,section_id' });
  if (insErr) throw new Error(insErr.message);

  // Corrélation par CLÉ (robuste, indépendante de l'ordre retourné par l'upsert) :
  // on relit les ids de la version et on les associe par (type, compte, section).
  const { data: allLines } = await client
    .from('budget_lines')
    .select('id,budget_type,account_code,section_id')
    .eq('version_id', versionId);
  const idByKey = new Map<string, string>();
  (allLines ?? []).forEach((r: any) => idByKey.set(`${r.budget_type}|${r.account_code}|${r.section_id ?? ''}`, r.id));

  const periodRecords: any[] = [];
  for (const l of lines) {
    const secId = l.section_code ? (sectionMap.get(l.section_code) ?? '') : '';
    const lineId = idByKey.get(`${l.budget_type}|${l.account_code}|${secId}`);
    if (!lineId) continue;
    for (let p = 1; p <= 12; p++) {
      periodRecords.push({ tenant_id: tenantId, budget_line_id: lineId, period: p, montant_prevu: Math.round((l.periods[p] || 0) * 100) / 100 });
    }
  }
  const linesCreated = lineRecords.length;
  if (periodRecords.length) {
    const { error: perErr } = await client
      .from('budget_line_periods')
      .upsert(periodRecords, { onConflict: 'budget_line_id,period' });
    if (perErr) throw new Error(perErr.message);
  }

  return { versionId, linesCreated, periodsCreated: periodRecords.length };
}
