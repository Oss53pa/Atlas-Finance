/**
 * Moteur de rattachement assisté des lignes collectives orphelines.
 * Vérifie que les propositions sont pertinentes ET prudentes : pas de
 * correspondance sur les seules formes juridiques, respect de la famille
 * (client 41x / fournisseur 40x), bonus explicite sur le compte auxiliaire.
 */
import { describe, it, expect } from 'vitest';
import { suggestTiers, type OrphanLine } from '../services/tiers/orphanLines';

const line = (partial: Partial<OrphanLine> = {}): OrphanLine => ({
  lineId: 'L1',
  entryId: 'E1',
  entryNumber: 'AC-000001',
  date: '2026-07-05',
  journal: 'AC',
  accountCode: '401',
  label: 'Facture ETS BOLLORE LOGISTICS 07/2026',
  debit: 0,
  credit: 150_000,
  famille: 'fournisseur',
  ...partial,
});

const tiers = [
  { code: 'F001', name: 'BOLLORE LOGISTICS', type: 'supplier' as const, accountCode: '401001' },
  { code: 'F002', name: 'SARL', type: 'supplier' as const, accountCode: '401002' },
  { code: 'F003', name: 'TOTAL ENERGIES', type: 'supplier' as const, accountCode: '401003' },
  { code: 'C001', name: 'BOLLORE LOGISTICS', type: 'customer' as const, accountCode: '411001' },
];

describe('suggestTiers', () => {
  it('propose la fiche dont le nom complet figure dans le libellé', () => {
    const s = suggestTiers(line(), tiers);
    expect(s[0].code).toBe('F001');
    expect(s[0].score).toBeGreaterThanOrEqual(100);
    expect(s[0].reason).toContain('nom complet');
  });

  it('ignore les fiches réduites à une forme juridique (SARL, SA…)', () => {
    const s = suggestTiers(line({ label: 'Facture SARL du mois' }), tiers);
    expect(s.some(x => x.code === 'F002')).toBe(false);
  });

  it('respecte la famille : une ligne 41x ne propose pas un fournisseur', () => {
    const s = suggestTiers(line({ accountCode: '411', famille: 'client' }), tiers);
    expect(s.map(x => x.code)).toContain('C001');
    expect(s.map(x => x.code)).not.toContain('F001');
  });

  it('bonifie la fiche dont le compte auxiliaire est exactement celui de la ligne', () => {
    const s = suggestTiers(line({ accountCode: '401001' }), tiers);
    expect(s[0].code).toBe('F001');
    expect(s[0].reason).toContain('401001');
  });

  it('ne propose rien quand le libellé ne contient aucun nom connu', () => {
    expect(suggestTiers(line({ label: 'Regularisation diverse' }), tiers)).toHaveLength(0);
  });

  it('ne propose rien sur un libellé vide (pas de devinette)', () => {
    expect(suggestTiers(line({ label: '' }), tiers)).toHaveLength(0);
  });
});
