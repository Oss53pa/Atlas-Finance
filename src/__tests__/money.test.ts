import { describe, it, expect } from 'vitest';
import { Money, money, percentage, convertCurrency, amountsEqual } from '../utils/money';

describe('Money class', () => {
  describe('basic arithmetic', () => {
    it('adds two Money values', () => {
      const a = money(100.50);
      const b = money(200.75);
      expect(a.add(b).toNumber()).toBe(301.25);
    });

    it('adds Money and raw number', () => {
      expect(money(10).add(5).toNumber()).toBe(15);
    });

    it('subtracts correctly', () => {
      expect(money(100).subtract(33.33).toNumber()).toBe(66.67);
    });

    it('multiplies correctly', () => {
      expect(money(100).multiply(0.18).round().toNumber()).toBe(18);
    });

    it('divides correctly', () => {
      expect(money(100).divide(3).round().toNumber()).toBe(33.33);
    });

    it('throws on division by zero', () => {
      expect(() => money(100).divide(0)).toThrow('Division par zéro');
    });
  });

  describe('floating point safety', () => {
    it('handles 0.1 + 0.2 correctly', () => {
      const result = money(0.1).add(0.2);
      expect(result.toNumber()).toBe(0.3);
    });

    it('handles 33.33 + 33.33 + 33.34 = 100.00', () => {
      const a = money(33.33);
      const b = money(33.33);
      const c = money(33.34);
      expect(Money.sum([a, b, c]).toNumber()).toBe(100);
    });

    it('handles large amounts without precision loss', () => {
      const big = money(999_999_999.99);
      const small = money(0.01);
      expect(big.add(small).toNumber()).toBe(1_000_000_000);
    });
  });

  describe('rounding', () => {
    it('rounds to 2 decimals by default', () => {
      expect(money(33.335).round().toNumber()).toBe(33.34);
    });

    it('rounds to 0 decimals', () => {
      expect(money(33.5).round(0).toNumber()).toBe(34);
    });

    it('uses ROUND_HALF_UP', () => {
      expect(money(2.5).round(0).toNumber()).toBe(3);
      expect(money(3.5).round(0).toNumber()).toBe(4);
    });
  });

  describe('comparisons', () => {
    it('detects equality within tolerance', () => {
      const a = money(100.001);
      const b = money(100.005);
      expect(a.equals(b, 0.01)).toBe(true);
    });

    it('detects inequality beyond tolerance', () => {
      const a = money(100);
      const b = money(100.02);
      expect(a.equals(b, 0.01)).toBe(false);
    });

    it('handles zero', () => {
      expect(money(0).isZero()).toBe(true);
      expect(money(0.001).isZero()).toBe(false);
    });

    it('handles negative amounts', () => {
      expect(money(-50).isNegative()).toBe(true);
      expect(money(-50).abs().toNumber()).toBe(50);
    });
  });

  describe('cents conversion', () => {
    it('converts to cents', () => {
      expect(money(12.34).toCents()).toBe(1234);
    });

    it('creates from cents', () => {
      expect(Money.fromCents(1234).toNumber()).toBe(12.34);
    });
  });

  describe('toString', () => {
    it('formats with 2 decimals', () => {
      expect(money(1234.5).toString()).toBe('1234.50');
    });
  });

  describe('sum', () => {
    it('sums an array of Money', () => {
      const amounts = [money(10), money(20), money(30.50)];
      expect(Money.sum(amounts).toNumber()).toBe(60.50);
    });

    it('returns 0 for empty array', () => {
      expect(Money.sum([]).toNumber()).toBe(0);
    });
  });
});

describe('percentage', () => {
  it('calculates 18% TVA', () => {
    expect(percentage(money(100_000), 18).toNumber()).toBe(18_000);
  });

  it('calculates 19.25% TVA Cameroun', () => {
    expect(percentage(money(100_000), 19.25).toNumber()).toBe(19_250);
  });
});

describe('convertCurrency', () => {
  it('converts XAF to EUR at 655.957', () => {
    const xaf = money(655_957);
    const eur = convertCurrency(xaf, 1 / 655.957);
    expect(eur.toNumber()).toBe(1000);
  });
});

describe('amountsEqual', () => {
  it('returns true for equal amounts', () => {
    expect(amountsEqual(100, 100)).toBe(true);
  });

  it('returns true within tolerance', () => {
    expect(amountsEqual(100.004, 100.005)).toBe(true);
  });

  it('returns false beyond tolerance', () => {
    expect(amountsEqual(100, 100.02)).toBe(false);
  });
});
