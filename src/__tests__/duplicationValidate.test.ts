/**
 * Paramètres · Lot B·3 — duplication société→société (CDC §3, critère #7).
 */
import { describe, it, expect } from 'vitest';
import { validateDuplication } from '../services/param/duplicationService';

describe('validateDuplication', () => {
  it('exige source et cible', () => {
    expect(validateDuplication('', 'B', ['sites'])).toMatch(/source et une soci/i);
    expect(validateDuplication('A', '', ['sites'])).toMatch(/source et une soci/i);
  });
  it('refuse source = cible', () => {
    expect(validateDuplication('A', 'A', ['sites'])).toMatch(/diff/i);
  });
  it('exige au moins un bloc', () => {
    expect(validateDuplication('A', 'B', [])).toMatch(/bloc/i);
  });
  it('couple valide → null', () => {
    expect(validateDuplication('A', 'B', ['parametres', 'sites'])).toBeNull();
  });
});
