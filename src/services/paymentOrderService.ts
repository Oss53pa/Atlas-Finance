/**
 * Payment Order Service — Gestion des ordres de paiement.
 * Cycle : draft → pending_approval → approved → executed
 * Chaque exécution génère l'écriture comptable correspondante.
 *
 * Conforme SYSCOHADA révisé.
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../lib/db';
import type { DBPaymentOrder, DBJournalEntry } from '../lib/db';
import { money } from '../utils/money';
import { safeAddEntry } from './entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePaymentOrderInput {
  companyId: string;
  beneficiaryType: DBPaymentOrder['beneficiaryType'];
  beneficiaryId?: string;
  beneficiaryName: string;
  amount: number;
  currency?: string;
  paymentMethod: DBPaymentOrder['paymentMethod'];
  bankAccountId?: string;
  reference?: string;
  description?: string;
}

export interface PaymentOrderResult {
  order: DBPaymentOrder;
  journalEntryId?: string;
}

// ============================================================================
// ACCOUNT MAPPING
// ============================================================================

/** Map beneficiary type to the debit account for payment execution. */
function getDebitAccount(type: DBPaymentOrder['beneficiaryType'], reference?: string): string {
  switch (type) {
    case 'supplier': return '401000';
    case 'employee': return '421100';
    case 'tax_authority': return reference?.startsWith('447') ? reference : '447100';
    case 'social_fund': return '431100';
    default: return '462000'; // Créditeurs divers
  }
}

/** Map payment method to the credit (bank/cash) account. */
function getCreditAccount(method: DBPaymentOrder['paymentMethod'], bankAccountId?: string): string {
  switch (method) {
    case 'cash':
    case 'mobile_money':
      return '571000'; // Caisse
    default:
      return bankAccountId || '521000'; // Banque
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function getNextOrderNumber(adapter: DataAdapter, companyId: string): Promise<string> {
  const all = await adapter.getAll<DBPaymentOrder>('paymentOrders', {
    where: { companyId },
  });
  const num = all.length + 1;
  return `OP-${String(num).padStart(5, '0')}`;
}

// ============================================================================
// SERVICE
// ============================================================================

export async function createPaymentOrder(
  adapter: DataAdapter,
  input: CreatePaymentOrderInput,
): Promise<DBPaymentOrder> {
  const now = new Date().toISOString();
  const orderNumber = await getNextOrderNumber(adapter, input.companyId);

  const order: DBPaymentOrder = {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    orderNumber,
    type: 'single',
    beneficiaryType: input.beneficiaryType,
    beneficiaryId: input.beneficiaryId,
    beneficiaryName: input.beneficiaryName,
    amount: input.amount,
    currency: input.currency || 'XOF',
    paymentMethod: input.paymentMethod,
    bankAccountId: input.bankAccountId,
    reference: input.reference,
    description: input.description,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  await adapter.create('paymentOrders', order);
  await logAudit('CREATE', 'paymentOrder', order.id, `Ordre de paiement ${orderNumber} créé — ${input.beneficiaryName} — ${input.amount} ${order.currency}`);
  return order;
}

export async function createBatchPaymentOrders(
  adapter: DataAdapter,
  inputs: CreatePaymentOrderInput[],
): Promise<DBPaymentOrder[]> {
  const orders: DBPaymentOrder[] = [];
  for (const input of inputs) {
    const order = await createPaymentOrder(adapter, input);
    orders.push(order);
  }
  return orders;
}

export async function submitForApproval(
  adapter: DataAdapter,
  orderId: string,
): Promise<DBPaymentOrder> {
  const order = await adapter.getById<DBPaymentOrder>('paymentOrders', orderId);
  if (!order) throw new Error(`Ordre de paiement ${orderId} introuvable`);
  if (order.status !== 'draft') throw new Error(`Seul un ordre en brouillon peut être soumis (statut actuel: ${order.status})`);

  const updated: DBPaymentOrder = { ...order, status: 'pending_approval', updatedAt: new Date().toISOString() };
  await adapter.update('paymentOrders', orderId, updated);
  await logAudit('SUBMIT', 'paymentOrder', orderId, `Ordre ${order.orderNumber} soumis pour approbation`);
  return updated;
}

export async function approvePaymentOrder(
  adapter: DataAdapter,
  orderId: string,
  approvedBy: string,
): Promise<DBPaymentOrder> {
  const order = await adapter.getById<DBPaymentOrder>('paymentOrders', orderId);
  if (!order) throw new Error(`Ordre de paiement ${orderId} introuvable`);
  if (order.status !== 'pending_approval') throw new Error(`Seul un ordre en attente peut être approuvé (statut actuel: ${order.status})`);

  const now = new Date().toISOString();
  const updated: DBPaymentOrder = {
    ...order,
    status: 'approved',
    approvedBy,
    approvedAt: now,
    updatedAt: now,
  };
  await adapter.update('paymentOrders', orderId, updated);
  await logAudit('APPROVE', 'paymentOrder', orderId, `Ordre ${order.orderNumber} approuvé par ${approvedBy}`);
  return updated;
}

export async function executePaymentOrder(
  adapter: DataAdapter,
  orderId: string,
): Promise<PaymentOrderResult> {
  const order = await adapter.getById<DBPaymentOrder>('paymentOrders', orderId);
  if (!order) throw new Error(`Ordre de paiement ${orderId} introuvable`);
  if (order.status !== 'approved') throw new Error(`Seul un ordre approuvé peut être exécuté (statut actuel: ${order.status})`);

  const now = new Date().toISOString();
  const date = now.substring(0, 10);
  const amt = money(order.amount);

  const debitAccount = getDebitAccount(order.beneficiaryType, order.reference);
  const creditAccount = getCreditAccount(order.paymentMethod, order.bankAccountId);

  // Generate the journal entry
  const entryId = await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `PAY-${order.orderNumber}`,
    journal: 'BQ',
    date,
    reference: order.reference || order.orderNumber,
    label: `Paiement ${order.beneficiaryName} — ${order.orderNumber}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: debitAccount,
        accountName: order.beneficiaryType === 'supplier' ? 'Fournisseurs' : order.beneficiaryName,
        thirdPartyCode: order.beneficiaryId,
        label: `Règlement ${order.reference || order.orderNumber}`,
        debit: amt.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: creditAccount,
        accountName: order.paymentMethod === 'cash' ? 'Caisse' : 'Banque',
        label: `Règlement ${order.reference || order.orderNumber}`,
        debit: 0,
        credit: amt.toNumber(),
      },
    ],
    createdAt: now,
  });

  const updated: DBPaymentOrder = {
    ...order,
    status: 'executed',
    executedAt: now,
    journalEntryId: entryId,
    updatedAt: now,
  };
  await adapter.update('paymentOrders', orderId, updated);
  await logAudit('EXECUTE', 'paymentOrder', orderId, `Ordre ${order.orderNumber} exécuté — ${amt.toNumber()} ${order.currency}`);

  return { order: updated, journalEntryId: entryId };
}

export async function rejectPaymentOrder(
  adapter: DataAdapter,
  orderId: string,
  reason: string,
): Promise<DBPaymentOrder> {
  const order = await adapter.getById<DBPaymentOrder>('paymentOrders', orderId);
  if (!order) throw new Error(`Ordre de paiement ${orderId} introuvable`);
  if (order.status !== 'pending_approval' && order.status !== 'approved') {
    throw new Error(`Impossible de rejeter un ordre avec le statut: ${order.status}`);
  }

  const updated: DBPaymentOrder = {
    ...order,
    status: 'rejected',
    description: (order.description || '') + ` [REJETÉ: ${reason}]`,
    updatedAt: new Date().toISOString(),
  };
  await adapter.update('paymentOrders', orderId, updated);
  await logAudit('REJECT', 'paymentOrder', orderId, `Ordre ${order.orderNumber} rejeté: ${reason}`);
  return updated;
}

export async function getPaymentOrders(
  adapter: DataAdapter,
  companyId: string,
  filters?: { status?: DBPaymentOrder['status'] },
): Promise<DBPaymentOrder[]> {
  const where: Record<string, unknown> = { companyId };
  if (filters?.status) where.status = filters.status;
  return adapter.getAll<DBPaymentOrder>('paymentOrders', { where });
}
