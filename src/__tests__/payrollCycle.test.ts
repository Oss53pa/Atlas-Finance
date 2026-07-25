/**
 * Cycle paie — Atlas People → GL (dernier satellite de la trilogie).
 *
 * Vérifie : payroll.run.validated → écriture de paie agrégée ÉQUILIBRÉE
 * (661/664 D ; 431/447/427/422 C, avec la contrepartie patronale 664/431) ·
 * payroll.payment.issued → 422/5xx + lettrage 422 quand la paie est par employé.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { postEvent } from '../services/integration/postingEngine';
import { invalidatePostingRulesCache } from '../services/integration/postingRulesService';
import { autoLettrerPayment } from '../services/integration/paymentLettrage';
import { PAYMENT_EVENT_ACCOUNTS } from '../services/integration/paymentLettrage';
import type { IntegrationEvent, PostingRule } from '../services/integration/types';

const memory: Record<string, any[]> = { postingRules: [] };

function makeAdapter() {
  const base = createTestAdapter() as any;
  const wrap = (t: string) => memory[t] !== undefined;
  return {
    ...base,
    getMode: () => 'local',
    getAll: async (table: string, filters?: any) => {
      if (!wrap(table)) return base.getAll(table, filters);
      let rows = [...memory[table]];
      if (filters?.where) for (const [k, v] of Object.entries(filters.where)) rows = rows.filter((r: any) => r[k] === v);
      return rows;
    },
    create: async (table: string, data: any) => (wrap(table) ? (memory[table].push({ id: crypto.randomUUID(), ...data }), memory[table].at(-1)) : base.create(table, data)),
  };
}

/** Règles paie — social_employer produit DEUX lignes (664 D / 431 C). */
function seedPayrollRules() {
  const rules: Partial<PostingRule>[] = [
    { eventType: 'payroll.run.validated', lineRole: 'gross_salary', matchKey: '', debitAccount: '661000', creditAccount: null, thirdParty: false, analytic: true, priority: 100, active: true },
    { eventType: 'payroll.run.validated', lineRole: 'social_employer', matchKey: '', debitAccount: '664000', creditAccount: '431000', thirdParty: false, analytic: true, priority: 100, active: true },
    { eventType: 'payroll.run.validated', lineRole: 'social_employee', matchKey: '', debitAccount: null, creditAccount: '431000', thirdParty: false, analytic: false, priority: 100, active: true },
    { eventType: 'payroll.run.validated', lineRole: 'income_tax_withheld', matchKey: '', debitAccount: null, creditAccount: '447000', thirdParty: false, analytic: false, priority: 100, active: true },
    { eventType: 'payroll.run.validated', lineRole: 'net_payable', matchKey: '', debitAccount: null, creditAccount: '422000', thirdParty: true, analytic: false, priority: 100, active: true },
    { eventType: 'payroll.payment.issued', lineRole: 'net_payable', matchKey: '', debitAccount: '422000', creditAccount: null, thirdParty: true, analytic: false, priority: 100, active: true },
    { eventType: 'payroll.payment.issued', lineRole: 'cash', matchKey: '', debitAccount: '521000', creditAccount: null, thirdParty: false, analytic: false, priority: 100, active: true },
  ];
  memory.postingRules = rules.map(r => ({ id: crypto.randomUUID(), ...r })) as any[];
  invalidatePostingRulesCache();
}

let adapter: any;

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  await db.fiscalPeriods.clear();
  memory.postingRules = [];
  invalidatePostingRulesCache();
  adapter = makeAdapter();
  seedPayrollRules();
});

/**
 * Run de paie cohérent : brut 1 000 000, part salariale sociale 60 000,
 * IRPP retenu 90 000 → net 850 000 ; charge patronale 180 000.
 *   Débit  : 661 (1 000 000) + 664 (180 000) = 1 180 000
 *   Crédit : 431 (60 000 sal. + 180 000 pat. = 240 000) + 447 (90 000) + 422 (850 000) = 1 180 000
 */
function runEvent(): IntegrationEvent {
  return {
    id: crypto.randomUUID(), sourceSystem: 'atlas_people', eventType: 'payroll.run.validated',
    eventVersion: 1, sourceDocId: 'PAY-2026-05', idempotencyKey: 'people:PAY-2026-05:run',
    occurredAt: '2026-05-31T10:00:00.000Z', payloadHash: 'h', status: 'pending', attempts: 0,
    payload: {
      docNumber: 'PAY-2026-05', docDate: '2026-05-31', currency: 'XOF',
      lines: [
        { role: 'gross_salary', amount: 1_000_000, label: 'Salaires bruts' },
        { role: 'social_employer', amount: 180_000, label: 'Charges patronales' },
        { role: 'social_employee', amount: 60_000, label: 'Cotisations salariales' },
        { role: 'income_tax_withheld', amount: 90_000, label: 'IRPP retenu' },
        { role: 'net_payable', amount: 850_000, label: 'Net à payer' },
      ],
    },
  } as IntegrationEvent;
}

describe('run de paie → écriture agrégée équilibrée', () => {
  it('poste 661/664 au débit et 431/447/422 au crédit, équilibré', async () => {
    const outcome = await postEvent(adapter, runEvent());
    expect(outcome.status).toBe('posted');

    const e = (await db.journalEntries.toArray())[0];
    expect(e.totalDebit).toBe(1_180_000);
    expect(e.totalCredit).toBe(1_180_000); // ← équilibre grâce à la contrepartie 664/431

    const byAccount = (code: string) =>
      e.lines.filter(l => l.accountCode === code)
        .reduce((s, l) => s + l.debit - l.credit, 0);

    expect(byAccount('661000')).toBe(1_000_000);   // brut au débit
    expect(byAccount('664000')).toBe(180_000);     // charge patronale au débit
    expect(byAccount('431000')).toBe(-240_000);    // 60 000 sal. + 180 000 pat. au crédit
    expect(byAccount('447000')).toBe(-90_000);     // IRPP au crédit
    expect(byAccount('422000')).toBe(-850_000);    // net à payer au crédit
  });

  it('sans contrepartie patronale, l’écriture serait rejetée (déséquilibre)', async () => {
    // Règle social_employer SANS crédit → 664 débit orphelin.
    memory.postingRules = memory.postingRules.map((r: any) =>
      r.lineRole === 'social_employer' ? { ...r, creditAccount: null } : r);
    invalidatePostingRulesCache();

    const outcome = await postEvent(adapter, runEvent());
    expect(outcome.status).toBe('rejected');
    expect(outcome.errorCode).toBe('UNBALANCED');
  });
});

describe('versement des salaires → lettrage 422', () => {
  it('422 est un compte de règlement lettrable', () => {
    expect(PAYMENT_EVENT_ACCOUNTS['payroll.payment.issued']).toBe('422');
  });

  it('lettre le net payé à l’employé quand la paie est par employé', async () => {
    const { safeAddEntry } = await import('../services/entryGuard');
    // Run par employé : 422 crédité avec le code tiers de l'employé.
    await safeAddEntry(adapter, {
      id: 'RUN-1', entryNumber: 'RUN-1', journal: 'OD', date: '2026-05-31', label: 'Paie', reference: 'RUN-1', status: 'validated',
      lines: [
        { id: 'a', accountCode: '661000', accountName: '661', label: '', debit: 1_000_000, credit: 0 },
        { id: 'b', accountCode: '431000', accountName: '431', label: '', debit: 0, credit: 150_000 },
        { id: 'c', accountCode: '422000', accountName: '422', label: '', debit: 0, credit: 850_000, thirdPartyCode: 'EMP-007' },
      ], createdAt: '2026-05-31T10:00:00Z',
    } as any, { skipSyncValidation: true });
    await safeAddEntry(adapter, {
      id: 'PAY-1', entryNumber: 'PAY-1', journal: 'BQ', date: '2026-06-02', label: 'Versement', reference: 'PAY-1', status: 'validated',
      lines: [
        { id: 'd', accountCode: '422000', accountName: '422', label: '', debit: 850_000, credit: 0, thirdPartyCode: 'EMP-007' },
        { id: 'e', accountCode: '521000', accountName: '521', label: '', debit: 0, credit: 850_000 },
      ], createdAt: '2026-06-02T10:00:00Z',
    } as any, { skipSyncValidation: true });

    const res = await autoLettrerPayment(adapter, {
      paymentEntryId: 'PAY-1', thirdPartyCode: 'EMP-007', accountPrefix: '422',
    });
    expect(res.lettered).toBe(true);
    expect(res.matchedEntryIds).toContain('RUN-1');
  });
});
