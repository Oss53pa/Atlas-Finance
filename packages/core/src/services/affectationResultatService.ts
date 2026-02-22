/**
 * @atlas/core — Affectation du resultat de l'exercice (logique pure).
 * Conforme SYSCOHADA revise — repartition du benefice ou traitement de la perte.
 *
 * Fonctions PURES : pas de Dexie, pas de DB, pas d'I/O.
 * Les donnees arrivent en parametre, les resultats sortent en retour.
 */
import { Money, money, percentage } from '../Money'

// ============================================================================
// TYPES
// ============================================================================

export interface AffectationVentilation {
  reserveLegale: number
  reservesStatutaires: number
  reservesFacultatives: number
  dividendes: number
  reportANouveau: number
}

export interface AffectationDetail {
  resultatNet: number
  isBenefice: boolean
  plafondReserveLegale: number
  dotationReserveLegaleMax: number
  ventilationFinale: AffectationVentilation
  totalAffecte: number
  ecart: number
}

export interface PropositionAffectation {
  ventilation: AffectationVentilation
  detail: AffectationDetail
}

// Comptes SYSCOHADA
export const COMPTES_AFFECTATION = {
  RESULTAT_BENEFICE: '131',
  RESULTAT_PERTE: '139',
  RESERVE_LEGALE: '111',
  RESERVES_STATUTAIRES: '112',
  RESERVES_FACULTATIVES: '118',
  DIVIDENDES_A_PAYER: '465',
  REPORT_A_NOUVEAU_CREDITEUR: '121',
  REPORT_A_NOUVEAU_DEBITEUR: '129',
} as const

// ============================================================================
// FUNCTIONS PURES
// ============================================================================

/**
 * Calculate the maximum legal reserve contribution.
 * OHADA: reserve legale capped at 20% of share capital.
 */
export function calculerPlafondReserveLegale(capitalSocial: number, reserveActuelle: number): number {
  const plafond = money(capitalSocial).multiply(0.20)
  const reste = plafond.subtract(money(reserveActuelle))
  return Math.max(0, reste.round(2).toNumber())
}

/**
 * Calculate the mandatory legal reserve dotation.
 * 10% of profit, capped at the remaining ceiling.
 */
export function calculerDotationReserveLegale(
  resultatNet: number,
  capitalSocial: number,
  reserveActuelle: number
): number {
  if (resultatNet <= 0) return 0
  const dotation10pct = percentage(money(resultatNet), 10)
  const plafondRestant = money(calculerPlafondReserveLegale(capitalSocial, reserveActuelle))
  const dotation = dotation10pct.greaterThan(plafondRestant) ? plafondRestant : dotation10pct
  return dotation.round(2).toNumber()
}

/**
 * Propose an automatic allocation of the result (pure computation).
 */
export function proposerAffectation(
  resultatNet: number,
  capitalSocial: number,
  reserveLegaleActuelle: number
): PropositionAffectation {
  const isBenefice = resultatNet > 0
  const absResultat = Math.abs(resultatNet)
  const plafond = calculerPlafondReserveLegale(capitalSocial, reserveLegaleActuelle)

  let ventilation: AffectationVentilation

  if (isBenefice) {
    const dotationRL = calculerDotationReserveLegale(resultatNet, capitalSocial, reserveLegaleActuelle)
    const restant = money(absResultat).subtract(money(dotationRL))
    ventilation = {
      reserveLegale: dotationRL,
      reservesStatutaires: 0,
      reservesFacultatives: 0,
      dividendes: 0,
      reportANouveau: restant.round(2).toNumber(),
    }
  } else {
    ventilation = {
      reserveLegale: 0,
      reservesStatutaires: 0,
      reservesFacultatives: 0,
      dividendes: 0,
      reportANouveau: -absResultat,
    }
  }

  const totalAffecte = ventilation.reserveLegale +
    ventilation.reservesStatutaires +
    ventilation.reservesFacultatives +
    ventilation.dividendes +
    ventilation.reportANouveau

  return {
    ventilation,
    detail: {
      resultatNet,
      isBenefice,
      plafondReserveLegale: plafond,
      dotationReserveLegaleMax: isBenefice
        ? calculerDotationReserveLegale(resultatNet, capitalSocial, reserveLegaleActuelle)
        : 0,
      ventilationFinale: ventilation,
      totalAffecte,
      ecart: Math.abs(resultatNet - totalAffecte),
    },
  }
}

/**
 * Validate the user's allocation sums up to the result.
 */
export function validerVentilation(resultatNet: number, ventilation: AffectationVentilation): string[] {
  const errors: string[] = []
  const total = money(ventilation.reserveLegale)
    .add(money(ventilation.reservesStatutaires))
    .add(money(ventilation.reservesFacultatives))
    .add(money(ventilation.dividendes))
    .add(money(ventilation.reportANouveau))

  if (!total.equals(money(resultatNet), 0.01)) {
    errors.push(
      `La somme des affectations (${total.toString()}) ne correspond pas au resultat net (${money(resultatNet).toString()}).`
    )
  }

  if (ventilation.reserveLegale < 0) errors.push('La reserve legale ne peut pas etre negative.')
  if (ventilation.dividendes < 0) errors.push('Les dividendes ne peuvent pas etre negatifs.')
  if (ventilation.reservesStatutaires < 0) errors.push('Les reserves statutaires ne peuvent pas etre negatives.')
  if (ventilation.reservesFacultatives < 0) errors.push('Les reserves facultatives ne peuvent pas etre negatives.')

  return errors
}
