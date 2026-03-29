import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';
import {
  calculateQuarterlyInstallment,
  recordInstallment,
  calculatePropertyTax,
  recordPropertyTax,
  applyDeficitCarryForward,
  type FiscalDeficit,
} from '../services/taxInstallmentService';

const adapter = createTestAdapter();

describe('taxInstallmentService', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
  });

  describe('calculateQuarterlyInstallment', () => {
    it('should use previous year IS when higher than minimum', () => {
      const result = calculateQuarterlyInstallment(
        new Decimal(8000000),
        new Decimal(2000000)
      );
      expect(result.toNumber()).toBe(2000000); // 8M / 4
    });

    it('should use minimum flat when IS is lower', () => {
      const result = calculateQuarterlyInstallment(
        new Decimal(500000),
        new Decimal(2000000)
      );
      expect(result.toNumber()).toBe(500000); // 2M / 4
    });
  });

  describe('recordInstallment', () => {
    it('should create journal entry D:4492 / C:521', async () => {
      const entryId = await recordInstallment(
        adapter, 'comp1', 1, new Decimal(2000000), '521', '2025', '2025-03-15'
      );

      expect(entryId).toBeTruthy();
      const entries = await db.journalEntries.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].lines[0].accountCode).toBe('4492');
      expect(entries[0].lines[0].debit).toBe(2000000);
      expect(entries[0].lines[1].accountCode).toBe('521');
      expect(entries[0].lines[1].credit).toBe(2000000);
    });
  });

  describe('calculatePropertyTax', () => {
    it('should compute rental value × rate', () => {
      const result = calculatePropertyTax(
        new Decimal(50000000), // rental value
        new Decimal(0.15) // 15% rate
      );
      expect(result.toNumber()).toBe(7500000);
    });
  });

  describe('recordPropertyTax', () => {
    it('should create journal entry D:642 / C:521', async () => {
      const entryId = await recordPropertyTax(
        adapter, 'comp1', new Decimal(7500000), '521', '2025', '2025-04-30'
      );

      expect(entryId).toBeTruthy();
      const entries = await db.journalEntries.toArray();
      expect(entries[0].lines[0].accountCode).toBe('642');
      expect(entries[0].lines[1].accountCode).toBe('521');
    });
  });

  describe('applyDeficitCarryForward', () => {
    it('should apply oldest deficits first', () => {
      const deficits: FiscalDeficit[] = [
        { fiscalYear: '2022', amount: new Decimal(3000000), remainingAmount: new Decimal(3000000), expiryYear: '2025' },
        { fiscalYear: '2023', amount: new Decimal(2000000), remainingAmount: new Decimal(2000000), expiryYear: '2026' },
      ];

      const result = applyDeficitCarryForward(new Decimal(4000000), deficits, '2025');

      expect(result.remainingProfit.toNumber()).toBe(0);
      // 2022 deficit fully used (3M), 2023 deficit partially used (1M of 2M)
      const d2022 = result.updatedDeficits.find(d => d.fiscalYear === '2022');
      const d2023 = result.updatedDeficits.find(d => d.fiscalYear === '2023');
      expect(d2022!.remainingAmount.toNumber()).toBe(0);
      expect(d2023!.remainingAmount.toNumber()).toBe(1000000);
    });

    it('should skip expired deficits', () => {
      const deficits: FiscalDeficit[] = [
        { fiscalYear: '2020', amount: new Decimal(5000000), remainingAmount: new Decimal(5000000), expiryYear: '2023' },
        { fiscalYear: '2023', amount: new Decimal(2000000), remainingAmount: new Decimal(2000000), expiryYear: '2026' },
      ];

      const result = applyDeficitCarryForward(new Decimal(3000000), deficits, '2025');

      // Only 2023 deficit used (2M), 2020 is expired
      expect(result.remainingProfit.toNumber()).toBe(1000000);
    });

    it('should return full profit when no deficits available', () => {
      const result = applyDeficitCarryForward(new Decimal(10000000), [], '2025');
      expect(result.remainingProfit.toNumber()).toBe(10000000);
    });
  });
});
