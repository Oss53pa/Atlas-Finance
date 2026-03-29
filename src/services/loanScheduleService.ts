/**
 * Loan Schedule Service — Tableau d'amortissement d'emprunt.
 * Deux méthodes : mensualité constante (annuité) ou capital constant.
 * Le paiement de chaque échéance génère l'écriture comptable.
 *
 * Conforme SYSCOHADA révisé.
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../lib/db';
import type { DBLoanSchedule } from '../lib/db';
import { money } from '../utils/money';
import { safeAddEntry } from './entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface LoanScheduleRow {
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
}

export interface GenerateScheduleInput {
  companyId: string;
  loanId: string;
  principal: number;
  annualRate: number;
  months: number;
  startDate: string;
  method: 'constant_installment' | 'constant_principal';
}

// ============================================================================
// SCHEDULE GENERATION
// ============================================================================

export function computeSchedule(input: {
  principal: number;
  annualRate: number;
  months: number;
  startDate: string;
  method: 'constant_installment' | 'constant_principal';
}): LoanScheduleRow[] {
  const { principal, annualRate, months, startDate, method } = input;
  const monthlyRate = annualRate / 100 / 12;
  const rows: LoanScheduleRow[] = [];
  let remaining = money(principal);

  if (method === 'constant_installment' && monthlyRate > 0) {
    // Mensualité constante (formule d'annuité)
    const r = monthlyRate;
    const n = months;
    const annuity = money(principal)
      .multiply(r * Math.pow(1 + r, n))
      .divide(Math.pow(1 + r, n) - 1)
      .round(0);

    for (let i = 1; i <= months; i++) {
      const interest = remaining.multiply(monthlyRate).round(0);
      let principalPart = annuity.subtract(interest);

      // Last installment: adjust to clear remaining balance
      if (i === months) {
        principalPart = remaining;
      }

      remaining = remaining.subtract(principalPart);
      if (remaining.toNumber() < 0) remaining = money(0);

      rows.push({
        installmentNumber: i,
        dueDate: addMonths(startDate, i),
        principalAmount: principalPart.toNumber(),
        interestAmount: interest.toNumber(),
        totalAmount: principalPart.add(interest).toNumber(),
        remainingBalance: remaining.toNumber(),
      });
    }
  } else {
    // Capital constant (ou taux 0%)
    const monthlyPrincipal = money(principal).divide(months).round(0);

    for (let i = 1; i <= months; i++) {
      const interest = remaining.multiply(monthlyRate).round(0);
      const principalPart = i === months ? remaining : monthlyPrincipal;

      remaining = remaining.subtract(principalPart);
      if (remaining.toNumber() < 0) remaining = money(0);

      rows.push({
        installmentNumber: i,
        dueDate: addMonths(startDate, i),
        principalAmount: principalPart.toNumber(),
        interestAmount: interest.toNumber(),
        totalAmount: principalPart.add(interest).toNumber(),
        remainingBalance: remaining.toNumber(),
      });
    }
  }

  return rows;
}

export async function generateSchedule(
  adapter: DataAdapter,
  input: GenerateScheduleInput,
): Promise<DBLoanSchedule[]> {
  const rows = computeSchedule(input);
  const now = new Date().toISOString();
  const schedules: DBLoanSchedule[] = [];

  for (const row of rows) {
    const schedule: DBLoanSchedule = {
      id: crypto.randomUUID(),
      companyId: input.companyId,
      loanId: input.loanId,
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      principalAmount: row.principalAmount,
      interestAmount: row.interestAmount,
      totalAmount: row.totalAmount,
      remainingBalance: row.remainingBalance,
      status: 'pending',
      createdAt: now,
    };
    await adapter.create('loanSchedules', schedule);
    schedules.push(schedule);
  }

  await logAudit('CREATE', 'loanSchedule', input.loanId,
    `Tableau d'amortissement généré — ${rows.length} échéances, capital: ${input.principal}, taux: ${input.annualRate}%`);

  return schedules;
}

// ============================================================================
// INSTALLMENT PAYMENT
// ============================================================================

export async function recordInstallmentPayment(
  adapter: DataAdapter,
  scheduleId: string,
  bankAccountId: string,
): Promise<string> {
  const schedule = await adapter.getById<DBLoanSchedule>('loanSchedules', scheduleId);
  if (!schedule) throw new Error(`Échéance ${scheduleId} introuvable`);
  if (schedule.status === 'paid') throw new Error('Échéance déjà payée');

  const now = new Date().toISOString();
  const date = now.substring(0, 10);
  const principal = money(schedule.principalAmount);
  const interest = money(schedule.interestAmount);
  const total = principal.add(interest);
  const bankAccount = bankAccountId || '521000';

  // D: 162000 Emprunts (capital) + D: 671100 Intérêts / C: 521000 Banque
  const lines = [
    {
      id: crypto.randomUUID(),
      accountCode: '162000',
      accountName: 'Emprunts auprès des établissements de crédit',
      label: `Remboursement capital — échéance ${schedule.installmentNumber}`,
      debit: principal.toNumber(),
      credit: 0,
    },
  ];

  if (interest.toNumber() > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '671100',
      accountName: 'Intérêts des emprunts',
      label: `Intérêts — échéance ${schedule.installmentNumber}`,
      debit: interest.toNumber(),
      credit: 0,
    });
  }

  lines.push({
    id: crypto.randomUUID(),
    accountCode: bankAccount,
    accountName: 'Banque',
    label: `Paiement échéance emprunt n°${schedule.installmentNumber}`,
    debit: 0,
    credit: total.toNumber(),
  });

  const entryId = await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `EMP-${date.replace(/-/g, '')}-${schedule.installmentNumber}`,
    journal: 'BQ',
    date,
    reference: `ECHEANCE-${schedule.loanId.substring(0, 8)}-${schedule.installmentNumber}`,
    label: `Échéance emprunt n°${schedule.installmentNumber} — capital: ${principal.toNumber()}, intérêts: ${interest.toNumber()}`,
    status: 'validated',
    lines,
    createdAt: now,
  });

  const updated: DBLoanSchedule = {
    ...schedule,
    status: 'paid',
    paidAt: date,
    journalEntryId: entryId,
  };
  await adapter.update('loanSchedules', scheduleId, updated);

  await logAudit('PAY', 'loanSchedule', scheduleId,
    `Échéance ${schedule.installmentNumber} payée — ${total.toNumber()} XOF`);

  return entryId;
}

export async function getScheduleByLoan(
  adapter: DataAdapter,
  companyId: string,
  loanId: string,
): Promise<DBLoanSchedule[]> {
  return adapter.getAll<DBLoanSchedule>('loanSchedules', {
    where: { companyId, loanId },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().substring(0, 10);
}
