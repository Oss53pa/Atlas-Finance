/**
 * Tests for exchange rate service connected to Dexie.
 * Verifies: rate CRUD, conversions, hedging positions, currency positions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { exchangeRateService } from '../services/treasury/exchangeRateService';
import { db } from '../lib/db';

describe('ExchangeRateService (Dexie)', () => {
  beforeEach(async () => {
    await db.exchangeRates.clear();
    await db.hedgingPositions.clear();
    await db.journalEntries.clear();
    await db.auditLogs.clear();

    // Seed exchange rates
    await exchangeRateService.setRate({
      fromCurrency: 'EUR',
      toCurrency: 'XAF',
      rate: 655.957,
      date: '2025-06-15',
      provider: 'ECB',
    });
    await exchangeRateService.setRate({
      fromCurrency: 'USD',
      toCurrency: 'XAF',
      rate: 600.50,
      date: '2025-06-15',
      provider: 'Reuters',
    });
    await exchangeRateService.setRate({
      fromCurrency: 'EUR',
      toCurrency: 'XAF',
      rate: 655.957,
      date: '2025-06-10',
      provider: 'ECB',
    });
  });

  describe('getRates', () => {
    it('should return all rates sorted by date desc', async () => {
      const rates = await exchangeRateService.getRates();
      expect(rates.length).toBe(3);
      expect(rates[0].date >= rates[1].date).toBe(true);
    });

    it('should filter by currency', async () => {
      const rates = await exchangeRateService.getRates({ fromCurrency: 'USD' });
      expect(rates.length).toBe(1);
      expect(rates[0].fromCurrency).toBe('USD');
    });

    it('should filter by date range', async () => {
      const rates = await exchangeRateService.getRates({
        dateFrom: '2025-06-12',
        dateTo: '2025-06-20',
      });
      expect(rates.length).toBe(2); // Only June 15 entries
    });
  });

  describe('getLatestRate', () => {
    it('should return the most recent rate for a pair', async () => {
      const rate = await exchangeRateService.getLatestRate('EUR', 'XAF');
      expect(rate).toBeDefined();
      expect(rate!.rate).toBe(655.957);
      expect(rate!.date).toBe('2025-06-15');
    });

    it('should return null for unknown pair', async () => {
      const rate = await exchangeRateService.getLatestRate('GBP', 'JPY');
      expect(rate).toBeNull();
    });
  });

  describe('convert', () => {
    it('should convert using latest rate', async () => {
      const result = await exchangeRateService.convert(1000, 'EUR', 'XAF');
      expect(result.fromAmount).toBe(1000);
      expect(result.toAmount).toBe(655957);
      expect(result.rate).toBe(655.957);
    });

    it('should return same amount for same currency', async () => {
      const result = await exchangeRateService.convert(5000, 'XAF', 'XAF');
      expect(result.toAmount).toBe(5000);
      expect(result.rate).toBe(1);
    });

    it('should try reverse rate if direct not found', async () => {
      const result = await exchangeRateService.convert(655957, 'XAF', 'EUR');
      expect(result.toAmount).toBeCloseTo(1000, 0);
    });

    it('should throw for unknown pair', async () => {
      await expect(
        exchangeRateService.convert(100, 'GBP', 'JPY')
      ).rejects.toThrow('No exchange rate found');
    });
  });

  describe('importRates', () => {
    it('should bulk import rates', async () => {
      const count = await exchangeRateService.importRates([
        { fromCurrency: 'GBP', toCurrency: 'XAF', rate: 780.50, date: '2025-06-15', provider: 'import' },
        { fromCurrency: 'CHF', toCurrency: 'XAF', rate: 700.25, date: '2025-06-15', provider: 'import' },
      ]);
      expect(count).toBe(2);

      const allRates = await exchangeRateService.getRates();
      expect(allRates.length).toBe(5); // 3 original + 2 imported
    });
  });

  describe('hedgingPositions', () => {
    it('should create and retrieve hedging positions', async () => {
      await exchangeRateService.createHedgingPosition({
        currency: 'EUR',
        type: 'forward',
        amount: 100000,
        strikeRate: 655.00,
        currentRate: 655.957,
        maturityDate: '2025-12-31',
        unrealizedPnL: 957,
        status: 'active',
      });

      const positions = await exchangeRateService.getHedgingPositions();
      expect(positions.length).toBe(1);
      expect(positions[0].currency).toBe('EUR');
      expect(positions[0].type).toBe('forward');
      expect(positions[0].amount).toBe(100000);
    });

    it('should filter by currency', async () => {
      await exchangeRateService.createHedgingPosition({
        currency: 'EUR',
        type: 'forward',
        amount: 100000,
        strikeRate: 655.00,
        currentRate: 655.957,
        maturityDate: '2025-12-31',
        unrealizedPnL: 0,
        status: 'active',
      });
      await exchangeRateService.createHedgingPosition({
        currency: 'USD',
        type: 'option',
        amount: 50000,
        strikeRate: 600.00,
        currentRate: 600.50,
        maturityDate: '2025-09-30',
        unrealizedPnL: 0,
        status: 'active',
      });

      const eurOnly = await exchangeRateService.getHedgingPositions({ currency: 'EUR' });
      expect(eurOnly.length).toBe(1);
    });
  });

  describe('exportRates', () => {
    it('should export as CSV blob', async () => {
      const blob = await exchangeRateService.exportRates('csv');
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toContain('csv');
    });
  });

  describe('audit trail', () => {
    it('should log rate creation', async () => {
      const logs = await db.auditLogs.toArray();
      const rateLog = logs.find(l => l.action === 'EXCHANGE_RATE_SET');
      expect(rateLog).toBeDefined();
    });
  });
});
