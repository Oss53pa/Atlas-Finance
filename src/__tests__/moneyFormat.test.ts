/**
 * Tests pour formatMoney — fonction de formatage globale.
 * Mode 'full'    : 1 234 567 890
 * Mode 'compact' : 1,23 Md
 */
import { describe, it, expect } from 'vitest';
import { formatMoney } from '../hooks/useMoneyFormat';

// Espace insécable utilisé dans le formatage (U+00A0)
const NBSP = '\u00A0';

describe('formatMoney — mode full (entier)', () => {
  it('formate un petit nombre sans séparateur', () => {
    expect(formatMoney(123, 'full')).toBe('123');
  });

  it('formate un millier avec espace', () => {
    expect(formatMoney(1234, 'full')).toBe(`1${NBSP}234`);
  });

  it('formate un million', () => {
    expect(formatMoney(1_234_567, 'full')).toBe(`1${NBSP}234${NBSP}567`);
  });

  it('formate un milliard', () => {
    expect(formatMoney(1_234_567_890, 'full')).toBe(`1${NBSP}234${NBSP}567${NBSP}890`);
  });

  it('gère les nombres négatifs', () => {
    expect(formatMoney(-1_234_567, 'full')).toBe(`-1${NBSP}234${NBSP}567`);
  });

  it('retourne un tiret pour null/undefined/NaN', () => {
    expect(formatMoney(null, 'full')).toBe('—');
    expect(formatMoney(undefined, 'full')).toBe('—');
    expect(formatMoney(NaN, 'full')).toBe('—');
  });

  it('gère le zéro', () => {
    expect(formatMoney(0, 'full')).toBe('0');
  });

  it('accepte des décimales explicites', () => {
    expect(formatMoney(1234.56, 'full', 2)).toBe(`1${NBSP}234,56`);
  });
});

describe('formatMoney — mode compact (K/M/Md)', () => {
  it('laisse les petits nombres sous 1000 en entier', () => {
    expect(formatMoney(850, 'compact')).toBe('850');
    expect(formatMoney(0, 'compact')).toBe('0');
  });

  it('abrège les milliers avec K (2 décimales)', () => {
    expect(formatMoney(1500, 'compact')).toBe('1,50 K');
    expect(formatMoney(150_000, 'compact')).toBe('150,00 K');
    // Juste sous 1M : on arrondit à 1000 K (la formatNumber ajoute un séparateur milliers)
    expect(formatMoney(999_999, 'compact')).toBe(`1${NBSP}000,00 K`);
  });

  it('abrège les millions avec M (2 décimales)', () => {
    expect(formatMoney(1_000_000, 'compact')).toBe('1,00 M');
    expect(formatMoney(2_500_000, 'compact')).toBe('2,50 M');
    expect(formatMoney(999_999_999, 'compact')).toBe(`1${NBSP}000,00 M`);
  });

  it('abrège les milliards avec Md (2 décimales)', () => {
    expect(formatMoney(1_000_000_000, 'compact')).toBe('1,00 Md');
    expect(formatMoney(1_234_567_890, 'compact')).toBe('1,23 Md');
    expect(formatMoney(12_000_000_000, 'compact')).toBe('12,00 Md');
  });

  it('gère les nombres négatifs en compact', () => {
    expect(formatMoney(-1_234_567_890, 'compact')).toBe('-1,23 Md');
    expect(formatMoney(-500_000, 'compact')).toBe('-500,00 K');
  });

  it('retourne un tiret pour null en compact', () => {
    expect(formatMoney(null, 'compact')).toBe('—');
  });
});
