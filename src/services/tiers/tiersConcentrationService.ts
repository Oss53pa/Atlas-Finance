/**
 * Concentration & dépendance financière tiers (CDC §8.1).
 *
 * Mesure le risque de dépendance : quelle part du CA repose sur un seul client,
 * quelle part des achats sur un seul fournisseur. Courbe de Pareto (80/20),
 * indice de Herfindahl-Hirschman (HHI), croisement avec l'encours (balance âgée)
 * pour le triple signal « gros + lent à payer + peu rentable ».
 *
 * Côté clients : CA par tiers (réutilise getClientRevenue) × encours 411.
 * Côté fournisseurs : achats cl.6 par tiers porté sur la 40x de l'écriture.
 */
import type { DataAdapter } from '@atlas/data';
import { getClientRevenue, loadEntriesWithLines, type DateRange } from './clientProfitability';
import { getAgedReceivables } from '../../features/balance/services/balanceService';

export type RisqueEncours = 'faible' | 'moyen' | 'eleve';

export interface ConcentrationItem {
  code: string;
  name: string;
  value: number;                 // CA (clients) ou achats (fournisseurs)
  sharePct: number;              // part du total (%)
  cumulPct: number;              // part cumulée (Pareto)
  encours?: number;              // solde 411 restant dû (clients)
  risque?: RisqueEncours;
  retard60?: number;             // montant échu > 60 j (clients)
}

export interface ConcentrationResult {
  items: ConcentrationItem[];
  total: number;
  hhi: number;                   // 0..1 (Σ des carrés des parts)
  hhiIndex: number;              // 0..10000 (échelle antitrust usuelle)
  top1Pct: number;
  top5Pct: number;
  top10Pct: number;
  nb: number;
}

/** Calcule Pareto + HHI + parts du top N. Fonction pure. */
export function computeConcentration(
  raw: Array<{ code: string; name: string; value: number; encours?: number; risque?: RisqueEncours; retard60?: number }>,
): ConcentrationResult {
  const pos = raw.filter(r => r.value > 0).slice().sort((a, b) => b.value - a.value);
  const total = pos.reduce((s, r) => s + r.value, 0);
  let cum = 0;
  const items: ConcentrationItem[] = pos.map(r => {
    const sharePct = total > 0 ? (r.value / total) * 100 : 0;
    cum += sharePct;
    return {
      code: r.code, name: r.name, value: r.value,
      sharePct: Math.round(sharePct * 10) / 10,
      cumulPct: Math.round(cum * 10) / 10,
      encours: r.encours, risque: r.risque, retard60: r.retard60,
    };
  });
  const hhi = total > 0 ? pos.reduce((s, r) => s + Math.pow(r.value / total, 2), 0) : 0;
  const share = (n: number) => total > 0 ? Math.round((pos.slice(0, n).reduce((s, r) => s + r.value, 0) / total) * 1000) / 10 : 0;
  return {
    items, total,
    hhi: Math.round(hhi * 1000) / 1000,
    hhiIndex: Math.round(hhi * 10000),
    top1Pct: share(1), top5Pct: share(5), top10Pct: share(10),
    nb: pos.length,
  };
}

/** Achats de classe 6 par fournisseur (tiers porté sur la ligne 40x de l'écriture). */
export async function getSupplierPurchases(adapter: DataAdapter, range?: DateRange): Promise<Array<{ code: string; name: string; value: number }>> {
  const entries = await loadEntriesWithLines(adapter, range);
  const acc = new Map<string, { code: string; name: string; value: number }>();
  for (const e of entries) {
    const lines = e.lines || [];
    let sup: { code: string; name: string } | null = null;
    for (const l of lines) {
      if (String(l.accountCode || '').startsWith('40') && l.thirdPartyCode && String(l.thirdPartyCode).trim()) {
        sup = { code: String(l.thirdPartyCode), name: String(l.thirdPartyName || l.thirdPartyCode) };
        break;
      }
    }
    if (!sup) continue;
    const achat = lines
      .filter(l => String(l.accountCode || '').startsWith('6'))
      .reduce((s, l) => s + ((l.debit || 0) - (l.credit || 0)), 0);
    if (achat === 0) continue;
    const cur = acc.get(sup.code) || { code: sup.code, name: sup.name, value: 0 };
    cur.value += achat;
    acc.set(sup.code, cur);
  }
  return Array.from(acc.values());
}

/** Concentration clients (part du CA) croisée avec l'encours 411. */
export async function getClientConcentration(adapter: DataAdapter, range?: DateRange): Promise<ConcentrationResult> {
  const report = await getClientRevenue(adapter, undefined, range);
  let aged: Awaited<ReturnType<typeof getAgedReceivables>> = [];
  try { aged = await getAgedReceivables(adapter); } catch { /* balance âgée indispo : concentration seule */ }
  const agedMap = new Map(aged.map(a => [a.clientCode, a]));
  const raw = report.clients
    .filter(c => c.code && c.ca > 0)
    .map(c => {
      const a = agedMap.get(c.code);
      return { code: c.code, name: c.name, value: c.ca, encours: a?.total, risque: a?.risque, retard60: a?.days60plus };
    });
  return computeConcentration(raw);
}

/** Concentration fournisseurs (part des achats). */
export async function getSupplierConcentration(adapter: DataAdapter, range?: DateRange): Promise<ConcentrationResult> {
  return computeConcentration(await getSupplierPurchases(adapter, range));
}
