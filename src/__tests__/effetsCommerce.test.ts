/**
 * Tests for effets de commerce service.
 * Verifies: creation, transitions, accounting entries, bordereau.
 */
import { describe, it, expect } from 'vitest';
import {
  creerEffet,
  isTransitionValide,
  getTransitionsDisponibles,
  creerBordereauRemise,
  isEffetEnRetard,
  filterEffetsByStatut,
  totalParStatut,
} from '../services/tresorerie/effetsCommerceService';

describe('Effets de Commerce — OHADA', () => {

  describe('Creation', () => {
    it('should create an effet with status cree', () => {
      const effet = creerEffet({
        type: 'lettre_de_change',
        montant: 1_000_000,
        dateEcheance: '2026-06-30',
        tireur: 'Atlas Finance',
        tire: 'Client A',
        beneficiaire: 'Atlas Finance',
      });
      expect(effet.statut).toBe('cree');
      expect(effet.montant).toBe(1_000_000);
      expect(effet.type).toBe('lettre_de_change');
      expect(effet.numero).toBeTruthy();
      expect(effet.id).toBeTruthy();
      expect(effet.historique).toHaveLength(1);
    });

    it('should create billet a ordre', () => {
      const effet = creerEffet({
        type: 'billet_a_ordre',
        montant: 500_000,
        dateEcheance: '2026-09-30',
        tireur: 'Fournisseur B',
        tire: 'Atlas Finance',
        beneficiaire: 'Fournisseur B',
      });
      expect(effet.type).toBe('billet_a_ordre');
    });

    it('should round montant to 2 decimals', () => {
      const effet = creerEffet({
        type: 'lettre_de_change',
        montant: 123456.789,
        dateEcheance: '2026-12-31',
        tireur: 'A', tire: 'B', beneficiaire: 'A',
      });
      expect(effet.montant).toBe(123456.79);
    });
  });

  describe('Transitions', () => {
    it('cree → accepte should be valid', () => {
      expect(isTransitionValide('cree', 'accepte')).toBe(true);
    });

    it('accepte → remis_encaissement should be valid', () => {
      expect(isTransitionValide('accepte', 'remis_encaissement')).toBe(true);
    });

    it('accepte → remis_escompte should be valid', () => {
      expect(isTransitionValide('accepte', 'remis_escompte')).toBe(true);
    });

    it('accepte → endosse should be valid', () => {
      expect(isTransitionValide('accepte', 'endosse')).toBe(true);
    });

    it('remis_encaissement → paye should be valid via echu', () => {
      expect(isTransitionValide('remis_encaissement', 'echu')).toBe(true);
      expect(isTransitionValide('echu', 'paye')).toBe(true);
    });

    it('remis_encaissement → impaye should be valid', () => {
      expect(isTransitionValide('remis_encaissement', 'impaye')).toBe(true);
    });

    it('paye → anything should be invalid (terminal)', () => {
      expect(isTransitionValide('paye', 'cree')).toBe(false);
      expect(isTransitionValide('paye', 'impaye')).toBe(false);
    });

    it('cree → paye should be invalid (skip)', () => {
      expect(isTransitionValide('cree', 'paye')).toBe(false);
    });

    it('should list available transitions', () => {
      const t = getTransitionsDisponibles('accepte');
      expect(t).toContain('endosse');
      expect(t).toContain('remis_encaissement');
      expect(t).toContain('remis_escompte');
      expect(t).toHaveLength(3);
    });
  });

  describe('Bordereau de remise', () => {
    it('should create bordereau encaissement', () => {
      const effets = [
        creerEffet({ type: 'lettre_de_change', montant: 500_000, dateEcheance: '2026-06-30', tireur: 'A', tire: 'B', beneficiaire: 'A' }),
        creerEffet({ type: 'lettre_de_change', montant: 300_000, dateEcheance: '2026-07-31', tireur: 'A', tire: 'C', beneficiaire: 'A' }),
      ];
      const bordereau = creerBordereauRemise('encaissement', effets, 'BCEAO');
      expect(bordereau.type).toBe('encaissement');
      expect(bordereau.montantTotal).toBe(800_000);
      expect(bordereau.fraisTotal).toBe(0);
      expect(bordereau.montantNet).toBe(800_000);
      expect(bordereau.effets).toHaveLength(2);
    });

    it('should create bordereau escompte with fees', () => {
      const effets = [
        creerEffet({ type: 'lettre_de_change', montant: 1_000_000, dateEcheance: '2026-09-30', tireur: 'A', tire: 'B', beneficiaire: 'A' }),
      ];
      const bordereau = creerBordereauRemise('escompte', effets, 'SGBCI', 15_000);
      expect(bordereau.montantTotal).toBe(1_000_000);
      expect(bordereau.fraisTotal).toBe(15_000);
      expect(bordereau.montantNet).toBe(985_000);
    });
  });

  describe('Retard detection', () => {
    it('should detect past due effet', () => {
      const effet = creerEffet({
        type: 'lettre_de_change', montant: 100_000,
        dateEcheance: '2020-01-01',
        tireur: 'A', tire: 'B', beneficiaire: 'A',
      });
      effet.statut = 'accepte';
      expect(isEffetEnRetard(effet)).toBe(true);
    });

    it('should not flag paid effet as late', () => {
      const effet = creerEffet({
        type: 'lettre_de_change', montant: 100_000,
        dateEcheance: '2020-01-01',
        tireur: 'A', tire: 'B', beneficiaire: 'A',
      });
      effet.statut = 'paye';
      expect(isEffetEnRetard(effet)).toBe(false);
    });
  });

  describe('Filtering and totals', () => {
    it('should filter by status', () => {
      const effets = [
        creerEffet({ type: 'lettre_de_change', montant: 100_000, dateEcheance: '2026-06-30', tireur: 'A', tire: 'B', beneficiaire: 'A' }),
        creerEffet({ type: 'lettre_de_change', montant: 200_000, dateEcheance: '2026-07-31', tireur: 'A', tire: 'C', beneficiaire: 'A' }),
      ];
      effets[1].statut = 'accepte';
      expect(filterEffetsByStatut(effets, 'cree')).toHaveLength(1);
      expect(filterEffetsByStatut(effets, 'accepte')).toHaveLength(1);
    });

    it('should compute total by status', () => {
      const effets = [
        creerEffet({ type: 'lettre_de_change', montant: 100_000, dateEcheance: '2026-06-30', tireur: 'A', tire: 'B', beneficiaire: 'A' }),
        creerEffet({ type: 'lettre_de_change', montant: 200_000, dateEcheance: '2026-07-31', tireur: 'A', tire: 'C', beneficiaire: 'A' }),
      ];
      const totals = totalParStatut(effets);
      expect(totals['cree']).toBe(300_000);
    });
  });
});
