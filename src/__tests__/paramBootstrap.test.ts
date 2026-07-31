/**
 * Paramètres · Lot B·3 — bootstrap tenant (CDC §22, critère #6).
 */
import { describe, it, expect } from 'vitest';
import { computeMissing } from '../services/param/paramBootstrapService';

describe('computeMissing', () => {
  it('tout présent → aucun bloc manquant', () => {
    expect(computeMissing({ hasPlan: true, nbConditions: 5, nbRoles: 8 })).toEqual([]);
  });
  it('rien présent → les 3 blocs', () => {
    expect(computeMissing({ hasPlan: false, nbConditions: 0, nbRoles: 0 })).toEqual(['plan', 'conditions', 'roles']);
  });
  it('détecte chaque bloc manquant individuellement', () => {
    expect(computeMissing({ hasPlan: false, nbConditions: 5, nbRoles: 8 })).toEqual(['plan']);
    expect(computeMissing({ hasPlan: true, nbConditions: 0, nbRoles: 8 })).toEqual(['conditions']);
    expect(computeMissing({ hasPlan: true, nbConditions: 5, nbRoles: 0 })).toEqual(['roles']);
  });
});
