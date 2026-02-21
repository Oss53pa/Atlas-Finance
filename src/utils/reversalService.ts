/**
 * Journal Entry Reversal (Contrepassation) Service
 * SYSCOHADA Article 19 — Validated entries cannot be modified or deleted.
 * The only way to cancel a validated entry is to create a reversal entry.
 */

import { db, logAudit } from '../lib/db';
import type { DBJournalEntry } from '../lib/db';
import { safeAddEntry } from '../services/entryGuard';

export interface ReversalRequest {
  originalEntryId: string;
  reversalDate: string;
  reason: string;
}

export interface ReversalResult {
  success: boolean;
  reversalEntry?: DBJournalEntry;
  error?: string;
}

/** Get the next sequential piece number for a journal */
async function getNextPieceNumber(journal: string): Promise<string> {
  const entries = await db.journalEntries
    .where('journal')
    .equals(journal)
    .sortBy('entryNumber');

  const lastNumber = entries.length > 0
    ? parseInt(entries[entries.length - 1].entryNumber.replace(/\D/g, '') || '0', 10)
    : 0;

  const prefix = journal.substring(0, 2).toUpperCase();
  return `${prefix}-${String(lastNumber + 1).padStart(6, '0')}`;
}

/** Create a reversal entry for a validated journal entry */
export async function reverseEntry(request: ReversalRequest): Promise<ReversalResult> {
  const original = await db.journalEntries.get(request.originalEntryId);

  if (!original) {
    return { success: false, error: 'Écriture introuvable.' };
  }

  if (original.status !== 'validated' && original.status !== 'posted') {
    return { success: false, error: 'Seules les écritures validées ou comptabilisées peuvent être contrepassées.' };
  }

  if (original.reversed) {
    return { success: false, error: 'Cette écriture a déjà été contrepassée.' };
  }

  const entryNumber = await getNextPieceNumber(original.journal);
  const now = new Date().toISOString();

  const reversalId = crypto.randomUUID();
  await safeAddEntry({
    id: reversalId,
    entryNumber,
    journal: original.journal,
    date: request.reversalDate,
    reference: `CTPS-${original.entryNumber}`,
    label: `CONTREPASSATION — ${original.label}`,
    status: 'validated',
    lines: original.lines.map(line => ({
      id: crypto.randomUUID(),
      accountCode: line.accountCode,
      accountName: line.accountName,
      thirdPartyCode: line.thirdPartyCode,
      thirdPartyName: line.thirdPartyName,
      label: line.label,
      debit: line.credit,   // Inversion
      credit: line.debit,   // Inversion
      analyticalCode: line.analyticalCode,
      lettrageCode: line.lettrageCode,
    })),
    reversalOf: original.id,
    reversalReason: request.reason,
    createdAt: now,
    createdBy: 'system',
  }, { skipSyncValidation: true });

  // Mark original as reversed
  await db.journalEntries.update(original.id, {
    reversed: true,
    reversedBy: reversalId,
    reversedAt: now,
    updatedAt: now,
  });

  // Audit trail
  await logAudit(
    'REVERSAL',
    'journal_entry',
    original.id,
    JSON.stringify({
      originalEntryId: original.id,
      originalEntryNumber: original.entryNumber,
      reversalEntryId: reversalId,
      reversalEntryNumber: entryNumber,
      reason: request.reason,
    })
  );

  const reversalEntry = await db.journalEntries.get(reversalId);
  return { success: true, reversalEntry };
}

/** Check if an entry can be edited (only drafts) */
export function isEntryEditable(status: string): boolean {
  return status === 'draft';
}

/** Check if an entry can be reversed */
export function isEntryReversible(entry: { status: string; reversed?: boolean }): boolean {
  return (entry.status === 'validated' || entry.status === 'posted') && !entry.reversed;
}
