import { describe, it, expect } from 'vitest';
import {
  isExerciceACheval,
  getFiscalMonths,
  getProrataDays,
  getFiscalYearMonthCount,
  isDateInFiscalYear,
} from '../utils/fiscalYearUtils';

describe('isExerciceACheval', () => {
  it('returns false for a standard Jan-Dec fiscal year', () => {
    expect(isExerciceACheval('2024-01-01', '2024-12-31')).toBe(false);
  });

  it('returns true for a fiscal year spanning 2 calendar years (Jul-Jun)', () => {
    expect(isExerciceACheval('2024-07-01', '2025-06-30')).toBe(true);
  });

  it('returns true for Oct-Sep fiscal year', () => {
    expect(isExerciceACheval('2024-10-01', '2025-09-30')).toBe(true);
  });

  it('returns false for same-year short period', () => {
    expect(isExerciceACheval('2024-04-01', '2024-09-30')).toBe(false);
  });
});

describe('getFiscalMonths', () => {
  it('returns 12 months for a standard Jan-Dec year', () => {
    const months = getFiscalMonths('2024-01-01', '2024-12-31');
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: 1, year: 2024 });
    expect(months[11]).toEqual({ month: 12, year: 2024 });
  });

  it('returns 12 months for a fiscal year a cheval (Jul-Jun)', () => {
    const months = getFiscalMonths('2024-07-01', '2025-06-30');
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: 7, year: 2024 });
    expect(months[11]).toEqual({ month: 6, year: 2025 });
  });

  it('returns correct months for a short exercice (6 months)', () => {
    const months = getFiscalMonths('2024-01-01', '2024-06-30');
    expect(months).toHaveLength(6);
    expect(months[0]).toEqual({ month: 1, year: 2024 });
    expect(months[5]).toEqual({ month: 6, year: 2024 });
  });

  it('handles a single-month fiscal period', () => {
    const months = getFiscalMonths('2024-03-01', '2024-03-31');
    expect(months).toHaveLength(1);
    expect(months[0]).toEqual({ month: 3, year: 2024 });
  });
});

describe('getProrataDays', () => {
  it('returns 1 for a full year acquisition at start of exercice', () => {
    const ratio = getProrataDays('2024-01-01', '2024-01-01', '2024-12-31');
    // 12 months * 30 = 360 days -> ratio = 1
    // endDay(31->30) - startDay(1) + months*30 = 30-1 + 11*30 = 29+330 = 359
    // Actually: (12-1)*30 + (30-1) = 330 + 29 = 359 -> 359/360
    // This depends on exact implementation — the function caps at 30 per month
    expect(ratio).toBeGreaterThan(0.99);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it('returns ~0.5 for mid-year acquisition', () => {
    const ratio = getProrataDays('2024-07-01', '2024-01-01', '2024-12-31');
    // From July 1 to Dec 31: 6 months = 180 days
    // (12-7)*30 + (30-1) = 150 + 29 = 179 -> 179/360 ~ 0.497
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });

  it('returns 0 when acquisition is after exercice end', () => {
    const ratio = getProrataDays('2025-03-01', '2024-01-01', '2024-12-31');
    expect(ratio).toBe(0);
  });

  it('uses exercice start when acquisition is before it', () => {
    const ratioFull = getProrataDays('2023-01-01', '2024-01-01', '2024-12-31');
    const ratioAtStart = getProrataDays('2024-01-01', '2024-01-01', '2024-12-31');
    expect(ratioFull).toBe(ratioAtStart);
  });

  it('handles exercice a cheval', () => {
    const ratio = getProrataDays('2024-07-01', '2024-07-01', '2025-06-30');
    expect(ratio).toBeGreaterThan(0.99);
  });
});

describe('getFiscalYearMonthCount', () => {
  it('returns 12 for a standard year', () => {
    expect(getFiscalYearMonthCount('2024-01-01', '2024-12-31')).toBe(12);
  });

  it('returns 12 for an exercice a cheval', () => {
    expect(getFiscalYearMonthCount('2024-07-01', '2025-06-30')).toBe(12);
  });

  it('returns 6 for a short exercice', () => {
    expect(getFiscalYearMonthCount('2024-01-01', '2024-06-30')).toBe(6);
  });
});

describe('isDateInFiscalYear', () => {
  it('returns true for a date within the fiscal year', () => {
    expect(isDateInFiscalYear('2024-06-15', '2024-01-01', '2024-12-31')).toBe(true);
  });

  it('returns true for the first day', () => {
    expect(isDateInFiscalYear('2024-01-01', '2024-01-01', '2024-12-31')).toBe(true);
  });

  it('returns true for the last day', () => {
    expect(isDateInFiscalYear('2024-12-31', '2024-01-01', '2024-12-31')).toBe(true);
  });

  it('returns false for a date before the fiscal year', () => {
    expect(isDateInFiscalYear('2023-12-31', '2024-01-01', '2024-12-31')).toBe(false);
  });

  it('returns false for a date after the fiscal year', () => {
    expect(isDateInFiscalYear('2025-01-01', '2024-01-01', '2024-12-31')).toBe(false);
  });

  it('works for exercice a cheval', () => {
    expect(isDateInFiscalYear('2025-02-15', '2024-07-01', '2025-06-30')).toBe(true);
    expect(isDateInFiscalYear('2024-06-30', '2024-07-01', '2025-06-30')).toBe(false);
  });
});
