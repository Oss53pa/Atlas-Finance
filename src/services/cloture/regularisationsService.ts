/**
 * Service de regularisations comptables CCA/FNP/FAE/PCA.
 * Conforme SYSCOHADA revise — comptes 408, 418, 476/486, 477/487.
 */
import { Money, money } from '../../utils/money';
import { db, logAudit } from '../../lib/db';
import type { DBJournalLine } from '../../lib/db';
import { safeBulkAddEntries } from '../entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export type TypeRegularisation = 'CCA' | 'FNP' | 'FAE' | 'PCA';

export interface Regularisation {
  id: string;
  type: TypeRegularisation;
  libelle: string;
  montant: number;
  compteCharge: string;
  compteRegularisation: string;
  periodeOrigine: string;
  periodeImputation: string;
  ecritureId?: string;
  extourneAuto: boolean;
  justification?: string;
  statut: 'proposee' | 'validee' | 'comptabilisee';
}

export interface RegularisationConfig {
  exerciceId: string;
  dateRegularisation: string;
  regularisations: Regularisation[];
}

export interface RegularisationResult {
  success: boolean;
  ecritures?: DBJournalEntry[];
  error?: string;
}

export interface CalculCCAParams {
  montantCharge: number;
  dateDebut: string;
  dateFin: string;
  dateClotureExercice: string;
}

export interface CalculFNPParams {
  montantEstime: number;
  fournisseur?: string;
  description: string;
}

// ============================================================================
// COMPTES SYSCOHADA PAR TYPE
// ============================================================================

const COMPTES_PAR_TYPE: Record<TypeRegularisation, { compteRegul: string; libelle: string }> = {
  CCA: { compteRegul: '476', libelle: "Charges constatees d'avance" },
  FNP: { compteRegul: '408', libelle: 'Fournisseurs - factures non parvenues' },
  FAE: { compteRegul: '418', libelle: 'Clients - factures a etablir' },
  PCA: { compteRegul: '477', libelle: 'Produits constates d\'avance' },
};

// ============================================================================
// CALCULS
// ============================================================================

/**
 * Calcul prorata temporis pour CCA.
 * Portion de charge relevant de l'exercice suivant.
 */
export function calculerCCA(params: CalculCCAParams): number {
  const { montantCharge, dateDebut, dateFin, dateClotureExercice } = params;

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const cloture = new Date(dateClotureExercice);

  if (fin <= cloture) return 0;

  const totalJours = Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));
  if (totalJours <= 0) return 0;

  const joursApresCloture = Math.ceil((fin.getTime() - cloture.getTime()) / (1000 * 60 * 60 * 24));
  const joursReportes = Math.max(0, joursApresCloture);

  const montantCCA = money(montantCharge)
    .multiply(joursReportes)
    .divide(totalJours)
    .round(2);

  return montantCCA.toNumber();
}

/**
 * Calcul FNP — montant estime de la facture non parvenue.
 */
export function calculerFNP(params: CalculFNPParams): number {
  return money(params.montantEstime).round(2).toNumber();
}

/**
 * Calcul FAE — montant de la facture a etablir (produit acquis non encore facture).
 */
export function calculerFAE(montantProduit: number): number {
  return money(montantProduit).round(2).toNumber();
}

/**
 * Calcul PCA — prorata temporis pour produits constates d'avance.
 */
export function calculerPCA(
  montantProduit: number,
  dateDebut: string,
  dateFin: string,
  dateClotureExercice: string
): number {
  return calculerCCA({
    montantCharge: montantProduit,
    dateDebut,
    dateFin,
    dateClotureExercice,
  });
}

// ============================================================================
// GENERATION D'ECRITURES
// ============================================================================

function buildRegulLines(regul: Regularisation): DBJournalLine[] {
  const lines: DBJournalLine[] = [];
  const typeConfig = COMPTES_PAR_TYPE[regul.type];

  if (regul.type === 'CCA' || regul.type === 'PCA') {
    // CCA: D 476/486 — C charge (6xx)
    // PCA: D produit (7xx) — C 477/487
    if (regul.type === 'CCA') {
      lines.push({
        id: crypto.randomUUID(),
        accountCode: regul.compteRegularisation || typeConfig.compteRegul,
        accountName: typeConfig.libelle,
        label: regul.libelle,
        debit: regul.montant,
        credit: 0,
      });
      lines.push({
        id: crypto.randomUUID(),
        accountCode: regul.compteCharge,
        accountName: `Charge regularisee - ${regul.libelle}`,
        label: regul.libelle,
        debit: 0,
        credit: regul.montant,
      });
    } else {
      lines.push({
        id: crypto.randomUUID(),
        accountCode: regul.compteCharge,
        accountName: `Produit regularise - ${regul.libelle}`,
        label: regul.libelle,
        debit: regul.montant,
        credit: 0,
      });
      lines.push({
        id: crypto.randomUUID(),
        accountCode: regul.compteRegularisation || typeConfig.compteRegul,
        accountName: typeConfig.libelle,
        label: regul.libelle,
        debit: 0,
        credit: regul.montant,
      });
    }
  } else if (regul.type === 'FNP') {
    // FNP: D charge (6xx) — C 408
    lines.push({
      id: crypto.randomUUID(),
      accountCode: regul.compteCharge,
      accountName: `Charge FNP - ${regul.libelle}`,
      label: regul.libelle,
      debit: regul.montant,
      credit: 0,
    });
    lines.push({
      id: crypto.randomUUID(),
      accountCode: regul.compteRegularisation || typeConfig.compteRegul,
      accountName: typeConfig.libelle,
      label: regul.libelle,
      debit: 0,
      credit: regul.montant,
    });
  } else if (regul.type === 'FAE') {
    // FAE: D 418 — C produit (7xx)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: regul.compteRegularisation || typeConfig.compteRegul,
      accountName: typeConfig.libelle,
      label: regul.libelle,
      debit: regul.montant,
      credit: 0,
    });
    lines.push({
      id: crypto.randomUUID(),
      accountCode: regul.compteCharge,
      accountName: `Produit FAE - ${regul.libelle}`,
      label: regul.libelle,
      debit: 0,
      credit: regul.montant,
    });
  }

  return lines;
}

/**
 * Generate journal entries for all regularisations.
 */
export async function genererEcrituresRegularisation(
  config: RegularisationConfig
): Promise<RegularisationResult> {
  const { dateRegularisation, regularisations } = config;

  if (regularisations.length === 0) {
    return { success: false, error: 'Aucune regularisation a comptabiliser.' };
  }

  const now = new Date().toISOString();
  const ecritures: Array<{ id: string; entryNumber: string; journal: string; date: string; reference: string; label: string; status: string; lines: DBJournalLine[]; createdAt: string; createdBy?: string }> = [];

  for (let i = 0; i < regularisations.length; i++) {
    const regul = regularisations[i];
    if (regul.montant <= 0) continue;

    const lines = buildRegulLines(regul);
    const entryNumber = `REG-${regul.type}-${dateRegularisation.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;

    const entry = {
      id: crypto.randomUUID(),
      entryNumber,
      journal: 'OD',
      date: dateRegularisation,
      reference: `REGUL-${regul.type}-${regul.id}`,
      label: `Regularisation ${regul.type} - ${regul.libelle}`,
      status: 'draft' as const,
      lines,
      createdAt: now,
      createdBy: 'system',
    };

    ecritures.push(entry);
    regul.ecritureId = entry.id;
    regul.statut = 'comptabilisee';
  }

  // Save all entries via entryGuard (handles totalDebit/totalCredit + hash)
  await safeBulkAddEntries(ecritures as unknown as Parameters<typeof safeBulkAddEntries>[0], { skipSyncValidation: true });

  // Audit
  await logAudit('REGULARISATION', 'fiscal_year', config.exerciceId, JSON.stringify({
    count: ecritures.length,
    types: regularisations.map(r => r.type),
    total: ecritures.reduce((s, e) => e.lines.reduce((ls, l) => ls + l.debit, 0) + s, 0),
  }));

  return { success: true, ecritures };
}

/**
 * Create a regularisation object with computed amount.
 */
export function creerRegularisation(
  type: TypeRegularisation,
  libelle: string,
  montant: number,
  compteCharge: string,
  periodeOrigine: string,
  periodeImputation: string,
  extourneAuto: boolean = true
): Regularisation {
  const typeConfig = COMPTES_PAR_TYPE[type];
  return {
    id: crypto.randomUUID(),
    type,
    libelle,
    montant: money(montant).round(2).toNumber(),
    compteCharge,
    compteRegularisation: typeConfig.compteRegul,
    periodeOrigine,
    periodeImputation,
    extourneAuto,
    statut: 'proposee',
  };
}
