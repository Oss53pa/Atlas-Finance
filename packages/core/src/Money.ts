/**
 * @atlas/core — Money class for safe financial calculations.
 * Wraps Decimal.js to avoid floating-point errors in OHADA accounting.
 *
 * This is a COPY of the original src/utils/money.ts, extended with
 * static convenience methods for use in pure service functions.
 */
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export class Money {
  private value: Decimal

  constructor(amount: number | string | Decimal) {
    this.value = new Decimal(amount)
  }

  add(other: Money | number): Money {
    const otherValue = other instanceof Money ? other.value : new Decimal(other)
    return new Money(this.value.plus(otherValue))
  }

  subtract(other: Money | number): Money {
    const otherValue = other instanceof Money ? other.value : new Decimal(other)
    return new Money(this.value.minus(otherValue))
  }

  multiply(factor: number | string | Decimal): Money {
    return new Money(this.value.times(factor))
  }

  divide(divisor: number | string | Decimal): Money {
    if (new Decimal(divisor).isZero()) throw new Error('Division par zero')
    return new Money(this.value.dividedBy(divisor))
  }

  round(decimals: number = 2): Money {
    return new Money(this.value.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP))
  }

  toNumber(): number {
    return this.value.toNumber()
  }

  toString(): string {
    return this.value.toFixed(2)
  }

  toCents(): number {
    return this.value.times(100).round().toNumber()
  }

  isZero(): boolean {
    return this.value.isZero()
  }

  equals(other: Money, tolerance: number = 0.01): boolean {
    return this.value.minus(other.value).abs().lessThan(tolerance)
  }

  greaterThan(other: Money | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other)
    return this.value.greaterThan(otherValue)
  }

  lessThan(other: Money | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other)
    return this.value.lessThan(otherValue)
  }

  isPositive(): boolean {
    return this.value.greaterThan(0)
  }

  isNegative(): boolean {
    return this.value.lessThan(0)
  }

  abs(): Money {
    return new Money(this.value.abs())
  }

  static sum(amounts: Money[]): Money {
    return amounts.reduce((acc, m) => acc.add(m), new Money(0))
  }

  static fromCents(cents: number): Money {
    return new Money(new Decimal(cents).dividedBy(100))
  }

  /**
   * Compare two Money values: returns -1, 0, or 1.
   */
  compare(other: Money): -1 | 0 | 1 {
    return this.value.comparedTo(other.value) as -1 | 0 | 1
  }

  /**
   * Format amount with FCFA-style grouping (ex: 1 234 567).
   */
  format(devise?: string): string {
    const num = this.value.toFixed(0)
    const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return devise ? `${formatted} ${devise}` : formatted
  }
}

/** Shorthand to create a Money instance */
export const money = (amount: number | string) => new Money(amount)

/** Calculate a percentage of a base amount */
export function percentage(base: Money, rate: number): Money {
  return base.multiply(new Decimal(rate).dividedBy(100)).round(2)
}

/** Convert an amount using an exchange rate */
export function convertCurrency(amount: Money, rate: number): Money {
  return amount.multiply(rate).round(2)
}

/** Check if two numeric amounts are equal within tolerance (for legacy code) */
export function amountsEqual(a: number, b: number, tolerance: number = 0.01): boolean {
  return Math.abs(a - b) < tolerance
}
