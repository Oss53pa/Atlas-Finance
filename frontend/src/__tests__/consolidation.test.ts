/**
 * Tests for consolidation multi-societes service.
 * Verifies: method determination, minority interests, elimination, perimeter.
 */
import { describe, it, expect } from 'vitest';
import {
  determinerMethode,
  calculerInteretsMinoritaires,
  calculerPartGroupe,
  identifierOperationsIntraGroupe,
  eliminerOperationsIntraGroupe,
  consoliderLigne,
  construirePerimetre,
  validerPerimetre,
  type Societe,
  type LienParticipation,
  type OperationIntraGroupe,
} from '../services/cdg/consolidationService';

describe('Consolidation Multi-Societes — SYSCOHADA', () => {

  describe('Methode determination', () => {
    it('>50% → integration globale', () => {
      expect(determinerMethode(51)).toBe('integration_globale');
      expect(determinerMethode(100)).toBe('integration_globale');
      expect(determinerMethode(75)).toBe('integration_globale');
    });

    it('20-50% → mise en equivalence', () => {
      expect(determinerMethode(20)).toBe('mise_en_equivalence');
      expect(determinerMethode(50)).toBe('mise_en_equivalence');
      expect(determinerMethode(35)).toBe('mise_en_equivalence');
    });

    it('<20% → non consolide', () => {
      expect(determinerMethode(19)).toBe('non_consolide');
      expect(determinerMethode(5)).toBe('non_consolide');
      expect(determinerMethode(0)).toBe('non_consolide');
    });
  });

  describe('Interets minoritaires', () => {
    it('should compute minority share correctly', () => {
      // Filiale result 10M, detention 80% → minoritaire = 20% of 10M = 2M
      expect(calculerInteretsMinoritaires(10_000_000, 80)).toBe(2_000_000);
    });

    it('should be 0 for 100% owned subsidiary', () => {
      expect(calculerInteretsMinoritaires(5_000_000, 100)).toBe(0);
    });

    it('should handle negative results (loss)', () => {
      expect(calculerInteretsMinoritaires(-2_000_000, 70)).toBe(-600_000);
    });
  });

  describe('Part du groupe', () => {
    it('should compute group share', () => {
      expect(calculerPartGroupe(10_000_000, 80)).toBe(8_000_000);
    });

    it('should handle 100% ownership', () => {
      expect(calculerPartGroupe(5_000_000, 100)).toBe(5_000_000);
    });
  });

  describe('Intra-group operations', () => {
    const ops: OperationIntraGroupe[] = [
      { id: '1', societeDebitrice: 'S1', societeCreditrice: 'S2', montant: 1_000_000, nature: 'Vente', compte: '701', eliminee: false },
      { id: '2', societeDebitrice: 'S1', societeCreditrice: 'S3', montant: 500_000, nature: 'Pret', compte: '274', eliminee: false },
      { id: '3', societeDebitrice: 'S1', societeCreditrice: 'EXT', montant: 800_000, nature: 'Vente externe', compte: '701', eliminee: false },
    ];

    it('should identify intra-group operations', () => {
      const intra = identifierOperationsIntraGroupe(ops, ['S1', 'S2', 'S3']);
      expect(intra).toHaveLength(2);
    });

    it('should exclude external operations', () => {
      const intra = identifierOperationsIntraGroupe(ops, ['S1', 'S2', 'S3']);
      expect(intra.find(o => o.id === '3')).toBeUndefined();
    });

    it('should eliminate and compute total', () => {
      const intra = identifierOperationsIntraGroupe(ops, ['S1', 'S2', 'S3']);
      const { eliminated, totalElimine } = eliminerOperationsIntraGroupe(intra);
      expect(eliminated.every(o => o.eliminee)).toBe(true);
      expect(totalElimine).toBe(1_500_000);
    });
  });

  describe('Line consolidation', () => {
    it('should consolidate with integration globale (100% of subsidiary)', () => {
      const ligne = consoliderLigne(
        '701', 'Ventes',
        5_000_000,
        [{ societeId: 'F1', montant: 3_000_000, pourcentage: 80, methode: 'integration_globale' }],
        500_000
      );
      // Mere 5M + Filiale 3M (100%) - Elimination 0.5M = 7.5M
      expect(ligne.montantConsolide).toBe(7_500_000);
      expect(ligne.montantsFiliales['F1']).toBe(3_000_000);
    });

    it('should consolidate with mise en equivalence', () => {
      const ligne = consoliderLigne(
        '26', 'Titres',
        0,
        [{ societeId: 'F2', montant: 10_000_000, pourcentage: 30, methode: 'mise_en_equivalence' }]
      );
      // 30% of 10M = 3M
      expect(ligne.montantConsolide).toBe(3_000_000);
    });

    it('should exclude non-consolidated entities', () => {
      const ligne = consoliderLigne(
        '701', 'Ventes',
        1_000_000,
        [{ societeId: 'F3', montant: 5_000_000, pourcentage: 10, methode: 'non_consolide' }]
      );
      expect(ligne.montantConsolide).toBe(1_000_000);
      expect(ligne.montantsFiliales['F3']).toBe(0);
    });
  });

  describe('Perimetre construction', () => {
    const mere: Societe = { id: 'M1', code: 'ATLAS', nom: 'Atlas Finance', devise: 'XAF', estMere: true };
    const filiale1: Societe = { id: 'F1', code: 'FIL1', nom: 'Filiale Cameroun', devise: 'XAF', estMere: false };
    const filiale2: Societe = { id: 'F2', code: 'FIL2', nom: 'Filiale CI', devise: 'XOF', estMere: false };

    const participations: LienParticipation[] = [
      { id: 'P1', societeMereId: 'M1', filialId: 'F1', pourcentageDetention: 80, pourcentageControle: 80, methodeConsolidation: 'integration_globale', dateAcquisition: '2020-01-01', ecartAcquisition: 500_000 },
      { id: 'P2', societeMereId: 'M1', filialId: 'F2', pourcentageDetention: 30, pourcentageControle: 30, methodeConsolidation: 'mise_en_equivalence', dateAcquisition: '2022-06-01', ecartAcquisition: 200_000 },
    ];

    it('should include mother + consolidated subsidiaries', () => {
      const perimetre = construirePerimetre(mere, participations, [mere, filiale1, filiale2]);
      expect(perimetre.societes).toHaveLength(3);
    });

    it('should validate clean perimeter', () => {
      const perimetre = construirePerimetre(mere, participations, [mere, filiale1, filiale2]);
      const errors = validerPerimetre(perimetre);
      expect(errors).toHaveLength(0);
    });

    it('should detect circular reference', () => {
      const badParticipations: LienParticipation[] = [
        { id: 'P1', societeMereId: 'M1', filialId: 'M1', pourcentageDetention: 100, pourcentageControle: 100, methodeConsolidation: 'integration_globale', dateAcquisition: '2020-01-01', ecartAcquisition: 0 },
      ];
      const perimetre = construirePerimetre(mere, badParticipations, [mere]);
      const errors = validerPerimetre(perimetre);
      expect(errors.some(e => e.includes('circulaire'))).toBe(true);
    });
  });
});
