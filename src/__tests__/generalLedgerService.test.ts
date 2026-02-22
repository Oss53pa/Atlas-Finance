/**
 * Tests for general ledger service connected to Dexie.
 * Verifies: real data queries, account aggregation, search, annotations.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { generalLedgerService } from '../features/accounting/services/generalLedgerService';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

describe('GeneralLedgerService (Dexie)', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.settings.clear();

    await db.journalEntries.bulkAdd([
      {
        id: 'E1',
        entryNumber: 'VT-001',
        journal: 'VT',
        date: '2025-03-15',
        reference: 'FAC-001',
        label: 'Vente produit',
        status: 'validated',
        lines: [
          { id: 'L1', accountCode: '411000', accountName: 'Clients', label: 'Client A', debit: 118000, credit: 0 },
          { id: 'L2', accountCode: '701000', accountName: 'Ventes produits', label: 'Vente', debit: 0, credit: 100000 },
          { id: 'L3', accountCode: '443100', accountName: 'TVA collectee', label: 'TVA', debit: 0, credit: 18000 },
        ],
        totalDebit: 118000,
        totalCredit: 118000,
        createdAt: '2025-03-15T10:00:00Z',
        updatedAt: '2025-03-15T10:00:00Z',
      },
      {
        id: 'E2',
        entryNumber: 'AC-001',
        journal: 'AC',
        date: '2025-04-01',
        reference: 'FFR-001',
        label: 'Achat fournitures',
        status: 'validated',
        lines: [
          { id: 'L4', accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 50000, credit: 0 },
          { id: 'L5', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur B', debit: 0, credit: 50000 },
        ],
        totalDebit: 50000,
        totalCredit: 50000,
        createdAt: '2025-04-01T10:00:00Z',
        updatedAt: '2025-04-01T10:00:00Z',
      },
    ]);
  });

  describe('getLedgerAccounts', () => {
    it('should return accounts from real entries', async () => {
      const accounts = await generalLedgerService.getLedgerAccounts(adapter, {
        dateDebut: '2025-01-01',
        dateFin: '2025-12-31',
      });
      expect(accounts.length).toBeGreaterThan(0);
      const codes = accounts.map(a => a.compte);
      expect(codes).toContain('411000');
      expect(codes).toContain('701000');
      expect(codes).toContain('601000');
    });

    it('should filter by date range', async () => {
      const accounts = await generalLedgerService.getLedgerAccounts(adapter, {
        dateDebut: '2025-03-01',
        dateFin: '2025-03-31',
      });
      const codes = accounts.map(a => a.compte);
      expect(codes).toContain('411000');
      expect(codes).not.toContain('601000'); // April entry excluded
    });

    it('should filter by journal', async () => {
      const accounts = await generalLedgerService.getLedgerAccounts(adapter, {
        dateDebut: '2025-01-01',
        dateFin: '2025-12-31',
        journal: 'VT',
      });
      const codes = accounts.map(a => a.compte);
      expect(codes).toContain('411000');
      expect(codes).not.toContain('601000'); // AC journal excluded
    });

    it('should compute running balance in entries', async () => {
      const accounts = await generalLedgerService.getLedgerAccounts(adapter, {
        dateDebut: '2025-01-01',
        dateFin: '2025-12-31',
      });
      const clients = accounts.find(a => a.compte === '411000');
      expect(clients).toBeDefined();
      expect(clients!.totalDebit).toBe(118000);
      expect(clients!.totalCredit).toBe(0);
      expect(clients!.soldeFermeture).toBe(118000);
    });
  });

  describe('getAccountLedger', () => {
    it('should return single account data', async () => {
      const account = await generalLedgerService.getAccountLedger(adapter, '411000', {
        dateDebut: '2025-01-01',
        dateFin: '2025-12-31',
      });
      expect(account.compte).toBe('411000');
      expect(account.nombreEcritures).toBe(1);
      expect(account.totalDebit).toBe(118000);
    });
  });

  describe('getStats', () => {
    it('should aggregate statistics', async () => {
      const stats = await generalLedgerService.getStats(adapter, {
        dateDebut: '2025-01-01',
        dateFin: '2025-12-31',
      });
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalAccounts).toBe(5); // 411000, 701000, 443100, 601000, 401000
      expect(stats.totalDebit).toBe(168000); // 118000 + 50000
      expect(stats.totalCredit).toBe(168000);
    });
  });

  describe('search', () => {
    it('should find entries by account code', async () => {
      const result = await generalLedgerService.search(adapter, '411');
      expect(result.totalResults).toBeGreaterThan(0);
    });

    it('should find entries by label', async () => {
      const result = await generalLedgerService.search(adapter, 'fournitures');
      expect(result.totalResults).toBeGreaterThan(0);
    });

    it('should return zero for unknown query', async () => {
      const result = await generalLedgerService.search(adapter, 'xyznotfound');
      expect(result.totalResults).toBe(0);
    });
  });

  describe('annotations', () => {
    it('should add and retrieve annotations', async () => {
      const annotation = await generalLedgerService.addAnnotation(adapter, 'E1', 'Test note');
      expect(annotation.content).toBe('Test note');

      const annotations = await generalLedgerService.getAnnotations(adapter, 'E1');
      expect(annotations.length).toBe(1);
      expect(annotations[0].content).toBe('Test note');
    });
  });

  describe('exportLedger', () => {
    it('should export CSV blob with content', async () => {
      const blob = await generalLedgerService.exportLedger(adapter, {
        format: 'csv',
        filters: { dateDebut: '2025-01-01', dateFin: '2025-12-31' },
      });
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toContain('csv');
    });
  });
});
