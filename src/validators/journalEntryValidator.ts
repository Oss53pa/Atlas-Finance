/**
 * Validateur d'écritures comptables — Obligations SYSCOHADA
 *
 * Ce validateur DOIT être appelé AVANT toute insertion dans db.journalEntries.
 * Il garantit le respect des règles fondamentales de la comptabilité en partie double.
 */

import { money, Money } from '../utils/money';
import { db, type DBJournalLine, type DBJournalEntry } from '../lib/db';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide une écriture comptable complète avant insertion.
 *
 * Règles vérifiées :
 * 1. EQUILIBRE : Total Débits = Total Crédits (écart = 0 en Money class)
 * 2. MINIMUM 2 LIGNES par écriture (obligation SYSCOHADA)
 * 3. PAS DE LIGNE avec débit > 0 ET crédit > 0 simultanément
 * 4. PAS DE LIGNE avec débit = 0 ET crédit = 0
 * 5. TOUS LES MONTANTS >= 0 (pas de négatifs)
 * 6. PÉRIODE OUVERTE : l'exercice contenant la date est 'open'
 * 7. COMPTE EXISTANT : chaque accountCode existe dans db.accounts
 */
export async function validateJournalEntry(
  entry: Pick<DBJournalEntry, 'date' | 'lines' | 'journal' | 'label'>
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { date, lines, journal, label } = entry;

  // --- Règle 2 : Minimum 2 lignes ---
  if (!lines || lines.length < 2) {
    errors.push(
      `Une écriture comptable doit comporter au minimum 2 lignes (reçu : ${lines?.length ?? 0}).`
    );
  }

  if (!lines || lines.length === 0) {
    return { isValid: false, errors, warnings };
  }

  // --- Règle 5 : Pas de montants négatifs ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.debit < 0) {
      errors.push(`Ligne ${i + 1} (${line.accountCode}) : le débit ne peut pas être négatif (${line.debit}).`);
    }
    if (line.credit < 0) {
      errors.push(`Ligne ${i + 1} (${line.accountCode}) : le crédit ne peut pas être négatif (${line.credit}).`);
    }
  }

  // --- Règle 3 : Pas de débit ET crédit sur la même ligne ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.debit > 0 && line.credit > 0) {
      errors.push(
        `Ligne ${i + 1} (${line.accountCode}) : une ligne ne peut pas avoir à la fois un débit (${line.debit}) et un crédit (${line.credit}).`
      );
    }
  }

  // --- Règle 4 : Pas de ligne vide (débit = 0 et crédit = 0) ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.debit === 0 && line.credit === 0) {
      errors.push(
        `Ligne ${i + 1} (${line.accountCode}) : une ligne doit avoir un débit ou un crédit non nul.`
      );
    }
  }

  // --- Règle 1 : Équilibre D = C (Money class) ---
  const totalDebit = Money.sum(lines.map(l => money(l.debit)));
  const totalCredit = Money.sum(lines.map(l => money(l.credit)));
  const ecart = totalDebit.subtract(totalCredit);

  if (!ecart.isZero()) {
    const ecartNum = ecart.toNumber();
    errors.push(
      `Écriture déséquilibrée : Total Débit = ${totalDebit.toNumber()}, Total Crédit = ${totalCredit.toNumber()}, Écart = ${ecartNum}.`
    );
  }

  // --- Règle 6 : Période ouverte ---
  if (date) {
    const fiscalYears = await db.fiscalYears.toArray();
    const matchingYear = fiscalYears.find(
      fy => date >= fy.startDate && date <= fy.endDate
    );

    if (!matchingYear) {
      errors.push(
        `Aucun exercice fiscal ne couvre la date ${date}. Créez un exercice correspondant.`
      );
    } else if (matchingYear.isClosed) {
      errors.push(
        `L'exercice "${matchingYear.name}" (${matchingYear.startDate} au ${matchingYear.endDate}) est clôturé. Impossible de saisir des écritures.`
      );
    }
  }

  // --- Règle 7 : Comptes existants ---
  const accountCodes = [...new Set(lines.map(l => l.accountCode))];
  const existingAccounts = await db.accounts
    .where('code')
    .anyOf(accountCodes)
    .toArray();
  const existingCodes = new Set(existingAccounts.map(a => a.code));

  for (const code of accountCodes) {
    if (!existingCodes.has(code)) {
      errors.push(`Le compte ${code} n'existe pas dans le plan comptable.`);
    }
  }

  // --- Warnings (non bloquants) ---
  if (!label || label.trim() === '') {
    warnings.push('Le libellé de l\'écriture est vide.');
  }

  if (!journal || journal.trim() === '') {
    warnings.push('Le code journal n\'est pas renseigné.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validation légère (synchrone) — uniquement les règles arithmétiques.
 * Utilisable dans les formulaires pour le feedback immédiat sans accès DB.
 */
export function validateJournalEntrySync(
  lines: Pick<DBJournalLine, 'debit' | 'credit' | 'accountCode'>[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!lines || lines.length < 2) {
    errors.push(
      `Une écriture comptable doit comporter au minimum 2 lignes (reçu : ${lines?.length ?? 0}).`
    );
  }

  if (!lines || lines.length === 0) {
    return { isValid: false, errors, warnings };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.debit < 0) {
      errors.push(`Ligne ${i + 1} (${line.accountCode}) : débit négatif (${line.debit}).`);
    }
    if (line.credit < 0) {
      errors.push(`Ligne ${i + 1} (${line.accountCode}) : crédit négatif (${line.credit}).`);
    }
    if (line.debit > 0 && line.credit > 0) {
      errors.push(`Ligne ${i + 1} (${line.accountCode}) : débit ET crédit sur la même ligne.`);
    }
    if (line.debit === 0 && line.credit === 0) {
      errors.push(`Ligne ${i + 1} (${line.accountCode}) : ligne vide (débit = 0, crédit = 0).`);
    }
  }

  const totalDebit = Money.sum(lines.map(l => money(l.debit)));
  const totalCredit = Money.sum(lines.map(l => money(l.credit)));
  const ecart = totalDebit.subtract(totalCredit);

  if (!ecart.isZero()) {
    errors.push(
      `Écriture déséquilibrée : Écart = ${ecart.toNumber()} (Débit = ${totalDebit.toNumber()}, Crédit = ${totalCredit.toNumber()}).`
    );
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Génère le prochain numéro de pièce séquentiel pour un journal donné.
 */
export async function getNextPieceNumber(journalCode: string): Promise<string> {
  const entries = await db.journalEntries
    .where('journal')
    .equals(journalCode)
    .toArray();

  let maxNum = 0;
  for (const entry of entries) {
    // Parse le numéro depuis le format "XX-000001"
    const parts = entry.entryNumber?.split('-');
    if (parts && parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  const next = maxNum + 1;
  return `${journalCode}-${String(next).padStart(6, '0')}`;
}
