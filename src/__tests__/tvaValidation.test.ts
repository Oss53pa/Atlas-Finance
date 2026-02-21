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

describe('Calculs TVA — Precision Money class (gros montants)', () => {
  it('TVA 18% sur 1 000 000 = 180 000 exactement', () => {
    expect(TVAValidator.calculerTVA(1_000_000, 18)).toBe(180_000);
  });

  it('TVA 18% sur 999 999 999 = 180 000 000 (pas 179 999 999.82)', () => {
    expect(TVAValidator.calculerTVA(999_999_999, 18)).toBe(180_000_000);
  });

  it('TVA 9% (taux reduit) sur 5 000 000 = 450 000', () => {
    expect(TVAValidator.calculerTVA(5_000_000, 9)).toBe(450_000);
  });

  it('TVA 19.25% (Cameroun) sur 10 000 000 = 1 925 000', () => {
    expect(TVAValidator.calculerTVA(10_000_000, 19.25)).toBe(1_925_000);
  });

  it('TVA 20% sur 7 777 777 = 1 555 555', () => {
    expect(TVAValidator.calculerTVA(7_777_777, 20)).toBe(1_555_555);
  });

  it('calculerHT(1 180 000, 18) redonne 1 000 000', () => {
    expect(TVAValidator.calculerHT(1_180_000, 18)).toBe(1_000_000);
  });

  it('calculerHT(5 450 000, 9) redonne 5 000 000', () => {
    expect(TVAValidator.calculerHT(5_450_000, 9)).toBe(5_000_000);
  });

  it('coherence aller-retour HT -> TTC -> HT pour 1 000 000 a 18%', () => {
    const ht = 1_000_000;
    const ttc = TVAValidator.calculerTTC(ht, 18);
    const htRetour = TVAValidator.calculerHT(ttc, 18);
    expect(htRetour).toBe(ht);
  });

  it('TTC de 999 999 999 a 18% = 1 179 999 999', () => {
    expect(TVAValidator.calculerTTC(999_999_999, 18)).toBe(1_179_999_999);
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
