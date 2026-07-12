import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { postMovement } from '../services/stock/stockMovementService';
import { createCountDocument, getCountLines, saveCount, validateCount } from '../services/stock/inventoryCountService';
import type { DBStockMaterial, DBStockQuant, DBStockWarehouse, DBJournalEntry } from '../lib/db';

const adapter = createTestAdapter();

async function seed() {
  const wh = await adapter.create<DBStockWarehouse>('stockWarehouses', { code: 'MP', name: 'Principal', type: 'principal', active: true } as any);
  const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
    code: 'ART-001', name: 'Art', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
    valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: false, hazmat: false, active: true,
  } as any);
  for (const [code, label, direction, special] of [
    ['101', 'Réception', 'in', 'goods_receipt'], ['701', 'Écart +', 'in', 'physinv'], ['702', 'Écart -', 'out', 'physinv'],
  ] as const) {
    await adapter.create('stockMovementTypes', { code, label, direction, postsGl: true, special, requiresReference: false, active: true });
  }
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'BSX', debitAccount: '311', creditAccount: null, analytic: false, movementContext: '' });
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'WRX', debitAccount: null, creditAccount: '408', analytic: false, movementContext: '' });
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'UMB', debitAccount: '6031', creditAccount: '758', analytic: false, movementContext: '' });
  return { whId: wh.id, matId: mat.id };
}

describe('inventoryCountService', () => {
  beforeEach(async () => {
    for (const t of ['stockWarehouses', 'stockMaterials', 'stockMovementTypes', 'stockGlDetermination', 'stockQuants', 'stockDocuments', 'stockDocumentLines', 'stockValuationLayers', 'stockCountDocuments', 'stockCountLines', 'journalEntries', 'fiscalYears', 'auditLogs']) {
      await (db as any)[t].clear();
    }
  });

  it('écart négatif : validation poste un 702 et ajuste le stock au compté', async () => {
    const { whId, matId } = await seed();
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-01', lines: [{ materialId: matId, warehouseId: whId, quantity: 10, unitCost: 100 }] });

    const doc = await createCountDocument(adapter, { warehouseId: whId, countDate: '2024-03-31', type: 'total' });
    let lines = await getCountLines(adapter, doc.id);
    expect(lines).toHaveLength(1);
    expect(lines[0].bookQty).toBe(10);

    await saveCount(adapter, lines[0], 8); // écart -2
    const res = await validateCount(adapter, doc.id);
    expect(res.adjustments).toBe(1);

    const quants = await adapter.getAll<DBStockQuant>('stockQuants');
    expect(quants.find(q => q.materialId === matId)?.quantity).toBe(8);

    const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
    const adj = entries.find(e => e.lines.some(l => l.accountCode === '6031'));
    expect(adj).toBeTruthy();
    expect(adj!.lines.find(l => l.accountCode === '6031')?.debit).toBe(200);
    expect(adj!.lines.find(l => l.accountCode === '311')?.credit).toBe(200);

    const reloaded = await adapter.getById<any>('stockCountDocuments', doc.id);
    expect(reloaded.status).toBe('valide');
    expect(reloaded.hash).toBeTruthy();
  });

  it('écart positif : validation poste un 701 (D 311 / C 758)', async () => {
    const { whId, matId } = await seed();
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-01', lines: [{ materialId: matId, warehouseId: whId, quantity: 10, unitCost: 100 }] });
    const doc = await createCountDocument(adapter, { warehouseId: whId, countDate: '2024-03-31' });
    const lines = await getCountLines(adapter, doc.id);
    await saveCount(adapter, lines[0], 13); // écart +3
    await validateCount(adapter, doc.id);

    const quants = await adapter.getAll<DBStockQuant>('stockQuants');
    expect(quants.find(q => q.materialId === matId)?.quantity).toBe(13);
    const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
    const adj = entries.find(e => e.lines.some(l => l.accountCode === '758'));
    expect(adj!.lines.find(l => l.accountCode === '311')?.debit).toBe(300);
    expect(adj!.lines.find(l => l.accountCode === '758')?.credit).toBe(300);
  });

  it('sans écart : aucune régularisation', async () => {
    const { whId, matId } = await seed();
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-01', lines: [{ materialId: matId, warehouseId: whId, quantity: 10, unitCost: 100 }] });
    const doc = await createCountDocument(adapter, { warehouseId: whId, countDate: '2024-03-31' });
    const lines = await getCountLines(adapter, doc.id);
    await saveCount(adapter, lines[0], 10);
    const res = await validateCount(adapter, doc.id);
    expect(res.adjustments).toBe(0);
  });
});
