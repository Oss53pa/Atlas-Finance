/**
 * State machine for journal entry status transitions.
 *
 * Allowed transitions (SYSCOHADA compliant):
 *   draft      → validated     (Validation par l'utilisateur)
 *   validated  → posted        (Comptabilisation définitive)
 *   validated  → draft         (Retour en brouillon — avant comptabilisation uniquement)
 *   posted     — IMMUTABLE     (SYSCOHADA Art. 19 — contrepassation uniquement)
 *
 * Each transition is logged in the audit trail.
 */

import { db, logAudit } from '../lib/db';
import type { DBJournalEntry } from '../lib/db';
import { validateJournalEntry } from '../validators/journalEntryValidator';

export type EntryStatus = 'draft' | 'validated' | 'posted';

const TRANSITIONS: Record<EntryStatus, EntryStatus[]> = {
  draft: ['validated'],
  validated: ['posted', 'draft'],
  posted: [], // immutable — reversal only
};

export interface TransitionResult {
  success: boolean;
  error?: string;
  newStatus?: EntryStatus;
}

/**
 * Check if a transition is allowed.
 */
export function canTransition(from: EntryStatus, to: EntryStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the list of allowed next statuses for a given entry.
 */
export function allowedTransitions(status: EntryStatus): EntryStatus[] {
  return TRANSITIONS[status] ?? [];
}

/**
 * Transition label for UI display.
 */
export function transitionLabel(to: EntryStatus): string {
  switch (to) {
    case 'validated': return 'Valider';
    case 'posted': return 'Comptabiliser';
    case 'draft': return 'Retour brouillon';
    default: return to;
  }
}

/**
 * Validate an entry (draft → validated).
 * Runs full async validation (D=C, accounts, fiscal year).
 */
export async function validerEcriture(entryId: string): Promise<TransitionResult> {
  const entry = await db.journalEntries.get(entryId);
  if (!entry) return { success: false, error: 'Écriture introuvable.' };

  if (!canTransition(entry.status as EntryStatus, 'validated')) {
    return { success: false, error: `Transition ${entry.status} → validated non autorisée.` };
  }

  // Full validation before accepting
  const result = await validateJournalEntry({
    date: entry.date,
    lines: entry.lines,
    journal: entry.journal,
    label: entry.label,
  });

  if (!result.isValid) {
    return { success: false, error: result.errors.join(' | ') };
  }

  const now = new Date().toISOString();
  await db.journalEntries.update(entryId, {
    status: 'validated',
    updatedAt: now,
  });

  await logAudit(
    'STATUS_CHANGE',
    'journal_entry',
    entryId,
    JSON.stringify({ from: 'draft', to: 'validated', entryNumber: entry.entryNumber }),
  );

  return { success: true, newStatus: 'validated' };
}

/**
 * Post an entry (validated → posted).
 * Makes entry definitive (SYSCOHADA immutability begins).
 */
export async function comptabiliserEcriture(entryId: string): Promise<TransitionResult> {
  const entry = await db.journalEntries.get(entryId);
  if (!entry) return { success: false, error: 'Écriture introuvable.' };

  if (!canTransition(entry.status as EntryStatus, 'posted')) {
    return { success: false, error: `Transition ${entry.status} → posted non autorisée.` };
  }

  const now = new Date().toISOString();
  await db.journalEntries.update(entryId, {
    status: 'posted',
    updatedAt: now,
  });

  await logAudit(
    'STATUS_CHANGE',
    'journal_entry',
    entryId,
    JSON.stringify({ from: 'validated', to: 'posted', entryNumber: entry.entryNumber }),
  );

  return { success: true, newStatus: 'posted' };
}

/**
 * Return entry to draft (validated → draft).
 * Only possible before comptabilisation.
 */
export async function retourBrouillon(entryId: string): Promise<TransitionResult> {
  const entry = await db.journalEntries.get(entryId);
  if (!entry) return { success: false, error: 'Écriture introuvable.' };

  if (!canTransition(entry.status as EntryStatus, 'draft')) {
    return { success: false, error: `Impossible de repasser en brouillon depuis "${entry.status}".` };
  }

  const now = new Date().toISOString();
  await db.journalEntries.update(entryId, {
    status: 'draft',
    updatedAt: now,
  });

  await logAudit(
    'STATUS_CHANGE',
    'journal_entry',
    entryId,
    JSON.stringify({ from: 'validated', to: 'draft', entryNumber: entry.entryNumber }),
  );

  return { success: true, newStatus: 'draft' };
}

/**
 * Batch validate multiple entries.
 * Returns count of successes and list of failures.
 */
export async function validerLot(entryIds: string[]): Promise<{
  validated: number;
  failures: Array<{ id: string; error: string }>;
}> {
  let validated = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const id of entryIds) {
    const result = await validerEcriture(id);
    if (result.success) {
      validated++;
    } else {
      failures.push({ id, error: result.error ?? 'Erreur inconnue' });
    }
  }

  return { validated, failures };
}

/**
 * Batch post multiple entries.
 */
export async function comptabiliserLot(entryIds: string[]): Promise<{
  posted: number;
  failures: Array<{ id: string; error: string }>;
}> {
  let posted = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const id of entryIds) {
    const result = await comptabiliserEcriture(id);
    if (result.success) {
      posted++;
    } else {
      failures.push({ id, error: result.error ?? 'Erreur inconnue' });
    }
  }

  return { posted, failures };
}
