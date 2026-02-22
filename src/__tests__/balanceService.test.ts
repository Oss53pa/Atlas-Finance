/**
 * Tests for balance service connected to Dexie.
 * Verifies: real data queries, hierarchy, totals, SYSCOHADA classes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { balanceService } from '../features/balance/services/balanceService';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

describe('BalanceService (Dexie)', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.accounts.clear();

    // Seed entries
    await db.journalEntries.bulkAdd([
      {
        id: 'E1',
        entryNumber: 'VT-001',
        journal: 'VT',
        date: '2025-06-15',
        reference: 'FAC-001',
        label: 'Vente',
        status: 'validated',
        lines: [
          { id: 'L1', accountCode: '411000', accountName: 'Clients', label: 'Client', debit: 236000, credit: 0 },
          { id: 'L2', accountCode: '701000', accountName: 'Ventes produits', label: 'Vente', debit: 0, credit: 200000 },
          { id: 'L3', accountCode: '443100', accountName: 'TVA collectee', label: 'TVA', debit: 0, credit: 36000 },
        ],
        totalDebit: 236000,
        totalCredit: 236000,
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
      {
        id: 'E2',
        entryNumber: 'AC-001',
        journal: 'AC',
        date: '2025-06-20',
        reference: 'FFR-001',
        label: 'Achat',
        status: 'validated',
        lines: [
          { id: 'L4', accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 80000, credit: 0 },
          { id: 'L5', accountCode: '445200', accountName: 'TVA recuperable', label: 'TVA', debit: 14400, credit: 0 },
          { id: 'L6', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur', debit: 0, credit: 94400 },
        ],
        totalDebit: 94400,
        totalCredit: 94400,
        createdAt: '2025-06-20T10:00:00Z',
        updatedAt: '2025-06-20T10:00:00Z',
      },
    ]);
  });

  const defaultFilters = {
    period: { from: '2025-01-01', to: '2025-12-31' },
    searchAccount: '',
    showZeroBalance: false,
    balanceType: 'generale' as const,
    displayLevel: 2 as const,
  };

  describe('getBalance', () => {
    it('should return SYSCOHADA class hierarchy', async () => {
      const balance = await balanceService.getBalance(adapter, defaultFilters);
      expect(balance.length).toBeGreaterThan(0);
      const classCodes = balance.map(b => b.code);
      expect(classCodes).toContain('4'); // Tiers
      expect(classCodes).toContain('7'); // Produits
      expect(classCodes).toContain('6'); // Charges
    });

    it('should aggregate movements by class', async () => {
      const balance = await balanceService.getBalance(adapter, defaultFilters);
      const class4 = balance.find(b => b.code === '4');
      expect(class4).toBeDefined();
      // Class 4: 411000 (D:236000), 443100 (C:36000), 445200 (D:14400), 401000 (C:94400)
      expect(class4!.mouvementsDebit).toBe(236000 + 14400);
      expect(class4!.mouvementsCredit).toBe(36000 + 94400);
    });

    it('should have children at displayLevel 2', async () => {
      const balance = await balanceService.getBalance(adapter, defaultFilters);
      const class4 = balance.find(b => b.code === '4');
      expect(class4!.children).toBeDefined();
      expect(class4!.children!.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const filtered = await balanceService.getBalance(adapter, {
        ...defaultFilters,
        period: { from: '2025-06-16', to: '2025-12-31' },
      });
      // Only E2 matches (June 20)
      const class7 = filtered.find(b => b.code === '7');
      expect(class7).toBeUndefined(); // Class 7 excluded since E1 (June 15) is out
    });

    it('should filter by search term', async () => {
      const filtered = await balanceService.getBalance(adapter, {
        ...defaultFilters,
        searchAccount: '411',
      });
      expect(filtered.length).toBe(1); // Only class 4
      const class4 = filtered[0];
      expect(class4.children!.length).toBe(1);
      expect(class4.children![0].code).toBe('411000');
    });
  });

  describe('calculateTotals', () => {
    it('should sum leaf account totals', async () => {
      const balance = await balanceService.getBalance(adapter, defaultFilters);
      const totals = balanceService.calculateTotals(balance);
      // All debits: 236000 + 80000 + 14400 = 330400
      // All credits: 200000 + 36000 + 94400 = 330400
      expect(totals.mouvementsDebit).toBe(330400);
      expect(totals.mouvementsCredit).toBe(330400);
    });
  });

  describe('exportBalance', () => {
    it('should export as CSV blob', async () => {
      const blob = await balanceService.exportBalance(adapter, 'xlsx', defaultFilters);
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toContain('csv');
    });
  });
});
