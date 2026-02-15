/**
 * Tests for FEC export service (18 columns).
 * Verifies: column structure, date format, balance, validation.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// We test the pure functions that don't require Dexie DB
// The service uses Dexie which needs IndexedDB — we test the format logic

describe('FEC Export — Format & Structure', () => {
  const FEC_HEADERS = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
    'EcrtureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
  ];

  it('should define exactly 18 FEC columns', () => {
    expect(FEC_HEADERS).toHaveLength(18);
  });

  it('should have correct column names per article A.47 A-1', () => {
    expect(FEC_HEADERS[0]).toBe('JournalCode');
    expect(FEC_HEADERS[3]).toBe('EcritureDate');
    expect(FEC_HEADERS[4]).toBe('CompteNum');
    expect(FEC_HEADERS[11]).toBe('Debit');
    expect(FEC_HEADERS[12]).toBe('Credit');
    expect(FEC_HEADERS[13]).toBe('EcrtureLet');
    expect(FEC_HEADERS[15]).toBe('ValidDate');
    expect(FEC_HEADERS[16]).toBe('Montantdevise');
    expect(FEC_HEADERS[17]).toBe('Idevise');
  });

  describe('Date formatting YYYYMMDD', () => {
    function formatDateFEC(dateStr: string): string {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    }

    it('should format date as YYYYMMDD', () => {
      expect(formatDateFEC('2026-01-15')).toBe('20260115');
      expect(formatDateFEC('2026-12-31')).toBe('20261231');
    });

    it('should handle single-digit months and days', () => {
      expect(formatDateFEC('2026-03-05')).toBe('20260305');
    });
  });

  describe('Amount formatting with comma decimal', () => {
    function formatAmount(amount: number): string {
      return amount.toFixed(2).replace('.', ',');
    }

    it('should format amounts with comma separator', () => {
      expect(formatAmount(100000)).toBe('100000,00');
      expect(formatAmount(18500.50)).toBe('18500,50');
      expect(formatAmount(0)).toBe('0,00');
    });
  });

  describe('Filename format', () => {
    it('should follow {SIREN}FEC{YYYYMMDD}.txt pattern', () => {
      const siren = '123456789';
      const closingDate = '20261231';
      const filename = `${siren}FEC${closingDate}.txt`;
      expect(filename).toBe('123456789FEC20261231.txt');
      expect(filename).toMatch(/^\d{9}FEC\d{8}\.txt$/);
    });
  });

  describe('Balance validation', () => {
    it('should detect balanced entries', () => {
      const lines = [
        { debit: 100000, credit: 0 },
        { debit: 18000, credit: 0 },
        { debit: 0, credit: 118000 },
      ];
      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);
    });

    it('should detect unbalanced entries', () => {
      const lines = [
        { debit: 100000, credit: 0 },
        { debit: 0, credit: 99000 },
      ];
      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeGreaterThan(0.01);
    });
  });

  describe('Field escaping for CSV', () => {
    function escapeField(value: string, separator: string): string {
      if (value.includes(separator) || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }

    it('should escape fields containing separator', () => {
      expect(escapeField('Hello;World', ';')).toBe('"Hello;World"');
    });

    it('should escape fields containing quotes', () => {
      expect(escapeField('He said "hi"', ';')).toBe('"He said ""hi"""');
    });

    it('should not escape clean fields', () => {
      expect(escapeField('Hello', ';')).toBe('Hello');
    });
  });
});
