/**
 * Reevaluation des immobilisations — SYSCOHADA revise.
 * Reevaluation libre et legale avec ecart de reevaluation (compte 106).
 * Methode de l'elimination (IAS 16 / SYSCOHADA) : les amortissements cumules
 * sont soldes contre l'immobilisation, la valeur brute est portee a la juste
 * valeur, et l'ecart net est credite au compte 106. L'amortissement futur
 * repart sur la valeur reevaluee et la duree restante.
 */
import type { DataAdapter } from '@atlas/data';
import { Money, money } from '../../utils/money';
import { logAudit } from '../../lib/db';
import type { DBJournalEntry, DBJournalLine, DBAsset } from '../../lib/db';
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
  // SYSCOHADA revise : 106 « Ecarts de reevaluation » (capitaux propres).
  // 105 = « Primes liees au capital social » — ne JAMAIS y porter l'ecart.
  ECART_REEVALUATION: '106',
  ECART_REEVALUATION_LIBRE: '1061',
  ECART_REEVALUATION_LEGALE: '1062',
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
  adapter: DataAdapter,
  request: ReevaluationRequest
): Promise<{ success: boolean; impact?: ReevaluationImpact; error?: string }> {
  const asset = await adapter.getById<DBAsset>('assets', request.assetId);
  if (!asset) {
    return { success: false, error: `Immobilisation ${request.assetId} introuvable.` };
  }

  if (request.nouvelleValeur <= 0) {
    return { success: false, error: 'La nouvelle valeur doit etre positive.' };
  }

  // VNC = valeur brute - amortissements cumules REELS (pas une approximation
  // lineaire theorique, qui serait fausse en degressif ou si des dotations
  // partielles/manquantes existent).
  const cumulReel = money((asset as any).cumulDepreciation ?? 0);
  const vnc = calculerVNC(asset.acquisitionValue, cumulReel.toNumber());
  const ecart = calculerEcartReevaluation(request.nouvelleValeur, vnc);

  if (ecart <= 0) {
    return { success: false, error: `La nouvelle valeur (${request.nouvelleValeur}) doit etre superieure a la VNC (${vnc}). Une baisse de valeur releve d'une depreciation (compte 29/6913), pas d'une reevaluation.` };
  }

  // Duree restante deduite de l'amortissement REEL deja passe (coherent avec
  // le cumul, y compris en degressif), et non du calendrier.
  const baseAmortissable = money(asset.acquisitionValue).subtract(money(asset.residualValue));
  const annualDepreciation = asset.usefulLifeYears > 0
    ? baseAmortissable.divide(asset.usefulLifeYears)
    : money(0);
  const annualNum = annualDepreciation.toNumber();
  const yearsDepreciated = annualNum > 0 ? cumulReel.toNumber() / annualNum : 0;
  const dureeRestante = Math.max(0.5, asset.usefulLifeYears - yearsDepreciated);
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
  adapter: DataAdapter,
  request: ReevaluationRequest
): Promise<ReevaluationResult> {
  // Preview first for validation
  const preview = await previewReevaluation(adapter, request);
  if (!preview.success || !preview.impact) {
    return { success: false, error: preview.error };
  }

  const { impact } = preview;
  const now = new Date().toISOString();
  const compteEcart = request.typeReevaluation === 'legale'
    ? COMPTES.ECART_REEVALUATION_LEGALE
    : COMPTES.ECART_REEVALUATION_LIBRE;

  // Idempotence : refuser une 2e reevaluation deja enregistree pour cet actif/date.
  const entryNumber = `REEVAL-${request.dateReevaluation.replace(/-/g, '')}-${request.assetId.substring(0, 6)}`;

  // Comptes REELS de l'actif (jamais son code d'inventaire).
  const asset: any = await adapter.getById<DBAsset>('assets', request.assetId);
  if (!asset) return { success: false, error: 'Immobilisation introuvable.' };
  const compteImmo = String(asset.accountCode || asset.account_code || '2');
  const compteAmort = String(asset.depreciationAccountCode || asset.depreciation_account_code || ('28' + compteImmo.slice(1)));

  const ancienBrut = money(impact.ancienneValeurBrute);
  const cumul = money(impact.ancienneValeurBrute).subtract(money(impact.vnc)); // amort cumule reel
  const grossDelta = money(request.nouvelleValeur).subtract(ancienBrut);       // signe
  const ecart = money(impact.ecartReevaluation);

  // Methode de l'elimination : on solde le 28x contre l'immo, on porte le brut
  // a la juste valeur, et l'ecart net va au 106. Ecriture equilibree par
  // construction : Dr(2x si grossDelta>0) + Dr 28x(cumul) = Cr(2x si grossDelta<0) + Cr 106(ecart).
  const lines: DBJournalLine[] = [];
  if (grossDelta.toNumber() > 0) {
    lines.push({ id: crypto.randomUUID(), accountCode: compteImmo, accountName: `Immobilisation - ${impact.assetName}`, label: `Reevaluation ${request.typeReevaluation} - ${impact.assetName}`, debit: grossDelta.round(2).toNumber(), credit: 0 });
  } else if (grossDelta.toNumber() < 0) {
    lines.push({ id: crypto.randomUUID(), accountCode: compteImmo, accountName: `Immobilisation - ${impact.assetName}`, label: `Reevaluation ${request.typeReevaluation} - ${impact.assetName}`, debit: 0, credit: grossDelta.abs().round(2).toNumber() });
  }
  if (cumul.toNumber() > 0) {
    lines.push({ id: crypto.randomUUID(), accountCode: compteAmort, accountName: 'Amortissements cumules soldes', label: `Elimination amort. - ${impact.assetName}`, debit: cumul.round(2).toNumber(), credit: 0 });
  }
  lines.push({ id: crypto.randomUUID(), accountCode: compteEcart, accountName: `Ecart de reevaluation ${request.typeReevaluation}`, label: `Ecart reevaluation - ${impact.assetName}`, debit: 0, credit: ecart.round(2).toNumber() });

  const entryId = crypto.randomUUID();

  await safeAddEntry(adapter, {
    id: entryId,
    entryNumber,
    journal: 'OD',
    date: request.dateReevaluation,
    reference: `REEVAL-${request.assetId}`,
    label: `Reevaluation ${request.typeReevaluation} - ${impact.assetName}`,
    status: 'validated',
    lines,
    createdAt: now,
    createdBy: 'system',
  }, { skipSyncValidation: true });

  // Update asset : valeur brute = juste valeur, amort cumule solde a 0,
  // duree = duree restante → l'amortissement futur repart correctement sur la
  // base reevaluee (le moteur lineaire (brut-residuel)/duree redonne alors la
  // bonne dotation, sans sur-amortir).
  await adapter.update('assets', request.assetId, {
    acquisitionValue: request.nouvelleValeur,
    cumulDepreciation: 0,
    usefulLifeYears: Math.max(1, Math.round(impact.nouvelleDureeRestante)),
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

  return { success: true, ecriture: entry as any, impact };
}
