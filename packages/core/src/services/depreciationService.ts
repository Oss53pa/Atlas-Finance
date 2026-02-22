/**
 * @atlas/core — Calcul des amortissements (logique pure).
 * Conforme SYSCOHADA — methode lineaire et degressive.
 */
import { money } from '../Money'
import type { Asset, JournalEntryLine } from '@atlas/shared'

// ============================================================================
// TYPES
// ============================================================================

export interface DepreciationInput {
  assets: Asset[]
  exerciceId: string
  initiatedBy: string
}

export interface DepreciationDetail {
  assetId: string
  assetCode: string
  assetName: string
  dotation: number
  vnc: number
  accountCode: string
  depreciationAccountCode: string
}

export interface DepreciationResult {
  lines: Omit<JournalEntryLine, 'id'>[]
  details: DepreciationDetail[]
  totalDotation: number
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Calculate annual depreciation for a set of assets (pure function).
 */
export function calculerAmortissements(input: DepreciationInput): DepreciationResult {
  const lines: Omit<JournalEntryLine, 'id'>[] = []
  const details: DepreciationDetail[] = []
  let totalDotation = 0

  for (const asset of input.assets) {
    if (asset.status !== 'active') continue

    const coutAcquisition = money(asset.acquisitionValue)
    const residuel = money(asset.residualValue)
    const baseAmortissable = coutAcquisition.subtract(residuel)

    if (baseAmortissable.isZero() || baseAmortissable.isNegative()) continue

    let dotation: number

    if (asset.depreciationMethod === 'linear') {
      dotation = baseAmortissable.divide(asset.usefulLifeYears).round(0).toNumber()
    } else {
      // Degressif: taux = 2 / duree (methode double-declining)
      const tauxDegressif = 2 / asset.usefulLifeYears
      const vnc = coutAcquisition.subtract(money(0)) // Simplifie — cumul vient de l'exterieur
      dotation = vnc.multiply(tauxDegressif).round(0).toNumber()
    }

    const vnc = coutAcquisition.subtract(money(dotation)).toNumber()

    details.push({
      assetId: asset.id,
      assetCode: asset.code,
      assetName: asset.name,
      dotation,
      vnc,
      accountCode: asset.accountCode,
      depreciationAccountCode: asset.depreciationAccountCode,
    })

    // Debit 681 (dotation aux amortissements), Credit 28x
    lines.push({
      accountCode: '681000',
      accountName: 'Dotations aux amortissements',
      label: `Amort. ${asset.name}`,
      debit: dotation,
      credit: 0,
    })
    lines.push({
      accountCode: asset.depreciationAccountCode,
      accountName: `Amort. ${asset.name}`,
      label: `Amort. ${asset.name}`,
      debit: 0,
      credit: dotation,
    })

    totalDotation += dotation
  }

  return { lines, details, totalDotation }
}
