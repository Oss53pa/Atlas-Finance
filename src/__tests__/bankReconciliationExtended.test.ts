import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';
import {
  generateRegularizationEntries,
  parseMT940,
  type UnmatchedBankItem,
} from '../services/rapprochementBancaireExtendedService';

const adapter = createTestAdapter();

describe('rapprochementBancaireExtendedService', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
  });

  describe('generateRegularizationEntries', () => {
    it('should create draft entries for bank fees', async () => {
      const items: UnmatchedBankItem[] = [
        { date: '2025-06-30', label: 'Frais tenue de compte', amount: new Decimal(-15000), suggestedType: 'bank_fees' },
      ];

      const ids = await generateRegularizationEntries(adapter, 'comp1', '521', items);
      expect(ids.length).toBe(1);

      const entries = await db.journalEntries.toArray();
      expect(entries[0].status).toBe('draft');
      // D:631 / C:521 (money going out)
      expect(entries[0].lines[0].accountCode).toBe('631');
      expect(entries[0].lines[0].debit).toBe(15000);
      expect(entries[0].lines[1].accountCode).toBe('521');
      expect(entries[0].lines[1].credit).toBe(15000);
    });

    it('should create entries for incoming transfers', async () => {
      const items: UnmatchedBankItem[] = [
        { date: '2025-07-01', label: 'Virement reçu ABC', amount: new Decimal(500000), suggestedType: 'transfer_received', suggestedCounterAccount: '411100' },
      ];

      const ids = await generateRegularizationEntries(adapter, 'comp1', '521', items);
      expect(ids.length).toBe(1);

      const entries = await db.journalEntries.toArray();
      // D:521 / C:411100 (money coming in)
      expect(entries[0].lines[0].accountCode).toBe('521');
      expect(entries[0].lines[0].debit).toBe(500000);
      expect(entries[0].lines[1].accountCode).toBe('411100');
      expect(entries[0].lines[1].credit).toBe(500000);
    });

    it('should use 471 (suspense) for unknown items', async () => {
      const items: UnmatchedBankItem[] = [
        { date: '2025-07-02', label: 'Opération inconnue', amount: new Decimal(-25000), suggestedType: 'other' },
      ];

      const ids = await generateRegularizationEntries(adapter, 'comp1', '521', items);
      const entries = await db.journalEntries.toArray();
      const counterLine = entries[0].lines.find((l: any) => l.accountCode === '471');
      expect(counterLine).toBeTruthy();
    });
  });

  describe('parseMT940', () => {
    it('should parse a basic MT940 statement', () => {
      const mt940 = [
        ':20:STMT202507',
        ':25:BICI-CI/0012345678',
        ':28C:001/001',
        ':60F:C250630XOF15000000,00',
        ':61:250701C500000,00NTRF//REF001',
        ':86:Virement client ABC SARL',
        ':61:250702D25000,00NCHG//FEE001',
        ':86:Frais bancaires',
        ':62F:C250702XOF15475000,00',
      ].join('\n');

      const result = parseMT940(mt940);

      expect(result.accountId).toBe('BICI-CI/0012345678');
      expect(result.openingBalance.amount.toNumber()).toBe(15000000);
      expect(result.openingBalance.isCredit).toBe(true);
      expect(result.closingBalance.amount.toNumber()).toBe(15475000);
      expect(result.transactions.length).toBe(2);
      expect(result.transactions[0].isCredit).toBe(true);
      expect(result.transactions[0].amount.toNumber()).toBe(500000);
      expect(result.transactions[1].isCredit).toBe(false);
      expect(result.transactions[1].amount.toNumber()).toBe(25000);
    });

    it('should handle empty content', () => {
      const result = parseMT940('');
      expect(result.transactions.length).toBe(0);
      expect(result.accountId).toBe('');
    });
  });
});
