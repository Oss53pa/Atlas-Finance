import { describe, it, expect } from 'vitest';
import { computeRanking, DEFAULT_CRITERIA, type BcScoringInput } from '../features/budget/services/capexScoringService';

const bc = (id: string, montant: number, van: number, over: Partial<BcScoringInput> = {}): BcScoringInput => ({
  id, libelle: id, montant, van, tri: 0.2, paybackMois: 24, categorie: 'croissance', riskPI: 6, obligatoire: false, urgence: false, ...over,
});

describe('computeRanking — priorisation CAPEX (Lot 5)', () => {
  it('sert les BC obligatoires en tête, hors classement', () => {
    const r = computeRanking([
      bc('A', 100, 500),                                  // fort VAN mais non obligatoire
      bc('B', 100, 10, { obligatoire: true, categorie: 'conformite_reglementaire' }),
    ], DEFAULT_CRITERIA, 1000);
    expect(r[0].id).toBe('B');
    expect(r[0].passe).toBe(true);
  });

  it('applique la ligne de flottaison cumulée vs enveloppe', () => {
    const r = computeRanking([bc('A', 600, 500), bc('B', 600, 400)], DEFAULT_CRITERIA, 1000);
    expect(r[0].passe).toBe(true);           // cumul 600 <= 1000
    expect(r[1].passe).toBe(false);          // cumul 1200 > 1000
  });

  it('score borné 0..100', () => {
    const r = computeRanking([bc('A', 100, 500), bc('B', 100, 10)], DEFAULT_CRITERIA, 1000);
    for (const x of r) { expect(x.score).toBeGreaterThanOrEqual(0); expect(x.score).toBeLessThanOrEqual(100); }
  });

  it('liste vide -> tableau vide', () => {
    expect(computeRanking([], DEFAULT_CRITERIA, 1000)).toEqual([]);
  });
});
