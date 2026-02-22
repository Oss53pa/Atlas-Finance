/**
 * Affectation du resultat de l'exercice.
 * Conforme SYSCOHADA revise — repartition du benefice ou traitement de la perte.
 */
import type { DataAdapter } from '@atlas/data';
import { Money, money, percentage } from '../../utils/money';
import { logAudit } from '../../lib/db';
import type { DBJournalLine } from '../../lib/db';
import { safeAddEntry } from '../entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface AffectationConfig {
  exerciceId: string;
  resultatNet: number;
  capitalSocial: number;
  reserveLegaleActuelle: number;
  /** Ventilation choisie par l'utilisateur */
  ventilation: AffectationVentilation;
}

export interface AffectationVentilation {
  reserveLegale: number;
  reservesStatutaires: number;
  reservesFacultatives: number;
  dividendes: number;
  reportANouveau: number;
}

export interface AffectationResult {
  success: boolean;
  ecritures?: DBJournalEntry[];
  error?: string;
  detail?: AffectationDetail;
}

export interface AffectationDetail {
  resultatNet: number;
  isBenefice: boolean;
  plafondReserveLegale: number;
  dotationReserveLegaleMax: number;
  ventilationFinale: AffectationVentilation;
  totalAffecte: number;
  ecart: number;
}

export interface PropositionAffectation {
  ventilation: AffectationVentilation;
  detail: AffectationDetail;
}

// ============================================================================
// COMPTES SYSCOHADA
// ============================================================================

const COMPTES = {
  RESULTAT_BENEFICE: '131',
  RESULTAT_PERTE: '139',
  RESERVE_LEGALE: '111',
  RESERVES_STATUTAIRES: '112',
  RESERVES_FACULTATIVES: '118',
  DIVIDENDES_A_PAYER: '465',
  REPORT_A_NOUVEAU_CREDITEUR: '121',
  REPORT_A_NOUVEAU_DEBITEUR: '129',
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Calculate the maximum legal reserve contribution.
 * OHADA: 10% of profit until reserve = 20% of share capital.
 */
export function calculerPlafondReserveLegale(capitalSocial: number, reserveActuelle: number): number {
  const plafond = money(capitalSocial).multiply(0.20);
  const reste = plafond.subtract(money(reserveActuelle));
  return Math.max(0, reste.round(2).toNumber());
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
  if (resultatNet <= 0) return 0;
  const dotation10pct = percentage(money(resultatNet), 10);
  const plafondRestant = money(calculerPlafondReserveLegale(capitalSocial, reserveActuelle));
  const dotation = dotation10pct.greaterThan(plafondRestant) ? plafondRestant : dotation10pct;
  return dotation.round(2).toNumber();
}

/**
 * Propose an automatic allocation of the result.
 */
export function proposerAffectation(
  resultatNet: number,
  capitalSocial: number,
  reserveLegaleActuelle: number
): PropositionAffectation {
  const isBenefice = resultatNet > 0;
  const absResultat = Math.abs(resultatNet);
  const plafond = calculerPlafondReserveLegale(capitalSocial, reserveLegaleActuelle);

  let ventilation: AffectationVentilation;

  if (isBenefice) {
    const dotationRL = calculerDotationReserveLegale(resultatNet, capitalSocial, reserveLegaleActuelle);
    const restant = money(absResultat).subtract(money(dotationRL));
    ventilation = {
      reserveLegale: dotationRL,
      reservesStatutaires: 0,
      reservesFacultatives: 0,
      dividendes: 0,
      reportANouveau: restant.round(2).toNumber(),
    };
  } else {
    ventilation = {
      reserveLegale: 0,
      reservesStatutaires: 0,
      reservesFacultatives: 0,
      dividendes: 0,
      reportANouveau: -absResultat,
    };
  }

  const totalAffecte = ventilation.reserveLegale +
    ventilation.reservesStatutaires +
    ventilation.reservesFacultatives +
    ventilation.dividendes +
    ventilation.reportANouveau;

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
  };
}

/**
 * Validate the user's allocation sums up to the result.
 */
export function validerVentilation(resultatNet: number, ventilation: AffectationVentilation): string[] {
  const errors: string[] = [];
  const total = money(ventilation.reserveLegale)
    .add(money(ventilation.reservesStatutaires))
    .add(money(ventilation.reservesFacultatives))
    .add(money(ventilation.dividendes))
    .add(money(ventilation.reportANouveau));

  if (!total.equals(money(resultatNet), 0.01)) {
    errors.push(
      `La somme des affectations (${total.toString()}) ne correspond pas au resultat net (${money(resultatNet).toString()}).`
    );
  }

  if (ventilation.reserveLegale < 0) errors.push('La reserve legale ne peut pas etre negative.');
  if (ventilation.dividendes < 0) errors.push('Les dividendes ne peuvent pas etre negatifs.');
  if (ventilation.reservesStatutaires < 0) errors.push('Les reserves statutaires ne peuvent pas etre negatives.');
  if (ventilation.reservesFacultatives < 0) errors.push('Les reserves facultatives ne peuvent pas etre negatives.');

  return errors;
}

/**
 * Generate the journal entries for the allocation.
 */
export async function genererEcrituresAffectation(adapter: DataAdapter, config: AffectationConfig): Promise<AffectationResult> {
  const { resultatNet, ventilation, exerciceId } = config;

  // Validate
  const errors = validerVentilation(resultatNet, ventilation);
  if (errors.length > 0) {
    return { success: false, error: errors.join(' | ') };
  }

  const isBenefice = resultatNet > 0;
  const now = new Date().toISOString();
  const dateAffectation = now.split('T')[0];

  const lines: DBJournalLine[] = [];

  // Debit: close result account
  lines.push({
    id: crypto.randomUUID(),
    accountCode: isBenefice ? COMPTES.RESULTAT_BENEFICE : COMPTES.REPORT_A_NOUVEAU_DEBITEUR,
    accountName: isBenefice ? 'Resultat net - Benefice' : 'Report a nouveau debiteur',
    label: "Affectation du resultat de l'exercice",
    debit: Math.abs(resultatNet),
    credit: 0,
  });

  // Credits: allocations
  if (ventilation.reserveLegale > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: COMPTES.RESERVE_LEGALE,
      accountName: 'Reserve legale',
      label: 'Dotation reserve legale',
      debit: 0,
      credit: ventilation.reserveLegale,
    });
  }
  if (ventilation.reservesStatutaires > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: COMPTES.RESERVES_STATUTAIRES,
      accountName: 'Reserves statutaires',
      label: 'Dotation reserves statutaires',
      debit: 0,
      credit: ventilation.reservesStatutaires,
    });
  }
  if (ventilation.reservesFacultatives > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: COMPTES.RESERVES_FACULTATIVES,
      accountName: 'Reserves facultatives',
      label: 'Dotation reserves facultatives',
      debit: 0,
      credit: ventilation.reservesFacultatives,
    });
  }
  if (ventilation.dividendes > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: COMPTES.DIVIDENDES_A_PAYER,
      accountName: 'Dividendes a payer',
      label: 'Dividendes distribues',
      debit: 0,
      credit: ventilation.dividendes,
    });
  }
  if (ventilation.reportANouveau !== 0) {
    if (ventilation.reportANouveau > 0) {
      lines.push({
        id: crypto.randomUUID(),
        accountCode: COMPTES.REPORT_A_NOUVEAU_CREDITEUR,
        accountName: 'Report a nouveau crediteur',
        label: 'Report a nouveau',
        debit: 0,
        credit: ventilation.reportANouveau,
      });
    } else {
      // Loss case: report a nouveau debiteur is already debited above;
      // if partial loss absorption, add credit entry for the absorbed portion
      lines.push({
        id: crypto.randomUUID(),
        accountCode: COMPTES.RESULTAT_PERTE,
        accountName: 'Resultat net - Perte',
        label: 'Solde perte reportee',
        debit: 0,
        credit: Math.abs(ventilation.reportANouveau),
      });
    }
  }

  // Build entry
  const entryNumber = `AFF-${dateAffectation.replace(/-/g, '')}`;
  const entryId = crypto.randomUUID();
  await safeAddEntry({
    id: entryId,
    entryNumber,
    journal: 'OD',
    date: dateAffectation,
    reference: `AFFECTATION-${exerciceId}`,
    label: `Affectation du resultat exercice ${exerciceId}`,
    status: 'draft',
    lines,
    createdAt: now,
    createdBy: 'system',
  }, { skipSyncValidation: true });
  await logAudit('AFFECTATION_RESULTAT', 'journal_entry', entryId, JSON.stringify({
    resultatNet,
    ventilation,
    exerciceId,
  }));

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const detail = proposerAffectation(resultatNet, config.capitalSocial, config.reserveLegaleActuelle).detail;
  detail.ventilationFinale = ventilation;
  detail.totalAffecte = totalDebit;
  detail.ecart = Math.abs(resultatNet - totalDebit);

  return { success: true, ecritures: [{ id: entryId, entryNumber, lines }], detail };
}
