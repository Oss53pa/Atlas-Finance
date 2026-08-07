/**
 * Paramètres · Lot B·3 — duplication société→société (CDC §3, critère #7).
 */
import { describe, it, expect } from 'vitest';
import { validateDuplication } from '../services/param/duplicationService';

describe('validateDuplication', () => {
  it('exige source et cible', () => {
    expect(validateDuplication('', 'B', ['sites'])).toBe('source_target_required');
    expect(validateDuplication('A', '', ['sites'])).toBe('source_target_required');
  });
  it('refuse source = cible', () => {
    expect(validateDuplication('A', 'A', ['sites'])).toBe('same_company');
  });
  it('exige au moins un bloc', () => {
    expect(validateDuplication('A', 'B', [])).toBe('no_block');
  });
  it('couple valide → null', () => {
    expect(validateDuplication('A', 'B', ['parametres', 'sites'])).toBeNull();
  });
});
