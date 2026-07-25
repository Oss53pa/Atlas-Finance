/**
 * Cycle achat — Atlas Procure → GL.
 *
 * Vérifie : commande approuvée → engagement budgétaire (pas de charge, idempotent) ·
 * facture achat → 601/445/401 · règlement → 401 + lettrage auto.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { recordPurchaseEngagement } from '../services/integration/procurementEngagement';
import { postEvent } from '../services/integration/postingEngine';
import { invalidatePostingRulesCache } from '../services/integration/postingRulesService';
import { autoLettrerPayment } from '../services/integration/paymentLettrage';
import type { IntegrationEvent, PostingRule } from '../services/integration/types';

// Tables SaaS-only simulées en mémoire (comme integrationPostingEngine.test.ts).
const memory: Record<string, any[]> = { postingRules: [], budgetEngagements: [] };

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
    create: async (table: string, data: any) => {
      if (!wrap(table)) return base.create(table, data);
      const row = { id: crypto.randomUUID(), ...data };
      memory[table].push(row);
      return row;
    },
  };
}

function seedPurchaseRules() {
  const rules: Partial<PostingRule>[] = [
    { eventType: 'purchase.invoice.received', lineRole: 'expense', matchKey: '', debitAccount: '601000', creditAccount: null, thirdParty: false, analytic: true, priority: 100, active: true },
    { eventType: 'purchase.invoice.received', lineRole: 'expense', matchKey: 'SERVICES', debitAccount: '622000', creditAccount: null, thirdParty: false, analytic: true, priority: 50, active: true },
    { eventType: 'purchase.invoice.received', lineRole: 'vat_deductible', matchKey: '', debitAccount: '445000', creditAccount: null, thirdParty: false, analytic: false, priority: 100, active: true },
    { eventType: 'purchase.invoice.received', lineRole: 'payable', matchKey: '', debitAccount: null, creditAccount: '401000', thirdParty: true, analytic: false, priority: 100, active: true },
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
  memory.budgetEngagements = [];
  invalidatePostingRulesCache();
  adapter = makeAdapter();
  seedPurchaseRules();
});

function poEvent(): IntegrationEvent {
  return {
    id: crypto.randomUUID(), sourceSystem: 'atlas_procure', eventType: 'purchase.order.approved',
    eventVersion: 1, sourceDocId: 'PO-2026-001', idempotencyKey: 'procure:PO-2026-001:approved',
    occurredAt: '2026-05-10T10:00:00.000Z', payloadHash: 'h', status: 'pending', attempts: 0,
    payload: {
      docNumber: 'PO-2026-001', docDate: '2026-05-10', currency: 'XOF',
      thirdParty: { code: 'F0007', name: 'Fournisseur X' },
      lines: [{ role: 'expense', amount: 2_000_000, label: 'Achat matières' }],
    },
  } as IntegrationEvent;
}

describe('commande approuvée → engagement budgétaire', () => {
  it('crée un engagement externe (pas d’écriture) sur le compte de charge', async () => {
    // Événement d'engagement : le moteur de posting l'IGNORE (pas une charge).
    const outcome = await postEvent(adapter, poEvent());
    expect(outcome.status).toBe('ignored');
    expect(await db.journalEntries.count()).toBe(0);

    const res = await recordPurchaseEngagement(adapter, poEvent());
    expect(res.created).toBe(1);
    const eng = memory.budgetEngagements[0];
    expect(eng.source).toBe('external');
    expect(eng.externalRef).toBe('PO-2026-001');
    expect(eng.accountCode).toBe('601000');   // compte résolu via la règle facture
    expect(eng.montantInitial).toBe(2_000_000);
    expect(eng.periode).toBe('2026-05-01');    // 1er du mois
    expect(eng.statut).toBe('ouvert');
  });

  it('est idempotent : rejouer la même commande ne crée pas de doublon', async () => {
    await recordPurchaseEngagement(adapter, poEvent());
    const second = await recordPurchaseEngagement(adapter, poEvent());
    expect(second.skipped).toBe(true);
    expect(second.reason).toMatch(/idempotence/i);
    expect(memory.budgetEngagements).toHaveLength(1);
  });

  it('résout le compte spécifique via matchKey', async () => {
    const ev = poEvent();
    ev.payload.lines[0].matchKey = 'SERVICES';
    await recordPurchaseEngagement(adapter, ev);
    expect(memory.budgetEngagements[0].accountCode).toBe('622000');
  });
});

describe('facture achat → 601/445/401', () => {
  it('poste la charge, la TVA déductible et la dette fournisseur', async () => {
    const inv: IntegrationEvent = {
      id: crypto.randomUUID(), sourceSystem: 'atlas_procure', eventType: 'purchase.invoice.received',
      eventVersion: 1, sourceDocId: 'PINV-1', idempotencyKey: 'procure:PINV-1', occurredAt: '2026-05-20T10:00:00Z',
      payloadHash: 'h', status: 'pending', attempts: 0,
      payload: {
        docNumber: 'PINV-1', docDate: '2026-05-20', currency: 'XOF',
        thirdParty: { code: 'F0007', name: 'Fournisseur X' },
        lines: [
          { role: 'payable', amount: 2_360_000, label: 'Dette' },
          { role: 'expense', amount: 2_000_000, label: 'Achat' },
          { role: 'vat_deductible', amount: 360_000, label: 'TVA 18%' },
        ],
      },
    } as IntegrationEvent;

    const outcome = await postEvent(adapter, inv);
    expect(outcome.status).toBe('posted');
    const e = (await db.journalEntries.toArray())[0];
    const codes = e.lines.map(l => l.accountCode).sort();
    expect(codes).toEqual(['401000', '445000', '601000']);
    expect(e.totalDebit).toBe(2_360_000);
    expect(e.totalCredit).toBe(2_360_000);
    const dette = e.lines.find(l => l.accountCode === '401000')!;
    expect(dette.credit).toBe(2_360_000);
    expect(dette.thirdPartyCode).toBe('F0007');
  });
});

describe('règlement fournisseur → lettrage 401', () => {
  it('lettre la facture soldée par le décaissement', async () => {
    // Facture (401 C) + règlement (401 D) déjà en GL, même fournisseur.
    const { safeAddEntry } = await import('../services/entryGuard');
    await safeAddEntry(adapter, {
      id: 'PINV-1', entryNumber: 'PINV-1', journal: 'AC', date: '2026-05-20', label: 'Facture', reference: 'PINV-1', status: 'validated',
      lines: [
        { id: 'a', accountCode: '601000', accountName: '601', label: '', debit: 2_000_000, credit: 0 },
        { id: 'b', accountCode: '445000', accountName: '445', label: '', debit: 360_000, credit: 0 },
        { id: 'c', accountCode: '401000', accountName: '401', label: '', debit: 0, credit: 2_360_000, thirdPartyCode: 'F0007' },
      ], createdAt: '2026-05-20T10:00:00Z',
    } as any, { skipSyncValidation: true });
    await safeAddEntry(adapter, {
      id: 'PAY-1', entryNumber: 'PAY-1', journal: 'BQ', date: '2026-06-01', label: 'Règlement', reference: 'PAY-1', status: 'validated',
      lines: [
        { id: 'd', accountCode: '401000', accountName: '401', label: '', debit: 2_360_000, credit: 0, thirdPartyCode: 'F0007' },
        { id: 'e', accountCode: '521000', accountName: '521', label: '', debit: 0, credit: 2_360_000 },
      ], createdAt: '2026-06-01T10:00:00Z',
    } as any, { skipSyncValidation: true });

    const res = await autoLettrerPayment(adapter, {
      paymentEntryId: 'PAY-1', thirdPartyCode: 'F0007', accountPrefix: '401',
    });
    expect(res.lettered).toBe(true);
    expect(res.matchedEntryIds).toContain('PINV-1');
  });
});
