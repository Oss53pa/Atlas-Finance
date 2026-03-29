/**
 * Correction #11 — Off-Balance Commitments Service
 * Manages guarantees, mortgages, pledges, lease commitments, etc.
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';
import type { DBOffBalanceCommitment } from '../lib/db';

export async function createCommitment(
  adapter: DataAdapter,
  data: Omit<DBOffBalanceCommitment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DBOffBalanceCommitment> {
  const now = new Date().toISOString();
  const record = await adapter.create<DBOffBalanceCommitment>('offBalanceCommitments', {
    ...data,
    createdAt: now,
    updatedAt: now,
  } as Omit<DBOffBalanceCommitment, 'id'>);

  await adapter.logAudit({
    timestamp: now,
    action: 'CREATE',
    entityType: 'offBalanceCommitments',
    entityId: record.id,
    details: `Engagement hors bilan créé: ${data.type} - ${data.counterparty} - ${data.amount}`,
    previousHash: '',
  });

  return record;
}

export async function updateCommitment(
  adapter: DataAdapter,
  id: string,
  data: Partial<DBOffBalanceCommitment>
): Promise<DBOffBalanceCommitment> {
  const updated = await adapter.update<DBOffBalanceCommitment>('offBalanceCommitments', id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export async function getCommitments(
  adapter: DataAdapter,
  companyId: string,
  filters?: { type?: string; status?: string }
): Promise<DBOffBalanceCommitment[]> {
  let all = await adapter.getAll<DBOffBalanceCommitment>('offBalanceCommitments', {
    where: { companyId },
  });

  if (filters?.type) {
    all = all.filter(c => c.type === filters.type);
  }
  if (filters?.status) {
    all = all.filter(c => c.status === filters.status);
  }

  return all;
}

export async function getActiveCommitments(
  adapter: DataAdapter,
  companyId: string
): Promise<DBOffBalanceCommitment[]> {
  return getCommitments(adapter, companyId, { status: 'active' });
}

export async function releaseCommitment(
  adapter: DataAdapter,
  id: string
): Promise<void> {
  await adapter.update('offBalanceCommitments', id, {
    status: 'released',
    updatedAt: new Date().toISOString(),
  });

  await adapter.logAudit({
    timestamp: new Date().toISOString(),
    action: 'UPDATE',
    entityType: 'offBalanceCommitments',
    entityId: id,
    details: 'Engagement levé',
    previousHash: '',
  });
}

export async function getCommitmentsSummary(
  adapter: DataAdapter,
  companyId: string
): Promise<{
  totalGiven: Decimal;
  totalReceived: Decimal;
  byType: Record<string, Decimal>;
}> {
  const active = await getActiveCommitments(adapter, companyId);

  const givenTypes = new Set(['guarantee_given', 'mortgage', 'pledge', 'bank_guarantee']);
  const receivedTypes = new Set(['guarantee_received', 'letter_of_credit']);

  let totalGiven = new Decimal(0);
  let totalReceived = new Decimal(0);
  const byType: Record<string, Decimal> = {};

  for (const c of active) {
    const amount = new Decimal(c.amount);

    if (givenTypes.has(c.type)) {
      totalGiven = totalGiven.plus(amount);
    } else if (receivedTypes.has(c.type)) {
      totalReceived = totalReceived.plus(amount);
    }

    if (!byType[c.type]) byType[c.type] = new Decimal(0);
    byType[c.type] = byType[c.type].plus(amount);
  }

  return {
    totalGiven: totalGiven.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalReceived: totalReceived.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    byType,
  };
}
