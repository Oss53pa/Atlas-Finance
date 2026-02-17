import { describe, it, expect } from 'vitest';
import { calculateIS, getISRate, getSupportedCountries } from '../utils/isCalculation';

describe('calculateIS', () => {
  it('calcule IS Cameroun à 33%', () => {
    const result = calculateIS({
      countryCode: 'CM',
      resultatComptable: 10_000_000,
      reintegrations: 500_000,
      deductions: 200_000,
      deficitsAnterieurs: 0,
      chiffreAffaires: 50_000_000,
      acomptesVerses: 1_000_000,
    });

    // Résultat fiscal = 10M + 500K - 200K = 10.3M
    expect(result.resultatFiscal.toNumber()).toBe(10_300_000);
    // IS brut = 10.3M * 33% = 3 399 000
    expect(result.impotBrut.toNumber()).toBe(3_399_000);
    // IS net = IS dû - acomptes
    expect(result.impotNet.toNumber()).toBeGreaterThan(0);
  });

  it('applique le minimum IS si IS < minimum', () => {
    const result = calculateIS({
      countryCode: 'CM',
      resultatComptable: 100_000, // Petit résultat
      reintegrations: 0,
      deductions: 0,
      deficitsAnterieurs: 0,
      chiffreAffaires: 100_000_000, // Gros CA
      acomptesVerses: 0,
    });

    // Minimum CM = 2.2% du CA = 2 200 000
    const minimumIS = result.minimumIS.toNumber();
    expect(minimumIS).toBe(2_200_000);
    // IS dû = max(IS brut, minimum)
    expect(result.impotDu.toNumber()).toBe(minimumIS);
  });

  it('impute les déficits antérieurs', () => {
    const result = calculateIS({
      countryCode: 'CI',
      resultatComptable: 5_000_000,
      reintegrations: 0,
      deductions: 0,
      deficitsAnterieurs: 2_000_000,
      chiffreAffaires: 30_000_000,
      acomptesVerses: 0,
    });

    expect(result.deficitsImputes.toNumber()).toBe(2_000_000);
    expect(result.resultatFiscal.toNumber()).toBe(3_000_000);
  });

  it('ne rend pas le résultat fiscal négatif avec les déficits', () => {
    const result = calculateIS({
      countryCode: 'CI',
      resultatComptable: 1_000_000,
      reintegrations: 0,
      deductions: 0,
      deficitsAnterieurs: 5_000_000,
      chiffreAffaires: 20_000_000,
      acomptesVerses: 0,
    });

    expect(result.deficitsImputes.toNumber()).toBe(1_000_000);
    expect(result.resultatFiscal.toNumber()).toBe(0);
  });

  it('calcule les acomptes trimestriels', () => {
    const result = calculateIS({
      countryCode: 'CM',
      resultatComptable: 10_000_000,
      reintegrations: 0,
      deductions: 0,
      deficitsAnterieurs: 0,
      chiffreAffaires: 50_000_000,
      acomptesVerses: 0,
    });

    // Acomptes = IS dû / 4
    expect(result.acomptesTrimestriels.toNumber()).toBeGreaterThan(0);
  });
});

describe('getISRate', () => {
  it('returns 33 for Cameroun', () => {
    expect(getISRate('CM')).toBe(33);
  });

  it('returns 25 for Côte d\'Ivoire', () => {
    expect(getISRate('CI')).toBe(25);
  });

  it('returns 30 as default for unknown country', () => {
    expect(getISRate('XX')).toBe(30);
  });
});

describe('getSupportedCountries', () => {
  it('returns at least 10 OHADA countries', () => {
    expect(getSupportedCountries().length).toBeGreaterThanOrEqual(10);
  });
});
