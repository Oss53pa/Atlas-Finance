import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';
import {
  writeOffBadDebt,
  calculateClientRiskScore,
  type BadDebtInvoice,
} from '../services/recouvrementExtendedService';

const adapter = createTestAdapter();

describe('recouvrementExtendedService', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
  });

  describe('writeOffBadDebt', () => {
    it('should write off debt with VAT regularization', async () => {
      const invoices: BadDebtInvoice[] = [
        {
          id: 'inv-001',
          amountHt: new Decimal(1000000),
          vatAmount: new Decimal(180000),
          amountTtc: new Decimal(1180000),
        },
      ];

      const entryId = await writeOffBadDebt(adapter, 'comp1', 'client-1', 'Client Douteux', invoices);
      expect(entryId).toBeTruthy();

      const entries = await db.journalEntries.toArray();
      expect(entries.length).toBe(1);
      const lines = entries[0].lines;

      // D:651 HT, D:4431 TVA, C:416 TTC
      const d651 = lines.find((l: any) => l.accountCode === '651');
      const d4431 = lines.find((l: any) => l.accountCode === '4431');
      const c416 = lines.find((l: any) => l.accountCode === '416');

      expect(d651!.debit).toBe(1000000);
      expect(d4431!.debit).toBe(180000);
      expect(c416!.credit).toBe(1180000);
    });

    it('should include provision reversal when provision exists', async () => {
      const invoices: BadDebtInvoice[] = [
        {
          id: 'inv-002',
          amountHt: new Decimal(2000000),
          vatAmount: new Decimal(360000),
          amountTtc: new Decimal(2360000),
          provisionAmount: new Decimal(1000000),
        },
      ];

      const entryId = await writeOffBadDebt(adapter, 'comp1', 'client-2', 'Client Insolvable', invoices);
      const entries = await db.journalEntries.toArray();
      const lines = entries[0].lines;

      // Should have provision reversal lines
      const d491 = lines.find((l: any) => l.accountCode === '491');
      const c7594 = lines.find((l: any) => l.accountCode === '7594');
      expect(d491!.debit).toBe(1000000);
      expect(c7594!.credit).toBe(1000000);
    });

    it('should handle multiple invoices', async () => {
      const invoices: BadDebtInvoice[] = [
        { id: 'a', amountHt: new Decimal(500000), vatAmount: new Decimal(90000), amountTtc: new Decimal(590000) },
        { id: 'b', amountHt: new Decimal(300000), vatAmount: new Decimal(54000), amountTtc: new Decimal(354000) },
      ];

      await writeOffBadDebt(adapter, 'comp1', 'client-3', 'Multi', invoices);
      const entries = await db.journalEntries.toArray();
      const d651 = entries[0].lines.find((l: any) => l.accountCode === '651');
      expect(d651!.debit).toBe(800000); // 500K + 300K
    });
  });

  describe('calculateClientRiskScore', () => {
    it('should return low risk for client with no outstanding', async () => {
      const score = await calculateClientRiskScore(adapter, 'comp1', 'good-client');
      expect(score.level).toBe('low');
      expect(score.score).toBeLessThanOrEqual(25);
    });

    it('should detect high outstanding ratio', async () => {
      // Seed invoices for a client (D:411 = invoiced, C:411 = paid)
      await adapter.saveJournalEntry({
        entryNumber: 'VE-001',
        journal: 'VE',
        date: '2025-01-15',
        reference: 'FAC-001',
        label: 'Facture client risqué',
        status: 'validated',
        lines: [
          { id: crypto.randomUUID(), accountCode: '411', accountName: 'Client', thirdPartyCode: 'risky-1', label: 'Facture', debit: 15000000, credit: 0 },
          { id: crypto.randomUUID(), accountCode: '701', accountName: 'Ventes', label: 'Facture', debit: 0, credit: 15000000 },
        ],
        totalDebit: 15000000,
        totalCredit: 15000000,
        updatedAt: new Date().toISOString(),
      });

      const score = await calculateClientRiskScore(adapter, 'comp1', 'risky-1');
      expect(score.score).toBeGreaterThan(25);
      expect(score.factors.length).toBeGreaterThan(0);
    });
  });
});
