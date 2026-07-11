import { describe, it, expect } from 'vitest';
import { reaffectableAmount } from '../features/budget/services/reaffectationService';

describe('reaffectableAmount — réaffectable CAPEX (Lot 5, §18.4)', () => {
  it('= approprié − engagé ferme − réalisé', () => {
    expect(reaffectableAmount(60_000_000, 22_000_000, 5_000_000)).toBe(33_000_000);
  });
  it('jamais négatif (clampé à 0)', () => {
    expect(reaffectableAmount(60, 60, 5)).toBe(0);
  });
  it('total réaffectable si rien engagé ni réalisé', () => {
    expect(reaffectableAmount(100, 0, 0)).toBe(100);
  });
});
