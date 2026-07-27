/**
 * Paramètres · Lot B·3 — bridge fiscal ↔ socle (décision P-fisc).
 */
import { describe, it, expect } from 'vitest';
import { pickFiscalValue, FISCAL_KEYS } from '../services/param/fiscalBridge';
import { resolveFiscalParameters } from '../services/fiscal/fiscalParameters';

describe('pickFiscalValue', () => {
  it('la surcharge tenant prime sur le défaut TS', () => {
    expect(pickFiscalValue(30, 25)).toBe(30);
  });
  it('sans surcharge → défaut TS', () => {
    expect(pickFiscalValue(undefined, 25)).toBe(25);
    expect(pickFiscalValue(null, 25)).toBe(25);
  });
  it('une surcharge à 0 est respectée (0 ≠ absence)', () => {
    expect(pickFiscalValue(0, 25)).toBe(0);
  });
});

describe('FISCAL_KEYS — extraction du référentiel TS', () => {
  it('extrait les scalaires du jeu CI courant sans casser', () => {
    const { parameters } = resolveFiscalParameters('CI', 2026);
    for (const d of FISCAL_KEYS) {
      const v = d.get(parameters);
      // chaque extracteur renvoie un nombre ou null, jamais undefined.
      expect(v === null || typeof v === 'number').toBe(true);
    }
    // le taux d'IS standard CI est renseigné et positif.
    const isTaux = FISCAL_KEYS.find(k => k.key === 'is_taux')!.get(parameters);
    expect(typeof isTaux).toBe('number');
    expect(isTaux as number).toBeGreaterThan(0);
  });
});
