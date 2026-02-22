/**
 * Treasury -> Accounting bridge.
 * Generates journal entries from bank movements.
 * SYSCOHADA: DR 512x (bank accounts), CR counterpart account.
 */
import { db, logAudit } from '../../lib/db';
import type { DBJournalEntry } from '../../lib/db';
import { hashEntry } from '../../utils/integrity';

export interface BankMovementPost {
  date: string;
  bankAccountCode: string;
  bankAccountName: string;
  counterpartCode: string;
  counterpartName: string;
  label: string;
  amount: number;
  reference?: string;
}

/**
 * Post a bank movement as a journal entry.
 * Positive amount = receipt (DR bank, CR counterpart)
 * Negative amount = payment (DR counterpart, CR bank)
 */
export async function postBankMovement(movement: BankMovementPost): Promise<string> {
  const id = crypto.randomUUID();
  const absAmount = Math.abs(movement.amount);
  const isReceipt = movement.amount >= 0;

  const lastEntry = await db.journalEntries.orderBy('entryNumber').last();
  const nextNum = lastEntry ? parseInt(lastEntry.entryNumber.replace(/\D/g, '') || '0') + 1 : 1;
  const entryNumber = `BQ-${String(nextNum).padStart(6, '0')}`;

  const now = new Date().toISOString();

  const entry: DBJournalEntry = {
    id,
    entryNumber,
    journal: 'BQ',
    date: movement.date,
    reference: movement.reference || '',
    label: movement.label,
    status: 'draft',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: isReceipt ? movement.bankAccountCode : movement.counterpartCode,
        accountName: isReceipt ? movement.bankAccountName : movement.counterpartName,
        label: movement.label,
        debit: absAmount,
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: isReceipt ? movement.counterpartCode : movement.bankAccountCode,
        accountName: isReceipt ? movement.counterpartName : movement.bankAccountName,
        label: movement.label,
        debit: 0,
        credit: absAmount,
      },
    ],
    totalDebit: absAmount,
    totalCredit: absAmount,
    createdAt: now,
    updatedAt: now,
  };

  // Hash chain
  const prev = await db.journalEntries.orderBy('createdAt').last();
  const previousHash = prev?.hash || '';
  entry.previousHash = previousHash;
  entry.hash = await hashEntry(entry, previousHash);

  await db.journalEntries.add(entry);

  await logAudit(
    'TREASURY_POSTING',
    'journalEntry',
    id,
    `Mouvement bancaire comptabilise: ${movement.label} — ${absAmount}`
  );

  return id;
}

/**
 * Post multiple bank movements in batch.
 */
export async function postBankMovements(movements: BankMovementPost[]): Promise<string[]> {
  const ids: string[] = [];
  for (const movement of movements) {
    const id = await postBankMovement(movement);
    ids.push(id);
  }
  return ids;
}
