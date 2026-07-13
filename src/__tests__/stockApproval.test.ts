import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  estimateMovementAmount, getMvaThreshold, submitOrPostMovement, applyApprovedInstance,
} from '../services/stock/stockApprovalService';
import type { DBStockMaterial, DBStockWarehouse } from '../lib/db';

const adapter = createTestAdapter();

async function seed() {
  const wh = await adapter.create<DBStockWarehouse>('stockWarehouses', { code: 'MP', name: 'Principal', type: 'principal', active: true } as any);
  const mat = await adapter.create<DBStockMaterial>('stockMaterials', {
    code: 'ART-001', name: 'Art', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
    valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: false, hazmat: false, active: true,
  } as any);
  await adapter.create('stockMovementTypes', { code: '101', label: 'Réception', direction: 'in', postsGl: true, special: 'goods_receipt', requiresReference: false, active: true });
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'BSX', debitAccount: '311', creditAccount: null, analytic: false, movementContext: '' });
  await adapter.create('stockGlDetermination', { valuationClass: 'MARCH', transactionKey: 'WRX', debitAccount: null, creditAccount: '408', analytic: false, movementContext: '' });
  return { whId: wh.id, matId: mat.id };
}

describe('stockApprovalService', () => {
  beforeEach(async () => {
    for (const t of ['stockWarehouses', 'stockMaterials', 'stockMovementTypes', 'stockGlDetermination', 'stockQuants', 'stockDocuments', 'stockDocumentLines', 'journalEntries', 'fiscalYears', 'auditLogs', 'settings']) {
      await (db as any)[t].clear();
    }
  });

  it('estime le montant d\'un mouvement (coût fourni ou CUMP article)', async () => {
    const { matId } = await seed();
    const amount = estimateMovementAmount(
      [{ id: matId, movingAvgCost: 50 } as DBStockMaterial],
      [{ materialId: matId, warehouseId: 'w', quantity: 10, unitCost: 100 }],
    );
    expect(amount).toBe(1000); // coût fourni prioritaire
    const amount2 = estimateMovementAmount(
      [{ id: matId, movingAvgCost: 50 } as DBStockMaterial],
      [{ materialId: matId, warehouseId: 'w', quantity: 10 }],
    );
    expect(amount2).toBe(500); // repli CUMP
  });

  it('seuil par défaut = 1 000 000 sans réglage explicite', async () => {
    expect(await getMvaThreshold(adapter)).toBe(1_000_000);
  });

  it('seuil réglable via settings', async () => {
    await adapter.create('settings', { key: 'stock.mva_threshold_xof', value: JSON.stringify(500000) } as any);
    expect(await getMvaThreshold(adapter)).toBe(500_000);
  });

  it('sous le seuil : post direct (comportement inchangé)', async () => {
    const { whId, matId } = await seed();
    const res = await submitOrPostMovement(adapter, {
      movementTypeCode: '101', date: '2024-03-10',
      lines: [{ materialId: matId, warehouseId: whId, quantity: 5, unitCost: 100 }],
    });
    expect(res.applied).toBe(true);
    expect(res.amount).toBe(500);
    const quants = await adapter.getAll<any>('stockQuants');
    expect(quants[0].quantity).toBe(5);
  });

  it('au-dessus du seuil sans moteur MVA (mode local/test) : refuse — fail-closed', async () => {
    const { whId, matId } = await seed();
    await expect(submitOrPostMovement(adapter, {
      movementTypeCode: '101', date: '2024-03-10',
      lines: [{ materialId: matId, warehouseId: whId, quantity: 100, unitCost: 50000 }], // 5M ≥ seuil 1M
    })).rejects.toThrow(/gouvernance MVA/i);
    // Rien n'a été posté (pas de contournement)
    const quants = await adapter.getAll<any>('stockQuants');
    expect(quants).toHaveLength(0);
  });

  it('applyApprovedInstance : idempotent (ne repost pas si déjà posté)', async () => {
    const { whId, matId } = await seed();
    const instance = {
      id: 'inst-1', object_id: 'doc-ref-1', object_hash: 'h', status: 'applied' as const,
      current_stage: 1, submitted_by: 'u1', created_at: '2024-01-01',
      object_preview: {
        movementInput: { movementTypeCode: '101', date: '2024-03-10', reference: 'doc-ref-1', lines: [{ materialId: matId, warehouseId: whId, quantity: 3, unitCost: 100 }] },
        amount_xof: 300, lineCount: 1, movementTypeCode: '101', date: '2024-03-10',
      },
    };
    const posted1 = await applyApprovedInstance(adapter, instance);
    expect(posted1).not.toBeNull();
    const posted2 = await applyApprovedInstance(adapter, instance); // 2e appel = no-op
    expect(posted2).toBeNull();
    const quants = await adapter.getAll<any>('stockQuants');
    expect(quants[0].quantity).toBe(3); // pas doublé
  });
});
