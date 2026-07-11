import type { DataAdapter } from '@atlas/data';
import { getAccountLabel } from '../../../utils/accountLabels';

/**
 * Alertes budgétaires OPEX (refonte OPEX/CAPEX — Lot 4, §15).
 * Dérivées de la vue d'équation v_budget_execution, agrégées par maille annuelle
 * (compte × section). Calcul déterministe (PROPH3T ne produit aucun chiffre).
 *
 *  OPX-DEP : disponible < 0                         (P1, dépassement)
 *  OPX-90  : (engagé+réalisé) ≥ 90 % du budget      (P2)
 *  OPX-75  : (engagé+réalisé) ≥ 75 % du budget      (P3)
 */

export type AlertCode = 'OPX-DEP' | 'OPX-90' | 'OPX-75';
export type AlertSeverity = 'P1' | 'P2' | 'P3';

export interface MailleAgg {
  account_code: string;
  section_id: string | null;
  budget: number;
  engage: number;
  realise: number;
  disponible: number;
}

export interface BudgetAlert {
  code: AlertCode;
  severity: AlertSeverity;
  account_code: string;
  section_id: string | null;
  budget: number;
  consomme: number;      // engagé + réalisé
  disponible: number;
  ratio: number;         // consommé / budget
  message: string;
}

/** Dérive les alertes d'un ensemble de mailles agrégées (fonction pure, testable). */
export function deriveAlerts(mailles: MailleAgg[]): BudgetAlert[] {
  const out: BudgetAlert[] = [];
  for (const m of mailles) {
    const consomme = (m.engage || 0) + (m.realise || 0);
    const ratio = m.budget > 0 ? consomme / m.budget : 0;
    const base = {
      account_code: m.account_code, section_id: m.section_id,
      budget: round2(m.budget), consomme: round2(consomme), disponible: round2(m.disponible), ratio: round4(ratio),
    };
    const label = getAccountLabel(m.account_code) || m.account_code;
    if (m.disponible < 0) {
      out.push({ ...base, code: 'OPX-DEP', severity: 'P1', message: `Dépassement sur ${m.account_code} — ${label} : disponible négatif.` });
    } else if (m.budget > 0 && ratio >= 0.9) {
      out.push({ ...base, code: 'OPX-90', severity: 'P2', message: `${m.account_code} — ${label} : consommation ≥ 90 % du budget.` });
    } else if (m.budget > 0 && ratio >= 0.75) {
      out.push({ ...base, code: 'OPX-75', severity: 'P3', message: `${m.account_code} — ${label} : consommation ≥ 75 % du budget.` });
    }
  }
  // tri par sévérité (P1 d'abord) puis ratio décroissant
  const rank: Record<AlertSeverity, number> = { P1: 0, P2: 1, P3: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.ratio - a.ratio);
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

async function fetchAll(build: () => any, chunk = 1000): Promise<any[]> {
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

/** Agrège v_budget_execution par maille annuelle puis dérive les alertes. */
export async function computeBudgetAlerts(adapter: DataAdapter, annee: string): Promise<BudgetAlert[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const rows = await fetchAll(() => client
    .from('v_budget_execution')
    .select('account_code,section_id,budget,engage,realise,disponible')
    .eq('annee', annee)
    .order('account_code', { ascending: true }));
  const byMaille = new Map<string, MailleAgg>();
  for (const r of rows) {
    const key = `${r.account_code}|${r.section_id ?? ''}`;
    const cur = byMaille.get(key) ?? { account_code: r.account_code, section_id: r.section_id ?? null, budget: 0, engage: 0, realise: 0, disponible: 0 };
    cur.budget += Number(r.budget) || 0;
    cur.engage += Number(r.engage) || 0;
    cur.realise += Number(r.realise) || 0;
    cur.disponible += Number(r.disponible) || 0;
    byMaille.set(key, cur);
  }
  return deriveAlerts([...byMaille.values()]);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
