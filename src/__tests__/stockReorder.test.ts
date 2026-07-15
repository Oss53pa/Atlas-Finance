import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { getReorderProposals, getStockAlerts } from '../services/stock/reorderService';
import type { DBStockMaterial } from '../lib/db';

const adapter = createTestAdapter();

async function material(patch: Partial<DBStockMaterial>): Promise<DBStockMaterial> {
  return adapter.create<DBStockMaterial>('stockMaterials', {
    code: 'X', name: 'x', materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
    valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: false,
    hazmat: false, active: true, ...patch,
  } as any);
}
async function quant(materialId: string, quantity: number) {
  await adapter.create('stockQuants', { materialId, warehouseId: 'w1', stockStatus: 'libre', quantity, value: 0 });
}

describe('reorderService', () => {
  beforeEach(async () => {
    for (const t of ['stockMaterials', 'stockQuants', 'stockReservations', 'stockDocuments', 'stockDocumentLines', 'stockBatches']) {
      await (db as any)[t].clear();
    }
  });

  it('propose un réappro quand le disponible ≤ point de commande', async () => {
    const m = await material({ code: 'ART-A', reorderPoint: 10, maxLevel: 50, minOrderQty: 5 });
    await quant(m.id, 3);
    const props = await getReorderProposals(adapter);
    expect(props).toHaveLength(1);
    expect(props[0].available).toBe(3);
    expect(props[0].suggestedQty).toBe(47); // 50 - 3
  });

  it('applique la quantité minimale de commande', async () => {
    const m = await material({ code: 'ART-B', reorderPoint: 10, maxLevel: 11, minOrderQty: 20 });
    await quant(m.id, 9);
    const props = await getReorderProposals(adapter);
    expect(props[0].suggestedQty).toBe(20); // max(11-9=2, 20)
  });

  it('les réservations réduisent le disponible', async () => {
    const m = await material({ code: 'ART-C', reorderPoint: 5, maxLevel: 20 });
    await quant(m.id, 8);
    await adapter.create('stockReservations', { materialId: m.id, warehouseId: 'w1', quantity: 5, status: 'active', reservedFor: 'manuel' });
    const props = await getReorderProposals(adapter);
    expect(props).toHaveLength(1); // dispo 8-5=3 ≤ 5
    expect(props[0].available).toBe(3);
  });

  it('sans point de commande : aucune proposition', async () => {
    const m = await material({ code: 'ART-D' });
    await quant(m.id, 0);
    expect(await getReorderProposals(adapter)).toHaveLength(0);
  });

  it('alertes : rupture, surstock, dormant', async () => {
    const rupture = await material({ code: 'RUP', reorderPoint: 5 });
    await quant(rupture.id, 0);
    const sur = await material({ code: 'SUR', maxLevel: 10 });
    await quant(sur.id, 25);
    const dorm = await material({ code: 'DOR' });
    await quant(dorm.id, 4); // stock présent, aucun mouvement -> dormant

    const alerts = await getStockAlerts(adapter, '2024-06-01', 90);
    expect(alerts.stockouts.map(m => m.code)).toContain('RUP');
    expect(alerts.overstock.map(o => o.material.code)).toContain('SUR');
    expect(alerts.dormant.map(d => d.material.code)).toContain('DOR');
  });
});
