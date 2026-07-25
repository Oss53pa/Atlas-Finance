/**
 * Paramètres · Lot B·1 — résolution des paramètres (CDC Paramètres §1, critères #3).
 * Teste le résolveur pur pickParamValue (miroir de param_resolve SQL).
 */
import { describe, it, expect } from 'vitest';
import { pickParamValue, type ParamValeurRow } from '../services/param/paramService';

const row = (p: Partial<ParamValeurRow>): ParamValeurRow => ({
  portee: 'plateforme', effet_du: '2026-01-01', effet_au: null, valeur: null, statut: 'actif', ...p,
});

describe('pickParamValue — précédence de portée', () => {
  it('la portée société l’emporte sur la plateforme', () => {
    const rows = [
      row({ portee: 'plateforme', valeur: 18 }),
      row({ portee: 'societe', valeur: 20 }),
    ];
    expect(pickParamValue(rows, '2026-06-01')).toBe(20);
  });
  it('la préférence utilisateur l’emporte sur société et module', () => {
    const rows = [
      row({ portee: 'societe', valeur: 'A' }),
      row({ portee: 'module', valeur: 'B' }),
      row({ portee: 'user', valeur: 'C' }),
    ];
    expect(pickParamValue(rows, '2026-06-01')).toBe('C');
  });
});

describe('pickParamValue — effet daté (critère #3)', () => {
  const rows = [
    row({ portee: 'societe', valeur: 18, effet_du: '2020-01-01', effet_au: '2026-04-01' }),
    row({ portee: 'societe', valeur: 21, effet_du: '2026-04-01', effet_au: null }),
  ];
  it('au 15/03/2026 → l’ancienne valeur (18), même si une valeur ultérieure existe', () => {
    expect(pickParamValue(rows, '2026-03-15')).toBe(18);
  });
  it('au 01/05/2026 → la nouvelle valeur (21)', () => {
    expect(pickParamValue(rows, '2026-05-01')).toBe(21);
  });
  it('à la borne effet_au (exclue) → bascule sur la valeur suivante', () => {
    // Le 01/04 la première valeur est fermée (effet_au = 2026-04-01, exclu) et la
    // seconde commence (effet_du = 2026-04-01, inclus).
    expect(pickParamValue(rows, '2026-04-01')).toBe(21);
  });
});

describe('pickParamValue — cas limites', () => {
  it('aucune valeur éligible → undefined (repli sur défaut géré ailleurs)', () => {
    expect(pickParamValue([], '2026-06-01')).toBeUndefined();
    expect(pickParamValue([row({ effet_du: '2027-01-01' })], '2026-06-01')).toBeUndefined();
  });
  it('les valeurs non actives (brouillon/historisé) sont ignorées', () => {
    const rows = [
      row({ portee: 'societe', valeur: 99, statut: 'historise' }),
      row({ portee: 'plateforme', valeur: 10, statut: 'actif' }),
    ];
    expect(pickParamValue(rows, '2026-06-01')).toBe(10);
  });
  it('à portée égale, la valeur la plus récente gagne', () => {
    const rows = [
      row({ portee: 'societe', valeur: 1, effet_du: '2026-01-01' }),
      row({ portee: 'societe', valeur: 2, effet_du: '2026-05-01' }),
    ];
    expect(pickParamValue(rows, '2026-06-01')).toBe(2);
  });
});
