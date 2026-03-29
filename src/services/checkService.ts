/**
 * Check Service — Registre de chèques (entrants et sortants).
 * Cycle entrant : received → deposited → cleared (ou bounced)
 * Cycle sortant : issued → cashed
 * Chaque étape génère l'écriture comptable correspondante.
 *
 * Conforme SYSCOHADA révisé.
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../lib/db';
import type { DBCheck } from '../lib/db';
import { money } from '../utils/money';
import { safeAddEntry } from './entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface IncomingCheckInput {
  companyId: string;
  checkNumber: string;
  bankName: string;
  amount: number;
  thirdPartyId?: string;
  issueDate: string;
  /** Compte client (ex: '411001') */
  clientAccount: string;
}

export interface OutgoingCheckInput {
  companyId: string;
  checkNumber: string;
  bankName: string;
  amount: number;
  thirdPartyId?: string;
  issueDate: string;
  bankAccountId: string;
  /** Compte fournisseur (ex: '401001') */
  supplierAccount: string;
}

// ============================================================================
// INCOMING CHECKS
// ============================================================================

export async function receiveCheck(
  adapter: DataAdapter,
  input: IncomingCheckInput,
): Promise<DBCheck> {
  const now = new Date().toISOString();
  const amt = money(input.amount);

  // D: 511200 Chèques à encaisser / C: 411xxx Client
  const entryId = await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `CHQ-R-${input.checkNumber}`,
    journal: 'BQ',
    date: input.issueDate,
    reference: `CHQ-${input.checkNumber}`,
    label: `Réception chèque n°${input.checkNumber} — ${input.bankName}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: '511200',
        accountName: 'Chèques à encaisser',
        label: `Chèque n°${input.checkNumber}`,
        debit: amt.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: input.clientAccount,
        accountName: 'Client',
        thirdPartyCode: input.thirdPartyId,
        label: `Chèque n°${input.checkNumber}`,
        debit: 0,
        credit: amt.toNumber(),
      },
    ],
    createdAt: now,
  });

  const check: DBCheck = {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    direction: 'incoming',
    checkNumber: input.checkNumber,
    bankName: input.bankName,
    amount: amt.toNumber(),
    thirdPartyId: input.thirdPartyId,
    issueDate: input.issueDate,
    status: 'received',
    journalEntryId: entryId,
    createdAt: now,
    updatedAt: now,
  };

  await adapter.create('checks', check);
  await logAudit('RECEIVE', 'check', check.id, `Chèque entrant n°${input.checkNumber} reçu — ${amt.toNumber()} XOF`);
  return check;
}

export async function depositCheck(
  adapter: DataAdapter,
  checkId: string,
  bankAccountId: string,
): Promise<DBCheck> {
  const check = await adapter.getById<DBCheck>('checks', checkId);
  if (!check) throw new Error(`Chèque ${checkId} introuvable`);
  if (check.status !== 'received') throw new Error(`Le chèque doit être au statut "received" (actuel: ${check.status})`);

  const now = new Date().toISOString();
  const date = now.substring(0, 10);
  const amt = money(check.amount);
  const bankAccount = bankAccountId || '521000';

  // D: 521000 Banque / C: 511200 Chèques à encaisser
  await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `CHQ-D-${check.checkNumber}`,
    journal: 'BQ',
    date,
    reference: `CHQ-${check.checkNumber}`,
    label: `Remise en banque chèque n°${check.checkNumber}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: bankAccount,
        accountName: 'Banque',
        label: `Remise chèque n°${check.checkNumber}`,
        debit: amt.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: '511200',
        accountName: 'Chèques à encaisser',
        label: `Remise chèque n°${check.checkNumber}`,
        debit: 0,
        credit: amt.toNumber(),
      },
    ],
    createdAt: now,
  });

  const updated: DBCheck = {
    ...check,
    status: 'deposited',
    depositDate: date,
    updatedAt: now,
  };
  await adapter.update('checks', checkId, updated);
  await logAudit('DEPOSIT', 'check', checkId, `Chèque n°${check.checkNumber} déposé en banque`);
  return updated;
}

export async function clearCheck(
  adapter: DataAdapter,
  checkId: string,
): Promise<DBCheck> {
  const check = await adapter.getById<DBCheck>('checks', checkId);
  if (!check) throw new Error(`Chèque ${checkId} introuvable`);
  if (check.status !== 'deposited') throw new Error(`Le chèque doit être déposé (actuel: ${check.status})`);

  const now = new Date().toISOString();
  const updated: DBCheck = {
    ...check,
    status: 'cleared',
    clearanceDate: now.substring(0, 10),
    updatedAt: now,
  };
  await adapter.update('checks', checkId, updated);
  await logAudit('CLEAR', 'check', checkId, `Chèque n°${check.checkNumber} encaissé`);
  return updated;
}

export async function recordBounce(
  adapter: DataAdapter,
  checkId: string,
  reason: string,
  bankFees?: number,
): Promise<DBCheck> {
  const check = await adapter.getById<DBCheck>('checks', checkId);
  if (!check) throw new Error(`Chèque ${checkId} introuvable`);
  if (check.status !== 'deposited') throw new Error(`Seul un chèque déposé peut être rejeté (actuel: ${check.status})`);

  const now = new Date().toISOString();
  const date = now.substring(0, 10);
  const amt = money(check.amount);

  // 1. Réimputation au client : D 411xxx / C 521000 Banque
  const lines = [
    {
      id: crypto.randomUUID(),
      accountCode: '416000', // Créances douteuses
      accountName: 'Clients — Chèques impayés',
      thirdPartyCode: check.thirdPartyId,
      label: `Chèque impayé n°${check.checkNumber} — ${reason}`,
      debit: amt.toNumber(),
      credit: 0,
    },
    {
      id: crypto.randomUUID(),
      accountCode: '521000',
      accountName: 'Banque',
      label: `Rejet chèque n°${check.checkNumber}`,
      debit: 0,
      credit: amt.toNumber(),
    },
  ];

  // 2. Frais bancaires si applicable
  if (bankFees && bankFees > 0) {
    const fees = money(bankFees);
    lines.push(
      {
        id: crypto.randomUUID(),
        accountCode: '631200',
        accountName: 'Frais sur effets impayés',
        label: `Frais rejet chèque n°${check.checkNumber}`,
        debit: fees.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: '521000',
        accountName: 'Banque',
        label: `Frais rejet chèque n°${check.checkNumber}`,
        debit: 0,
        credit: fees.toNumber(),
      },
    );
  }

  const bounceEntryId = await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `CHQ-IMP-${check.checkNumber}`,
    journal: 'BQ',
    date,
    reference: `CHQ-IMP-${check.checkNumber}`,
    label: `Chèque impayé n°${check.checkNumber} — ${reason}`,
    status: 'validated',
    lines,
    createdAt: now,
  });

  const updated: DBCheck = {
    ...check,
    status: 'bounced',
    bounceReason: reason,
    bounceJournalEntryId: bounceEntryId,
    updatedAt: now,
  };
  await adapter.update('checks', checkId, updated);
  await logAudit('BOUNCE', 'check', checkId, `Chèque n°${check.checkNumber} rejeté: ${reason}`);
  return updated;
}

// ============================================================================
// OUTGOING CHECKS
// ============================================================================

export async function issueCheck(
  adapter: DataAdapter,
  input: OutgoingCheckInput,
): Promise<DBCheck> {
  const now = new Date().toISOString();
  const amt = money(input.amount);
  const bankAccount = input.bankAccountId || '521000';

  // D: 401xxx Fournisseur / C: 521000 Banque
  const entryId = await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `CHQ-E-${input.checkNumber}`,
    journal: 'BQ',
    date: input.issueDate,
    reference: `CHQ-${input.checkNumber}`,
    label: `Émission chèque n°${input.checkNumber}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: input.supplierAccount,
        accountName: 'Fournisseur',
        thirdPartyCode: input.thirdPartyId,
        label: `Chèque n°${input.checkNumber}`,
        debit: amt.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: bankAccount,
        accountName: 'Banque',
        label: `Chèque n°${input.checkNumber}`,
        debit: 0,
        credit: amt.toNumber(),
      },
    ],
    createdAt: now,
  });

  const check: DBCheck = {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    direction: 'outgoing',
    checkNumber: input.checkNumber,
    bankName: input.bankName,
    amount: amt.toNumber(),
    thirdPartyId: input.thirdPartyId,
    issueDate: input.issueDate,
    status: 'issued',
    journalEntryId: entryId,
    createdAt: now,
    updatedAt: now,
  };

  await adapter.create('checks', check);
  await logAudit('ISSUE', 'check', check.id, `Chèque sortant n°${input.checkNumber} émis — ${amt.toNumber()} XOF`);
  return check;
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getChecks(
  adapter: DataAdapter,
  companyId: string,
  filters?: { direction?: DBCheck['direction']; status?: DBCheck['status'] },
): Promise<DBCheck[]> {
  const where: Record<string, unknown> = { companyId };
  if (filters?.direction) where.direction = filters.direction;
  if (filters?.status) where.status = filters.status;
  return adapter.getAll<DBCheck>('checks', { where });
}
