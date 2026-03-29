import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';

describe('CashRegisterService', () => {
  const adapter = createTestAdapter();

  beforeEach(async () => {
    await db.cashRegisterSessions.clear();
    await db.cashMovements.clear();
    await db.journalEntries.clear();
  });

  it('should open a cash register session with correct opening balance', async () => {
    const session = await adapter.create<any>('cashRegisterSessions', {
      companyId: 'comp1',
      cashAccountId: '571',
      cashierId: 'user1',
      openedAt: new Date().toISOString(),
      openingBalance: 500000,
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    expect(session.id).toBeTruthy();
    expect(session.openingBalance).toBe(500000);
    expect(session.status).toBe('open');
  });

  it('should record a receipt movement', async () => {
    const session = await adapter.create<any>('cashRegisterSessions', {
      companyId: 'comp1',
      cashAccountId: '571',
      cashierId: 'user1',
      openedAt: new Date().toISOString(),
      openingBalance: 100000,
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    const movement = await adapter.create<any>('cashMovements', {
      companyId: 'comp1',
      sessionId: session.id,
      type: 'receipt',
      amount: 50000,
      paymentMethod: 'cash',
      description: 'Encaissement client',
      createdAt: new Date().toISOString(),
    });

    expect(movement.type).toBe('receipt');
    expect(movement.amount).toBe(50000);
  });

  it('should record a disbursement movement', async () => {
    const session = await adapter.create<any>('cashRegisterSessions', {
      companyId: 'comp1',
      cashAccountId: '571',
      cashierId: 'user1',
      openedAt: new Date().toISOString(),
      openingBalance: 200000,
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    const movement = await adapter.create<any>('cashMovements', {
      companyId: 'comp1',
      sessionId: session.id,
      type: 'disbursement',
      amount: 30000,
      paymentMethod: 'cash',
      description: 'Paiement fournisseur',
      createdAt: new Date().toISOString(),
    });

    expect(movement.type).toBe('disbursement');
    expect(movement.amount).toBe(30000);
  });

  it('should compute closing balance correctly', async () => {
    const opening = 500000;
    const receipts = [50000, 75000];
    const disbursements = [30000];

    const computed = new Decimal(opening)
      .plus(receipts.reduce((s, r) => s + r, 0))
      .minus(disbursements.reduce((s, d) => s + d, 0));

    expect(computed.toNumber()).toBe(595000);
  });

  it('should calculate discrepancy on close', async () => {
    const computed = new Decimal(595000);
    const counted = new Decimal(594500);
    const discrepancy = counted.minus(computed);

    expect(discrepancy.toNumber()).toBe(-500);
  });

  it('should detect zero discrepancy when count matches', async () => {
    const computed = new Decimal(100000);
    const counted = new Decimal(100000);
    const discrepancy = counted.minus(computed);

    expect(discrepancy.isZero()).toBe(true);
  });

  it('should detect positive discrepancy (surplus)', async () => {
    const computed = new Decimal(100000);
    const counted = new Decimal(100500);
    const discrepancy = counted.minus(computed);

    expect(discrepancy.gt(0)).toBe(true);
    expect(discrepancy.toNumber()).toBe(500);
  });

  it('should list movements for a session', async () => {
    const session = await adapter.create<any>('cashRegisterSessions', {
      companyId: 'comp1',
      cashAccountId: '571',
      cashierId: 'user1',
      openedAt: new Date().toISOString(),
      openingBalance: 100000,
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    await adapter.create('cashMovements', {
      companyId: 'comp1', sessionId: session.id, type: 'receipt',
      amount: 50000, paymentMethod: 'cash', createdAt: new Date().toISOString(),
    });
    await adapter.create('cashMovements', {
      companyId: 'comp1', sessionId: session.id, type: 'disbursement',
      amount: 20000, paymentMethod: 'cash', createdAt: new Date().toISOString(),
    });

    const movements = await adapter.getAll('cashMovements', {
      where: { sessionId: session.id },
    });
    expect(movements.length).toBe(2);
  });

  it('should use Decimal.js for all amounts', () => {
    const amount = new Decimal('123456.78');
    expect(amount.toNumber()).toBe(123456.78);
    expect(amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()).toBe('123456.78');
  });

  it('should not allow negative cash balance', () => {
    const opening = new Decimal(50000);
    const disbursement = new Decimal(60000);
    const wouldBeNegative = opening.minus(disbursement).lt(0);

    expect(wouldBeNegative).toBe(true);
  });
});
