import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';
import {
  getBalanceSheetComparative,
  getIncomeStatementComparative,
  getProvisionNote,
} from '../services/financialStatementsExtendedService';

const adapter = createTestAdapter();

describe('financialStatementsExtendedService', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.assets.clear();
  });

  describe('getBalanceSheetComparative', () => {
    it('should return empty lines when no data', async () => {
      const lines = await getBalanceSheetComparative(
        adapter, 'comp1',
        { start: '2025-01-01', end: '2025-12-31' }
      );
      expect(lines).toEqual([]);
    });

    it('should accept previous fiscal year parameter', async () => {
      const lines = await getBalanceSheetComparative(
        adapter, 'comp1',
        { start: '2025-01-01', end: '2025-12-31' },
        { start: '2024-01-01', end: '2024-12-31' }
      );
      expect(Array.isArray(lines)).toBe(true);
    });
  });

  describe('getIncomeStatementComparative', () => {
    it('should return empty when no data', async () => {
      const lines = await getIncomeStatementComparative(
        adapter, 'comp1',
        { start: '2025-01-01', end: '2025-12-31' }
      );
      expect(lines).toEqual([]);
    });
  });

  describe('getProvisionNote', () => {
    it('should return empty when no provision entries', async () => {
      const notes = await getProvisionNote(
        adapter, 'comp1',
        { start: '2025-01-01', end: '2025-12-31' }
      );
      expect(notes).toEqual([]);
    });

    it('should detect dotations from journal entries', async () => {
      // Seed a provision dotation entry
      await adapter.saveJournalEntry({
        entryNumber: 'OD-100',
        journal: 'OD',
        date: '2025-06-30',
        reference: 'PROV-001',
        label: 'Provision créances douteuses',
        status: 'validated',
        lines: [
          { id: crypto.randomUUID(), accountCode: '6594', accountName: 'Dotation provisions créances', label: 'Provision', debit: 2000000, credit: 0 },
          { id: crypto.randomUUID(), accountCode: '491', accountName: 'Provisions créances', label: 'Provision', debit: 0, credit: 2000000 },
        ],
        totalDebit: 2000000,
        totalCredit: 2000000,
        updatedAt: new Date().toISOString(),
      });

      const notes = await getProvisionNote(
        adapter, 'comp1',
        { start: '2025-01-01', end: '2025-12-31' }
      );

      const creancesNote = notes.find(n => n.accountPrefix === '491');
      expect(creancesNote).toBeTruthy();
      expect(creancesNote!.dotations.toNumber()).toBe(2000000);
    });
  });
});
