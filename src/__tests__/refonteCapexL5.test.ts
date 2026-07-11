import { describe, it, expect } from 'vitest';
import { aggregateCashflows } from '../features/budget/services/capexBcService';

describe('aggregateCashflows — agrégation des flux par année (Lot 5)', () => {
  it('somme les flux d’une même année et remplit les années vides', () => {
    const flows = aggregateCashflows([
      { annee: 1, montant: 100 }, { annee: 1, montant: 50 }, { annee: 3, montant: 200 },
    ]);
    expect(flows).toEqual([150, 0, 200]);
  });

  it('ignore l’année 0 (investissement traité à part)', () => {
    expect(aggregateCashflows([{ annee: 0, montant: 999 }, { annee: 1, montant: 10 }])).toEqual([10]);
  });

  it('renvoie un tableau vide sans cashflow', () => {
    expect(aggregateCashflows([])).toEqual([]);
  });
});
