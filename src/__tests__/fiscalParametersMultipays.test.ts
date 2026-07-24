/**
 * Paramètres CGI multi-pays — complétude et prudence (jeux indicatifs).
 *
 * Vérifie que les 14 pays UEMOA+CEMAC sont paramétrés, que CI reste
 * authoritative (non provisoire) et que tous les autres sont marqués
 * provisoires avec avertissement — pour ne pas présenter de l'indicatif comme
 * de l'officiel.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveFiscalParameters,
  getFiscalCountries,
} from '../services/fiscal/fiscalParameters';
import { OHADA_COUNTRIES } from '../services/fiscal/ohadaCountries';

describe('couverture multi-pays', () => {
  it('paramètre les 14 pays UEMOA + CEMAC', () => {
    const countries = getFiscalCountries();
    for (const c of OHADA_COUNTRIES) {
      expect(countries).toContain(c.code);
    }
  });

  it('associe la bonne devise à chaque zone', () => {
    for (const c of OHADA_COUNTRIES) {
      const r = resolveFiscalParameters(c.code, 2026);
      expect(r.parameters.currency).toBe(c.currency);
    }
  });
});

describe('honnêteté des jeux indicatifs', () => {
  it('CI est authoritative (non provisoire)', () => {
    const r = resolveFiscalParameters('CI', 2026);
    expect(r.fallback).toBe(false);
    expect(r.provisional).toBe(false);
    expect(r.warning).toBeUndefined();
  });

  it('les autres pays sont provisoires et avertissent', () => {
    for (const c of OHADA_COUNTRIES.filter(x => x.code !== 'CI')) {
      const r = resolveFiscalParameters(c.code, 2026);
      expect(r.provisional).toBe(true);
      expect(r.warning).toBeTruthy();
      expect(r.warning).toMatch(/VALIDER|indicatif/i);
    }
  });

  it('propage le caractère provisoire même en repli d’année', () => {
    // 2030 : pas de jeu exact → repli sur 2026 (provisoire) du même pays.
    const r = resolveFiscalParameters('SN', 2030);
    expect(r.fallback).toBe(true);
    expect(r.provisional).toBe(true);
    expect(r.warning).toMatch(/VALIDER/i);
  });
});

describe('taux têtes de chapitre', () => {
  it('applique les taux IS/TVA attendus (échantillon)', () => {
    expect(resolveFiscalParameters('SN', 2026).parameters.is.rateStandard).toBe(30);
    expect(resolveFiscalParameters('CM', 2026).parameters.vatRateStandard).toBe(19.25);
    expect(resolveFiscalParameters('GA', 2026).parameters.currency).toBe('XAF');
    expect(resolveFiscalParameters('TG', 2026).parameters.is.rateStandard).toBe(27);
  });

  it('un pays hors OHADA replie sur CI avec avertissement fort', () => {
    const r = resolveFiscalParameters('FR', 2026);
    expect(r.fallback).toBe(true);
    expect(r.provisional).toBe(true);
    expect(r.parameters.countryCode).toBe('CI');
  });
});
