/**
 * reorderService — réapprovisionnement (MRP-lite) & alertes de stock.
 *
 * Disponible = stock physique libre − réservations actives.
 * Propositions de réappro quand disponible ≤ point de commande.
 * Alertes : ruptures, sous-mini, surstock, articles dormants, lots proches péremption.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockMaterial, DBStockQuant } from '../../lib/db';
import { expiringBatches, type StockBatch } from './batchSerialService';

export interface ReorderProposal {
  material: DBStockMaterial;
  onHand: number;
  available: number;
  reorderPoint: number;
  maxLevel?: number;
  suggestedQty: number;
  supplierId?: string;
  leadTimeDays?: number;
}

export interface StockAlerts {
  stockouts: DBStockMaterial[];
  belowReorder: ReorderProposal[];
  overstock: { material: DBStockMaterial; available: number; maxLevel: number }[];
  dormant: { material: DBStockMaterial; lastMovement?: string; available: number }[];
  expiring: StockBatch[];
}

interface Ctx {
  materials: DBStockMaterial[];
  onHandByMat: Map<string, number>;
  reservedByMat: Map<string, number>;
  lastMoveByMat: Map<string, string>;
}

async function buildCtx(adapter: DataAdapter): Promise<Ctx> {
  const [materials, quants, reservations, docLines, docs] = await Promise.all([
    adapter.getAll<DBStockMaterial>('stockMaterials'),
    adapter.getAll<DBStockQuant>('stockQuants'),
    adapter.getAll<any>('stockReservations'),
    adapter.getAll<any>('stockDocumentLines'),
    adapter.getAll<any>('stockDocuments'),
  ]);

  const onHandByMat = new Map<string, number>();
  for (const q of quants) {
    if ((q.stockStatus ?? 'libre') !== 'libre') continue;
    onHandByMat.set(q.materialId, (onHandByMat.get(q.materialId) || 0) + (Number(q.quantity) || 0));
  }

  const reservedByMat = new Map<string, number>();
  for (const r of reservations) {
    if (r.status !== 'active') continue;
    reservedByMat.set(r.materialId, (reservedByMat.get(r.materialId) || 0) + (Number(r.quantity) || 0));
  }

  const docDateById = new Map(docs.map((d: any) => [d.id, d.docDate as string]));
  const lastMoveByMat = new Map<string, string>();
  for (const l of docLines) {
    const date = docDateById.get(l.documentId);
    if (!date) continue;
    const prev = lastMoveByMat.get(l.materialId);
    if (!prev || date > prev) lastMoveByMat.set(l.materialId, date);
  }

  return { materials, onHandByMat, reservedByMat, lastMoveByMat };
}

function availabilityOf(ctx: Ctx, m: DBStockMaterial): { onHand: number; available: number } {
  const onHand = ctx.onHandByMat.get(m.id) || 0;
  const reserved = ctx.reservedByMat.get(m.id) || 0;
  return { onHand, available: onHand - reserved };
}

function proposalFor(ctx: Ctx, m: DBStockMaterial): ReorderProposal | null {
  if (typeof m.reorderPoint !== 'number') return null;
  const { onHand, available } = availabilityOf(ctx, m);
  if (available > m.reorderPoint) return null;
  const target = typeof m.maxLevel === 'number' && m.maxLevel > 0 ? m.maxLevel : m.reorderPoint;
  let suggested = target - available;
  if (typeof m.minOrderQty === 'number' && m.minOrderQty > 0) suggested = Math.max(suggested, m.minOrderQty);
  return {
    material: m, onHand, available, reorderPoint: m.reorderPoint, maxLevel: m.maxLevel,
    suggestedQty: Math.max(0, Math.ceil(suggested)), supplierId: m.defaultSupplierId, leadTimeDays: m.leadTimeDays,
  };
}

export async function getReorderProposals(adapter: DataAdapter): Promise<ReorderProposal[]> {
  const ctx = await buildCtx(adapter);
  return ctx.materials
    .filter(m => m.active)
    .map(m => proposalFor(ctx, m))
    .filter((p): p is ReorderProposal => p !== null)
    .sort((a, b) => (a.available - a.reorderPoint) - (b.available - b.reorderPoint));
}

/** refDate = YYYY-MM-DD (aujourd'hui). dormantDays : seuil sans mouvement. */
export async function getStockAlerts(adapter: DataAdapter, refDate: string, dormantDays = 90): Promise<StockAlerts> {
  const ctx = await buildCtx(adapter);
  const batches = await adapter.getAll<StockBatch>('stockBatches');

  const stockouts: DBStockMaterial[] = [];
  const belowReorder: ReorderProposal[] = [];
  const overstock: StockAlerts['overstock'] = [];
  const dormant: StockAlerts['dormant'] = [];

  const dormantHorizon = new Date(refDate).getTime() - dormantDays * 86400000;

  for (const m of ctx.materials) {
    if (!m.active) continue;
    const { onHand, available } = availabilityOf(ctx, m);
    if (available <= 0) stockouts.push(m);
    const p = proposalFor(ctx, m);
    if (p) belowReorder.push(p);
    if (typeof m.maxLevel === 'number' && m.maxLevel > 0 && available > m.maxLevel) {
      overstock.push({ material: m, available, maxLevel: m.maxLevel });
    }
    if (onHand > 0) {
      const last = ctx.lastMoveByMat.get(m.id);
      if (!last || new Date(last).getTime() < dormantHorizon) {
        dormant.push({ material: m, lastMovement: last, available });
      }
    }
  }

  return { stockouts, belowReorder, overstock, dormant, expiring: expiringBatches(batches, refDate, 30) };
}
