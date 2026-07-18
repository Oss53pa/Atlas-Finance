import type { DataAdapter } from '@atlas/data';

/**
 * Cockpit analytique budgétaire (dashboards style REWISE) — refonte OPEX/CAPEX.
 * Calcule le P&L de gestion MENSUEL (budget vs réalisé) à partir de la vue
 * d'équation v_budget_execution (budget/réalisé par compte × mois) + réalisé GL.
 * Cascade type NOI (immobilier commercial). Mapping SYSCOHADA explicite ci-dessous
 * — ajustable. Calcul 100 % code.
 */

// Préfixes de comptes par rubrique (mapping SYSCOHADA du compte de résultat).
const RUB = {
  goi: ['70', '71', '72', '73', '74', '75', '76', '78', '79'],  // produits d'exploitation (hors financier 77)
  opex: ['60', '61', '62', '63', '64', '65', '66', '68'],       // charges d'exploitation — 66 = charges de personnel (exploitation), 68 = dotations d'exploitation
  finInc: ['77'],                                                // revenus financiers
  finExp: ['67'],                                                // frais financiers (66 n'en fait PAS partie : c'est le personnel)
  tax: ['89'],                                                   // impôt sur le résultat (classe 8, réinjecté depuis v_actual_income_tax)
};

export interface PnLMonthLine { goi: number; opex: number; noi: number; finInc: number; finExp: number; resFin: number; tax: number; netIncome: number; }
export interface PnLMonth { period: number; budget: PnLMonthLine; actual: PnLMonthLine; }

const startsAny = (code: string, prefixes: string[]) => prefixes.some((p) => code.startsWith(p));
const line = (get: (prefixes: string[]) => number): PnLMonthLine => {
  const goi = get(RUB.goi), opex = get(RUB.opex), finInc = get(RUB.finInc), finExp = get(RUB.finExp), tax = get(RUB.tax);
  const noi = goi - opex;
  const resFin = finInc - finExp;
  return { goi, opex, noi, finInc, finExp, resFin, tax, netIncome: noi + resFin - tax };
};

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function fetchAll(build: () => any, chunk = 1000): Promise<any[]> {
  const all: any[] = []; let from = 0;
  for (;;) { const { data, error } = await build().range(from, from + chunk - 1); if (error) throw new Error(error.message); const b = (data || []) as any[]; all.push(...b); if (b.length < chunk) break; from += chunk; }
  return all;
}

/** P&L mensuel (12 mois) budget vs réalisé. Le réalisé vient du GL (tout compte),
 *  le budget de v_budget_execution (mailles budgétées). */
export async function getMonthlyPnL(adapter: DataAdapter, annee: string): Promise<PnLMonth[]> {
  const client = getClient(adapter);
  const months: PnLMonth[] = Array.from({ length: 12 }, (_, i) => ({
    period: i + 1,
    budget: line(() => 0), actual: line(() => 0),
  }));
  if (!client) return months;

  // budget par compte × mois (vue d'équation) ; réalisé par compte × mois (GL live) ;
  // impôt sur le résultat (compte 89) par mois — absent de v_actual_exploitation (classes 6-7 seules).
  const [bex, act, tax] = await Promise.all([
    fetchAll(() => client.from('v_budget_execution').select('account_code,period,budget').eq('annee', annee)),
    fetchAll(() => client.from('v_actual_exploitation').select('account_code,period,montant_realise').eq('annee', annee)),
    fetchAll(() => client.from('v_actual_income_tax').select('period,montant_impot').eq('annee', annee)),
  ]);

  const budByMonth: Record<number, Record<string, number>> = {};
  for (const r of bex) {
    const p = Number(r.period); (budByMonth[p] ??= {});
    budByMonth[p][r.account_code] = (budByMonth[p][r.account_code] || 0) + (Number(r.budget) || 0);
  }
  const actByMonth: Record<number, Record<string, number>> = {};
  for (const r of act) {
    const p = Number(r.period); (actByMonth[p] ??= {});
    actByMonth[p][r.account_code] = (actByMonth[p][r.account_code] || 0) + (Number(r.montant_realise) || 0);
  }
  // Réinjecte l'impôt sous une clé de compte « 89 » (captée par RUB.tax).
  for (const r of tax) {
    const p = Number(r.period); (actByMonth[p] ??= {});
    actByMonth[p]['89'] = (actByMonth[p]['89'] || 0) + (Number(r.montant_impot) || 0);
  }

  const sumBy = (byAccount: Record<string, number> | undefined) => (prefixes: string[]) => {
    if (!byAccount) return 0;
    let s = 0; for (const [code, v] of Object.entries(byAccount)) if (startsAny(code, prefixes)) s += v; return s;
  };

  for (let m = 1; m <= 12; m++) {
    months[m - 1].budget = line(sumBy(budByMonth[m]));
    months[m - 1].actual = line(sumBy(actByMonth[m]));
  }
  return months;
}

// ---------------------------------------------------------------------------
// Onglet « Dépenses » — analyse des charges réelles (classe 6) par nature, par
// mois et par fournisseur. Tout depuis le GL (v_actual_exploitation) + la vue
// v_expense_by_supplier (contrepartie 40x du tiers). Aucun mock.
// ---------------------------------------------------------------------------

// Libellés SYSCOHADA des rubriques de charges (préfixe 2 chiffres).
const RUB6_LABELS: Record<string, string> = {
  '60': 'Achats et variations de stocks',
  '61': 'Transports',
  '62': 'Services extérieurs A',
  '63': 'Services extérieurs B',
  '64': 'Impôts et taxes',
  '65': 'Autres charges',
  '66': 'Charges de personnel',
  '67': 'Frais financiers et charges assimilées',
  '68': 'Dotations aux amortissements et provisions',
  '69': 'Dotations HAO / Impôts sur le résultat',
};

export interface NatureAccount { code: string; total: number; }
export interface ExpenseNature { rubrique: string; label: string; total: number; byMonth: number[]; accounts: NatureAccount[]; }
export interface ExpenseSupplier { code: string; name: string; total: number; }
export interface ExpenseAnalysis {
  total: number;          // total charges réalisées (classe 6)
  budget: number;         // budget des charges (v_budget_execution, comptes classe 6)
  byMonth: number[];      // 12 mois
  byNature: ExpenseNature[];  // trié desc
  bySupplier: ExpenseSupplier[]; // top fournisseurs
}

/** Analyse des dépenses (charges classe 6) : par nature, par mois, par fournisseur. */
export async function getExpenseAnalysis(adapter: DataAdapter, annee: string): Promise<ExpenseAnalysis> {
  const empty: ExpenseAnalysis = { total: 0, budget: 0, byMonth: Array(12).fill(0), byNature: [], bySupplier: [] };
  const client = getClient(adapter);
  if (!client) return empty;

  const [act, bex] = await Promise.all([
    fetchAll(() => client.from('v_actual_exploitation').select('account_code,period,montant_realise').eq('classe', '6').eq('annee', annee)),
    fetchAll(() => client.from('v_budget_execution').select('account_code,budget').eq('annee', annee)),
  ]);
  // Vue fournisseurs isolée : joint third_parties (RLS auth_tenant_ids) — un échec
  // (droits insuffisants) ne doit pas casser tout l'onglet, on dégrade en liste vide.
  let sup: any[] = [];
  try { sup = await fetchAll(() => client.from('v_expense_by_supplier').select('code,fournisseur,depense').eq('annee', annee)); } catch { sup = []; }

  const byMonth = Array(12).fill(0) as number[];
  const natMap = new Map<string, ExpenseNature>();
  const acctMap = new Map<string, Map<string, number>>(); // rubrique -> (compte -> total)
  let total = 0;
  for (const r of act) {
    const code = String(r.account_code || '');
    const rub = code.slice(0, 2);
    const p = Number(r.period);
    const v = Number(r.montant_realise) || 0;
    total += v;
    if (p >= 1 && p <= 12) byMonth[p - 1] += v;
    let n = natMap.get(rub);
    if (!n) { n = { rubrique: rub, label: RUB6_LABELS[rub] || `Comptes ${rub}`, total: 0, byMonth: Array(12).fill(0), accounts: [] }; natMap.set(rub, n); }
    n.total += v;
    if (p >= 1 && p <= 12) n.byMonth[p - 1] += v;
    let am = acctMap.get(rub); if (!am) { am = new Map(); acctMap.set(rub, am); }
    am.set(code, (am.get(code) || 0) + v);
  }
  for (const [rub, am] of acctMap) {
    const n = natMap.get(rub); if (!n) continue;
    n.accounts = [...am.entries()].map(([code, t]) => ({ code, total: t })).sort((a, b) => b.total - a.total);
  }
  const byNature = [...natMap.values()].sort((a, b) => b.total - a.total);

  const supMap = new Map<string, ExpenseSupplier>();
  for (const r of sup) {
    const code = String(r.code || '');
    let s = supMap.get(code);
    if (!s) { s = { code, name: r.fournisseur || code, total: 0 }; supMap.set(code, s); }
    s.total += Number(r.depense) || 0;
  }
  const bySupplier = [...supMap.values()].filter((s) => s.total > 0).sort((a, b) => b.total - a.total).slice(0, 12);

  let budget = 0;
  for (const r of bex) if (String(r.account_code || '').startsWith('6')) budget += Number(r.budget) || 0;

  return { total, budget, byMonth, byNature, bySupplier };
}

// ---------------------------------------------------------------------------
// Onglet « Revenus » — analyse des produits réels (classe 7) par nature, par
// mois et par client (contrepartie 41x). Symétrique de l'analyse des dépenses.
// ---------------------------------------------------------------------------

// Libellés SYSCOHADA des rubriques de produits (préfixe 2 chiffres).
const RUB7_LABELS: Record<string, string> = {
  '70': 'Ventes',
  '71': 'Subventions d’exploitation',
  '72': 'Production immobilisée',
  '73': 'Variations de stocks de produits',
  '75': 'Autres produits',
  '77': 'Revenus financiers et assimilés',
  '78': 'Transferts de charges',
  '79': 'Reprises de provisions',
};

export interface RevenueNature { rubrique: string; label: string; total: number; byMonth: number[]; accounts: NatureAccount[]; }
export interface RevenueClient { code: string; name: string; total: number; }
export interface RevenueAnalysis {
  total: number;          // total produits réalisés (classe 7)
  budget: number;         // budget des produits (v_budget_execution, comptes classe 7)
  byMonth: number[];      // 12 mois
  byNature: RevenueNature[];  // trié desc
  byClient: RevenueClient[];  // top clients
}

/** Analyse des revenus (produits classe 7) : par nature, par mois, par client. */
export async function getRevenueAnalysis(adapter: DataAdapter, annee: string): Promise<RevenueAnalysis> {
  const empty: RevenueAnalysis = { total: 0, budget: 0, byMonth: Array(12).fill(0), byNature: [], byClient: [] };
  const client = getClient(adapter);
  if (!client) return empty;

  const [act, bex] = await Promise.all([
    fetchAll(() => client.from('v_actual_exploitation').select('account_code,period,montant_realise').eq('classe', '7').eq('annee', annee)),
    fetchAll(() => client.from('v_budget_execution').select('account_code,budget').eq('annee', annee)),
  ]);
  // Vue clients isolée (joint third_parties) : un échec de droits ne casse pas l'onglet.
  let cli: any[] = [];
  try { cli = await fetchAll(() => client.from('v_revenue_by_client').select('code,client,revenu').eq('annee', annee)); } catch { cli = []; }

  const byMonth = Array(12).fill(0) as number[];
  const natMap = new Map<string, RevenueNature>();
  const acctMap = new Map<string, Map<string, number>>();
  let total = 0;
  for (const r of act) {
    const code = String(r.account_code || '');
    const rub = code.slice(0, 2);
    const p = Number(r.period);
    const v = Number(r.montant_realise) || 0;
    total += v;
    if (p >= 1 && p <= 12) byMonth[p - 1] += v;
    let n = natMap.get(rub);
    if (!n) { n = { rubrique: rub, label: RUB7_LABELS[rub] || `Comptes ${rub}`, total: 0, byMonth: Array(12).fill(0), accounts: [] }; natMap.set(rub, n); }
    n.total += v;
    if (p >= 1 && p <= 12) n.byMonth[p - 1] += v;
    let am = acctMap.get(rub); if (!am) { am = new Map(); acctMap.set(rub, am); }
    am.set(code, (am.get(code) || 0) + v);
  }
  for (const [rub, am] of acctMap) {
    const n = natMap.get(rub); if (!n) continue;
    n.accounts = [...am.entries()].map(([code, t]) => ({ code, total: t })).sort((a, b) => b.total - a.total);
  }
  const byNature = [...natMap.values()].sort((a, b) => b.total - a.total);

  const cliMap = new Map<string, RevenueClient>();
  for (const r of cli) {
    const code = String(r.code || '');
    let c = cliMap.get(code);
    if (!c) { c = { code, name: r.client || code, total: 0 }; cliMap.set(code, c); }
    c.total += Number(r.revenu) || 0;
  }
  const byClient = [...cliMap.values()].filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 12);

  let budget = 0;
  for (const r of bex) if (String(r.account_code || '').startsWith('7')) budget += Number(r.budget) || 0;

  return { total, budget, byMonth, byNature, byClient };
}

// ---------------------------------------------------------------------------
// Page « Investissement (CAPEX) » — exécution réelle de l'investissement depuis
// le GL (classe 2, vue v_capex_investment). Distingue le PARC (stock, AN inclus)
// du FLUX d'investissement de l'année (hors à-nouveaux). Aucun mock.
// ---------------------------------------------------------------------------

// Libellés SYSCOHADA des rubriques d'immobilisation (préfixe 2 chiffres).
const CLASS2_LABELS: Record<string, string> = {
  '20': 'Charges immobilisées',
  '21': 'Immobilisations incorporelles',
  '22': 'Terrains',
  '23': 'Bâtiments, installations & agencements',
  '24': 'Matériel, mobilier & actifs biologiques',
  '25': 'Avances & acomptes sur immobilisations',
  '26': 'Titres de participation',
  '27': 'Autres immobilisations financières',
  '28': 'Amortissements',
  '29': 'Dépréciations',
};

export interface CapexNature { rubrique: string; label: string; total: number; byMonth: number[]; }
export interface CapexExecution {
  parcBrut: number;    // immobilisations brutes (20-27), position courante (AN inclus)
  parcAmort: number;   // amortissements cumulés (28)
  parcVnc: number;     // valeur nette comptable
  flowGross: number;   // acquisitions brutes de l'exercice (20-27, hors AN)
  flowNet: number;     // flux net classe 2 de l'exercice (hors AN)
  byMonth: number[];   // acquisitions brutes hors AN, par mois
  byNature: CapexNature[]; // acquisitions brutes hors AN, par rubrique
}

/** Exécution CAPEX : parc immobilisé (stock) + flux d'investissement de l'année (hors AN). */
export async function getCapexExecution(adapter: DataAdapter, annee: string): Promise<CapexExecution> {
  const empty: CapexExecution = { parcBrut: 0, parcAmort: 0, parcVnc: 0, flowGross: 0, flowNet: 0, byMonth: Array(12).fill(0), byNature: [] };
  const client = getClient(adapter);
  if (!client) return empty;

  const rows = await fetchAll(() => client.from('v_capex_investment').select('rubrique,period,is_an,montant').eq('annee', annee));

  let parcBrut = 0, parcAmort = 0, parcVnc = 0, flowGross = 0, flowNet = 0;
  const byMonth = Array(12).fill(0) as number[];
  const natMap = new Map<string, CapexNature>();
  for (const r of rows) {
    const rub = String(r.rubrique || '');
    const rubN = parseInt(rub, 10);
    const p = Number(r.period);
    const m = Number(r.montant) || 0;
    // Parc (stock) — AN inclus (position courante).
    if (rubN >= 20 && rubN <= 27) parcBrut += m;
    if (rubN === 28) parcAmort += -m;   // 28 est créditeur => amort positif
    parcVnc += m;                       // net (brut + 28 négatif + 29)
    // Flux de l'exercice — hors à-nouveaux.
    if (!r.is_an) {
      flowNet += m;
      if (rubN >= 20 && rubN <= 27) {
        flowGross += m;
        if (p >= 1 && p <= 12) byMonth[p - 1] += m;
        let n = natMap.get(rub);
        if (!n) { n = { rubrique: rub, label: CLASS2_LABELS[rub] || `Comptes ${rub}`, total: 0, byMonth: Array(12).fill(0) }; natMap.set(rub, n); }
        n.total += m;
        if (p >= 1 && p <= 12) n.byMonth[p - 1] += m;
      }
    }
  }
  const byNature = [...natMap.values()].sort((a, b) => b.total - a.total);
  return { parcBrut, parcAmort, parcVnc, flowGross, flowNet, byMonth, byNature };
}

// ---------------------------------------------------------------------------
// Onglets « Budget » & « Variance » — exécution budgétaire depuis la vue
// d'équation v_budget_execution (budget / engagé / réalisé / disponible par
// compte × mois). Le budget vient de la version en vigueur, le réalisé du GL.
// ---------------------------------------------------------------------------

export interface BudgetAccount { code: string; budget: number; realise: number; }
export interface BudgetLineAgg { rubrique: string; label: string; budget: number; engage: number; realise: number; disponible: number; accounts: BudgetAccount[]; }
export interface BudgetVsActualMonth { period: number; budgetCharges: number; realiseCharges: number; budgetProduits: number; realiseProduits: number; }
export interface BudgetAnalysis {
  charges: { budget: number; engage: number; realise: number; disponible: number };
  produits: { budget: number; realise: number };
  byRubriqueCharges: BudgetLineAgg[];   // consommation du budget de charges (classe 6)
  byRubriqueProduits: BudgetLineAgg[];  // réalisation du budget de produits (classe 7)
  byMonth: BudgetVsActualMonth[];       // budget vs réalisé par mois (charges & produits)
}

/** Exécution budgétaire (Budget/Engagé/Réalisé/Disponible) par rubrique et par mois. */
export async function getBudgetAnalysis(adapter: DataAdapter, annee: string): Promise<BudgetAnalysis> {
  const empty: BudgetAnalysis = {
    charges: { budget: 0, engage: 0, realise: 0, disponible: 0 }, produits: { budget: 0, realise: 0 },
    byRubriqueCharges: [], byRubriqueProduits: [],
    byMonth: Array.from({ length: 12 }, (_, i) => ({ period: i + 1, budgetCharges: 0, realiseCharges: 0, budgetProduits: 0, realiseProduits: 0 })),
  };
  const client = getClient(adapter);
  if (!client) return empty;

  const rows = await fetchAll(() => client.from('v_budget_execution').select('account_code,period,budget,engage,realise,disponible').eq('annee', annee));

  const charges = { budget: 0, engage: 0, realise: 0, disponible: 0 };
  const produits = { budget: 0, realise: 0 };
  const cMap = new Map<string, BudgetLineAgg>();
  const pMap = new Map<string, BudgetLineAgg>();
  const cAcct = new Map<string, Map<string, BudgetAccount>>(); // rubrique -> compte -> {budget,realise}
  const pAcct = new Map<string, Map<string, BudgetAccount>>();
  const byMonth = empty.byMonth.map((m) => ({ ...m }));

  const bumpAcct = (store: Map<string, Map<string, BudgetAccount>>, rub: string, code: string, budget: number, realise: number) => {
    let am = store.get(rub); if (!am) { am = new Map(); store.set(rub, am); }
    let a = am.get(code); if (!a) { a = { code, budget: 0, realise: 0 }; am.set(code, a); }
    a.budget += budget; a.realise += realise;
  };

  for (const r of rows) {
    const code = String(r.account_code || '');
    const rub = code.slice(0, 2);
    const classe = code.slice(0, 1);
    const p = Number(r.period);
    const budget = Number(r.budget) || 0, engage = Number(r.engage) || 0, realise = Number(r.realise) || 0, dispo = Number(r.disponible) || 0;
    if (classe === '6') {
      charges.budget += budget; charges.engage += engage; charges.realise += realise; charges.disponible += dispo;
      let n = cMap.get(rub);
      if (!n) { n = { rubrique: rub, label: RUB6_LABELS[rub] || `Comptes ${rub}`, budget: 0, engage: 0, realise: 0, disponible: 0, accounts: [] }; cMap.set(rub, n); }
      n.budget += budget; n.engage += engage; n.realise += realise; n.disponible += dispo;
      bumpAcct(cAcct, rub, code, budget, realise);
      if (p >= 1 && p <= 12) { byMonth[p - 1].budgetCharges += budget; byMonth[p - 1].realiseCharges += realise; }
    } else if (classe === '7') {
      produits.budget += budget; produits.realise += realise;
      let n = pMap.get(rub);
      if (!n) { n = { rubrique: rub, label: RUB7_LABELS[rub] || `Comptes ${rub}`, budget: 0, engage: 0, realise: 0, disponible: 0, accounts: [] }; pMap.set(rub, n); }
      n.budget += budget; n.realise += realise; n.disponible += (budget - realise);
      bumpAcct(pAcct, rub, code, budget, realise);
      if (p >= 1 && p <= 12) { byMonth[p - 1].budgetProduits += budget; byMonth[p - 1].realiseProduits += realise; }
    }
  }

  const attachAccounts = (map: Map<string, BudgetLineAgg>, store: Map<string, Map<string, BudgetAccount>>) => {
    for (const [rub, am] of store) { const n = map.get(rub); if (n) n.accounts = [...am.values()].sort((a, b) => b.budget - a.budget); }
  };
  attachAccounts(cMap, cAcct);
  attachAccounts(pMap, pAcct);

  return {
    charges, produits,
    byRubriqueCharges: [...cMap.values()].sort((a, b) => b.budget - a.budget),
    byRubriqueProduits: [...pMap.values()].sort((a, b) => b.budget - a.budget),
    byMonth,
  };
}

export interface MonthCard { period: number; budgeted: number; overspent: number; incoming: number; noBudget: number; available: number; }

/** Cartes de synthèse mensuelle (style REWISE : Budgeted / Overspent / Incoming / No budgeted / Available). */
export function monthCard(m: PnLMonth): MonthCard {
  const budgeted = m.budget.opex + m.budget.finExp + m.budget.tax;   // dépenses budgétées du mois
  const spent = m.actual.opex + m.actual.finExp + m.actual.tax;
  const overspent = Math.max(0, spent - budgeted);
  const incoming = m.actual.goi + m.actual.finInc;                    // encaissements/produits réalisés
  const noBudget = budgeted === 0 && spent > 0 ? spent : 0;
  const available = Math.max(0, budgeted - spent);
  return { period: m.period, budgeted, overspent, incoming, noBudget, available };
}
