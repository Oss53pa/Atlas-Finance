/**
 * stockReportingService — analyses ABC & rotation. Source unique (quants +
 * documents de mouvement). Réutilisé par l'écran module et le Report Builder.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockMaterial, DBStockQuant } from '../../lib/db';
import { money } from '../../utils/money';

export interface AbcRow {
  material: DBStockMaterial;
  stockValue: number;
  quantity: number;
  sharePct: number;
  cumulativePct: number;
  abcClass: 'A' | 'B' | 'C';
}

export interface RotationRow {
  material: DBStockMaterial;
  issuedQty: number;
  issuedValue: number;
  currentValue: number;
  turnover: number;      // rotation = sorties valorisées / stock actuel
  coverageDays: number;  // couverture = 365 × stock / sorties (0 si pas de sortie)
}

async function stockValueByMaterial(adapter: DataAdapter): Promise<Map<string, { qty: number; value: number }>> {
  const quants = await adapter.getAll<DBStockQuant>('stockQuants');
  const map = new Map<string, { qty: number; value: number }>();
  for (const q of quants) {
    if ((q.stockStatus ?? 'libre') !== 'libre') continue;
    const agg = map.get(q.materialId) || { qty: 0, value: 0 };
    agg.qty += Number(q.quantity) || 0;
    agg.value += Number(q.value) || 0;
    map.set(q.materialId, agg);
  }
  return map;
}

export async function getAbcAnalysis(adapter: DataAdapter): Promise<AbcRow[]> {
  const [materials, valueMap] = await Promise.all([
    adapter.getAll<DBStockMaterial>('stockMaterials'),
    stockValueByMaterial(adapter),
  ]);
  const rows = materials
    .map(m => ({ material: m, ...(valueMap.get(m.id) || { qty: 0, value: 0 }) }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = rows.reduce((s, r) => s + r.value, 0);
  let cum = 0;
  return rows.map(r => {
    const sharePct = total > 0 ? (r.value / total) * 100 : 0;
    cum += sharePct;
    const abcClass: AbcRow['abcClass'] = cum <= 80 ? 'A' : cum <= 95 ? 'B' : 'C';
    return { material: r.material, stockValue: r.value, quantity: r.qty, sharePct, cumulativePct: cum, abcClass };
  });
}

export async function getRotation(
  adapter: DataAdapter,
  period?: { startDate: string; endDate: string },
): Promise<RotationRow[]> {
  const [materials, valueMap, docs, docLines] = await Promise.all([
    adapter.getAll<DBStockMaterial>('stockMaterials'),
    stockValueByMaterial(adapter),
    adapter.getAll<any>('stockDocuments'),
    adapter.getAll<any>('stockDocumentLines'),
  ]);
  const docDate = new Map(docs.map((d: any) => [d.id, d.docDate as string]));

  const issued = new Map<string, { qty: number; value: number }>();
  for (const l of docLines) {
    if (l.direction !== 'out') continue;
    const date = docDate.get(l.documentId);
    if (period && date && !(date >= period.startDate && date <= period.endDate)) continue;
    const agg = issued.get(l.materialId) || { qty: 0, value: 0 };
    agg.qty += Number(l.quantity) || 0;
    agg.value += Number(l.amount) || 0;
    issued.set(l.materialId, agg);
  }

  return materials.map(m => {
    const cur = valueMap.get(m.id)?.value || 0;
    const iss = issued.get(m.id) || { qty: 0, value: 0 };
    const turnover = cur > 0 ? money(iss.value).divide(cur).toNumber() : 0;
    const coverageDays = iss.value > 0 ? money(cur).multiply(365).divide(iss.value).toNumber() : 0;
    return { material: m, issuedQty: iss.qty, issuedValue: iss.value, currentValue: cur, turnover, coverageDays };
  }).filter(r => r.currentValue > 0 || r.issuedValue > 0)
    .sort((a, b) => b.issuedValue - a.issuedValue);
}
