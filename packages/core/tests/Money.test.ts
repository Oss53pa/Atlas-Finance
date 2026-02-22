import { describe, it, expect } from 'vitest'
import { Money, money, percentage, amountsEqual } from '../src/Money'

describe('Money', () => {
  it('additionne sans erreur de flottant', () => {
    const result = money(1000).add(money(2000))
    expect(result.toNumber()).toBe(3000)
  })

  it('soustrait correctement', () => {
    const result = money(5000).subtract(money(3000))
    expect(result.toNumber()).toBe(2000)
  })

  it('multiplie correctement', () => {
    const result = money(100).multiply(0.18)
    expect(result.toNumber()).toBe(18)
  })

  it('divise correctement', () => {
    const result = money(1000).divide(3)
    expect(result.round(2).toNumber()).toBeCloseTo(333.33)
  })

  it('leve une erreur sur division par zero', () => {
    expect(() => money(100).divide(0)).toThrow('Division par zero')
  })

  it('detecte l\'egalite', () => {
    expect(money(100).equals(money(100))).toBe(true)
    expect(money(100).equals(money(101))).toBe(false)
    expect(money(100.004).equals(money(100.005))).toBe(true) // within tolerance 0.01
  })

  it('detecte zero', () => {
    expect(money(0).isZero()).toBe(true)
    expect(money(1).isZero()).toBe(false)
  })

  it('gere les grands montants FCFA', () => {
    const a = money(5_000_000_000)
    const b = money(5_000_000_000)
    expect(a.add(b).toNumber()).toBe(10_000_000_000)
  })

  it('calcule la valeur absolue', () => {
    expect(money(-500).abs().toNumber()).toBe(500)
    expect(money(500).abs().toNumber()).toBe(500)
  })

  it('compare correctement', () => {
    expect(money(100).greaterThan(money(50))).toBe(true)
    expect(money(50).lessThan(money(100))).toBe(true)
    expect(money(100).greaterThan(money(100))).toBe(false)
  })

  it('somme un tableau', () => {
    const amounts = [money(100), money(200), money(300)]
    expect(Money.sum(amounts).toNumber()).toBe(600)
  })

  it('convertit depuis les centimes', () => {
    expect(Money.fromCents(12345).toNumber()).toBe(123.45)
  })

  it('formate en FCFA', () => {
    const formatted = money(1234567).format()
    expect(formatted).toContain('1')
    expect(formatted).toContain('234')
    expect(formatted).toContain('567')
  })
})

describe('percentage', () => {
  it('calcule un pourcentage', () => {
    const result = percentage(money(10000), 18)
    expect(result.toNumber()).toBe(1800)
  })

  it('calcule 10% pour la reserve legale', () => {
    const result = percentage(money(5_000_000), 10)
    expect(result.toNumber()).toBe(500_000)
  })
})

describe('amountsEqual', () => {
  it('detecte des montants egaux', () => {
    expect(amountsEqual(100, 100)).toBe(true)
    expect(amountsEqual(100, 100.005)).toBe(true)
    expect(amountsEqual(100, 101)).toBe(false)
  })
})
