/**
 * Tests for treasury services connected to Dexie.
 * Covers: paymentOrderService, cashRegisterService, loanScheduleService, checkService.
 *
 * Each service is tested for its full lifecycle including journal entry generation
 * and SYSCOHADA account compliance.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import type { DBJournalEntry } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { money } from '../utils/money';

// Payment Order Service
import {
  createPaymentOrder,
  submitForApproval,
  approvePaymentOrder,
  executePaymentOrder,
  rejectPaymentOrder,
  getPaymentOrders,
} from '../services/paymentOrderService';

// Cash Register Service
import {
  openSession,
  recordMovement,
  closeSession,
  getDailyCashReport,
} from '../services/cashRegisterService';

// Loan Schedule Service
import {
  computeSchedule,
  generateSchedule,
  recordInstallmentPayment,
} from '../services/loanScheduleService';

// Check Service
import {
  receiveCheck,
  depositCheck,
  clearCheck,
  recordBounce,
  issueCheck,
} from '../services/checkService';

const adapter = createTestAdapter();
const COMPANY_ID = 'test-company-001';

// ---------------------------------------------------------------------------
// Helper: verify that a journal entry exists and is balanced (D === C)
// ---------------------------------------------------------------------------
async function expectBalancedEntry(entryId: string) {
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const entry = entries.find((e) => e.id === entryId);
  expect(entry).toBeDefined();
  expect(money(entry!.totalDebit).toNumber()).toBe(money(entry!.totalCredit).toNumber());
  return entry!;
}

async function allEntries(): Promise<DBJournalEntry[]> {
  return adapter.getAll<DBJournalEntry>('journalEntries');
}

// ===========================================================================
// paymentOrderService
// ===========================================================================

describe('paymentOrderService', () => {
  beforeEach(async () => {
    await db.paymentOrders.clear();
    await db.journalEntries.clear();
    await db.auditLogs.clear();
  });

  it('should create a payment order with status=draft', async () => {
    const order = await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'supplier',
      beneficiaryName: 'Fournisseur Alpha',
      amount: 500000,
      paymentMethod: 'transfer',
      reference: 'FAC-2025-001',
      description: 'Achat fournitures bureau',
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe('draft');
    expect(order.beneficiaryType).toBe('supplier');
    expect(order.beneficiaryName).toBe('Fournisseur Alpha');
    expect(order.amount).toBe(500000);
    expect(order.currency).toBe('XOF');
    expect(order.orderNumber).toMatch(/^OP-\d{5}$/);
  });

  it('should submit for approval → status=pending_approval', async () => {
    const order = await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'supplier',
      beneficiaryName: 'Fournisseur Beta',
      amount: 300000,
      paymentMethod: 'transfer',
    });

    const submitted = await submitForApproval(adapter, order.id);
    expect(submitted.status).toBe('pending_approval');
  });

  it('should approve → status=approved with approver info', async () => {
    const order = await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'employee',
      beneficiaryName: 'Jean Dupont',
      amount: 150000,
      paymentMethod: 'transfer',
    });

    await submitForApproval(adapter, order.id);
    const approved = await approvePaymentOrder(adapter, order.id, 'directeur-financier');

    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('directeur-financier');
    expect(approved.approvedAt).toBeDefined();
  });

  it('should execute → status=executed, journal entry created with D===C', async () => {
    const order = await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'supplier',
      beneficiaryName: 'Fournisseur Gamma',
      amount: 750000,
      paymentMethod: 'transfer',
      bankAccountId: '521000',
    });

    await submitForApproval(adapter, order.id);
    await approvePaymentOrder(adapter, order.id, 'admin');
    const result = await executePaymentOrder(adapter, order.id);

    expect(result.order.status).toBe('executed');
    expect(result.order.executedAt).toBeDefined();
    expect(result.journalEntryId).toBeDefined();

    // Verify journal entry is balanced
    const entry = await expectBalancedEntry(result.journalEntryId!);
    expect(money(entry.totalDebit).toNumber()).toBe(750000);

    // Verify account codes: D:401000 (supplier) / C:521000 (bank)
    const debitLine = entry.lines.find((l) => l.debit > 0);
    const creditLine = entry.lines.find((l) => l.credit > 0);
    expect(debitLine!.accountCode).toBe('401000');
    expect(creditLine!.accountCode).toBe('521000');
  });

  it('should reject → status=rejected', async () => {
    const order = await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'supplier',
      beneficiaryName: 'Fournisseur Delta',
      amount: 200000,
      paymentMethod: 'check',
    });

    await submitForApproval(adapter, order.id);
    const rejected = await rejectPaymentOrder(adapter, order.id, 'Montant non justifié');

    expect(rejected.status).toBe('rejected');
    expect(rejected.description).toContain('REJETÉ');
    expect(rejected.description).toContain('Montant non justifié');
  });

  it('should not execute an unapproved order', async () => {
    const order = await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'supplier',
      beneficiaryName: 'Fournisseur Epsilon',
      amount: 100000,
      paymentMethod: 'transfer',
    });

    // Try to execute a draft order (not submitted, not approved)
    await expect(executePaymentOrder(adapter, order.id)).rejects.toThrow(/approuvé/);

    // Also try after submission but before approval
    await submitForApproval(adapter, order.id);
    await expect(executePaymentOrder(adapter, order.id)).rejects.toThrow(/approuvé/);
  });

  it('should list orders filtered by status', async () => {
    await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'supplier',
      beneficiaryName: 'A',
      amount: 100000,
      paymentMethod: 'transfer',
    });
    const order2 = await createPaymentOrder(adapter, {
      companyId: COMPANY_ID,
      beneficiaryType: 'employee',
      beneficiaryName: 'B',
      amount: 200000,
      paymentMethod: 'transfer',
    });
    await submitForApproval(adapter, order2.id);

    const drafts = await getPaymentOrders(adapter, COMPANY_ID, { status: 'draft' });
    expect(drafts.length).toBe(1);

    const pending = await getPaymentOrders(adapter, COMPANY_ID, { status: 'pending_approval' });
    expect(pending.length).toBe(1);
  });
});

// ===========================================================================
// cashRegisterService
// ===========================================================================

describe('cashRegisterService', () => {
  beforeEach(async () => {
    await db.cashRegisterSessions.clear();
    await db.cashMovements.clear();
    await db.journalEntries.clear();
    await db.auditLogs.clear();
  });

  it('should open a session with the correct opening balance', async () => {
    const session = await openSession(adapter, COMPANY_ID, '571000', 'cashier-01', 500000);

    expect(session.id).toBeDefined();
    expect(session.openingBalance).toBe(500000);
    expect(session.status).toBe('open');
    expect(session.cashierId).toBe('cashier-01');
    expect(session.cashAccountId).toBe('571000');
  });

  it('should record a receipt and increase balance', async () => {
    const session = await openSession(adapter, COMPANY_ID, '571000', 'cashier-01', 100000);

    const movement = await recordMovement(adapter, session.id, {
      type: 'receipt',
      amount: 50000,
      counterpartAccount: '411001',
      description: 'Encaissement client',
    });

    expect(movement.type).toBe('receipt');
    expect(movement.amount).toBe(50000);
    expect(movement.journalEntryId).toBeDefined();

    // Verify journal entry: D:571000 / C:411001
    const entry = await expectBalancedEntry(movement.journalEntryId!);
    const debitLine = entry.lines.find((l) => l.debit > 0);
    const creditLine = entry.lines.find((l) => l.credit > 0);
    expect(debitLine!.accountCode).toBe('571000');
    expect(creditLine!.accountCode).toBe('411001');

    // Check balance via report
    const report = await getDailyCashReport(adapter, session.id);
    expect(report.computedBalance).toBe(150000);
  });

  it('should record a disbursement and decrease balance', async () => {
    const session = await openSession(adapter, COMPANY_ID, '571000', 'cashier-01', 200000);

    // First seed a receipt entry so the cash account has a balance for entryGuard check
    await db.journalEntries.add({
      id: 'seed-cash-balance',
      entryNumber: 'SEED-001',
      journal: 'CA',
      date: '2025-01-01',
      reference: 'SEED',
      label: 'Solde initial caisse',
      status: 'validated',
      lines: [
        { id: 'sl1', accountCode: '571000', accountName: 'Caisse', label: 'Solde', debit: 500000, credit: 0 },
        { id: 'sl2', accountCode: '101000', accountName: 'Capital', label: 'Solde', debit: 0, credit: 500000 },
      ],
      totalDebit: 500000,
      totalCredit: 500000,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      hash: '',
    });

    const movement = await recordMovement(adapter, session.id, {
      type: 'disbursement',
      amount: 75000,
      counterpartAccount: '601000',
      description: 'Achat fournitures',
    });

    expect(movement.type).toBe('disbursement');
    expect(movement.amount).toBe(75000);

    // Check balance via report
    const report = await getDailyCashReport(adapter, session.id);
    expect(report.computedBalance).toBe(125000); // 200000 - 75000
  });

  it('should block negative balance on disbursement', async () => {
    const session = await openSession(adapter, COMPANY_ID, '571000', 'cashier-01', 10000);

    await expect(
      recordMovement(adapter, session.id, {
        type: 'disbursement',
        amount: 50000,
        counterpartAccount: '601000',
        description: 'Tentative de décaissement excessif',
      }),
    ).rejects.toThrow(/insuffisant/i);
  });

  it('should close session with matching count → discrepancy=0', async () => {
    const session = await openSession(adapter, COMPANY_ID, '571000', 'cashier-01', 100000);

    // Close with exact matching balance
    const { session: closed, discrepancy } = await closeSession(adapter, session.id, 100000);

    expect(closed.status).toBe('closed');
    expect(discrepancy).toBe(0);
    expect(closed.closingBalanceComputed).toBe(100000);
    expect(closed.closingBalanceCounted).toBe(100000);

    // No discrepancy journal entry should exist
    const entries = await allEntries();
    const discrepancyEntries = entries.filter((e) => e.entryNumber.includes('ECART'));
    expect(discrepancyEntries.length).toBe(0);
  });

  it('should close session with discrepancy → creates ecart entry', async () => {
    // Seed a cash account balance so entryGuard allows the deficit entry (C:571000)
    await db.journalEntries.add({
      id: 'seed-cash-deficit',
      entryNumber: 'SEED-DEFICIT',
      journal: 'CA',
      date: '2025-01-01',
      reference: 'SEED',
      label: 'Solde initial caisse',
      status: 'validated',
      lines: [
        { id: 'sd1', accountCode: '571000', accountName: 'Caisse', label: 'Solde', debit: 500000, credit: 0 },
        { id: 'sd2', accountCode: '101000', accountName: 'Capital', label: 'Solde', debit: 0, credit: 500000 },
      ],
      totalDebit: 500000,
      totalCredit: 500000,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      hash: '',
    });

    const session = await openSession(adapter, COMPANY_ID, '571000', 'cashier-01', 100000);

    // Close with a deficit of 5000 (counted 95000, computed 100000)
    const { session: closed, discrepancy } = await closeSession(adapter, session.id, 95000);

    expect(closed.status).toBe('closed');
    expect(discrepancy).toBe(-5000); // deficit
    expect(closed.discrepancyJournalEntryId).toBeDefined();

    // Verify the discrepancy journal entry
    const entry = await expectBalancedEntry(closed.discrepancyJournalEntryId!);
    expect(money(entry.totalDebit).toNumber()).toBe(5000);

    // D:658000 Charges diverses / C:571000 Caisse for deficit
    const debitLine = entry.lines.find((l) => l.debit > 0);
    const creditLine = entry.lines.find((l) => l.credit > 0);
    expect(debitLine!.accountCode).toBe('658000');
    expect(creditLine!.accountCode).toBe('571000');
  });

  it('should close session with surplus → creates ecart entry (excedent)', async () => {
    const session = await openSession(adapter, COMPANY_ID, '571000', 'cashier-01', 100000);

    // Seed a debit on the cash account so the guard allows the surplus credit line
    await db.journalEntries.add({
      id: 'seed-surplus-balance',
      entryNumber: 'SEED-SURPLUS',
      journal: 'CA',
      date: '2025-01-01',
      reference: 'SEED',
      label: 'Solde initial caisse',
      status: 'validated',
      lines: [
        { id: 'sl3', accountCode: '571000', accountName: 'Caisse', label: 'Solde', debit: 500000, credit: 0 },
        { id: 'sl4', accountCode: '101000', accountName: 'Capital', label: 'Solde', debit: 0, credit: 500000 },
      ],
      totalDebit: 500000,
      totalCredit: 500000,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      hash: '',
    });

    // Close with surplus of 3000 (counted 103000, computed 100000)
    const { discrepancy, session: closed } = await closeSession(adapter, session.id, 103000);

    expect(discrepancy).toBe(3000); // surplus
    expect(closed.discrepancyJournalEntryId).toBeDefined();

    const entry = await expectBalancedEntry(closed.discrepancyJournalEntryId!);
    // D:571000 Caisse / C:758000 Produits divers for surplus
    const debitLine = entry.lines.find((l) => l.debit > 0);
    const creditLine = entry.lines.find((l) => l.credit > 0);
    expect(debitLine!.accountCode).toBe('571000');
    expect(creditLine!.accountCode).toBe('758000');
  });
});

// ===========================================================================
// loanScheduleService
// ===========================================================================

describe('loanScheduleService', () => {
  beforeEach(async () => {
    await db.loanSchedules.clear();
    await db.journalEntries.clear();
    await db.auditLogs.clear();
  });

  describe('computeSchedule', () => {
    it('constant_installment → correct row count and last balance = 0', () => {
      const rows = computeSchedule({
        principal: 12000000,
        annualRate: 12,
        months: 12,
        startDate: '2025-01-01',
        method: 'constant_installment',
      });

      expect(rows.length).toBe(12);

      // Last row balance should be 0
      const lastRow = rows[rows.length - 1];
      expect(lastRow.remainingBalance).toBe(0);

      // Every row should have positive principal and interest
      for (const row of rows) {
        expect(row.principalAmount).toBeGreaterThan(0);
        expect(row.interestAmount).toBeGreaterThanOrEqual(0);
        expect(row.totalAmount).toBe(row.principalAmount + row.interestAmount);
      }

      // Total principal repaid should equal the initial principal
      const totalPrincipal = rows.reduce((sum, r) => sum + r.principalAmount, 0);
      expect(totalPrincipal).toBe(12000000);
    });

    it('constant_principal → correct row count and decreasing installments', () => {
      const rows = computeSchedule({
        principal: 6000000,
        annualRate: 10,
        months: 6,
        startDate: '2025-01-01',
        method: 'constant_principal',
      });

      expect(rows.length).toBe(6);

      // Last row balance should be 0
      expect(rows[rows.length - 1].remainingBalance).toBe(0);

      // With constant principal and decreasing remaining balance,
      // interest decreases, so total installment should decrease
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].interestAmount).toBeLessThanOrEqual(rows[i - 1].interestAmount);
      }

      // Total principal repaid should equal initial principal
      const totalPrincipal = rows.reduce((sum, r) => sum + r.principalAmount, 0);
      expect(totalPrincipal).toBe(6000000);
    });

    it('should generate correct due dates', () => {
      const rows = computeSchedule({
        principal: 1000000,
        annualRate: 6,
        months: 3,
        startDate: '2025-03-15',
        method: 'constant_principal',
      });

      expect(rows[0].dueDate).toBe('2025-04-15');
      expect(rows[1].dueDate).toBe('2025-05-15');
      expect(rows[2].dueDate).toBe('2025-06-15');
    });
  });

  describe('recordInstallmentPayment', () => {
    it('should create journal entry with D:162000 + D:671100 / C:521000', async () => {
      const loanId = crypto.randomUUID();

      // Generate and persist the schedule
      const schedules = await generateSchedule(adapter, {
        companyId: COMPANY_ID,
        loanId,
        principal: 3000000,
        annualRate: 12,
        months: 6,
        startDate: '2025-01-01',
        method: 'constant_principal',
      });

      expect(schedules.length).toBe(6);
      const firstSchedule = schedules[0];
      expect(firstSchedule.status).toBe('pending');

      // Pay the first installment
      const entryId = await recordInstallmentPayment(adapter, firstSchedule.id, '521000');

      // Verify the journal entry
      const entry = await expectBalancedEntry(entryId);

      // Should have D:162000 (principal) + D:671100 (interest) + C:521000 (bank)
      const debitLines = entry.lines.filter((l) => l.debit > 0);
      const creditLines = entry.lines.filter((l) => l.credit > 0);

      // Principal debit on 162000
      const principalLine = debitLines.find((l) => l.accountCode === '162000');
      expect(principalLine).toBeDefined();
      expect(principalLine!.debit).toBe(firstSchedule.principalAmount);

      // Interest debit on 671100 (should exist since rate > 0)
      const interestLine = debitLines.find((l) => l.accountCode === '671100');
      expect(interestLine).toBeDefined();
      expect(interestLine!.debit).toBe(firstSchedule.interestAmount);

      // Credit on bank account
      expect(creditLines.length).toBe(1);
      expect(creditLines[0].accountCode).toBe('521000');
      expect(creditLines[0].credit).toBe(firstSchedule.totalAmount);

      // Verify schedule status updated
      const updatedSchedule = await adapter.getById('loanSchedules', firstSchedule.id);
      expect((updatedSchedule as any).status).toBe('paid');
    });

    it('should reject payment on already paid installment', async () => {
      const loanId = crypto.randomUUID();
      const schedules = await generateSchedule(adapter, {
        companyId: COMPANY_ID,
        loanId,
        principal: 1000000,
        annualRate: 6,
        months: 3,
        startDate: '2025-01-01',
        method: 'constant_principal',
      });

      await recordInstallmentPayment(adapter, schedules[0].id, '521000');
      await expect(recordInstallmentPayment(adapter, schedules[0].id, '521000')).rejects.toThrow(/déjà payée/);
    });
  });
});

// ===========================================================================
// checkService
// ===========================================================================

describe('checkService', () => {
  beforeEach(async () => {
    await db.checks.clear();
    await db.journalEntries.clear();
    await db.auditLogs.clear();
  });

  it('receiveCheck → D:511200 / C:411xxx', async () => {
    const check = await receiveCheck(adapter, {
      companyId: COMPANY_ID,
      checkNumber: 'CHQ-001',
      bankName: 'BIAO-CI',
      amount: 250000,
      clientAccount: '411001',
      issueDate: '2025-06-01',
      thirdPartyId: 'client-001',
    });

    expect(check.direction).toBe('incoming');
    expect(check.status).toBe('received');
    expect(check.amount).toBe(250000);
    expect(check.journalEntryId).toBeDefined();

    const entry = await expectBalancedEntry(check.journalEntryId!);
    const debitLine = entry.lines.find((l) => l.debit > 0);
    const creditLine = entry.lines.find((l) => l.credit > 0);
    expect(debitLine!.accountCode).toBe('511200');
    expect(creditLine!.accountCode).toBe('411001');
    expect(money(entry.totalDebit).toNumber()).toBe(250000);
  });

  it('depositCheck → D:521000 / C:511200', async () => {
    const check = await receiveCheck(adapter, {
      companyId: COMPANY_ID,
      checkNumber: 'CHQ-002',
      bankName: 'SGBCI',
      amount: 400000,
      clientAccount: '411002',
      issueDate: '2025-06-05',
    });

    const deposited = await depositCheck(adapter, check.id, '521000');

    expect(deposited.status).toBe('deposited');
    expect(deposited.depositDate).toBeDefined();

    // Verify the deposit journal entry (second entry created)
    const entries = await allEntries();
    const depositEntry = entries.find((e) => e.entryNumber.includes('CHQ-D-'));
    expect(depositEntry).toBeDefined();
    expect(money(depositEntry!.totalDebit).toNumber()).toBe(money(depositEntry!.totalCredit).toNumber());

    const debitLine = depositEntry!.lines.find((l) => l.debit > 0);
    const creditLine = depositEntry!.lines.find((l) => l.credit > 0);
    expect(debitLine!.accountCode).toBe('521000');
    expect(creditLine!.accountCode).toBe('511200');
  });

  it('clearCheck → status=cleared', async () => {
    const check = await receiveCheck(adapter, {
      companyId: COMPANY_ID,
      checkNumber: 'CHQ-003',
      bankName: 'BOA',
      amount: 150000,
      clientAccount: '411003',
      issueDate: '2025-06-10',
    });

    await depositCheck(adapter, check.id, '521000');
    const cleared = await clearCheck(adapter, check.id);

    expect(cleared.status).toBe('cleared');
    expect(cleared.clearanceDate).toBeDefined();
  });

  it('recordBounce → D:416000 / C:521000 + optional bank fees', async () => {
    // Seed initial bank balance so the entryGuard doesn't block the C:521000
    await db.journalEntries.add({
      id: 'seed-bank-balance',
      entryNumber: 'SEED-BANK-001',
      journal: 'OD',
      date: '2025-01-01',
      reference: 'SEED',
      label: 'Solde initial banque',
      status: 'validated',
      lines: [
        { id: 'sb1', accountCode: '521000', accountName: 'Banque', label: 'Solde', debit: 5000000, credit: 0 },
        { id: 'sb2', accountCode: '101000', accountName: 'Capital', label: 'Solde', debit: 0, credit: 5000000 },
      ],
      totalDebit: 5000000,
      totalCredit: 5000000,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      hash: '',
    });

    const check = await receiveCheck(adapter, {
      companyId: COMPANY_ID,
      checkNumber: 'CHQ-004',
      bankName: 'NSIA',
      amount: 300000,
      clientAccount: '411004',
      issueDate: '2025-06-15',
      thirdPartyId: 'client-004',
    });

    await depositCheck(adapter, check.id, '521000');
    const bounced = await recordBounce(adapter, check.id, 'Provision insuffisante', 5000);

    expect(bounced.status).toBe('bounced');
    expect(bounced.bounceReason).toBe('Provision insuffisante');
    expect(bounced.bounceJournalEntryId).toBeDefined();

    // Verify the bounce journal entry
    const entry = await expectBalancedEntry(bounced.bounceJournalEntryId!);

    // Should have 4 lines: D:416000 + D:631200 / C:521000 + C:521000
    expect(entry.lines.length).toBe(4);

    const debitLines = entry.lines.filter((l) => l.debit > 0);
    const creditLines = entry.lines.filter((l) => l.credit > 0);

    // D:416000 for the check amount
    const clientDebit = debitLines.find((l) => l.accountCode === '416000');
    expect(clientDebit).toBeDefined();
    expect(clientDebit!.debit).toBe(300000);

    // D:631200 for the bank fees
    const feesDebit = debitLines.find((l) => l.accountCode === '631200');
    expect(feesDebit).toBeDefined();
    expect(feesDebit!.debit).toBe(5000);

    // Total credits on 521000 = 300000 + 5000 = 305000
    const totalBankCredit = creditLines
      .filter((l) => l.accountCode === '521000')
      .reduce((sum, l) => sum + l.credit, 0);
    expect(totalBankCredit).toBe(305000);
  });

  it('issueCheck (outgoing) → D:401xxx / C:521000', async () => {
    // Seed bank balance for the outgoing check
    await db.journalEntries.add({
      id: 'seed-bank-outgoing',
      entryNumber: 'SEED-BANK-OUT',
      journal: 'OD',
      date: '2025-01-01',
      reference: 'SEED',
      label: 'Solde initial banque',
      status: 'validated',
      lines: [
        { id: 'so1', accountCode: '521000', accountName: 'Banque', label: 'Solde', debit: 2000000, credit: 0 },
        { id: 'so2', accountCode: '101000', accountName: 'Capital', label: 'Solde', debit: 0, credit: 2000000 },
      ],
      totalDebit: 2000000,
      totalCredit: 2000000,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      hash: '',
    });

    const check = await issueCheck(adapter, {
      companyId: COMPANY_ID,
      checkNumber: 'CHQ-E-001',
      bankName: 'BCEAO',
      amount: 600000,
      supplierAccount: '401001',
      issueDate: '2025-06-20',
      bankAccountId: '521000',
      thirdPartyId: 'supplier-001',
    });

    expect(check.direction).toBe('outgoing');
    expect(check.status).toBe('issued');
    expect(check.amount).toBe(600000);
    expect(check.journalEntryId).toBeDefined();

    const entry = await expectBalancedEntry(check.journalEntryId!);
    expect(money(entry.totalDebit).toNumber()).toBe(600000);

    const debitLine = entry.lines.find((l) => l.debit > 0);
    const creditLine = entry.lines.find((l) => l.credit > 0);
    expect(debitLine!.accountCode).toBe('401001');
    expect(creditLine!.accountCode).toBe('521000');
  });

  it('should not deposit an already deposited check', async () => {
    const check = await receiveCheck(adapter, {
      companyId: COMPANY_ID,
      checkNumber: 'CHQ-005',
      bankName: 'BOA',
      amount: 100000,
      clientAccount: '411005',
      issueDate: '2025-06-25',
    });

    await depositCheck(adapter, check.id, '521000');
    await expect(depositCheck(adapter, check.id, '521000')).rejects.toThrow(/received/);
  });

  it('should not bounce a non-deposited check', async () => {
    const check = await receiveCheck(adapter, {
      companyId: COMPANY_ID,
      checkNumber: 'CHQ-006',
      bankName: 'SGBCI',
      amount: 200000,
      clientAccount: '411006',
      issueDate: '2025-07-01',
    });

    // Try to bounce a check that is only "received", not "deposited"
    await expect(recordBounce(adapter, check.id, 'Test')).rejects.toThrow(/déposé/);
  });
});
