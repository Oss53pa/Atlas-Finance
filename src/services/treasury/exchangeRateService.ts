/**
 * Exchange Rate Service — Connected to Dexie IndexedDB.
 * Manages exchange rates, currency positions, and hedging.
 * Uses journal entries to compute real currency exposures.
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../utils/money';
import { logAudit } from '../../lib/db';
import type { DBExchangeRate, DBHedgingPosition } from '../../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface CurrencyPosition {
  currency: string;
  balance: number;
  equivalentXAF: number;
  accounts: number;
  averageRate: number;
  lastUpdate: string;
  exposure: 'low' | 'medium' | 'high';
  hedged: boolean;
  hedgeRatio: number;
}

export interface ExchangeRateEntry {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  provider: string;
}

export interface HedgingPosition {
  id: string;
  currency: string;
  type: 'forward' | 'option' | 'swap';
  amount: number;
  strikeRate: number;
  currentRate: number;
  maturityDate: string;
  unrealizedPnL: number;
  status: 'active' | 'expired' | 'exercised';
}

export interface ConversionResult {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  date: string;
}

// Default base currency (SYSCOHADA = XAF)
const BASE_CURRENCY = 'XAF';

// ============================================================================
// SERVICE
// ============================================================================

class ExchangeRateService {
  private adapter: DataAdapter;

  constructor(adapter: DataAdapter) {
    this.adapter = adapter;
  }

  /**
   * Get all exchange rates, optionally filtered by date or currency pair.
   */
  async getRates(filters?: {
    fromCurrency?: string;
    toCurrency?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ExchangeRateEntry[]> {
    let rates = await this.adapter.getAll<ExchangeRateEntry>('exchangeRates');

    if (filters?.fromCurrency) {
      rates = rates.filter(r => r.fromCurrency === filters.fromCurrency);
    }
    if (filters?.toCurrency) {
      rates = rates.filter(r => r.toCurrency === filters.toCurrency);
    }
    if (filters?.dateFrom) {
      rates = rates.filter(r => r.date >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      rates = rates.filter(r => r.date <= filters.dateTo!);
    }

    return rates.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get the latest rate for a currency pair.
   */
  async getLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRateEntry | null> {
    const allRates = await this.adapter.getAll<ExchangeRateEntry>('exchangeRates');
    const rates = allRates.filter(r => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency);

    if (rates.length === 0) return null;
    return rates.sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  /**
   * Add or update an exchange rate.
   */
  async setRate(entry: Omit<ExchangeRateEntry, 'id'>): Promise<ExchangeRateEntry> {
    const id = crypto.randomUUID();
    const record: DBExchangeRate = {
      id,
      fromCurrency: entry.fromCurrency,
      toCurrency: entry.toCurrency,
      rate: entry.rate,
      date: entry.date,
      provider: entry.provider || 'manual',
      createdAt: new Date().toISOString(),
    };

    await this.adapter.create('exchangeRates', record);

    await logAudit(
      'EXCHANGE_RATE_SET',
      'exchangeRate',
      id,
      `${entry.fromCurrency}/${entry.toCurrency} = ${entry.rate} (${entry.date})`
    );

    return { ...record };
  }

  /**
   * Bulk import exchange rates.
   */
  async importRates(rates: Omit<ExchangeRateEntry, 'id'>[]): Promise<number> {
    const records: DBExchangeRate[] = rates.map(r => ({
      id: crypto.randomUUID(),
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: r.rate,
      date: r.date,
      provider: r.provider || 'import',
      createdAt: new Date().toISOString(),
    }));

    for (const record of records) { await this.adapter.create('exchangeRates', record); }
    return records.length;
  }

  /**
   * Convert an amount from one currency to another using the latest rate.
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      return {
        fromAmount: amount,
        fromCurrency,
        toAmount: amount,
        toCurrency,
        rate: 1,
        date: new Date().toISOString().split('T')[0],
      };
    }

    const rateEntry = await this.getLatestRate(fromCurrency, toCurrency);
    if (!rateEntry) {
      // Try reverse
      const reverseEntry = await this.getLatestRate(toCurrency, fromCurrency);
      if (!reverseEntry) {
        throw new Error(`No exchange rate found for ${fromCurrency}/${toCurrency}`);
      }
      const reverseRate = 1 / reverseEntry.rate;
      return {
        fromAmount: amount,
        fromCurrency,
        toAmount: money(amount).multiply(reverseRate).toNumber(),
        toCurrency,
        rate: reverseRate,
        date: reverseEntry.date,
      };
    }

    return {
      fromAmount: amount,
      fromCurrency,
      toAmount: money(amount).multiply(rateEntry.rate).toNumber(),
      toCurrency,
      rate: rateEntry.rate,
      date: rateEntry.date,
    };
  }

  /**
   * Compute currency positions from journal entries.
   * Looks at 5xx bank accounts that have a currency suffix (e.g. 521USD, 521EUR).
   */
  async getCurrencyPositions(): Promise<CurrencyPosition[]> {
    const allEntries = await this.adapter.getAll<any>('journalEntries');
    const entries = allEntries.filter((e: any) => e.status === 'validated' || e.status === 'posted');

    // Group by currency from account codes or analytical codes
    const positions = new Map<string, { balance: number; accounts: Set<string> }>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        // Detect currency from analyticalCode or account suffix
        const currency = line.analyticalCode?.match(/^[A-Z]{3}$/)?.[0] || BASE_CURRENCY;
        const existing = positions.get(currency) || { balance: 0, accounts: new Set<string>() };
        existing.balance += line.debit - line.credit;
        existing.accounts.add(line.accountCode);
        positions.set(currency, existing);
      }
    }

    // If no multi-currency detected, show base currency only
    if (positions.size === 0 || (positions.size === 1 && positions.has(BASE_CURRENCY))) {
      const totalBalance = entries.reduce((sum, e) => sum + e.totalDebit, 0);
      return [{
        currency: BASE_CURRENCY,
        balance: totalBalance,
        equivalentXAF: totalBalance,
        accounts: new Set(entries.flatMap(e => e.lines.map(l => l.accountCode))).size,
        averageRate: 1,
        lastUpdate: new Date().toISOString(),
        exposure: 'low',
        hedged: false,
        hedgeRatio: 0,
      }];
    }

    const result: CurrencyPosition[] = [];
    for (const [currency, data] of positions) {
      const latestRate = currency === BASE_CURRENCY ? null : await this.getLatestRate(currency, BASE_CURRENCY);
      const rate = currency === BASE_CURRENCY ? 1 : (latestRate?.rate || 1);
      const absBalance = Math.abs(data.balance);

      // Determine exposure based on balance magnitude
      let exposure: CurrencyPosition['exposure'] = 'low';
      if (absBalance > 10000000) exposure = 'high';
      else if (absBalance > 1000000) exposure = 'medium';

      // Check hedging
      const allHedges = await this.adapter.getAll<DBHedgingPosition>('hedgingPositions', { where: { currency } });
      const hedges = allHedges.filter(h => h.status === 'active');
      const hedgedAmount = hedges.reduce((sum, h) => sum + h.amount, 0);

      result.push({
        currency,
        balance: data.balance,
        equivalentXAF: money(data.balance).multiply(rate).toNumber(),
        accounts: data.accounts.size,
        averageRate: rate,
        lastUpdate: new Date().toISOString(),
        exposure,
        hedged: hedgedAmount > 0,
        hedgeRatio: absBalance > 0 ? hedgedAmount / absBalance : 0,
      });
    }

    return result.sort((a, b) => Math.abs(b.equivalentXAF) - Math.abs(a.equivalentXAF));
  }

  /**
   * Get hedging positions.
   */
  async getHedgingPositions(filters?: { currency?: string; status?: string }): Promise<HedgingPosition[]> {
    let positions = await this.adapter.getAll<HedgingPosition>('hedgingPositions');

    if (filters?.currency) {
      positions = positions.filter(p => p.currency === filters.currency);
    }
    if (filters?.status) {
      positions = positions.filter(p => p.status === filters.status);
    }

    return positions.sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));
  }

  /**
   * Create a hedging position.
   */
  async createHedgingPosition(position: Omit<HedgingPosition, 'id'>): Promise<HedgingPosition> {
    const id = crypto.randomUUID();
    const record: DBHedgingPosition = {
      id,
      currency: position.currency,
      type: position.type,
      amount: position.amount,
      strikeRate: position.strikeRate,
      currentRate: position.currentRate,
      maturityDate: position.maturityDate,
      unrealizedPnL: position.unrealizedPnL,
      status: position.status || 'active',
      createdAt: new Date().toISOString(),
    };

    await this.adapter.create('hedgingPositions', record);

    await logAudit(
      'HEDGING_CREATE',
      'hedgingPosition',
      id,
      `${position.type} ${position.currency} — ${position.amount} @ ${position.strikeRate}`
    );

    return { ...record };
  }

  /**
   * Delete an exchange rate.
   */
  async deleteRate(id: string): Promise<void> {
    await this.adapter.delete('exchangeRates', id);
  }

  /**
   * Export exchange rates as CSV.
   */
  async exportRates(format: 'csv'): Promise<Blob> {
    const rates = await this.adapter.getAll<ExchangeRateEntry>('exchangeRates');
    const header = 'Date;De;Vers;Taux;Source';
    const rows = rates
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(r => `${r.date};${r.fromCurrency};${r.toCurrency};${r.rate};${r.provider}`);

    const content = [header, ...rows].join('\n');
    return new Blob([content], { type: 'text/csv;charset=utf-8' });
  }
}

export function createExchangeRateService(adapter: DataAdapter): ExchangeRateService {
  return new ExchangeRateService(adapter);
}
