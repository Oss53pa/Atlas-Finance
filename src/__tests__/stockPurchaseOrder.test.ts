import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { getReorderProposals } from '../services/stock/reorderService';
import { generatePurchaseOrders } from '../services/stock/purchaseOrderService';
import type { DBStockMaterial } from '../lib/db';

const adapter = createTestAdapter();
const SUP = '11111111-1111-1111-1111-111111111111';

async function material(patch: Partial<DBStockMaterial>): Promise<DBStockMaterial> {
  return adapter.create<DBStockMaterial>('stockMaterials', {
    code: 'X', name: 'x', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
    valuationClass: 'MARCH', movingAvgCost: 100, currency: 'XOF', batchManaged: false, serialManaged: false,
    hazmat: false, active: true, ...patch,
  } as any);
}

describe('purchaseOrderService', () => {
  beforeEach(async () => {
    for (const t of ['stockMaterials', 'stockQuants', 'stockReservations', 'stockDocuments', 'stockDocumentLines', 'stockBatches', 'purchaseOrders', 'auditLogs']) {
      await (db as any)[t].clear();
    }
  });

  it('génère une commande fournisseur (brouillon) à partir des propositions', async () => {
    const m = await material({ code: 'ART-A', reorderPoint: 10, maxLevel: 50, minOrderQty: 5, movingAvgCost: 100, defaultSupplierId: SUP });
    await adapter.create('stockQuants', { materialId: m.id, warehouseId: 'w1', stockStatus: 'libre', quantity: 3, value: 300 });
    const props = await getReorderProposals(adapter);
    expect(props).toHaveLength(1);

    const res = await generatePurchaseOrders(adapter, props, '2024-06-01');
    expect(res.orders).toHaveLength(1);
    expect(res.skippedNoSupplier).toBe(0);

    const pos = await adapter.getAll<any>('purchaseOrders');
    expect(pos).toHaveLength(1);
    expect(pos[0].supplierId).toBe(SUP);
    expect(pos[0].status).toBe('draft');
    expect(pos[0].lines).toHaveLength(1);
    // qté suggérée 47 × coût 100
    expect(pos[0].lines[0].quantity).toBe(47);
    expect(pos[0].totalHt).toBe(4700);
    expect(pos[0].lines[0].account).toBe('601');
  });

  it('regroupe les articles par fournisseur', async () => {
    const m1 = await material({ code: 'A1', reorderPoint: 10, maxLevel: 20, defaultSupplierId: SUP });
    const m2 = await material({ code: 'A2', reorderPoint: 10, maxLevel: 20, defaultSupplierId: SUP });
    await adapter.create('stockQuants', { materialId: m1.id, warehouseId: 'w1', stockStatus: 'libre', quantity: 1, value: 100 });
    await adapter.create('stockQuants', { materialId: m2.id, warehouseId: 'w1', stockStatus: 'libre', quantity: 1, value: 100 });
    const props = await getReorderProposals(adapter);
    const res = await generatePurchaseOrders(adapter, props, '2024-06-01');
    expect(res.orders).toHaveLength(1); // un seul fournisseur → une commande à 2 lignes
    const pos = await adapter.getAll<any>('purchaseOrders');
    expect(pos[0].lines).toHaveLength(2);
  });

  it('ignore les articles sans fournisseur par défaut', async () => {
    const m = await material({ code: 'NOSUP', reorderPoint: 10, maxLevel: 20 });
    await adapter.create('stockQuants', { materialId: m.id, warehouseId: 'w1', stockStatus: 'libre', quantity: 1, value: 100 });
    const props = await getReorderProposals(adapter);
    const res = await generatePurchaseOrders(adapter, props, '2024-06-01');
    expect(res.orders).toHaveLength(0);
    expect(res.skippedNoSupplier).toBe(1);
  });
});
