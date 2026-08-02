/**
 * Paramètres · Lot B·4 — candidats à l'anonymisation (CDC §13).
 */
import { describe, it, expect } from 'vitest';
import { computeCandidates, addMonths } from '../services/param/anonymizationService';

describe('addMonths', () => {
  it('ajoute des mois avec franchissement d’année', () => {
    expect(addMonths('2020-01-01', 60)).toBe('2025-01-01');
    expect(addMonths('2025-11-15', 3)).toBe('2026-02-15');
  });
});

describe('computeCandidates', () => {
  const rows = [
    { code: '411001', name: 'Ancien', derniere_activite: '2018-01-01' }, // échu (rétention 60 mois → 2023)
    { code: '411002', name: 'Récent', derniere_activite: '2025-06-01' }, // à conserver
    { code: '411003', name: 'Sans date', derniere_activite: null },      // écarté
  ];
  const c = computeCandidates(rows, 60, '2026-07-31');

  it('écarte les tiers sans dernière activité', () => {
    expect(c.find(x => x.code === '411003')).toBeUndefined();
    expect(c).toHaveLength(2);
  });
  it('calcule échéance et éligibilité', () => {
    const anc = c.find(x => x.code === '411001')!;
    expect(anc.echeance).toBe('2023-01-01');
    expect(anc.eligible).toBe(true);
    const rec = c.find(x => x.code === '411002')!;
    expect(rec.echeance).toBe('2030-06-01');
    expect(rec.eligible).toBe(false);
  });
  it('trie les éligibles en tête', () => {
    expect(c[0].eligible).toBe(true);
  });
});
