/**
 * Tests — inventoryService (P2-2)
 *
 * Couvre :
 * - CUMP (Coût Unitaire Moyen Pondéré) — calcul correct
 * - FIFO — consommation des couches par date
 * - Mouvements de stock — entrées, sorties, ajustements
 * - Variation de stocks (603) — calcul et écriture comptable
 * - KPIs temps réel
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  calculateCUMP,
  consumeFIFO,
  recordMovement,
  getMovements,
  valuateStockCUMP,
  valuateStockFIFO,
  calculateStockVariation,
  generateVariationJournalEntry,
  getInventoryKPIs,
} from '../services/inventory/inventoryService';
import type { CostLayer } from '../services/inventory/inventoryService';

const adapter = createTestAdapter();

// Helper: create a test inventory item
async function createItem(overrides: Partial<any> = {}) {
  const id = crypto.randomUUID();
  const item = {
    id,
    code: overrides.code || 'ART001',
    name: overrides.name || 'Article Test',
    category: overrides.category || 'marchandises',
    location: 'Entrepôt A',
    quantity: overrides.quantity ?? 0,
    unitCost: overrides.unitCost ?? 0,
    totalValue: overrides.totalValue ?? 0,
    minStock: overrides.minStock ?? 10,
    maxStock: overrides.maxStock ?? 1000,
    unit: 'pièce',
    lastMovementDate: '2025-01-01',
    status: overrides.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.inventoryItems.add(item);
  return item;
}

beforeEach(async () => {
  await db.inventoryItems.clear();
  await db.stockMovements.clear();
  await db.journalEntries.clear();
});

// ============================================================================
// CUMP
// ============================================================================

describe('CUMP — Coût Unitaire Moyen Pondéré', () => {
  it('calcule le CUMP sur première entrée', () => {
    const { cump, newQuantity, newValue } = calculateCUMP(0, 0, 100, 500);
    expect(newQuantity).toBe(100);
    expect(newValue).toBe(50000);
    expect(cump).toBe(500);
  });

  it('recalcule le CUMP sur entrée supplémentaire', () => {
    // Stock existant : 100 unités à 500 = 50 000
    // Nouvelle entrée : 50 unités à 600 = 30 000
    // CUMP = 80 000 / 150 = 533.33
    const { cump, newQuantity, newValue } = calculateCUMP(100, 50000, 50, 600);
    expect(newQuantity).toBe(150);
    expect(newValue).toBe(80000);
    expect(cump).toBeCloseTo(533.33, 1);
  });

  it('retourne 0 si quantité résultante <= 0', () => {
    const { cump, newQuantity, newValue } = calculateCUMP(0, 0, 0, 500);
    expect(cump).toBe(0);
    expect(newQuantity).toBe(0);
    expect(newValue).toBe(0);
  });
});

// ============================================================================
// FIFO
// ============================================================================

describe('FIFO — First In First Out', () => {
  it('consomme les couches dans l\'ordre chronologique', () => {
    const layers: CostLayer[] = [
      { date: '2025-01-10', quantity: 50, unitCost: 400 },
      { date: '2025-02-15', quantity: 80, unitCost: 450 },
      { date: '2025-03-20', quantity: 30, unitCost: 500 },
    ];

    // Sortie de 70 unités : 50 × 400 + 20 × 450 = 29 000
    const { costOfIssue, remainingLayers } = consumeFIFO(layers, 70);
    expect(costOfIssue).toBe(29000);
    expect(remainingLayers).toHaveLength(2);
    expect(remainingLayers[0].quantity).toBe(60); // 80 - 20
    expect(remainingLayers[0].unitCost).toBe(450);
    expect(remainingLayers[1].quantity).toBe(30);
  });

  it('consomme tout le stock si sortie >= quantité totale', () => {
    const layers: CostLayer[] = [
      { date: '2025-01-10', quantity: 30, unitCost: 100 },
      { date: '2025-02-15', quantity: 20, unitCost: 200 },
    ];

    const { costOfIssue, remainingLayers } = consumeFIFO(layers, 50);
    expect(costOfIssue).toBe(7000); // 30*100 + 20*200
    expect(remainingLayers).toHaveLength(0);
  });
});

// ============================================================================
// MOUVEMENTS
// ============================================================================

describe('Mouvements de stock', () => {
  it('enregistre une entrée et met à jour le CUMP', async () => {
    const item = await createItem({ quantity: 100, unitCost: 500, totalValue: 50000 });

    const mvt = await recordMovement(adapter, {
      itemId: item.id,
      date: '2025-03-01',
      type: 'receipt',
      quantity: 50,
      unitCost: 600,
      reference: 'BL-001',
      label: 'Entrée marchandises',
    });

    expect(mvt.quantity).toBe(50);
    expect(mvt.quantityAfter).toBe(150);
    // CUMP = (50000 + 30000) / 150 = 533.33
    expect(mvt.cumpAfter).toBeCloseTo(533.33, 1);
    expect(mvt.valueAfter).toBe(80000);

    // Vérifier que l'article est mis à jour
    const updated = await adapter.getById<any>('inventoryItems', item.id);
    expect(updated.quantity).toBe(150);
    expect(updated.unitCost).toBeCloseTo(533.33, 1);
  });

  it('enregistre une sortie au CUMP courant', async () => {
    const item = await createItem({ quantity: 100, unitCost: 500, totalValue: 50000 });

    const mvt = await recordMovement(adapter, {
      itemId: item.id,
      date: '2025-03-01',
      type: 'issue',
      quantity: 30,
      unitCost: 0, // ignoré pour les sorties
      reference: 'BS-001',
      label: 'Sortie marchandises',
    });

    expect(mvt.quantity).toBe(-30);
    expect(mvt.quantityAfter).toBe(70);
    expect(mvt.cumpAfter).toBe(500); // CUMP inchangé
    expect(mvt.valueAfter).toBe(35000); // 70 * 500
  });

  it('récupère les mouvements par article et date', async () => {
    const item = await createItem({ quantity: 0, unitCost: 0, totalValue: 0 });

    await recordMovement(adapter, {
      itemId: item.id, date: '2025-01-15', type: 'receipt',
      quantity: 100, unitCost: 500, reference: 'BL-001', label: 'Entrée 1',
    });
    await recordMovement(adapter, {
      itemId: item.id, date: '2025-02-10', type: 'issue',
      quantity: 30, unitCost: 0, reference: 'BS-001', label: 'Sortie 1',
    });
    await recordMovement(adapter, {
      itemId: item.id, date: '2025-03-05', type: 'receipt',
      quantity: 50, unitCost: 600, reference: 'BL-002', label: 'Entrée 2',
    });

    // Tous les mouvements
    const all = await getMovements(adapter, item.id);
    expect(all).toHaveLength(3);

    // Filtré par date
    const filtered = await getMovements(adapter, item.id, {
      from: '2025-02-01', to: '2025-02-28',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('issue');
  });
});

// ============================================================================
// VALORISATION
// ============================================================================

describe('Valorisation du stock', () => {
  it('valorise en CUMP depuis les articles', async () => {
    await createItem({ code: 'ART001', quantity: 100, unitCost: 500, totalValue: 50000 });
    await createItem({ code: 'ART002', quantity: 50, unitCost: 800, totalValue: 40000 });

    const valuation = await valuateStockCUMP(adapter);
    expect(valuation).toHaveLength(2);
    expect(valuation[0].method).toBe('CUMP');

    const total = valuation.reduce((s, v) => s + v.totalValue, 0);
    expect(total).toBe(90000);
  });

  it('valorise en FIFO depuis les mouvements', async () => {
    const item = await createItem({ code: 'ART-FIFO', quantity: 0, unitCost: 0, totalValue: 0 });

    // Entrée 1 : 100 @ 400
    await recordMovement(adapter, {
      itemId: item.id, date: '2025-01-10', type: 'receipt',
      quantity: 100, unitCost: 400, reference: 'BL-01', label: 'Lot 1',
    });
    // Entrée 2 : 80 @ 450
    await recordMovement(adapter, {
      itemId: item.id, date: '2025-02-15', type: 'receipt',
      quantity: 80, unitCost: 450, reference: 'BL-02', label: 'Lot 2',
    });
    // Sortie : 60
    await recordMovement(adapter, {
      itemId: item.id, date: '2025-03-01', type: 'issue',
      quantity: 60, unitCost: 0, reference: 'BS-01', label: 'Sortie',
    });

    const valuation = await valuateStockFIFO(adapter);
    expect(valuation).toHaveLength(1);
    expect(valuation[0].method).toBe('FIFO');
    // Remaining: 40 @ 400 + 80 @ 450 = 16000 + 36000 = 52000
    expect(valuation[0].quantity).toBe(120);
    expect(valuation[0].totalValue).toBe(52000);
  });
});

// ============================================================================
// VARIATION DE STOCKS (603)
// ============================================================================

describe('Variation de stocks (603)', () => {
  it('calcule la variation correctement (stock diminue = charge)', async () => {
    const item = await createItem({ category: 'marchandises', quantity: 0, unitCost: 0, totalValue: 0 });

    // Stock initial : entrée en décembre N-1
    await recordMovement(adapter, {
      itemId: item.id, date: '2024-12-15', type: 'receipt',
      quantity: 200, unitCost: 500, reference: 'BL-DEC', label: 'Stock initial',
    });

    // Sorties en janvier N
    await recordMovement(adapter, {
      itemId: item.id, date: '2025-01-10', type: 'issue',
      quantity: 80, unitCost: 0, reference: 'BS-01', label: 'Vente',
    });

    const variations = await calculateStockVariation(adapter, '2025-01-01', '2025-01-31');
    expect(variations).toHaveLength(1);
    expect(variations[0].accountCode).toBe('6031');
    // SI = 100000 (200 * 500), SF = 60000 (120 * 500)
    // Variation = SI - SF = 40000 (positif = stock diminue = charge)
    expect(variations[0].stockInitial).toBe(100000);
    expect(variations[0].stockFinal).toBe(60000);
    expect(variations[0].variation).toBe(40000);
  });

  it('génère l\'écriture comptable de variation', async () => {
    const item = await createItem({ category: 'marchandises', quantity: 0, unitCost: 0, totalValue: 0 });

    await recordMovement(adapter, {
      itemId: item.id, date: '2024-12-15', type: 'receipt',
      quantity: 100, unitCost: 1000, reference: 'BL-DEC', label: 'Stock initial',
    });
    await recordMovement(adapter, {
      itemId: item.id, date: '2025-01-20', type: 'issue',
      quantity: 40, unitCost: 0, reference: 'BS-01', label: 'Vente',
    });

    const entry = await generateVariationJournalEntry(adapter, '2025-01-01', '2025-01-31');
    expect(entry).not.toBeNull();
    expect(entry!.journal).toBe('OD');
    expect(entry!.nature).toBe('inventaire');

    // Stock diminue : Débit 6031, Crédit 31
    const debit603 = entry!.lines.find(l => l.accountCode === '6031' && l.debit > 0);
    const credit31 = entry!.lines.find(l => l.accountCode === '31' && l.credit > 0);
    expect(debit603).toBeDefined();
    expect(credit31).toBeDefined();
    // Variation = 100000 - 60000 = 40000
    expect(debit603!.debit).toBe(40000);
    expect(credit31!.credit).toBe(40000);
    // Équilibre D = C
    expect(entry!.totalDebit).toBe(entry!.totalCredit);
  });

  it('retourne null si aucune variation', async () => {
    const entry = await generateVariationJournalEntry(adapter, '2025-01-01', '2025-01-31');
    expect(entry).toBeNull();
  });
});

// ============================================================================
// KPIs
// ============================================================================

describe('KPIs inventaire', () => {
  it('calcule les KPIs depuis les données réelles', async () => {
    await createItem({ code: 'A1', quantity: 100, unitCost: 500, totalValue: 50000, minStock: 10, maxStock: 200 });
    await createItem({ code: 'A2', quantity: 5, unitCost: 300, totalValue: 1500, minStock: 10, maxStock: 100 });
    await createItem({ code: 'A3', quantity: 0, unitCost: 0, totalValue: 0, minStock: 5, maxStock: 50 });

    const kpis = await getInventoryKPIs(adapter);
    expect(kpis.totalItems).toBe(3);
    expect(kpis.totalValue).toBe(51500);
    expect(kpis.lowStockItems).toBe(1); // A2 : qty=5 <= minStock=10
    expect(kpis.outOfStockItems).toBe(1); // A3 : qty=0
    expect(kpis.overStockItems).toBe(0);
  });
});
