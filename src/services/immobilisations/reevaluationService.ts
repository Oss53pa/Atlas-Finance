/**
 * Reevaluation des immobilisations — SYSCOHADA revise.
 * Reevaluation libre et legale avec ecart de reevaluation (compte 105).
 */
import { Money, money } from '../../utils/money';
import { db, logAudit } from '../../lib/db';
import type { DBJournalLine, DBAsset } from '../../lib/db';
import { safeAddEntry } from '../entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface ReevaluationRequest {
  assetId: string;
  nouvelleValeur: number;
  dateReevaluation: string;
  motif: string;
  typeReevaluation: 'libre' | 'legale';
  expertEvaluateur?: string;
}

export interface ReevaluationResult {
  success: boolean;
  ecriture?: DBJournalEntry;
  impact?: ReevaluationImpact;
  error?: string;
}

export interface ReevaluationImpact {
  assetCode: string;
  assetName: string;
  ancienneValeurBrute: number;
  nouvelleValeurBrute: number;
  vnc: number;
  ecartReevaluation: number;
  nouvelleDureeRestante: number;
  nouvelleDotationAnnuelle: number;
  ancienneDotationAnnuelle: number;
}

export interface ReevaluationHistorique {
  id: string;
  assetId: string;
  date: string;
  ancienneValeur: number;
  nouvelleValeur: number;
  ecart: number;
  type: 'libre' | 'legale';
  motif: string;
  ecritureId: string;
}

// ============================================================================
// COMPTES SYSCOHADA
// ============================================================================

const COMPTES = {
  ECART_REEVALUATION: '105',
  ECART_REEVALUATION_LIBRE: '1051',
  ECART_REEVALUATION_LEGALE: '1052',
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Calculate the net book value (VNC) of an asset at a given date.
 */
export function calculerVNC(
  valeurAcquisition: number,
  amortissementsCumules: number
): number {
  return money(valeurAcquisition).subtract(money(amortissementsCumules)).round(2).toNumber();
}

/**
 * Calculate the revaluation surplus.
 */
export function calculerEcartReevaluation(
  nouvelleValeur: number,
  vnc: number
): number {
  return money(nouvelleValeur).subtract(money(vnc)).round(2).toNumber();
}

/**
 * Recalculate depreciation after revaluation.
 */
export function recalculerAmortissement(
  nouvelleValeurBrute: number,
  valeurResiduelle: number,
  dureeRestanteAnnees: number
): number {
  if (dureeRestanteAnnees <= 0) return 0;
  const baseAmortissable = money(nouvelleValeurBrute).subtract(money(valeurResiduelle));
  return baseAmortissable.divide(dureeRestanteAnnees).round(2).toNumber();
}

/**
 * Preview the impact of a revaluation without saving.
 */
export async function previewReevaluation(
  request: ReevaluationRequest
): Promise<{ success: boolean; impact?: ReevaluationImpact; error?: string }> {
  const asset = await db.assets.get(request.assetId);
  if (!asset) {
    return { success: false, error: `Immobilisation ${request.assetId} introuvable.` };
  }

  if (request.nouvelleValeur <= 0) {
    return { success: false, error: 'La nouvelle valeur doit etre positive.' };
  }

  // Compute cumulated depreciation (approximation from useful life)
  const acquisitionDate = new Date(asset.acquisitionDate);
  const revalDate = new Date(request.dateReevaluation);
  const yearsElapsed = (revalDate.getTime() - acquisitionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const annualDepreciation = money(asset.acquisitionValue)
    .subtract(money(asset.residualValue))
    .divide(asset.usefulLifeYears);
  const cumulDepreciation = annualDepreciation.multiply(Math.min(yearsElapsed, asset.usefulLifeYears)).round(2);

  const vnc = money(asset.acquisitionValue).subtract(cumulDepreciation).round(2).toNumber();
  const ecart = calculerEcartReevaluation(request.nouvelleValeur, vnc);

  if (ecart <= 0) {
    return { success: false, error: `La nouvelle valeur (${request.nouvelleValeur}) doit etre superieure a la VNC (${vnc}).` };
  }

  const dureeRestante = Math.max(0, asset.usefulLifeYears - yearsElapsed);
  const nouvelleDotation = recalculerAmortissement(request.nouvelleValeur, asset.residualValue, dureeRestante);
  const ancienneDotation = annualDepreciation.round(2).toNumber();

  return {
    success: true,
    impact: {
      assetCode: asset.code,
      assetName: asset.name,
      ancienneValeurBrute: asset.acquisitionValue,
      nouvelleValeurBrute: request.nouvelleValeur,
      vnc,
      ecartReevaluation: ecart,
      nouvelleDureeRestante: Math.round(dureeRestante * 10) / 10,
      nouvelleDotationAnnuelle: nouvelleDotation,
      ancienneDotationAnnuelle: ancienneDotation,
    },
  };
}

/**
 * Execute the revaluation: update asset, generate journal entry.
 */
export async function executerReevaluation(
  request: ReevaluationRequest
): Promise<ReevaluationResult> {
  // Preview first for validation
  const preview = await previewReevaluation(request);
  if (!preview.success || !preview.impact) {
    return { success: false, error: preview.error };
  }

  const { impact } = preview;
  const now = new Date().toISOString();
  const compteEcart = request.typeReevaluation === 'legale'
    ? COMPTES.ECART_REEVALUATION_LEGALE
    : COMPTES.ECART_REEVALUATION_LIBRE;

  // Build journal entry lines
  const lines: DBJournalLine[] = [
    {
      id: crypto.randomUUID(),
      accountCode: impact.assetCode.startsWith('2') ? impact.assetCode : `2${impact.assetCode}`,
      accountName: `Immobilisation - ${impact.assetName}`,
      label: `Reevaluation ${request.typeReevaluation} - ${impact.assetName}`,
      debit: impact.ecartReevaluation,
      credit: 0,
    },
    {
      id: crypto.randomUUID(),
      accountCode: compteEcart,
      accountName: `Ecart de reevaluation ${request.typeReevaluation}`,
      label: `Ecart reevaluation - ${impact.assetName}`,
      debit: 0,
      credit: impact.ecartReevaluation,
    },
  ];

  const entryNumber = `REEVAL-${request.dateReevaluation.replace(/-/g, '')}-${request.assetId.substring(0, 6)}`;
  const entryId = crypto.randomUUID();

  await safeAddEntry({
    id: entryId,
    entryNumber,
    journal: 'OD',
    date: request.dateReevaluation,
    reference: `REEVAL-${request.assetId}`,
    label: `Reevaluation ${request.typeReevaluation} - ${impact.assetName}`,
    status: 'draft',
    lines,
    createdAt: now,
    createdBy: 'system',
  }, { skipSyncValidation: true });

  // Update asset
  await db.assets.update(request.assetId, {
    acquisitionValue: request.nouvelleValeur,
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const entry = { id: entryId, entryNumber, journal: 'OD', date: request.dateReevaluation, label: `Reevaluation ${request.typeReevaluation} - ${impact.assetName}`, lines, totalDebit, totalCredit };

  // Audit
  await logAudit('REEVALUATION', 'asset', request.assetId, JSON.stringify({
    type: request.typeReevaluation,
    ancienneValeur: impact.ancienneValeurBrute,
    nouvelleValeur: request.nouvelleValeur,
    ecart: impact.ecartReevaluation,
    motif: request.motif,
    ecritureId: entryId,
  }));

  return { success: true, ecriture: entry, impact };
}
