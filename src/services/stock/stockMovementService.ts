/**
 * stockMovementService — moteur de mouvements de stock (SAP material document).
 *
 * postMovement() est transactionnel-par-intention :
 *  1. valorise chaque ligne (CUMP ou FIFO) ;
 *  2. poste l'écriture GL SYSCOHADA (safeAddEntry → verrou de clôture, équilibre,
 *     hash) AVANT toute mutation de stock : si la période est verrouillée, rien
 *     n'est modifié ;
 *  3. met à jour les quants (+ couches FIFO) et le CUMP article ;
 *  4. écrit le document de mouvement (stock_documents + lignes), lié à l'écriture.
 *
 * Détermination comptable via stock_gl_determination (OBYC-like), éditable.
 */
import type { DataAdapter } from '@atlas/data';
import type {
  DBStockMaterial, DBStockQuant, DBStockMovementType, DBStockGlDetermination,
  DBJournalLine,
} from '../../lib/db';
import { money, Money } from '../../utils/money';
import { calculateCUMP, consumeFIFO } from '../inventory/inventoryService';
import { safeAddEntry } from '../entryGuard';
import { getAccountLabel } from '../../utils/accountLabels';
import { resolve, type TransactionKey } from './glDeterminationService';

export interface MovementLineInput {
  materialId: string;
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  serialId?: string;
  quantity: number;
  /** Coût unitaire d'entrée (réception). Ignoré en sortie (valorisée au CUMP/FIFO). */
  unitCost?: number;
  reason?: string;
  costCenterId?: string;
  /** Transfert : destination */
  toWarehouseId?: string;
  toLocationId?: string;
  // --- L3 : lots & séries ---
  /** Article géré par lot : n° de lot (créé à la réception s'il n'existe pas). */
  batchNumber?: string;
  /** Date de péremption/DLC du lot (à la création). */
  expiryDate?: string;
  /** Article géré par n° de série : liste des n° (longueur = quantité). */
  serialNumbers?: string[];
}

export interface MovementInput {
  movementTypeCode: string;
  date: string;            // YYYY-MM-DD
  reference?: string;
  lines: MovementLineInput[];
  userId?: string;
}

export interface MovementResult {
  documentId: string;
  docNumber: string;
  journalEntryId?: string;
  totalAmount: number;
}

const SEG = '00000000-0000-0000-0000-000000000000';

function getClient(adapter: DataAdapter): any | null {
  return (adapter as any).client ?? null;
}
async function tenantOf(adapter: DataAdapter): Promise<string | null> {
  const c = getClient(adapter);
  if (!c) return null;
  try { const { data } = await c.rpc('get_user_company_id'); return (data as string) ?? null; }
  catch { return null; }
}

async function nextDocNumber(adapter: DataAdapter): Promise<string> {
  const client = getClient(adapter);
  const tenant = await tenantOf(adapter);
  if (client && tenant) {
    try {
      const { data } = await client.rpc('stock_next_number', { p_tenant: tenant, p_object: 'MATDOC', p_prefix: 'MD-' });
      if (typeof data === 'string' && data) return data;
    } catch { /* repli ci-dessous */ }
  }
  return `MD-${Date.now()}`;
}

/** Compte de contrepartie selon le type de mouvement et le sens. */
function counterpartAccount(
  det: DBStockGlDetermination[], valClass: string,
  mt: DBStockMovementType, direction: 'in' | 'out',
): { account?: string; key: TransactionKey } {
  const special = mt.special;
  if (special === 'goods_receipt') {
    if (mt.code === '501') return { account: resolve(det, valClass, 'UMB')?.creditAccount, key: 'UMB' };
    return { account: resolve(det, valClass, 'WRX')?.creditAccount, key: 'WRX' }; // 101/561 → 408
  }
  if (special === 'goods_issue' || special === 'scrap') {
    return { account: resolve(det, valClass, 'GBB')?.debitAccount, key: 'GBB' };
  }
  if (special === 'physinv') {
    const row = resolve(det, valClass, 'UMB');
    return { account: direction === 'in' ? row?.creditAccount : row?.debitAccount, key: 'UMB' };
  }
  return { key: 'GBB' }; // transferts : pas de contrepartie (GL neutre)
}

export async function postMovement(adapter: DataAdapter, input: MovementInput): Promise<MovementResult> {
  if (!input.lines?.length) throw new Error('Aucune ligne de mouvement');

  const [materials, movementTypes, det] = await Promise.all([
    adapter.getAll<DBStockMaterial>('stockMaterials'),
    adapter.getAll<DBStockMovementType>('stockMovementTypes'),
    adapter.getAll<DBStockGlDetermination>('stockGlDetermination'),
  ]);
  const mt = movementTypes.find(t => t.code === input.movementTypeCode);
  if (!mt) throw new Error(`Type de mouvement inconnu : ${input.movementTypeCode}`);
  if (mt.requiresReference && !input.reference?.trim()) {
    throw new Error(`Le type ${mt.code} exige une référence`);
  }

  const allQuants = await adapter.getAll<DBStockQuant>('stockQuants');
  const materialById = new Map(materials.map(m => [m.id, m]));

  // ---- 1. Valorisation + préparation des mutations & lignes GL ----------
  const glLines: DBJournalLine[] = [];
  const quantOps: { quant: DBStockQuant | null; segment: any; deltaQty: number; setValue?: number }[] = [];
  const serialOps: { materialId: string; materialCode: string; batchId?: string | null; locationId?: string | null; direction: 'in' | 'out'; serials: string[] }[] = [];
  const materialAvgUpdates = new Map<string, number>();
  const docLines: any[] = [];
  let totalAmount = money(0);
  let lineNo = 0;

  const isTransfer = mt.direction === 'transfer';

  for (const l of input.lines) {
    const mat = materialById.get(l.materialId);
    if (!mat) throw new Error('Article introuvable');
    if (!(l.quantity > 0)) throw new Error('Quantité invalide');

    // ---- L3 : résolution du lot (batch-managed) -------------------------
    let lineBatchId = l.batchId;
    if (mat.batchManaged) {
      if (!lineBatchId && l.batchNumber?.trim()) {
        const batches = await adapter.getAll<any>('stockBatches');
        let b = batches.find((x: any) => x.materialId === mat.id && x.batchNumber === l.batchNumber!.trim());
        if (!b) {
          if (mt.direction === 'out') throw new Error(`Lot « ${l.batchNumber} » inconnu pour ${mat.code}`);
          b = await adapter.create<any>('stockBatches', {
            materialId: mat.id, batchNumber: l.batchNumber.trim(),
            expiryDate: l.expiryDate ?? null, qualityStatus: 'libre',
          });
        }
        lineBatchId = b.id;
      }
      if (!lineBatchId) throw new Error(`Article ${mat.code} géré par lot : n° de lot requis`);
    }

    // ---- L3 : validation des n° de série (serial-managed, hors transfert) --
    if (mat.serialManaged && !isTransfer) {
      const serials = (l.serialNumbers ?? []).map(s => s.trim()).filter(Boolean);
      if (serials.length !== l.quantity) {
        throw new Error(`Article ${mat.code} géré par n° de série : ${l.quantity} n° attendu(s), ${serials.length} fourni(s)`);
      }
      if (new Set(serials).size !== serials.length) throw new Error(`N° de série en double pour ${mat.code}`);
      if (mt.direction === 'out') {
        // valider la disponibilité AVANT tout post (fail-fast avant l'écriture GL)
        const known = await adapter.getAll<any>('stockSerials');
        for (const sn of serials) {
          const s = known.find((x: any) => x.materialId === mat.id && x.serialNumber === sn);
          if (!s) throw new Error(`N° série ${sn} inconnu pour ${mat.code}`);
          if (s.status !== 'en_stock') throw new Error(`N° série ${sn} non disponible (statut ${s.status})`);
        }
      }
      serialOps.push({ materialId: mat.id, materialCode: mat.code, batchId: lineBatchId ?? null, locationId: l.locationId ?? null, direction: mt.direction as 'in' | 'out', serials });
    }

    // Stock courant de l'article (niveau article, tous quants)
    const matQuants = allQuants.filter(q => q.materialId === l.materialId && (q.stockStatus ?? 'libre') === 'libre');
    const totalQty = matQuants.reduce((s, q) => s + (Number(q.quantity) || 0), 0);
    const totalVal = matQuants.reduce((s, q) => s + (Number(q.value) || 0), 0);
    const avg = mat.movingAvgCost || (totalQty > 0 ? totalVal / totalQty : 0);

    const dirs: ('in' | 'out')[] = isTransfer ? ['out', 'in'] : [mt.direction as 'in' | 'out'];

    for (const direction of dirs) {
      let unitCost: number;
      if (direction === 'in') {
        unitCost = l.unitCost ?? avg; // entrée : coût fourni (réception) ou CUMP (transfert)
      } else {
        // sortie : valorisée au CUMP (ou FIFO)
        if (mat.valuationMethod === 'FIFO') {
          const layers = (await adapter.getAll<any>('stockValuationLayers'))
            .filter((v: any) => v.materialId === mat.id && Number(v.remainingQty) > 0)
            .map((v: any) => ({ quantity: Number(v.remainingQty), unitCost: Number(v.unitCost), date: v.inDate }));
          const { costOfIssue } = consumeFIFO(layers, l.quantity);
          unitCost = l.quantity > 0 ? money(costOfIssue).divide(l.quantity).toNumber() : avg;
        } else {
          unitCost = avg;
        }
        if (totalQty < l.quantity && !isTransfer) {
          throw new Error(`Stock insuffisant pour ${mat.code} (${totalQty} < ${l.quantity})`);
        }
      }
      const amount = money(l.quantity).multiply(unitCost).toNumber();

      // Quant cible (segment)
      const whId = direction === 'in' && isTransfer ? (l.toWarehouseId || l.warehouseId) : l.warehouseId;
      const locId = direction === 'in' && isTransfer ? l.toLocationId : l.locationId;
      const segment = {
        materialId: l.materialId, warehouseId: whId, locationId: locId ?? null,
        batchId: lineBatchId ?? null, serialId: l.serialId ?? null, stockStatus: 'libre',
      };
      const existing = allQuants.find(q =>
        q.materialId === segment.materialId && q.warehouseId === segment.warehouseId &&
        (q.locationId ?? null) === segment.locationId && (q.batchId ?? null) === segment.batchId &&
        (q.serialId ?? null) === segment.serialId && (q.stockStatus ?? 'libre') === 'libre');
      const deltaQty = direction === 'in' ? l.quantity : -l.quantity;
      quantOps.push({ quant: existing ?? null, segment, deltaQty });

      // CUMP article : recalcul à l'entrée valorisée
      if (direction === 'in' && !isTransfer) {
        const { cump } = calculateCUMP(totalQty, totalVal, l.quantity, unitCost);
        materialAvgUpdates.set(mat.id, cump);
      }

      // Lignes GL (si le mouvement poste au grand livre et non transfert neutre)
      if (mt.postsGl && !isTransfer) {
        const stockAcc = resolve(det, mat.valuationClass, 'BSX')?.debitAccount;
        const cp = counterpartAccount(det, mat.valuationClass, mt, direction);
        if (!stockAcc || !cp.account) {
          throw new Error(`Détermination comptable incomplète pour la classe ${mat.valuationClass} (${direction === 'in' ? 'entrée' : 'sortie'}). Configurez /stock/gl-setup.`);
        }
        if (direction === 'in') {
          glLines.push(mkLine(stockAcc, amount, 0));
          glLines.push(mkLine(cp.account, 0, amount));
        } else {
          glLines.push(mkLine(cp.account, amount, 0));
          glLines.push(mkLine(stockAcc, 0, amount));
        }
      }

      if (!isTransfer || direction === 'out') totalAmount = totalAmount.add(amount);

      docLines.push({
        lineNo: ++lineNo, materialId: l.materialId,
        warehouseId: whId, locationId: locId ?? null,
        batchId: lineBatchId ?? null, serialId: l.serialId ?? null,
        direction, quantity: l.quantity, unitCost, amount,
        toWarehouseId: isTransfer ? (l.toWarehouseId ?? null) : null,
        toLocationId: isTransfer ? (l.toLocationId ?? null) : null,
        reason: l.reason ?? null, costCenterId: l.costCenterId ?? null,
      });
    }
  }

  // ---- 2. Poste l'écriture GL (verrou de clôture appliqué ici) ----------
  const docNumber = await nextDocNumber(adapter);
  let journalEntryId: string | undefined;
  if (glLines.length > 0) {
    // Sécurité : l'entrée doit être équilibrée par construction.
    const d = Money.sum(glLines.map(l => money(l.debit)));
    const c = Money.sum(glLines.map(l => money(l.credit)));
    if (!d.equals(c)) throw new Error('Écriture de stock déséquilibrée (bug interne)');
    journalEntryId = await safeAddEntry(adapter, {
      id: crypto.randomUUID(),
      entryNumber: docNumber,
      journal: 'STK',
      date: input.date,
      reference: input.reference || docNumber,
      label: `Mouvement stock ${mt.code} — ${mt.label}`,
      status: 'validated',
      nature: mt.special === 'physinv' ? 'inventaire' : 'normal',
      lines: glLines,
      createdBy: input.userId,
    } as any, { skipSyncValidation: true });
  }

  // ---- 3. Mutations de stock (quants, couches, CUMP) --------------------
  for (const op of quantOps) {
    if (op.quant) {
      const newQty = (Number(op.quant.quantity) || 0) + op.deltaQty;
      await adapter.update<DBStockQuant>('stockQuants', op.quant.id, { quantity: newQty } as any);
      op.quant.quantity = newQty; // maj cache local
    } else if (op.deltaQty > 0) {
      const created = await adapter.create<DBStockQuant>('stockQuants', {
        ...op.segment, quantity: op.deltaQty, value: 0,
      } as any);
      allQuants.push(created);
    }
  }
  // Couches FIFO — traitées AVANT la revalorisation (elles pilotent la valeur).
  for (const l of input.lines) {
    const mat = materialById.get(l.materialId)!;
    if (mat.valuationMethod !== 'FIFO') continue;
    if (mt.direction === 'in') {
      await adapter.create('stockValuationLayers', {
        materialId: mat.id, warehouseId: l.warehouseId,
        remainingQty: l.quantity, unitCost: l.unitCost ?? mat.movingAvgCost ?? 0, inDate: input.date,
      } as any);
    } else if (mt.direction === 'out') {
      // consomme les couches les plus anciennes
      const layers = (await adapter.getAll<any>('stockValuationLayers'))
        .filter((v: any) => v.materialId === mat.id && Number(v.remainingQty) > 0)
        .sort((a: any, b: any) => (a.inDate || '').localeCompare(b.inDate || ''));
      let rem = l.quantity;
      for (const layer of layers) {
        if (rem <= 0) break;
        const take = Math.min(rem, Number(layer.remainingQty));
        await adapter.update('stockValuationLayers', layer.id, { remainingQty: Number(layer.remainingQty) - take } as any);
        rem -= take;
      }
    }
  }
  // Articles FIFO : coût moyen = moyenne pondérée des couches restantes (corrige
  // la valorisation FIFO qui restait à 0 faute de CUMP entretenu).
  const layersAll = await adapter.getAll<any>('stockValuationLayers');
  for (const matId of new Set(input.lines.map(l => l.materialId))) {
    const mat = materialById.get(matId)!;
    if (mat.valuationMethod !== 'FIFO') continue;
    const rem = layersAll.filter((v: any) => v.materialId === matId && Number(v.remainingQty) > 0);
    const totQ = rem.reduce((s: number, v: any) => s + Number(v.remainingQty), 0);
    const totV = rem.reduce((s: number, v: any) => s + money(Number(v.remainingQty)).multiply(Number(v.unitCost)).toNumber(), 0);
    materialAvgUpdates.set(matId, totQ > 0 ? money(totV).divide(totQ).toNumber() : 0);
  }
  // CUMP/FIFO article + revalorisation des quants (value = qté × coût moyen)
  for (const [matId, avg] of materialAvgUpdates) {
    await adapter.update<DBStockMaterial>('stockMaterials', matId, { movingAvgCost: avg } as any);
  }
  const touched = new Set(input.lines.map(l => l.materialId));
  const freshQuants = await adapter.getAll<DBStockQuant>('stockQuants');
  for (const matId of touched) {
    const mat = materialById.get(matId)!;
    const avg = materialAvgUpdates.get(matId) ?? mat.movingAvgCost ?? 0;
    for (const q of freshQuants.filter(q => q.materialId === matId)) {
      const val = money(Number(q.quantity) || 0).multiply(avg).toNumber();
      if (val !== Number(q.value)) await adapter.update<DBStockQuant>('stockQuants', q.id, { value: val } as any);
    }
  }

  // ---- 3bis. Numéros de série (L3) --------------------------------------
  if (serialOps.length > 0) {
    const knownSerials = await adapter.getAll<any>('stockSerials');
    for (const so of serialOps) {
      for (const sn of so.serials) {
        const existing = knownSerials.find((x: any) => x.materialId === so.materialId && x.serialNumber === sn);
        if (so.direction === 'in') {
          if (existing) {
            await adapter.update('stockSerials', existing.id, {
              status: 'en_stock', batchId: so.batchId ?? null, currentLocationId: so.locationId ?? null,
            } as any);
          } else {
            await adapter.create('stockSerials', {
              materialId: so.materialId, serialNumber: sn, batchId: so.batchId ?? null,
              status: 'en_stock', currentLocationId: so.locationId ?? null,
            } as any);
          }
        } else if (existing) {
          await adapter.update('stockSerials', existing.id, { status: 'sorti' } as any);
        }
      }
    }
  }

  // ---- 4. Document de mouvement -----------------------------------------
  const doc = await adapter.create<any>('stockDocuments', {
    docNumber, docDate: input.date, postingDate: input.date,
    movementTypeCode: mt.code, status: 'posted', reference: input.reference ?? null,
    journalEntryId: journalEntryId ?? null, createdBy: input.userId ?? null,
    postedAt: new Date().toISOString(),
  });
  for (const dl of docLines) {
    await adapter.create('stockDocumentLines', { ...dl, documentId: doc.id });
  }

  await adapter.logAudit?.({
    action: 'STOCK_MOVEMENT_POSTED', entityType: 'stockDocument', entityId: doc.id,
    details: JSON.stringify({ docNumber, movementType: mt.code, totalAmount: totalAmount.toNumber(), journalEntryId }),
    timestamp: new Date().toISOString(), previousHash: '',
  });

  return { documentId: doc.id, docNumber, journalEntryId, totalAmount: totalAmount.toNumber() };
}

function mkLine(accountCode: string, debit: number, credit: number): DBJournalLine {
  return {
    id: crypto.randomUUID(),
    accountCode,
    accountName: getAccountLabel(accountCode) || accountCode,
    debit, credit,
  } as DBJournalLine;
}
