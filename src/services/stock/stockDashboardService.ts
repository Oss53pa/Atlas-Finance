/**
 * stockDashboardService — KPIs du module Stock (source unique = quants + articles).
 * Aucun mock : sur un tenant fraîchement activé, tout est à 0 (état honnête).
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockMaterial, DBStockQuant } from '../../lib/db';
import { money } from '../../utils/money';

export interface StockKpis {
  materialsCount: number;
  activeMaterials: number;
  totalValue: number;
  totalQuantity: number;
  warehousesCount: number;
  stockouts: number;      // articles avec dispo ≤ 0
  belowReorder: number;   // articles sous le point de commande
  dormant: number;        // articles sans mouvement (proxy : pas de quant)
}

export interface MaterialStockRow {
  material: DBStockMaterial;
  quantity: number;
  value: number;
  belowReorder: boolean;
  stockout: boolean;
}

/** Agrège les quants par article (tous magasins, statut « libre »). */
export async function getMaterialStockRows(adapter: DataAdapter): Promise<MaterialStockRow[]> {
  const [materials, quants] = await Promise.all([
    adapter.getAll<DBStockMaterial>('stockMaterials'),
    adapter.getAll<DBStockQuant>('stockQuants'),
  ]);

  const byMaterial = new Map<string, { qty: number; val: number }>();
  for (const q of quants) {
    if (q.stockStatus && q.stockStatus !== 'libre') continue;
    const agg = byMaterial.get(q.materialId) || { qty: 0, val: 0 };
    agg.qty += Number(q.quantity) || 0;
    agg.val += Number(q.value) || 0;
    byMaterial.set(q.materialId, agg);
  }

  return materials.map(m => {
    const agg = byMaterial.get(m.id) || { qty: 0, val: 0 };
    const reorder = typeof m.reorderPoint === 'number' ? m.reorderPoint : null;
    return {
      material: m,
      quantity: agg.qty,
      value: agg.val,
      stockout: agg.qty <= 0,
      belowReorder: reorder !== null && agg.qty <= reorder,
    };
  });
}

export async function getStockKpis(adapter: DataAdapter): Promise<StockKpis> {
  const [rows, warehouses] = await Promise.all([
    getMaterialStockRows(adapter),
    adapter.getAll<{ id: string }>('stockWarehouses'),
  ]);

  let totalValue = money(0);
  let totalQuantity = 0;
  let stockouts = 0;
  let belowReorder = 0;
  let dormant = 0;

  for (const r of rows) {
    totalValue = totalValue.add(r.value);
    totalQuantity += r.quantity;
    if (r.stockout) stockouts++;
    if (r.belowReorder) belowReorder++;
    if (r.quantity === 0 && r.value === 0) dormant++;
  }

  return {
    materialsCount: rows.length,
    activeMaterials: rows.filter(r => r.material.active).length,
    totalValue: totalValue.toNumber(),
    totalQuantity,
    warehousesCount: warehouses.length,
    stockouts,
    belowReorder,
    dormant,
  };
}
