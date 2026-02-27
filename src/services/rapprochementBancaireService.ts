/**
 * Service de rapprochement bancaire automatique.
 *
 * Compare les mouvements bancaires (relevé importé) avec les écritures comptables
 * sur les comptes de trésorerie (classe 5 : 512x banques, 531x caisse).
 *
 * Algorithmes de matching :
 * 1. Exact      — même montant + même date
 * 2. Tolérance  — même montant, date ± N jours
 * 3. Référence  — même référence/libellé entre relevé et écriture
 * 4. Somme      — 1 opération bancaire = N écritures (ou inverse)
 *
 * Conforme SYSCOHADA — état de rapprochement bancaire.
 */

import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../lib/db';
import type { DBJournalEntry } from '../lib/db';
import { money, Money } from '../utils/money';

// ============================================================================
// TYPES
// ============================================================================

export interface BankTransaction {
  id: string;
  date: string;
  valueDate?: string;
  label: string;
  reference?: string;
  amount: number;           // Positif = crédit banque, Négatif = débit banque
  balance?: number;
  category?: string;
  matched?: boolean;
  matchedEntryIds?: string[];
  matchMethod?: RapprochementMethod;
}

export type RapprochementMethod = 'exact' | 'tolerance' | 'reference' | 'somme' | 'manual';

export interface RapprochementMatch {
  bankTransactionId: string;
  entryIds: string[];        // IDs des écritures comptables matchées
  lineIds: string[];         // IDs des lignes matchées
  method: RapprochementMethod;
  bankAmount: number;
  comptaAmount: number;
  ecart: number;
  confidence: number;        // 0-1
}

export interface RapprochementConfig {
  comptesBancaires: string[];  // Codes comptes (512100, 512200, etc.)
  toleranceJours: number;      // Jours de tolérance sur la date
  toleranceMontant: number;    // FCFA de tolérance sur le montant
  matchParReference: boolean;
  matchParMontant: boolean;
  matchSomme: boolean;
}

export interface RapprochementResult {
  matches: RapprochementMatch[];
  unmatchedBank: BankTransaction[];
  unmatchedCompta: Array<{ entryId: string; lineId: string; date: string; amount: number; label: string }>;
  soldeReleve: number;
  soldeComptable: number;
  ecart: number;
  tauxRapprochement: number;
}

export interface EtatRapprochement {
  compte: string;
  dateRapprochement: string;
  soldeReleve: number;
  soldeComptable: number;
  ecrituresNonPointees: Array<{ date: string; label: string; debit: number; credit: number }>;
  operationsNonComptabilisees: Array<{ date: string; label: string; amount: number }>;
  soldeBanqueCorrige: number;
  soldeComptaCorrige: number;
  isRapproche: boolean;
}

const DEFAULT_CONFIG: RapprochementConfig = {
  comptesBancaires: ['512'],
  toleranceJours: 3,
  toleranceMontant: 0,
  matchParReference: true,
  matchParMontant: true,
  matchSomme: true,
};

// ============================================================================
// PARSE BANK STATEMENT
// ============================================================================

/**
 * Parse un relevé bancaire CSV en transactions.
 * Format attendu : Date;Libellé;Référence;Débit;Crédit;Solde
 */
export function parseBankStatementCSV(csv: string): BankTransaction[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const transactions: BankTransaction[] = [];
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';').map(p => p.trim().replace(/"/g, ''));
    if (parts.length < 4) continue;

    const debit = parseFloat(parts[3]?.replace(/\s/g, '').replace(',', '.')) || 0;
    const credit = parseFloat(parts[4]?.replace(/\s/g, '').replace(',', '.')) || 0;
    const amount = credit - debit; // Positif = entrée, Négatif = sortie

    transactions.push({
      id: `BK-${i.toString().padStart(4, '0')}`,
      date: parts[0],
      label: parts[1] || '',
      reference: parts[2] || undefined,
      amount,
      balance: parts[5] ? parseFloat(parts[5].replace(/\s/g, '').replace(',', '.')) : undefined,
    });
  }

  return transactions;
}

// ============================================================================
// MATCHING ALGORITHMS
// ============================================================================

interface ComptaLine {
  entryId: string;
  lineId: string;
  date: string;
  amount: number;       // Positif = débit comptable (sortie banque → négatif relevé), Négatif = crédit comptable
  label: string;
  reference: string;
  matched: boolean;
}

function getComptaLines(entries: DBJournalEntry[], comptesPrefixes: string[]): ComptaLine[] {
  const lines: ComptaLine[] = [];
  for (const entry of entries) {
    for (const line of entry.lines) {
      const isBank = comptesPrefixes.some(p => line.accountCode.startsWith(p));
      if (!isBank) continue;

      // En comptabilité : débit 512 = entrée en banque, crédit 512 = sortie
      // Sur le relevé : crédit = entrée, débit = sortie
      // Donc : débit comptable correspond à crédit bancaire (montant positif)
      //        crédit comptable correspond à débit bancaire (montant négatif)
      const amount = line.debit > 0 ? line.debit : -line.credit;

      lines.push({
        entryId: entry.id,
        lineId: line.id,
        date: entry.date,
        amount,
        label: line.label || entry.label,
        reference: entry.reference || '',
        matched: false,
      });
    }
  }
  return lines;
}

function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / 86400000));
}

function matchExactAmount(
  bankTx: BankTransaction[],
  comptaLines: ComptaLine[],
  toleranceJours: number,
): RapprochementMatch[] {
  const matches: RapprochementMatch[] = [];

  for (const tx of bankTx) {
    if (tx.matched) continue;
    for (const cl of comptaLines) {
      if (cl.matched) continue;
      if (Math.abs(tx.amount - cl.amount) < 0.01 && daysBetween(tx.date, cl.date) <= toleranceJours) {
        matches.push({
          bankTransactionId: tx.id,
          entryIds: [cl.entryId],
          lineIds: [cl.lineId],
          method: toleranceJours === 0 ? 'exact' : 'tolerance',
          bankAmount: tx.amount,
          comptaAmount: cl.amount,
          ecart: 0,
          confidence: toleranceJours === 0 ? 1.0 : 0.9,
        });
        tx.matched = true;
        cl.matched = true;
        break;
      }
    }
  }

  return matches;
}

function matchByReference(
  bankTx: BankTransaction[],
  comptaLines: ComptaLine[],
): RapprochementMatch[] {
  const matches: RapprochementMatch[] = [];

  for (const tx of bankTx) {
    if (tx.matched || !tx.reference) continue;
    for (const cl of comptaLines) {
      if (cl.matched || !cl.reference) continue;
      const refMatch = tx.reference.toLowerCase() === cl.reference.toLowerCase()
        || tx.label.toLowerCase().includes(cl.reference.toLowerCase())
        || cl.label.toLowerCase().includes(tx.reference.toLowerCase());

      if (refMatch && Math.abs(tx.amount - cl.amount) < 0.01) {
        matches.push({
          bankTransactionId: tx.id,
          entryIds: [cl.entryId],
          lineIds: [cl.lineId],
          method: 'reference',
          bankAmount: tx.amount,
          comptaAmount: cl.amount,
          ecart: 0,
          confidence: 0.95,
        });
        tx.matched = true;
        cl.matched = true;
        break;
      }
    }
  }

  return matches;
}

function matchSumN(
  bankTx: BankTransaction[],
  comptaLines: ComptaLine[],
  toleranceMontant: number,
): RapprochementMatch[] {
  const matches: RapprochementMatch[] = [];

  for (const tx of bankTx) {
    if (tx.matched) continue;

    const available = comptaLines.filter(cl => !cl.matched && Math.sign(cl.amount) === Math.sign(tx.amount));
    if (available.length < 2) continue;

    // Greedy search: try to find a subset that sums to tx.amount
    const sorted = [...available].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const selected: ComptaLine[] = [];
    let sum = 0;

    for (const cl of sorted) {
      if (Math.abs(sum + cl.amount - tx.amount) < Math.abs(sum - tx.amount)) {
        selected.push(cl);
        sum += cl.amount;
      }
      if (Math.abs(sum - tx.amount) <= toleranceMontant) break;
    }

    if (selected.length >= 2 && Math.abs(sum - tx.amount) <= toleranceMontant) {
      matches.push({
        bankTransactionId: tx.id,
        entryIds: selected.map(cl => cl.entryId),
        lineIds: selected.map(cl => cl.lineId),
        method: 'somme',
        bankAmount: tx.amount,
        comptaAmount: sum,
        ecart: Math.abs(sum - tx.amount),
        confidence: 0.75,
      });
      tx.matched = true;
      for (const cl of selected) cl.matched = true;
    }
  }

  return matches;
}

// ============================================================================
// MAIN RAPPROCHEMENT
// ============================================================================

/**
 * Execute le rapprochement bancaire automatique.
 */
export async function rapprochementAutomatique(
  adapter: DataAdapter,
  bankTransactions: BankTransaction[],
  config: Partial<RapprochementConfig> = {},
): Promise<RapprochementResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const comptaLines = getComptaLines(entries, cfg.comptesBancaires);

  // Reset matched flags
  const txCopy = bankTransactions.map(tx => ({ ...tx, matched: false }));
  const clCopy = comptaLines.map(cl => ({ ...cl, matched: false }));

  const allMatches: RapprochementMatch[] = [];

  // 1. Exact match (date identique)
  if (cfg.matchParMontant) {
    allMatches.push(...matchExactAmount(txCopy, clCopy, 0));
  }

  // 2. Tolerance match (date ± N jours)
  if (cfg.matchParMontant && cfg.toleranceJours > 0) {
    allMatches.push(...matchExactAmount(txCopy, clCopy, cfg.toleranceJours));
  }

  // 3. Reference match
  if (cfg.matchParReference) {
    allMatches.push(...matchByReference(txCopy, clCopy));
  }

  // 4. Sum-N match
  if (cfg.matchSomme) {
    allMatches.push(...matchSumN(txCopy, clCopy, cfg.toleranceMontant));
  }

  // Compute totals
  // P0-4 FIX: Money is immutable — must reassign result of .add()
  let soldeReleve = money(0);
  for (const tx of txCopy) soldeReleve = soldeReleve.add(tx.amount);

  let soldeComptable = money(0);
  for (const cl of clCopy) soldeComptable = soldeComptable.add(cl.amount);

  const soldeR = soldeReleve.toNumber();
  const soldeC = soldeComptable.toNumber();

  const matched = allMatches.length;
  const total = txCopy.length;

  return {
    matches: allMatches,
    unmatchedBank: txCopy.filter(tx => !tx.matched),
    unmatchedCompta: clCopy.filter(cl => !cl.matched).map(cl => ({
      entryId: cl.entryId,
      lineId: cl.lineId,
      date: cl.date,
      amount: cl.amount,
      label: cl.label,
    })),
    soldeReleve: soldeR,
    soldeComptable: soldeC,
    ecart: money(soldeR).subtract(soldeC).toNumber(),
    tauxRapprochement: total > 0 ? (matched / total) * 100 : 0,
  };
}

/**
 * Génère l'état de rapprochement bancaire (document SYSCOHADA).
 */
export async function genererEtatRapprochement(
  compte: string,
  bankTransactions: BankTransaction[],
  result: RapprochementResult,
): Promise<EtatRapprochement> {
  const ecrituresNonPointees = result.unmatchedCompta.map(cl => ({
    date: cl.date,
    label: cl.label,
    debit: cl.amount > 0 ? cl.amount : 0,
    credit: cl.amount < 0 ? Math.abs(cl.amount) : 0,
  }));

  const operationsNonComptabilisees = result.unmatchedBank.map(tx => ({
    date: tx.date,
    label: tx.label,
    amount: tx.amount,
  }));

  // Solde banque corrigé = solde relevé - opérations non comptabilisées
  const nonComptaTotal = operationsNonComptabilisees.reduce((s, op) => s + op.amount, 0);
  const soldeBanqueCorrige = money(result.soldeReleve).subtract(nonComptaTotal).toNumber();

  // Solde compta corrigé = solde compta - écritures non pointées
  const nonPointeesTotal = ecrituresNonPointees.reduce((s, e) => s + e.debit - e.credit, 0);
  const soldeComptaCorrige = money(result.soldeComptable).subtract(nonPointeesTotal).toNumber();

  return {
    compte,
    dateRapprochement: new Date().toISOString().split('T')[0],
    soldeReleve: result.soldeReleve,
    soldeComptable: result.soldeComptable,
    ecrituresNonPointees,
    operationsNonComptabilisees,
    soldeBanqueCorrige,
    soldeComptaCorrige,
    isRapproche: Math.abs(soldeBanqueCorrige - soldeComptaCorrige) < 0.01,
  };
}

/**
 * Applique le rapprochement : marque les lignes comme rapprochées dans Dexie.
 */
export async function appliquerRapprochement(
  adapter: DataAdapter,
  matches: RapprochementMatch[],
): Promise<number> {
  let applied = 0;
  const code = `RAP-${new Date().toISOString().slice(0, 10)}`;

  for (const match of matches) {
    const lineIdSet = new Set(match.lineIds);
    const entryIdSet = new Set(match.entryIds);

    for (const entryId of entryIdSet) {
      const entry = await adapter.getById<DBJournalEntry>('journalEntries', entryId);
      if (!entry) continue;

      let modified = false;
      for (const line of entry.lines) {
        if (lineIdSet.has(line.id)) {
          line.lettrageCode = line.lettrageCode || code;
          modified = true;
        }
      }

      if (modified) {
        await adapter.update('journalEntries', entryId, { lines: entry.lines, updatedAt: new Date().toISOString() });
        applied++;
      }
    }
  }

  await logAudit(
    'RAPPROCHEMENT_BANCAIRE',
    'journal_entry',
    '',
    JSON.stringify({ code, matchCount: matches.length, appliedEntries: applied }),
  );

  return applied;
}
