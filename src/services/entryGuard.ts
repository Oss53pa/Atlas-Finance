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
import type { DBJournalEntry } from '../lib/db';
import { money, Money } from '../utils/money';
import { validateJournalEntrySync, type ValidationResult } from '../validators/journalEntryValidator';
import { hashEntry } from '../utils/integrity';

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
  options: { skipSyncValidation?: boolean } = {},
): Promise<string> {
  const lines = entry.lines ?? [];

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

  // 4. Hash with chain
  const allEntries = await adapter.getAll('journalEntries', { orderBy: { field: 'date', direction: 'asc' } });
  const lastEntry = allEntries.length > 0 ? allEntries[allEntries.length - 1] : undefined;
  const previousHash = lastEntry?.hash ?? '';
  finalEntry.previousHash = previousHash;
  finalEntry.hash = await hashEntry(finalEntry, previousHash);

  // 5. Persist
  await adapter.create('journalEntries', finalEntry);
  return finalEntry.id;
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
  options: { skipSyncValidation?: boolean } = {},
): Promise<string[]> {
  const ids: string[] = [];
  // Sequential to maintain hash chain ordering
  for (const entry of entries) {
    const id = await safeAddEntry(adapter, entry, options);
    ids.push(id);
  }
  return ids;
}
