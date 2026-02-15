/**
 * Tests for affectation du resultat service.
 * Verifies: reserve legale calculation, ventilation validation, entry generation.
 */
import { describe, it, expect } from 'vitest';
import {
  calculerPlafondReserveLegale,
  calculerDotationReserveLegale,
  proposerAffectation,
  validerVentilation,
} from '../services/cloture/affectationResultatService';

describe('Affectation du Resultat — SYSCOHADA', () => {

  describe('Reserve legale calculation', () => {
    it('should compute ceiling at 20% of capital', () => {
      // Capital 10M, reserve actuelle 0 → plafond = 2M
      expect(calculerPlafondReserveLegale(10_000_000, 0)).toBe(2_000_000);
    });

    it('should compute remaining ceiling correctly', () => {
      // Capital 10M, reserve actuelle 1.5M → plafond restant = 0.5M
      expect(calculerPlafondReserveLegale(10_000_000, 1_500_000)).toBe(500_000);
    });

    it('should return 0 when reserve is at or above ceiling', () => {
      expect(calculerPlafondReserveLegale(10_000_000, 2_000_000)).toBe(0);
      expect(calculerPlafondReserveLegale(10_000_000, 3_000_000)).toBe(0);
    });
  });

  describe('Legal reserve dotation (10% of profit)', () => {
    it('should compute 10% of profit', () => {
      // Profit 5M, capital 50M, reserve 0 → dotation = 500K
      expect(calculerDotationReserveLegale(5_000_000, 50_000_000, 0)).toBe(500_000);
    });

    it('should cap at remaining ceiling', () => {
      // Profit 5M (10% = 500K), capital 10M (plafond 2M), reserve 1.8M (restant 200K)
      expect(calculerDotationReserveLegale(5_000_000, 10_000_000, 1_800_000)).toBe(200_000);
    });

    it('should return 0 for losses', () => {
      expect(calculerDotationReserveLegale(-1_000_000, 10_000_000, 0)).toBe(0);
    });

    it('should return 0 when ceiling is reached', () => {
      expect(calculerDotationReserveLegale(1_000_000, 10_000_000, 2_000_000)).toBe(0);
    });
  });

  describe('Proposed affectation', () => {
    it('should propose correct allocation for profit', () => {
      const prop = proposerAffectation(5_000_000, 50_000_000, 0);
      expect(prop.detail.isBenefice).toBe(true);
      expect(prop.ventilation.reserveLegale).toBe(500_000);
      expect(prop.ventilation.reportANouveau).toBe(4_500_000);
      expect(prop.ventilation.dividendes).toBe(0);
    });

    it('should handle loss correctly', () => {
      const prop = proposerAffectation(-2_000_000, 10_000_000, 500_000);
      expect(prop.detail.isBenefice).toBe(false);
      expect(prop.ventilation.reserveLegale).toBe(0);
      expect(prop.ventilation.reportANouveau).toBe(-2_000_000);
    });

    it('should verify total = result', () => {
      const prop = proposerAffectation(10_000_000, 100_000_000, 0);
      const total = prop.ventilation.reserveLegale +
        prop.ventilation.reservesStatutaires +
        prop.ventilation.reservesFacultatives +
        prop.ventilation.dividendes +
        prop.ventilation.reportANouveau;
      expect(Math.abs(total - 10_000_000)).toBeLessThan(0.01);
    });
  });

  describe('Ventilation validation', () => {
    it('should accept valid ventilation', () => {
      const errors = validerVentilation(5_000_000, {
        reserveLegale: 500_000,
        reservesStatutaires: 0,
        reservesFacultatives: 1_000_000,
        dividendes: 2_000_000,
        reportANouveau: 1_500_000,
      });
      expect(errors).toHaveLength(0);
    });

    it('should reject ventilation not summing to result', () => {
      const errors = validerVentilation(5_000_000, {
        reserveLegale: 500_000,
        reservesStatutaires: 0,
        reservesFacultatives: 0,
        dividendes: 0,
        reportANouveau: 0,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('ne correspond pas');
    });

    it('should reject negative reserve legale', () => {
      const errors = validerVentilation(5_000_000, {
        reserveLegale: -100,
        reservesStatutaires: 0,
        reservesFacultatives: 0,
        dividendes: 0,
        reportANouveau: 5_000_100,
      });
      expect(errors.some(e => e.includes('negative'))).toBe(true);
    });

    it('should reject negative dividends', () => {
      const errors = validerVentilation(5_000_000, {
        reserveLegale: 0,
        reservesStatutaires: 0,
        reservesFacultatives: 0,
        dividendes: -1000,
        reportANouveau: 5_001_000,
      });
      expect(errors.some(e => e.includes('negatif'))).toBe(true);
    });
  });
});
