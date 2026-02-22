import { describe, it, expect } from 'vitest'
import {
  calculerPlafondReserveLegale,
  calculerDotationReserveLegale,
  proposerAffectation,
  validerVentilation,
} from '../src/services/affectationResultatService'

describe('affectationResultatService', () => {
  describe('calculerPlafondReserveLegale', () => {
    it('plafond = 20% du capital - reserve existante', () => {
      expect(calculerPlafondReserveLegale(10_000_000, 0)).toBe(2_000_000)
      expect(calculerPlafondReserveLegale(10_000_000, 1_000_000)).toBe(1_000_000)
      expect(calculerPlafondReserveLegale(10_000_000, 2_000_000)).toBe(0)
    })

    it('retourne 0 si reserve depasse le plafond', () => {
      expect(calculerPlafondReserveLegale(10_000_000, 3_000_000)).toBe(0)
    })
  })

  describe('calculerDotationReserveLegale', () => {
    it('10% du resultat, plafonne', () => {
      expect(calculerDotationReserveLegale(5_000_000, 10_000_000, 0)).toBe(500_000)
    })

    it('0 si resultat negatif', () => {
      expect(calculerDotationReserveLegale(-1_000_000, 10_000_000, 0)).toBe(0)
    })

    it('plafonne au restant du plafond', () => {
      // Plafond = 2M, reserve = 1.8M → restant = 200K
      // 10% de 5M = 500K > 200K → plafonné à 200K
      expect(calculerDotationReserveLegale(5_000_000, 10_000_000, 1_800_000)).toBe(200_000)
    })
  })

  describe('proposerAffectation', () => {
    it('propose benefice avec reserve legale + report', () => {
      const prop = proposerAffectation(10_000_000, 50_000_000, 0)
      expect(prop.detail.isBenefice).toBe(true)
      expect(prop.ventilation.reserveLegale).toBe(1_000_000)
      expect(prop.ventilation.reportANouveau).toBe(9_000_000)
    })

    it('total = resultat net', () => {
      const prop = proposerAffectation(10_000_000, 50_000_000, 0)
      const total = prop.ventilation.reserveLegale +
        prop.ventilation.reservesStatutaires +
        prop.ventilation.reservesFacultatives +
        prop.ventilation.dividendes +
        prop.ventilation.reportANouveau
      expect(Math.abs(total - 10_000_000)).toBeLessThan(0.01)
    })

    it('perte → report a nouveau negatif', () => {
      const prop = proposerAffectation(-3_000_000, 50_000_000, 0)
      expect(prop.detail.isBenefice).toBe(false)
      expect(prop.ventilation.reportANouveau).toBe(-3_000_000)
    })
  })

  describe('validerVentilation', () => {
    it('valide si total = resultat', () => {
      const errors = validerVentilation(10_000_000, {
        reserveLegale: 1_000_000,
        reservesStatutaires: 0,
        reservesFacultatives: 0,
        dividendes: 2_000_000,
        reportANouveau: 7_000_000,
      })
      expect(errors).toHaveLength(0)
    })

    it('erreur si total != resultat', () => {
      const errors = validerVentilation(10_000_000, {
        reserveLegale: 1_000_000,
        reservesStatutaires: 0,
        reservesFacultatives: 0,
        dividendes: 0,
        reportANouveau: 0,
      })
      expect(errors.length).toBeGreaterThan(0)
    })

    it('erreur si montant negatif', () => {
      const errors = validerVentilation(10_000_000, {
        reserveLegale: -1,
        reservesStatutaires: 0,
        reservesFacultatives: 0,
        dividendes: 0,
        reportANouveau: 10_000_001,
      })
      expect(errors.some(e => e.includes('negative'))).toBe(true)
    })
  })
})
