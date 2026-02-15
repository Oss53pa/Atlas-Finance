/**
 * Tests for reevaluation service (SYSCOHADA revise).
 * Verifies: VNC calculation, ecart, depreciation recalculation.
 */
import { describe, it, expect } from 'vitest';
import {
  calculerVNC,
  calculerEcartReevaluation,
  recalculerAmortissement,
} from '../services/immobilisations/reevaluationService';

describe('Reevaluation des immobilisations — SYSCOHADA', () => {

  describe('VNC calculation', () => {
    it('should compute VNC = acquisition - cumulated depreciation', () => {
      expect(calculerVNC(10_000_000, 4_000_000)).toBe(6_000_000);
    });

    it('should return 0 for fully depreciated asset', () => {
      expect(calculerVNC(5_000_000, 5_000_000)).toBe(0);
    });

    it('should handle zero depreciation', () => {
      expect(calculerVNC(3_000_000, 0)).toBe(3_000_000);
    });
  });

  describe('Ecart de reevaluation', () => {
    it('should compute ecart = nouvelle valeur - VNC', () => {
      expect(calculerEcartReevaluation(8_000_000, 6_000_000)).toBe(2_000_000);
    });

    it('should return negative for downward adjustment', () => {
      expect(calculerEcartReevaluation(4_000_000, 6_000_000)).toBe(-2_000_000);
    });

    it('should return 0 for no change', () => {
      expect(calculerEcartReevaluation(6_000_000, 6_000_000)).toBe(0);
    });
  });

  describe('Post-revaluation depreciation recalculation', () => {
    it('should compute new annual depreciation', () => {
      // Nouvelle valeur 8M, residuelle 0, 4 ans restant → 2M/an
      expect(recalculerAmortissement(8_000_000, 0, 4)).toBe(2_000_000);
    });

    it('should account for residual value', () => {
      // Nouvelle valeur 10M, residuelle 2M, 5 ans → (10-2)/5 = 1.6M
      expect(recalculerAmortissement(10_000_000, 2_000_000, 5)).toBe(1_600_000);
    });

    it('should return 0 for zero remaining life', () => {
      expect(recalculerAmortissement(5_000_000, 0, 0)).toBe(0);
    });

    it('should handle fractional years', () => {
      const result = recalculerAmortissement(6_000_000, 0, 3);
      expect(result).toBe(2_000_000);
    });
  });

  describe('Full revaluation scenario', () => {
    it('should correctly chain: VNC → ecart → new depreciation', () => {
      // Asset: acquired 10M, 4M depreciated, 5 years total, 3 years passed
      const vnc = calculerVNC(10_000_000, 4_000_000); // 6M
      expect(vnc).toBe(6_000_000);

      // Revalue to 9M
      const ecart = calculerEcartReevaluation(9_000_000, vnc); // 3M
      expect(ecart).toBe(3_000_000);

      // Remaining life: 2 years
      const newDepreciation = recalculerAmortissement(9_000_000, 0, 2); // 4.5M
      expect(newDepreciation).toBe(4_500_000);
    });
  });
});
