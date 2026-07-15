import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { getAbcAnalysis, getRotation } from '../services/stock/stockReportingService';
import type { DBStockMaterial } from '../lib/db';

const adapter = createTestAdapter();

async function mat(code: string): Promise<DBStockMaterial> {
  return adapter.create<DBStockMaterial>('stockMaterials', {
    code, name: code, materialType: 'marchandise', baseUom: 'U', valuationMethod: 'CUMP',
    valuationClass: 'MARCH', movingAvgCost: 0, currency: 'XOF', batchManaged: false, serialManaged: false, hazmat: false, active: true,
  } as any);
}
async function quant(materialId: string, quantity: number, value: number) {
  await adapter.create('stockQuants', { materialId, warehouseId: 'w1', stockStatus: 'libre', quantity, value });
}

describe('stockReportingService', () => {
  beforeEach(async () => {
    for (const t of ['stockMaterials', 'stockQuants', 'stockDocuments', 'stockDocumentLines']) await (db as any)[t].clear();
  });

  it('ABC : classe A les articles couvrant 80% de la valeur', async () => {
    const a = await mat('A'); await quant(a.id, 1, 8000); // 80%
    const b = await mat('B'); await quant(b.id, 1, 1500); // 15% → cumul 95
    const c = await mat('C'); await quant(c.id, 1, 500);  // 5%  → cumul 100
    const rows = await getAbcAnalysis(adapter);
    const byCode = Object.fromEntries(rows.map(r => [r.material.code, r.abcClass]));
    expect(byCode['A']).toBe('A');
    expect(byCode['B']).toBe('B');
    expect(byCode['C']).toBe('C');
    expect(rows[0].cumulativePct).toBeCloseTo(80, 1);
  });

  it('rotation : sorties valorisées / stock actuel + couverture', async () => {
    const m = await mat('ROT'); await quant(m.id, 5, 500); // stock actuel 500
    const doc = await adapter.create<any>('stockDocuments', { docNumber: 'D1', docDate: '2024-03-10', movementTypeCode: '201', status: 'posted' });
    await adapter.create('stockDocumentLines', { documentId: doc.id, materialId: m.id, warehouseId: 'w1', direction: 'out', quantity: 10, unitCost: 100, amount: 1000 });
    const rows = await getRotation(adapter);
    const r = rows.find(x => x.material.code === 'ROT')!;
    expect(r.issuedValue).toBe(1000);
    expect(r.currentValue).toBe(500);
    expect(r.turnover).toBeCloseTo(2, 2); // 1000 / 500
  });
});
