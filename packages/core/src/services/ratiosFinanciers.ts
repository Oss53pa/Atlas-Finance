/**
 * @atlas/core — Ratios financiers SYSCOHADA (logique pure).
 * Calculs a partir de balances pre-calculees.
 */
import { money } from '../Money'
import type { AccountBalance } from '@atlas/shared'

// ============================================================================
// TYPES
// ============================================================================

export interface RatiosInput {
  /** Map accountPrefix -> AccountBalance */
  balances: Map<string, AccountBalance>
}

export interface RatioResult {
  code: string
  label: string
  value: number
  unit: '%' | 'ratio' | 'jours' | 'FCFA'
  status: 'bon' | 'attention' | 'critique'
}

// ============================================================================
// HELPERS
// ============================================================================

function soldeForPrefixes(balances: Map<string, AccountBalance>, prefixes: string[]): number {
  let total = 0
  for (const [key, balance] of balances) {
    if (prefixes.some(p => key.startsWith(p))) {
      total = money(total).add(money(balance.solde)).toNumber()
    }
  }
  return total
}

function debitForPrefixes(balances: Map<string, AccountBalance>, prefixes: string[]): number {
  let total = 0
  for (const [key, balance] of balances) {
    if (prefixes.some(p => key.startsWith(p))) {
      total = money(total).add(money(balance.debit)).toNumber()
    }
  }
  return total
}

// ============================================================================
// CALCULS
// ============================================================================

/**
 * Ratio de liquidite generale = Actif circulant / Passif circulant
 */
export function liquiditeGenerale(balances: Map<string, AccountBalance>): number {
  const actifCirculant = soldeForPrefixes(balances, ['3', '4', '5'])
  const passifCirculant = Math.abs(soldeForPrefixes(balances, ['40', '42', '43', '44', '45', '46', '47', '56']))
  if (passifCirculant === 0) return 0
  return money(actifCirculant).divide(passifCirculant).round(2).toNumber()
}

/**
 * Ratio d'endettement = Dettes / Capitaux propres
 */
export function ratioEndettement(balances: Map<string, AccountBalance>): number {
  const dettes = Math.abs(soldeForPrefixes(balances, ['16', '17', '18', '19']))
  const capitauxPropres = Math.abs(soldeForPrefixes(balances, ['10', '11', '12', '13', '14', '15']))
  if (capitauxPropres === 0) return 0
  return money(dettes).divide(capitauxPropres).round(2).toNumber()
}

/**
 * Marge commerciale
 */
export function margeCommerciale(balances: Map<string, AccountBalance>): number {
  const ventes = Math.abs(soldeForPrefixes(balances, ['701']))
  const achats = soldeForPrefixes(balances, ['601'])
  const varStock = soldeForPrefixes(balances, ['6031'])
  return money(ventes).subtract(money(achats)).subtract(money(varStock)).toNumber()
}

/**
 * Excedent brut d'exploitation (EBE)
 */
export function ebe(balances: Map<string, AccountBalance>): number {
  const valeurAjoutee = soldeForPrefixes(balances, ['7']) // Simplifie
  const chargesPersonnel = soldeForPrefixes(balances, ['66'])
  const impots = soldeForPrefixes(balances, ['64'])
  return money(valeurAjoutee).subtract(money(chargesPersonnel)).subtract(money(impots)).toNumber()
}
