import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { postMovement } from '../services/stock/stockMovementService';
import type { DBStockMaterial, DBStockQuant, DBStockWarehouse, DBJournalEntry } from '../lib/db';

const adapter = createTestAdapter();

async function seed() {
  const wh = await adapter.create<DBStockWarehouse>('stockWarehouses', {
    code: 'MP', name: 'Magasin principal', type: 'principal', active: true,
  } as any);
  const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
    code: 'ART-001', name: 'Article test', materialType: 'marchandise',
    baseUom: 'U', valuationMethod: 'CUMP', valuationClass: 'MARCH',
    movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: false,
    hazmat: false, active: true,
  } as any);
  await adapter.create('stockMovementTypes', { code: '101', label: 'Réception', direction: 'in', postsGl: true, special: 'goods_receipt', requiresReference: false, active: true });
  await adapter.create('stockMovementTypes', { code: '201', label: 'Sortie', direction: 'out', postsGl: true, special: 'goods_issue', requiresReference: false, active: true });
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'BSX', debitAccount: '311', creditAccount: null, analytic: false, movementContext: '' });
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'GBB', debitAccount: '6031', creditAccount: null, analytic: true, movementContext: '' });
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'WRX', debitAccount: null, creditAccount: '408', analytic: false, movementContext: '' });
  return { whId: wh.id, matId: mat.id };
}

describe('stockMovementService.postMovement', () => {
  beforeEach(async () => {
    for (const t of ['stockWarehouses', 'stockMaterials', 'stockMovementTypes', 'stockGlDetermination', 'stockQuants', 'stockDocuments', 'stockDocumentLines', 'stockValuationLayers', 'stockBatches', 'stockSerials', 'journalEntries', 'fiscalYears', 'auditLogs']) {
      await (db as any)[t].clear();
    }
  });

  it('réception (101) : met à jour le quant, le CUMP et poste une écriture équilibrée', async () => {
    const { whId, matId } = await seed();
    await postMovement(adapter, {
      movementTypeCode: '101', date: '2024-03-10',
      lines: [{ materialId: matId, warehouseId: whId, quantity: 10, unitCost: 100 }],
    });

    const quants = await adapter.getAll<DBStockQuant>('stockQuants');
    expect(quants).toHaveLength(1);
    expect(quants[0].quantity).toBe(10);
    expect(quants[0].value).toBe(1000);

    const mat = await adapter.getById<DBStockMaterial>('stockMaterials', matId);
    expect(mat?.movingAvgCost).toBe(100);

    const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(e.totalDebit).toBe(1000);
    expect(e.totalCredit).toBe(1000);
    const debit311 = e.lines.find(l => l.accountCode === '311');
    const credit408 = e.lines.find(l => l.accountCode === '408');
    expect(debit311?.debit).toBe(1000);
    expect(credit408?.credit).toBe(1000);
  });

  it('sortie (201) : décrémente le stock et poste D 6031 / C 311 au CUMP', async () => {
    const { whId, matId } = await seed();
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-10', lines: [{ materialId: matId, warehouseId: whId, quantity: 10, unitCost: 100 }] });
    await postMovement(adapter, { movementTypeCode: '201', date: '2024-03-15', lines: [{ materialId: matId, warehouseId: whId, quantity: 4 }] });

    const quants = await adapter.getAll<DBStockQuant>('stockQuants');
    expect(quants[0].quantity).toBe(6);
    expect(quants[0].value).toBe(600);

    const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
    const issue = entries.find(e => e.lines.some(l => l.accountCode === '6031'));
    expect(issue).toBeTruthy();
    expect(issue!.lines.find(l => l.accountCode === '6031')?.debit).toBe(400);
    expect(issue!.lines.find(l => l.accountCode === '311')?.credit).toBe(400);
  });

  it('CUMP pondéré sur deux réceptions à coûts différents', async () => {
    const { whId, matId } = await seed();
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-10', lines: [{ materialId: matId, warehouseId: whId, quantity: 10, unitCost: 100 }] });
    await postMovement(adapter, { movementTypeCode: '201', date: '2024-03-12', lines: [{ materialId: matId, warehouseId: whId, quantity: 4 }] });
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-20', lines: [{ materialId: matId, warehouseId: whId, quantity: 10, unitCost: 130 }] });

    const mat = await adapter.getById<DBStockMaterial>('stockMaterials', matId);
    // (6*100 + 10*130) / 16 = 118.75
    expect(mat?.movingAvgCost).toBeCloseTo(118.75, 2);
  });

  it('refuse une sortie sans stock suffisant', async () => {
    const { whId, matId } = await seed();
    await expect(
      postMovement(adapter, { movementTypeCode: '201', date: '2024-03-10', lines: [{ materialId: matId, warehouseId: whId, quantity: 5 }] }),
    ).rejects.toThrow(/insuffisant/i);
  });

  it('lot (batch) : réception crée le lot et segmente le quant', async () => {
    const { whId } = await seed();
    const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
      code: 'ART-LOT', name: 'Article lot', materialType: 'marchandise', baseUom: 'U',
      valuationMethod: 'CUMP', valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF',
      batchManaged: true, serialManaged: false, hazmat: false, active: true,
    } as any);
    await postMovement(adapter, {
      movementTypeCode: '101', date: '2024-03-10',
      lines: [{ materialId: mat.id, warehouseId: whId, quantity: 5, unitCost: 50, batchNumber: 'LOT-A', expiryDate: '2025-01-01' }],
    });
    const batches = await adapter.getAll<any>('stockBatches');
    expect(batches).toHaveLength(1);
    expect(batches[0].batchNumber).toBe('LOT-A');
    const quants = await adapter.getAll<DBStockQuant>('stockQuants');
    const q = quants.find(x => x.materialId === mat.id);
    expect(q?.batchId).toBe(batches[0].id);
    expect(q?.quantity).toBe(5);
  });

  it('lot manquant : refus si article géré par lot sans n° de lot', async () => {
    const { whId } = await seed();
    const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
      code: 'ART-LOT2', name: 'x', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
      valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: true, serialManaged: false, hazmat: false, active: true,
    } as any);
    await expect(postMovement(adapter, {
      movementTypeCode: '101', date: '2024-03-10',
      lines: [{ materialId: mat.id, warehouseId: whId, quantity: 1, unitCost: 10 }],
    })).rejects.toThrow(/lot/i);
  });

  it('n° série : réception crée les séries en_stock, sortie les marque sorti', async () => {
    const { whId } = await seed();
    const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
      code: 'ART-SN', name: 'Article série', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
      valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: true, hazmat: false, active: true,
    } as any);
    await postMovement(adapter, {
      movementTypeCode: '101', date: '2024-03-10',
      lines: [{ materialId: mat.id, warehouseId: whId, quantity: 2, unitCost: 200, serialNumbers: ['SN-1', 'SN-2'] }],
    });
    let serials = await adapter.getAll<any>('stockSerials');
    expect(serials.filter(s => s.status === 'en_stock')).toHaveLength(2);

    await postMovement(adapter, {
      movementTypeCode: '201', date: '2024-03-12',
      lines: [{ materialId: mat.id, warehouseId: whId, quantity: 1, serialNumbers: ['SN-1'] }],
    });
    serials = await adapter.getAll<any>('stockSerials');
    expect(serials.find(s => s.serialNumber === 'SN-1')?.status).toBe('sorti');
    expect(serials.find(s => s.serialNumber === 'SN-2')?.status).toBe('en_stock');
  });

  it('FIFO : couches consommées au plus ancien, valorisation article ≠ 0', async () => {
    const { whId } = await seed();
    const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
      code: 'ART-FIFO', name: 'Article FIFO', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'FIFO',
      valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: false, hazmat: false, active: true,
    } as any);
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-01', lines: [{ materialId: mat.id, warehouseId: whId, quantity: 10, unitCost: 100 }] });
    await postMovement(adapter, { movementTypeCode: '101', date: '2024-03-10', lines: [{ materialId: mat.id, warehouseId: whId, quantity: 10, unitCost: 130 }] });
    await postMovement(adapter, { movementTypeCode: '201', date: '2024-03-15', lines: [{ materialId: mat.id, warehouseId: whId, quantity: 5 }] });

    // Restant : 5@100 + 10@130 = 1800 sur 15 → coût moyen 120 (avant : bug valeur 0)
    const m = await adapter.getById<DBStockMaterial>('stockMaterials', mat.id);
    expect(m?.movingAvgCost).toBeCloseTo(120, 2);
    const quants = await adapter.getAll<DBStockQuant>('stockQuants');
    const q = quants.find(x => x.materialId === mat.id)!;
    expect(q.quantity).toBe(15);
    expect(q.value).toBeCloseTo(1800, 0);
    // La sortie FIFO est valorisée au plus ancien (5 × 100 = 500)
    const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
    const issue = entries.find(e => e.lines.some(l => l.accountCode === '6031'));
    expect(issue!.lines.find(l => l.accountCode === '6031')?.debit).toBe(500);
  });

  it('n° série : refus si le nombre de n° ne correspond pas à la quantité', async () => {
    const { whId } = await seed();
    const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
      code: 'ART-SN2', name: 'x', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
      valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: true, hazmat: false, active: true,
    } as any);
    await expect(postMovement(adapter, {
      movementTypeCode: '101', date: '2024-03-10',
      lines: [{ materialId: mat.id, warehouseId: whId, quantity: 3, unitCost: 10, serialNumbers: ['SN-1'] }],
    })).rejects.toThrow(/série/i);
  });
});
