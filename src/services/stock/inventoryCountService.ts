/**
 * inventoryCountService — inventaire physique (SAP physical inventory).
 *
 * Cycle : création (photo du stock théorique figée) → comptage → écarts →
 * validation (génère les mouvements 701/702 + régularisation GL via UMB, fige
 * le document avec un hash d'intégrité).
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockMaterial, DBStockQuant } from '../../lib/db';
import { money } from '../../utils/money';
import { sha256Hex } from '../../utils/integrity';
import { postMovement } from './stockMovementService';

export interface CountDocument {
  id: string; docNumber: string; warehouseId: string; countDate: string;
  type: 'total' | 'tournant' | 'ponctuel'; status: 'ouvert' | 'compte' | 'valide' | 'annule';
  periodCode?: string; hash?: string; createdBy?: string;
}
export interface CountLine {
  id: string; countDocId: string; materialId: string; locationId?: string; batchId?: string;
  bookQty: number; countedQty?: number; varianceQty?: number; unitCost: number;
  varianceValue?: number; recount: boolean;
  /** Articles sérialisés : n° de série physiquement trouvés. */
  countedSerials?: string[];
}

function getClient(adapter: DataAdapter): any | null { return (adapter as any).client ?? null; }
async function tenantOf(adapter: DataAdapter): Promise<string | null> {
  const c = getClient(adapter);
  if (!c) return null;
  try { const { data } = await c.rpc('get_user_company_id'); return (data as string) ?? null; } catch { return null; }
}
async function nextDocNumber(adapter: DataAdapter): Promise<string> {
  const c = getClient(adapter); const tenant = await tenantOf(adapter);
  if (c && tenant) {
    try { const { data } = await c.rpc('stock_next_number', { p_tenant: tenant, p_object: 'INVDOC', p_prefix: 'INV-' }); if (typeof data === 'string' && data) return data; } catch { /* repli */ }
  }
  return `INV-${Date.now()}`;
}

export async function listCountDocuments(adapter: DataAdapter): Promise<CountDocument[]> {
  const rows = await adapter.getAll<CountDocument>('stockCountDocuments');
  return rows.sort((a, b) => (b.docNumber || '').localeCompare(a.docNumber || ''));
}

export async function getCountLines(adapter: DataAdapter, docId: string): Promise<CountLine[]> {
  const rows = await adapter.getAll<CountLine>('stockCountLines');
  return rows.filter(l => l.countDocId === docId);
}

/** Crée un document d'inventaire : fige le stock théorique (book_qty) par quant. */
export async function createCountDocument(
  adapter: DataAdapter,
  input: { warehouseId: string; countDate: string; type?: CountDocument['type']; team?: any; userId?: string },
): Promise<CountDocument> {
  const [quants, materials] = await Promise.all([
    adapter.getAll<DBStockQuant>('stockQuants'),
    adapter.getAll<DBStockMaterial>('stockMaterials'),
  ]);
  const matById = new Map(materials.map(m => [m.id, m]));
  const docNumber = await nextDocNumber(adapter);
  const doc = await adapter.create<CountDocument>('stockCountDocuments', {
    docNumber, warehouseId: input.warehouseId, countDate: input.countDate,
    type: input.type ?? 'total', status: 'ouvert', team: input.team ?? null,
    createdBy: input.userId ?? null,
  } as any);

  const whQuants = quants.filter(q => q.warehouseId === input.warehouseId && (q.stockStatus ?? 'libre') === 'libre');
  for (const q of whQuants) {
    const mat = matById.get(q.materialId);
    await adapter.create('stockCountLines', {
      countDocId: doc.id, materialId: q.materialId, locationId: q.locationId ?? null, batchId: q.batchId ?? null,
      bookQty: Number(q.quantity) || 0, unitCost: mat?.movingAvgCost ?? 0, recount: false,
    } as any);
  }
  return doc;
}

/** Saisit la quantité comptée d'une ligne et calcule l'écart. */
export async function saveCount(adapter: DataAdapter, line: CountLine, countedQty: number): Promise<void> {
  const varianceQty = money(countedQty).subtract(line.bookQty).toNumber();
  const varianceValue = money(varianceQty).multiply(line.unitCost).toNumber();
  await adapter.update('stockCountLines', line.id, { countedQty, varianceQty, varianceValue } as any);
}

/** Saisit les n° de série trouvés (articles sérialisés) : quantité = nombre de n°. */
export async function saveCountSerials(adapter: DataAdapter, line: CountLine, serials: string[]): Promise<void> {
  const clean = serials.map(s => s.trim()).filter(Boolean);
  const countedQty = clean.length;
  const varianceQty = money(countedQty).subtract(line.bookQty).toNumber();
  const varianceValue = money(varianceQty).multiply(line.unitCost).toNumber();
  await adapter.update('stockCountLines', line.id, { countedQty, varianceQty, varianceValue, countedSerials: clean } as any);
}

export interface ValidateResult { adjustments: number; skippedSerial: number; totalVarianceValue: number }

/**
 * Valide l'inventaire : pour chaque écart, poste un mouvement 701 (positif) ou
 * 702 (négatif) → ajuste le stock ET la comptabilité (UMB). Fige le document.
 */
export async function validateCount(adapter: DataAdapter, docId: string, userId?: string): Promise<ValidateResult> {
  const doc = await adapter.getById<CountDocument>('stockCountDocuments', docId);
  if (!doc) throw new Error('Document introuvable');
  if (doc.status === 'valide') throw new Error('Inventaire déjà validé');

  const [lines, materials] = await Promise.all([
    getCountLines(adapter, docId),
    adapter.getAll<DBStockMaterial>('stockMaterials'),
  ]);
  const matById = new Map(materials.map(m => [m.id, m]));

  let adjustments = 0, skippedSerial = 0;
  let totalVarianceValue = money(0);
  const allSerials = await adapter.getAll<any>('stockSerials');

  for (const l of lines) {
    if (l.countedQty == null) continue; // ligne non comptée
    const mat = matById.get(l.materialId);

    // --- Articles gérés par n° de série : ajustement par n° (manquants/en trop) ---
    if (mat?.serialManaged) {
      const found = new Set((l.countedSerials ?? []).map(s => String(s).trim()).filter(Boolean));
      if (found.size === 0 && !l.varianceQty) continue;
      const enStock = allSerials.filter((s: any) => s.materialId === l.materialId && s.status === 'en_stock');
      const missing = enStock.filter((s: any) => !found.has(s.serialNumber)).map((s: any) => s.serialNumber);
      const knownNumbers = new Set(allSerials.filter((s: any) => s.materialId === l.materialId).map((s: any) => s.serialNumber));
      const extra = [...found].filter(sn => !knownNumbers.has(sn));

      if (missing.length > 0) {
        await postMovement(adapter, {
          movementTypeCode: '702', date: doc.countDate, reference: doc.docNumber, userId,
          lines: [{ materialId: l.materialId, warehouseId: doc.warehouseId, locationId: l.locationId, quantity: missing.length, serialNumbers: missing, reason: `Manquant inventaire ${doc.docNumber}` }],
        });
        adjustments++;
        totalVarianceValue = totalVarianceValue.subtract(money(missing.length).multiply(l.unitCost).toNumber());
      }
      if (extra.length > 0) {
        await postMovement(adapter, {
          movementTypeCode: '701', date: doc.countDate, reference: doc.docNumber, userId,
          lines: [{ materialId: l.materialId, warehouseId: doc.warehouseId, locationId: l.locationId, quantity: extra.length, unitCost: l.unitCost, serialNumbers: extra, reason: `Excédent inventaire ${doc.docNumber}` }],
        });
        adjustments++;
        totalVarianceValue = totalVarianceValue.add(money(extra.length).multiply(l.unitCost).toNumber());
      }
      if (l.varianceQty && missing.length === 0 && extra.length === 0) skippedSerial++; // écart sans détail série
      continue;
    }

    // --- Articles non sérialisés : ajustement par quantité (701/702 agrégé) ---
    if (!l.varianceQty) continue;
    const positive = l.varianceQty > 0;
    await postMovement(adapter, {
      movementTypeCode: positive ? '701' : '702',
      date: doc.countDate,
      reference: doc.docNumber,
      userId,
      lines: [{
        materialId: l.materialId, warehouseId: doc.warehouseId, locationId: l.locationId,
        batchId: l.batchId, quantity: Math.abs(l.varianceQty),
        unitCost: positive ? l.unitCost : undefined,
        reason: `Écart d'inventaire ${doc.docNumber}`,
      }],
    });
    adjustments++;
    totalVarianceValue = totalVarianceValue.add(l.varianceValue ?? 0);
  }

  const payload = JSON.stringify(lines.map(l => ({ m: l.materialId, b: l.bookQty, c: l.countedQty, v: l.varianceQty })));
  const hash = await sha256Hex(`${doc.docNumber}|${doc.countDate}|${payload}`);
  await adapter.update('stockCountDocuments', docId, { status: 'valide', hash } as any);

  await adapter.logAudit?.({
    action: 'STOCK_INVENTORY_VALIDATED', entityType: 'stockCountDocument', entityId: docId,
    details: JSON.stringify({ docNumber: doc.docNumber, adjustments, skippedSerial, totalVarianceValue: totalVarianceValue.toNumber() }),
    timestamp: new Date().toISOString(), previousHash: '',
  });

  return { adjustments, skippedSerial, totalVarianceValue: totalVarianceValue.toNumber() };
}

export const COUNT_TYPE_LABELS: Record<CountDocument['type'], string> = {
  total: 'Inventaire total', tournant: 'Inventaire tournant', ponctuel: 'Comptage ponctuel',
};
