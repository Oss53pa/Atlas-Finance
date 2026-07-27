/**
 * Portefeuille cabinet — synthèse (logique pure ; l'agrégation cross-tenant est
 * côté serveur, vérifiée en live).
 */

import { describe, it, expect } from 'vitest';
import { portfolioSummary, type CabinetDossier } from '../services/cabinet/cabinetPortfolioService';

const dossier = (o: Partial<CabinetDossier>): CabinetDossier => ({
  id: o.id ?? 'x', nom: o.nom ?? 'X', role: o.role ?? 'Comptable',
  exercice: o.exercice ?? { name: '2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false },
  entries: o.entries ?? 0, lastActivity: o.lastActivity ?? null,
  produits: o.produits ?? 0, charges: o.charges ?? 0, resultat: o.resultat ?? 0,
  code: o.code, pays: o.pays,
});

describe('portfolioSummary', () => {
  it('agrège dossiers, résultat cumulé, clôturés/ouverts/inactifs', () => {
    const s = portfolioSummary([
      dossier({ id: 'a', resultat: 500, entries: 100 }),
      dossier({ id: 'b', resultat: -200, entries: 50, exercice: { name: '2025', startDate: '2025-01-01', endDate: '2025-12-31', isClosed: true } }),
      dossier({ id: 'c', resultat: 0, entries: 0 }), // inactif
    ]);
    expect(s.nbDossiers).toBe(3);
    expect(s.resultatCumule).toBe(300);
    expect(s.clotures).toBe(1);
    expect(s.ouverts).toBe(2);
    expect(s.inactifs).toBe(1);
  });

  it('portefeuille vide → tout à zéro', () => {
    const s = portfolioSummary([]);
    expect(s.nbDossiers).toBe(0);
    expect(s.resultatCumule).toBe(0);
    expect(s.inactifs).toBe(0);
  });
});
