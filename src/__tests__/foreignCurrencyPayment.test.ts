import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';
import {
  recordForeignCurrencyPayment,
  extourneEcartsConversion,
} from '../services/foreignCurrencyPaymentService';

const adapter = createTestAdapter();

describe('foreignCurrencyPaymentService', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
  });

  describe('recordForeignCurrencyPayment', () => {
    it('should record supplier payment with exchange loss (spot > historical)', async () => {
      const result = await recordForeignCurrencyPayment(adapter, {
        invoiceId: 'inv-001',
        paymentAmountForeign: new Decimal(10000), // 10 000 EUR
        paymentCurrency: 'EUR',
        spotRate: new Decimal(660),    // EUR/XOF at payment
        historicalRate: new Decimal(650), // EUR/XOF at invoice
        paymentDate: '2025-06-15',
        bankAccountCode: '521',
        thirdPartyCode: '4011001',
        thirdPartyName: 'Fournisseur UE',
        isSupplier: true,
      });

      expect(result.isGain).toBe(false); // loss
      expect(result.exchangeGainLoss.toNumber()).toBe(100000); // (660-650)*10000

      const entries = await db.journalEntries.toArray();
      expect(entries.length).toBe(1);
      const lines = entries[0].lines;
      // D:401 6500000, D:676 100000, C:521 6600000
      const d401 = lines.find((l: any) => l.accountCode === '4011001');
      const d676 = lines.find((l: any) => l.accountCode === '676');
      const c521 = lines.find((l: any) => l.accountCode === '521');
      expect(d401.debit).toBe(6500000);
      expect(d676.debit).toBe(100000);
      expect(c521.credit).toBe(6600000);
    });

    it('should record supplier payment with exchange gain (spot < historical)', async () => {
      const result = await recordForeignCurrencyPayment(adapter, {
        invoiceId: 'inv-002',
        paymentAmountForeign: new Decimal(5000),
        paymentCurrency: 'USD',
        spotRate: new Decimal(580),
        historicalRate: new Decimal(600),
        paymentDate: '2025-07-01',
        bankAccountCode: '521',
        thirdPartyCode: '401',
        thirdPartyName: 'Supplier US',
        isSupplier: true,
      });

      expect(result.isGain).toBe(true);
      expect(result.exchangeGainLoss.toNumber()).toBe(100000); // (600-580)*5000
    });

    it('should record customer receipt with exchange gain (spot > historical)', async () => {
      const result = await recordForeignCurrencyPayment(adapter, {
        invoiceId: 'inv-003',
        paymentAmountForeign: new Decimal(8000),
        paymentCurrency: 'EUR',
        spotRate: new Decimal(670),
        historicalRate: new Decimal(655),
        paymentDate: '2025-08-01',
        bankAccountCode: '521',
        thirdPartyCode: '411',
        thirdPartyName: 'Client Export',
        isSupplier: false,
      });

      expect(result.isGain).toBe(true);
      expect(result.exchangeGainLoss.toNumber()).toBe(120000); // (670-655)*8000
    });

    it('should record no gain/loss when rates are equal', async () => {
      const result = await recordForeignCurrencyPayment(adapter, {
        invoiceId: 'inv-004',
        paymentAmountForeign: new Decimal(1000),
        paymentCurrency: 'EUR',
        spotRate: new Decimal(655.957),
        historicalRate: new Decimal(655.957),
        paymentDate: '2025-08-01',
        bankAccountCode: '521',
        thirdPartyCode: '401',
        thirdPartyName: 'Fournisseur Zone Euro',
        isSupplier: true,
      });

      expect(result.exchangeGainLoss.toNumber()).toBe(0);
      const entries = await db.journalEntries.toArray();
      // Only 2 lines (no gain/loss line)
      expect(entries[0].lines.length).toBe(2);
    });
  });

  describe('extourneEcartsConversion', () => {
    it('should reverse conversion difference entries from prior year', async () => {
      // Seed a prior-year conversion entry
      await adapter.saveJournalEntry({
        entryNumber: 'OD-001',
        journal: 'OD',
        date: '2024-12-31',
        reference: 'CONV-001',
        label: 'Écart de conversion actif',
        status: 'validated',
        lines: [
          { id: crypto.randomUUID(), accountCode: '476', accountName: 'Écart conversion actif', label: 'ECA', debit: 500000, credit: 0 },
          { id: crypto.randomUUID(), accountCode: '401', accountName: 'Fournisseur', label: 'ECA', debit: 0, credit: 500000 },
        ],
        totalDebit: 500000,
        totalCredit: 500000,
      });

      const reversalIds = await extourneEcartsConversion(adapter, 'comp1', '2025-01-01');
      expect(reversalIds.length).toBe(1);

      const entries = await db.journalEntries.toArray();
      const reversal = entries.find((e: any) => e.id === reversalIds[0]);
      expect(reversal).toBeTruthy();
      // Reversed: debits become credits and vice versa
      expect(reversal!.lines[0].credit).toBe(500000);
      expect(reversal!.lines[0].debit).toBe(0);
    });

    it('should not reverse entries from the current year', async () => {
      await adapter.saveJournalEntry({
        entryNumber: 'OD-002',
        journal: 'OD',
        date: '2025-03-15',
        reference: 'CONV-002',
        label: 'Current year conversion',
        status: 'validated',
        lines: [
          { id: crypto.randomUUID(), accountCode: '477', accountName: 'ECP', label: 'ECP', debit: 0, credit: 300000 },
          { id: crypto.randomUUID(), accountCode: '411', accountName: 'Client', label: 'ECP', debit: 300000, credit: 0 },
        ],
        totalDebit: 300000,
        totalCredit: 300000,
      });

      const reversalIds = await extourneEcartsConversion(adapter, 'comp1', '2025-01-01');
      expect(reversalIds.length).toBe(0);
    });
  });
});
