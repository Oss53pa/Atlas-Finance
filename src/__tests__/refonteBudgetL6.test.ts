import { describe, it, expect } from 'vitest';
import { carryoverSummary, shiftYear } from '../features/budget/services/yearEndService';
import type { BudgetEngagement } from '../features/budget/services/engagementService';

const eng = (id: string, statut: BudgetEngagement['statut'], init: number, fact: number): BudgetEngagement => ({
  id, tenant_id: 't', source: 'manuel', external_ref: null, account_code: '6011', section_id: null,
  capex_section_projet_id: null, periode: '2027-05-01', fournisseur_libelle: null, reference_document: null,
  montant_initial: init, montant_facture: fact, montant_degage: 0, statut, motif: null, contrat_recurrent: false, created_at: '',
});

describe('carryoverSummary — dégagement fin d’exercice (Lot 6, §9)', () => {
  it('ne compte que les engagements ouverts et somme le reliquat', () => {
    const s = carryoverSummary([
      eng('a', 'ouvert', 1000, 0),                 // reliquat 1000
      eng('b', 'partiellement_facture', 1000, 600),// reliquat 400
      eng('c', 'solde', 1000, 1000),               // ignoré
      eng('d', 'annule', 1000, 0),                 // ignoré
    ]);
    expect(s.count).toBe(2);
    expect(s.totalReliquat).toBe(1400);
  });
});

describe('shiftYear — report de période sur N+1', () => {
  it('décale d’un an en gardant le mois', () => {
    expect(shiftYear('2027-03-01')).toBe('2028-03-01');
    expect(shiftYear('2027-12-01')).toBe('2028-12-01');
  });
});
