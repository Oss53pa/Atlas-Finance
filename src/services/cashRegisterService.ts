/**
 * Cash Register Service — Gestion de caisse.
 * Cycle : ouverture → mouvements → clôture (avec comptage physique).
 * Chaque mouvement génère une écriture comptable.
 * Contrôle bloquant : solde de caisse jamais négatif.
 *
 * Conforme SYSCOHADA révisé.
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../lib/db';
import type { DBCashRegisterSession, DBCashMovement } from '../lib/db';
import { money, Money } from '../utils/money';
import { safeAddEntry } from './entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface CashMovementInput {
  type: DBCashMovement['type'];
  amount: number;
  paymentMethod?: DBCashMovement['paymentMethod'];
  reference?: string;
  description?: string;
  thirdPartyId?: string;
  /** Compte de contrepartie (ex: 411xxx pour encaissement client, 6xxx pour décaissement charge) */
  counterpartAccount: string;
  counterpartLabel?: string;
}

export interface CashDailyReport {
  session: DBCashRegisterSession;
  movements: DBCashMovement[];
  totalReceipts: number;
  totalDisbursements: number;
  computedBalance: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export async function openSession(
  adapter: DataAdapter,
  companyId: string,
  cashAccountId: string,
  cashierId: string,
  openingBalance: number,
): Promise<DBCashRegisterSession> {
  // Vérifier qu'il n'y a pas déjà une session ouverte pour ce compte
  const existing = await adapter.getAll<DBCashRegisterSession>('cashRegisterSessions', {
    where: { companyId, cashAccountId, status: 'open' },
  });
  if (existing.length > 0) {
    throw new Error(`Une session de caisse est déjà ouverte pour ce compte (${existing[0].id})`);
  }

  const now = new Date().toISOString();
  const session: DBCashRegisterSession = {
    id: crypto.randomUUID(),
    companyId,
    cashAccountId,
    cashierId,
    openedAt: now,
    openingBalance,
    status: 'open',
    createdAt: now,
  };

  await adapter.create('cashRegisterSessions', session);
  await logAudit('OPEN', 'cashRegisterSession', session.id, `Session de caisse ouverte — solde: ${openingBalance} XOF`);
  return session;
}

export async function recordMovement(
  adapter: DataAdapter,
  sessionId: string,
  input: CashMovementInput,
): Promise<DBCashMovement> {
  const session = await adapter.getById<DBCashRegisterSession>('cashRegisterSessions', sessionId);
  if (!session) throw new Error(`Session ${sessionId} introuvable`);
  if (session.status !== 'open') throw new Error('Session de caisse fermée');

  const amt = money(input.amount);
  if (amt.toNumber() <= 0) throw new Error('Le montant doit être positif');

  // Contrôle solde négatif pour les sorties
  if (input.type === 'disbursement' || input.type === 'deposit_to_bank') {
    const currentBalance = await computeSessionBalance(adapter, session);
    if (money(currentBalance).subtract(amt).toNumber() < 0) {
      throw new Error(`Solde de caisse insuffisant. Solde actuel: ${currentBalance} XOF, mouvement: ${amt.toNumber()} XOF`);
    }
  }

  const now = new Date().toISOString();
  const date = now.substring(0, 10);
  const cashAccount = session.cashAccountId || '571000';

  // Build journal entry lines based on movement type
  let debitAccount: string;
  let creditAccount: string;
  let journal: string;
  let label: string;

  switch (input.type) {
    case 'receipt':
      // Encaissement : D Caisse / C Contrepartie (client, produit...)
      debitAccount = cashAccount;
      creditAccount = input.counterpartAccount;
      journal = 'CA';
      label = `Encaissement caisse — ${input.description || input.reference || ''}`;
      break;
    case 'disbursement':
      // Décaissement : D Contrepartie (fournisseur, charge...) / C Caisse
      debitAccount = input.counterpartAccount;
      creditAccount = cashAccount;
      journal = 'CA';
      label = `Décaissement caisse — ${input.description || input.reference || ''}`;
      break;
    case 'supply_from_bank':
      // Approvisionnement : D Caisse / C Virements internes
      debitAccount = cashAccount;
      creditAccount = '585000';
      journal = 'OD';
      label = `Approvisionnement caisse depuis banque`;
      break;
    case 'deposit_to_bank':
      // Versement en banque : D Virements internes / C Caisse
      debitAccount = '585000';
      creditAccount = cashAccount;
      journal = 'OD';
      label = `Versement caisse en banque`;
      break;
  }

  const entryId = await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `CA-${date.replace(/-/g, '')}-${crypto.randomUUID().substring(0, 4)}`,
    journal,
    date,
    reference: input.reference || '',
    label,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: debitAccount,
        accountName: debitAccount === cashAccount ? 'Caisse' : (input.counterpartLabel || input.counterpartAccount),
        thirdPartyCode: input.thirdPartyId,
        label,
        debit: amt.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: creditAccount,
        accountName: creditAccount === cashAccount ? 'Caisse' : (input.counterpartLabel || input.counterpartAccount),
        thirdPartyCode: input.thirdPartyId,
        label,
        debit: 0,
        credit: amt.toNumber(),
      },
    ],
    createdAt: now,
  });

  const movement: DBCashMovement = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    sessionId,
    type: input.type,
    amount: amt.toNumber(),
    paymentMethod: input.paymentMethod || 'cash',
    reference: input.reference,
    description: input.description,
    thirdPartyId: input.thirdPartyId,
    journalEntryId: entryId,
    createdAt: now,
  };

  await adapter.create('cashMovements', movement);
  await logAudit('RECORD', 'cashMovement', movement.id, `Mouvement ${input.type}: ${amt.toNumber()} XOF — ${input.description || ''}`);
  return movement;
}

export async function closeSession(
  adapter: DataAdapter,
  sessionId: string,
  countedBalance: number,
): Promise<{ session: DBCashRegisterSession; discrepancy: number }> {
  const session = await adapter.getById<DBCashRegisterSession>('cashRegisterSessions', sessionId);
  if (!session) throw new Error(`Session ${sessionId} introuvable`);
  if (session.status !== 'open') throw new Error('Session déjà fermée');

  const computedBalance = await computeSessionBalance(adapter, session);
  const discrepancy = money(countedBalance).subtract(money(computedBalance)).toNumber();

  const now = new Date().toISOString();
  let discrepancyEntryId: string | undefined;

  // Si écart, créer l'écriture comptable
  if (discrepancy !== 0) {
    const date = now.substring(0, 10);
    const cashAccount = session.cashAccountId || '571000';
    const lines = discrepancy > 0
      ? [
        // Excédent de caisse : D Caisse / C 758 Produits divers
        { id: crypto.randomUUID(), accountCode: cashAccount, accountName: 'Caisse', label: 'Excédent de caisse', debit: Math.abs(discrepancy), credit: 0 },
        { id: crypto.randomUUID(), accountCode: '758000', accountName: 'Produits divers de gestion', label: 'Excédent de caisse', debit: 0, credit: Math.abs(discrepancy) },
      ]
      : [
        // Déficit de caisse : D 658 Charges diverses / C Caisse
        { id: crypto.randomUUID(), accountCode: '658000', accountName: 'Charges diverses de gestion', label: 'Déficit de caisse', debit: Math.abs(discrepancy), credit: 0 },
        { id: crypto.randomUUID(), accountCode: cashAccount, accountName: 'Caisse', label: 'Déficit de caisse', debit: 0, credit: Math.abs(discrepancy) },
      ];

    discrepancyEntryId = await safeAddEntry(adapter, {
      id: crypto.randomUUID(),
      entryNumber: `CA-ECART-${date.replace(/-/g, '')}`,
      journal: 'CA',
      date,
      reference: `ECART-${session.id.substring(0, 8)}`,
      label: `Écart de caisse — session ${session.id.substring(0, 8)}`,
      status: 'validated',
      lines,
      createdAt: now,
    });
  }

  const updated: DBCashRegisterSession = {
    ...session,
    status: 'closed',
    closedAt: now,
    closingBalanceComputed: computedBalance,
    closingBalanceCounted: countedBalance,
    discrepancy,
    discrepancyJournalEntryId: discrepancyEntryId,
  };

  await adapter.update('cashRegisterSessions', sessionId, updated);
  await logAudit('CLOSE', 'cashRegisterSession', sessionId,
    `Session fermée — calculé: ${computedBalance}, compté: ${countedBalance}, écart: ${discrepancy}`);

  return { session: updated, discrepancy };
}

export async function getDailyCashReport(
  adapter: DataAdapter,
  sessionId: string,
): Promise<CashDailyReport> {
  const session = await adapter.getById<DBCashRegisterSession>('cashRegisterSessions', sessionId);
  if (!session) throw new Error(`Session ${sessionId} introuvable`);

  const movements = await adapter.getAll<DBCashMovement>('cashMovements', {
    where: { sessionId },
  });

  let totalReceipts = money(0);
  let totalDisbursements = money(0);

  for (const m of movements) {
    if (m.type === 'receipt' || m.type === 'supply_from_bank') {
      totalReceipts = totalReceipts.add(money(m.amount));
    } else {
      totalDisbursements = totalDisbursements.add(money(m.amount));
    }
  }

  const computedBalance = money(session.openingBalance)
    .add(totalReceipts)
    .subtract(totalDisbursements)
    .toNumber();

  return {
    session,
    movements,
    totalReceipts: totalReceipts.toNumber(),
    totalDisbursements: totalDisbursements.toNumber(),
    computedBalance,
  };
}

// ============================================================================
// INTERNAL
// ============================================================================

async function computeSessionBalance(
  adapter: DataAdapter,
  session: DBCashRegisterSession,
): Promise<number> {
  const movements = await adapter.getAll<DBCashMovement>('cashMovements', {
    where: { sessionId: session.id },
  });

  let balance = money(session.openingBalance);
  for (const m of movements) {
    if (m.type === 'receipt' || m.type === 'supply_from_bank') {
      balance = balance.add(money(m.amount));
    } else {
      balance = balance.subtract(money(m.amount));
    }
  }
  return balance.toNumber();
}
