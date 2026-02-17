/**
 * Tests for regularisations service (CCA, FNP, FAE, PCA).
 * Verifies: prorata calculations, correct SYSCOHADA accounts.
 */
import { describe, it, expect } from 'vitest';
import {
  calculerCCA,
  calculerFNP,
  calculerFAE,
  calculerPCA,
  creerRegularisation,
} from '../services/cloture/regularisationsService';

describe('Regularisations CCA/FNP/FAE/PCA', () => {

  describe('CCA — Charges constatees d\'avance', () => {
    it('should compute prorata temporis correctly', () => {
      // Charge annuelle 12M, du 01/07 au 30/06 N+1, cloture 31/12
      // 6 mois sur 12 reportes → 6M
      const result = calculerCCA({
        montantCharge: 12_000_000,
        dateDebut: '2026-07-01',
        dateFin: '2027-06-30',
        dateClotureExercice: '2026-12-31',
      });
      // ~6M (roughly half)
      expect(result).toBeGreaterThan(5_500_000);
      expect(result).toBeLessThan(6_500_000);
    });

    it('should return 0 if charge ends before cloture', () => {
      const result = calculerCCA({
        montantCharge: 1_000_000,
        dateDebut: '2026-01-01',
        dateFin: '2026-06-30',
        dateClotureExercice: '2026-12-31',
      });
      expect(result).toBe(0);
    });

    it('should compute full amount if charge starts at cloture', () => {
      const result = calculerCCA({
        montantCharge: 1_200_000,
        dateDebut: '2026-12-31',
        dateFin: '2027-12-31',
        dateClotureExercice: '2026-12-31',
      });
      // Almost full amount (365/366 days)
      expect(result).toBeGreaterThan(1_100_000);
    });
  });

  describe('FNP — Factures non parvenues', () => {
    it('should return estimated amount rounded to 2 decimals', () => {
      const result = calculerFNP({ montantEstime: 500_000.567, description: 'Facture X' });
      expect(result).toBe(500_000.57);
    });
  });

  describe('FAE — Factures a etablir', () => {
    it('should return product amount rounded to 2 decimals', () => {
      const result = calculerFAE(300_000.123);
      expect(result).toBe(300_000.12);
    });
  });

  describe('PCA — Produits constates d\'avance', () => {
    it('should use same prorata as CCA', () => {
      const pca = calculerPCA(
        6_000_000,
        '2026-10-01',
        '2027-03-31',
        '2026-12-31'
      );
      // 3 mois sur 6 reportes → ~3M
      expect(pca).toBeGreaterThan(2_500_000);
      expect(pca).toBeLessThan(3_500_000);
    });
  });

  describe('creerRegularisation', () => {
    it('should create CCA regularisation with correct account 476', () => {
      const regul = creerRegularisation(
        'CCA', 'Assurance annuelle', 600_000, '616', '2026-12', '2027-01', true
      );
      expect(regul.type).toBe('CCA');
      expect(regul.compteRegularisation).toBe('476');
      expect(regul.compteCharge).toBe('616');
      expect(regul.extourneAuto).toBe(true);
      expect(regul.statut).toBe('proposee');
      expect(regul.montant).toBe(600_000);
    });

    it('should create FNP regularisation with account 408', () => {
      const regul = creerRegularisation(
        'FNP', 'Electricite dec.', 150_000, '605', '2026-12', '2027-01'
      );
      expect(regul.compteRegularisation).toBe('408');
    });

    it('should create FAE regularisation with account 418', () => {
      const regul = creerRegularisation(
        'FAE', 'Prestation livree', 800_000, '706', '2026-12', '2027-01'
      );
      expect(regul.compteRegularisation).toBe('418');
    });

    it('should create PCA regularisation with account 477', () => {
      const regul = creerRegularisation(
        'PCA', 'Abonnement anticipe', 200_000, '706', '2026-12', '2027-01'
      );
      expect(regul.compteRegularisation).toBe('477');
    });

    it('should have a UUID id', () => {
      const regul = creerRegularisation('CCA', 'Test', 100, '616', '2026-12', '2027-01');
      expect(regul.id).toBeTruthy();
      expect(regul.id.length).toBeGreaterThan(10);
    });
  });
});
