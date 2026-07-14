import type { DataAdapter } from '@atlas/data';

/**
 * Cockpit analytique budgétaire (dashboards style REWISE) — refonte OPEX/CAPEX.
 * Calcule le P&L de gestion MENSUEL (budget vs réalisé) à partir de la vue
 * d'équation v_budget_execution (budget/réalisé par compte × mois) + réalisé GL.
 * Cascade type NOI (immobilier commercial). Mapping SYSCOHADA explicite ci-dessous
 * — ajustable. Calcul 100 % code.
 */

// Préfixes de comptes par rubrique (ajustable selon le plan du tenant).
const RUB = {
  goi: ['70', '71', '72', '73', '74', '75', '76'],  // produits d'exploitation (hors financier 77)
  opex: ['60', '61', '62', '63', '64', '65', '68'],  // charges d'exploitation (hors financier 66/67, hors impôt)
  finInc: ['77'],
  finExp: ['66', '67'],
  tax: ['69', '89'],
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

  // budget par compte × mois (vue d'équation) ; réalisé par compte × mois (GL live)
  const [bex, act] = await Promise.all([
    fetchAll(() => client.from('v_budget_execution').select('account_code,period,budget').eq('annee', annee)),
    fetchAll(() => client.from('v_actual_exploitation').select('account_code,period,montant_realise').eq('annee', annee)),
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
