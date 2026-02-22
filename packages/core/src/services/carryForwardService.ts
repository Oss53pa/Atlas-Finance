/**
 * @atlas/core — Carry-Forward (Reports a Nouveau) — logique pure.
 * Calcule les soldes de cloture et genere les lignes d'a-nouveaux.
 *
 * Fonctions PURES : recoivent les entries en parametre.
 */
import { money } from '../Money'
import type { JournalEntry } from '@atlas/shared'

// ============================================================================
// TYPES
// ============================================================================

export interface CarryForwardLine {
  accountCode: string
  accountName: string
  soldeDebiteur: number
  soldeCrediteur: number
}

export interface CarryForwardPreview {
  lignes: CarryForwardLine[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  accountCount: number
}

// Balance sheet classes (SYSCOHADA)
const BILAN_CLASSES = ['1', '2', '3', '4', '5']

// ============================================================================
// FUNCTIONS PURES
// ============================================================================

/**
 * Compute closing balances for all balance sheet accounts from entries.
 * Pure function — receives entries as parameter.
 */
export function calculerSoldesCloture(
  entries: JournalEntry[],
  accountClasses: string[] = BILAN_CLASSES
): CarryForwardLine[] {
  const balances = new Map<string, { name: string; debit: number; credit: number }>()

  for (const entry of entries) {
    for (const line of entry.lines) {
      const classCode = line.accountCode.charAt(0)
      if (!accountClasses.includes(classCode)) continue

      const existing = balances.get(line.accountCode) || {
        name: line.accountName,
        debit: 0,
        credit: 0,
      }
      existing.debit += line.debit
      existing.credit += line.credit
      balances.set(line.accountCode, existing)
    }
  }

  const lignes: CarryForwardLine[] = []
  for (const [code, data] of balances) {
    const net = money(data.debit).subtract(money(data.credit))
    const netValue = net.toNumber()

    if (netValue === 0) continue

    lignes.push({
      accountCode: code,
      accountName: data.name,
      soldeDebiteur: netValue > 0 ? netValue : 0,
      soldeCrediteur: netValue < 0 ? Math.abs(netValue) : 0,
    })
  }

  return lignes.sort((a, b) => a.accountCode.localeCompare(b.accountCode))
}

/**
 * Preview carry-forward from entries (pure computation).
 */
export function previewCarryForwardFromEntries(
  entries: JournalEntry[],
  accountClasses?: string[],
  includeResultat?: boolean
): CarryForwardPreview {
  const classes = accountClasses || BILAN_CLASSES
  const classesWithResult = includeResultat ? [...classes, '12'] : classes
  const lignes = calculerSoldesCloture(entries, classesWithResult)

  let totalDebit = 0
  let totalCredit = 0
  for (const l of lignes) {
    totalDebit += l.soldeDebiteur
    totalCredit += l.soldeCrediteur
  }

  return {
    lignes,
    totalDebit,
    totalCredit,
    isBalanced: money(totalDebit).equals(money(totalCredit)),
    accountCount: lignes.length,
  }
}
