import { describe, it, expect } from 'vitest';
import { TVAValidator } from '../utils/tvaValidation';

describe('Calculs TVA', () => {
  it('calcule TVA 18% sur 100 000', () => {
    const tva = TVAValidator.calculerTVA(100_000, 18);
    expect(tva).toBe(18_000);
  });

  it('calcule TVA 19.25% Cameroun', () => {
    const tva = TVAValidator.calculerTVA(100_000, 19.25);
    expect(tva).toBe(19_250);
  });

  it('calcule TTC = HT + TVA', () => {
    const ttc = TVAValidator.calculerTTC(100_000, 18);
    expect(ttc).toBe(118_000);
  });

  it('calcule HT depuis TTC', () => {
    const ht = TVAValidator.calculerHT(118_000, 18);
    expect(ht).toBeCloseTo(100_000, 0);
  });

  it('TVA à 0% (exonéré)', () => {
    expect(TVAValidator.calculerTVA(100_000, 0)).toBe(0);
    expect(TVAValidator.calculerTTC(100_000, 0)).toBe(100_000);
  });

  it('taux réduit 5.5%', () => {
    const tva = TVAValidator.calculerTVA(100_000, 5.5);
    expect(tva).toBe(5_500);
  });
});

describe('TVAValidator', () => {
  it('valide une écriture avec TVA correcte', () => {
    const result = TVAValidator.validateEcritureTVA([
      { compte: '607000', libelle: 'Achats', debit: 100_000, credit: 0 },
      { compte: '445660', libelle: 'TVA déductible', debit: 19_250, credit: 0 },
      { compte: '401000', libelle: 'Fournisseur', debit: 0, credit: 119_250 },
    ]);
    expect(result.errors.length).toBe(0);
  });

  it('détecte TVA déductible au crédit (erreur)', () => {
    const result = TVAValidator.validateEcritureTVA([
      { compte: '607000', libelle: 'Achats', debit: 100_000, credit: 0 },
      { compte: '445660', libelle: 'TVA déductible', debit: 0, credit: 19_250 },
      { compte: '401000', libelle: 'Fournisseur', debit: 0, credit: 80_750 },
    ]);
    // TVA déductible should be on debit side — must trigger an error
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('débit'))).toBe(true);
  });
});
