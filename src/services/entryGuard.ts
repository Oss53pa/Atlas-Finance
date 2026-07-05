/**
 * Guard central — Toute insertion d'écriture comptable passe par ici.
 *
 * Garantit :
 * 1. totalDebit / totalCredit toujours calculés (Money class)
 * 2. Validation D=C via validateJournalEntrySync (Money precision)
 * 3. Hash d'intégrité SHA-256 avec chaînage
 * 4. updatedAt toujours présent
 */

import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry, DBFiscalYear } from '../lib/db';
import { money, Money } from '../utils/money';
import { validateJournalEntrySync, type ValidationResult } from '../validators/journalEntryValidator';
import { hashEntry } from '../utils/integrity';
import { getPeriodeStatus } from './periodeComptableService';

export class EntryGuardError extends Error {
  constructor(public errors: string[]) {
    super(errors.join(' | '));
    this.name = 'EntryGuardError';
  }
}

/**
 * Insert une écriture dans Dexie avec validation obligatoire.
 * Lève EntryGuardError si l'écriture est déséquilibrée ou invalide.
 *
 * @param entry L'écriture à insérer (id, lines, etc.)
 * @param options.skipSyncValidation  true pour les écritures système (ex: extourne, clôture)
 *        dont l'équilibre est garanti par construction. La validation reste en place par
 *        défaut pour toute saisie utilisateur.
 */
export async function safeAddEntry(
  adapter: DataAdapter,
  entry: Omit<DBJournalEntry, 'totalDebit' | 'totalCredit' | 'hash' | 'updatedAt'> & {
    totalDebit?: number;
    totalCredit?: number;
    hash?: string;
    updatedAt?: string;
  },
  options: { skipSyncValidation?: boolean; allowClosedPeriod?: boolean } = {},
): Promise<string> {
  const lines = entry.lines ?? [];

  // --- Verrou de clôture (intangibilité SYSCOHADA Art. 19) ---
  // Appliqué à TOUTES les écritures (imports, trésorerie, immo, saisie…), et
  // non plus au seul modal manuel. Les écritures SYSTÈME de clôture (résultat,
  // affectation, à-nouveaux, extourne) passent explicitement allowClosedPeriod.
  if (!options.allowClosedPeriod && entry.date) {
    const fiscalYears = await adapter.getAll<DBFiscalYear>('fiscalYears');
    const fy = fiscalYears.find(f => entry.date >= f.startDate && entry.date <= f.endDate);
    if (fy?.isClosed) {
      throw new EntryGuardError([`Exercice clôturé « ${fy.name} » (${fy.startDate} → ${fy.endDate}) — écriture impossible au ${entry.date}.`]);
    }
    const periodStatus = await getPeriodeStatus(adapter, entry.date);
    if (periodStatus === 'closed' || periodStatus === 'locked') {
      throw new EntryGuardError([`Période du ${entry.date} clôturée/verrouillée — écriture impossible.`]);
    }
  }

  // Load all entries once — reused for duplicate check, cash check, and hash chain
  const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');

  // 1. Compute totalDebit / totalCredit with Money class
  const totalDebit = Money.sum(lines.map(l => money(l.debit))).toNumber();
  const totalCredit = Money.sum(lines.map(l => money(l.credit))).toNumber();

  // 2. Sync validation (unless explicitly skipped for system entries)
  if (!options.skipSyncValidation) {
    const result: ValidationResult = validateJournalEntrySync(
      lines.map(l => ({ accountCode: l.accountCode, debit: l.debit, credit: l.credit })),
    );
    if (!result.isValid) {
      throw new EntryGuardError(result.errors);
    }
  }

  // P1-7: Duplicate detection — vérifier unicité du numéro de pièce
  if (entry.entryNumber) {
    const duplicate = allEntries.find(
      (e: any) => e.entryNumber === entry.entryNumber && e.id !== entry.id
    );
    if (duplicate) {
      throw new EntryGuardError([
        `Doublon détecté : le numéro de pièce "${entry.entryNumber}" existe déjà (écriture ${(duplicate as unknown as { id: string }).id}).`,
      ]);
    }
  }

  // P4-2: Contrôle caisse >= 0 — les comptes de caisse (57x) ne peuvent pas devenir négatifs
  const caisseLines = lines.filter(l => l.accountCode.startsWith('57'));
  if (caisseLines.length > 0) {
    for (const cl of caisseLines) {
      if (cl.credit <= 0) continue; // seules les sorties (crédit) peuvent rendre négatif
      let solde = 0;
      for (const e of allEntries) {
        for (const l of e.lines) {
          if (l.accountCode === cl.accountCode) {
            solde += l.debit - l.credit;
          }
        }
      }
      const soldeFutur = solde - cl.credit + cl.debit;
      if (soldeFutur < 0) {
        throw new EntryGuardError([
          `Solde caisse négatif interdit : le compte ${cl.accountCode} aurait un solde de ${soldeFutur} après cette opération (solde actuel : ${solde}).`,
        ]);
      }
    }
  }

  // 3. Build final entry
  const now = new Date().toISOString();
  const finalEntry: DBJournalEntry = {
    ...entry,
    totalDebit,
    totalCredit,
    updatedAt: entry.updatedAt ?? now,
    createdAt: entry.createdAt ?? now,
    hash: '', // placeholder — overwritten below
  } as DBJournalEntry;

  // Garantir un id d'entête et un id par ligne (les lignes vivent dans la table
  // SÉPARÉE journal_lines ; chaque ligne doit avoir son propre id).
  finalEntry.id = finalEntry.id ?? crypto.randomUUID();
  if (Array.isArray(finalEntry.lines)) {
    finalEntry.lines = finalEntry.lines.map((l: any) => ({ ...l, id: l.id ?? crypto.randomUUID() }));
  }

  // 4. Hash with chain — sort cached entries by date for chain ordering
  const sortedEntries = [...allEntries].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const lastEntry = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : undefined;
  const previousHash = lastEntry?.hash ?? '';
  finalEntry.previousHash = previousHash;
  finalEntry.hash = await hashEntry(finalEntry, previousHash);

  // 5. Persist — via saveJournalEntry qui écrit l'entête ET les lignes dans la table
  // SÉPARÉE journal_lines (RPC atomique + trigger d'équilibre en SaaS). L'ancien
  // adapter.create embarquait `lines` dans journal_entries (colonne inexistante) →
  // l'insert échouait / l'écriture était perdue en production SaaS.
  const saved = await adapter.saveJournalEntry(finalEntry as any);
  (adapter as any).invalidateCache?.();
  return (saved as any)?.id ?? finalEntry.id;
}

/**
 * Insert multiple entries in bulk, each validated individually.
 */
export async function safeBulkAddEntries(
  adapter: DataAdapter,
  entries: Array<
    Omit<DBJournalEntry, 'totalDebit' | 'totalCredit' | 'hash' | 'updatedAt'> & {
      totalDebit?: number;
      totalCredit?: number;
      hash?: string;
      updatedAt?: string;
    }
  >,
  options: { skipSyncValidation?: boolean; allowClosedPeriod?: boolean } = {},
): Promise<string[]> {
  const ids: string[] = [];
  // Sequential to maintain hash chain ordering
  for (const entry of entries) {
    const id = await safeAddEntry(adapter, entry, options);
    ids.push(id);
  }
  return ids;
}
