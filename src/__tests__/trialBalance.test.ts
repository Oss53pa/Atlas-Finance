import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { verifyTrialBalance } from '../services/trialBalanceService';

// ============================================================================
// SEED DATA
// ============================================================================

async function seedAccounts() {
  await db.accounts.bulkPut([
    { id: '1', code: '101000', name: 'Capital social', accountClass: '1', accountType: 'equity', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: '2', code: '211000', name: 'Terrain', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: '3', code: '411000', name: 'Clients', accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: '4', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: '5', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: '6', code: '601000', name: 'Achats', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: '7', code: '701000', name: 'Ventes', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  ]);
}

function makeEntry(id: string, num: string, lines: Array<{ accountCode: string; debit: number; credit: number }>) {
  return {
    id,
    entryNumber: num,
    date: '2026-03-15',
    journal: 'OD',
    label: `Entry ${id}`,
    reference: '',
    status: 'posted' as const,
    lines: lines.map((l, i) => ({
      id: `${id}-l${i}`,
      accountCode: l.accountCode,
      accountName: l.accountCode,
      label: '',
      debit: l.debit,
      credit: l.credit,
    })),
    totalDebit: lines.reduce((s, l) => s + l.debit, 0),
    totalCredit: lines.reduce((s, l) => s + l.credit, 0),
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    hash: `hash-${id}`,
  };
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.journalEntries.clear();
  await seedAccounts();
});

// ============================================================================
// TESTS
// ============================================================================

describe('verifyTrialBalance', () => {
  it('passe pour des ecritures parfaitement equilibrees', async () => {
    await db.journalEntries.bulkAdd([
      // Capital → Banque (apport)
      makeEntry('e1', 'OD-001', [
        { accountCode: '512000', debit: 1_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 1_000_000 },
      ]),
      // Achat fournisseur
      makeEntry('e2', 'OD-002', [
        { accountCode: '601000', debit: 200_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 200_000 },
      ]),
      // Vente client
      makeEntry('e3', 'OD-003', [
        { accountCode: '411000', debit: 500_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 500_000 },
      ]),
    ]);

    const result = await verifyTrialBalance();

    expect(result.isBalanced).toBe(true);
    expect(result.ecartGlobal).toBe(0);
    expect(result.entriesChecked).toBe(3);
    expect(result.unbalancedEntries).toHaveLength(0);

    // Check 1: global D=C
    const globalCheck = result.checks.find(c => c.name.includes('global'));
    expect(globalCheck?.status).toBe('pass');
  });

  it('detecte un ecart global quand une ecriture est desequilibree', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', 'OD-001', [
        { accountCode: '512000', debit: 1_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 1_000_000 },
      ]),
      // Intentionally unbalanced
      {
        ...makeEntry('e2', 'OD-002', [
          { accountCode: '601000', debit: 200_000, credit: 0 },
          { accountCode: '401000', debit: 0, credit: 199_000 },
        ]),
        totalDebit: 200_000,
        totalCredit: 199_000,
      },
    ]);

    const result = await verifyTrialBalance();

    expect(result.ecartGlobal).toBe(1_000);
    expect(result.unbalancedEntries.length).toBeGreaterThan(0);

    const individualCheck = result.checks.find(c => c.name.includes('individuelles'));
    expect(individualCheck?.status).toBe('fail');
  });

  it('detecte les trous de numerotation', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', 'OD-001', [
        { accountCode: '512000', debit: 100_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 100_000 },
      ]),
      // Gap: OD-002 is missing
      makeEntry('e3', 'OD-003', [
        { accountCode: '512000', debit: 50_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 50_000 },
      ]),
    ]);

    const result = await verifyTrialBalance();

    const seqCheck = result.checks.find(c => c.name.includes('séquentielle'));
    expect(seqCheck?.status).toBe('warning');
    expect(seqCheck?.details).toContain('trou');
  });

  it('filtre par exercice fiscal', async () => {
    await db.journalEntries.bulkAdd([
      { ...makeEntry('e2026', 'OD-001', [
        { accountCode: '512000', debit: 100_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 100_000 },
      ]), date: '2026-03-15' },
      { ...makeEntry('e2025', 'OD-002', [
        { accountCode: '512000', debit: 200_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 200_000 },
      ]), date: '2025-06-01' },
    ]);

    const result2026 = await verifyTrialBalance('2026');
    expect(result2026.entriesChecked).toBe(1);
    expect(result2026.totalDebits).toBe(100_000);

    const result2025 = await verifyTrialBalance('2025');
    expect(result2025.entriesChecked).toBe(1);
    expect(result2025.totalDebits).toBe(200_000);
  });

  it('verifie Actif = Passif pour des ecritures bilan', async () => {
    // Simple: capital goes to bank
    await db.journalEntries.bulkAdd([
      makeEntry('e1', 'OD-001', [
        { accountCode: '512000', debit: 5_000_000, credit: 0 },   // Actif +5M
        { accountCode: '101000', debit: 0, credit: 5_000_000 },   // Passif +5M
      ]),
    ]);

    const result = await verifyTrialBalance();
    const bilanCheck = result.checks.find(c => c.name.includes('Actif'));
    expect(bilanCheck?.status).toBe('pass');
  });

  it('signale les brouillons restants comme warning', async () => {
    await db.journalEntries.bulkAdd([
      { ...makeEntry('e1', 'OD-001', [
        { accountCode: '512000', debit: 100_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 100_000 },
      ]), status: 'draft' as const },
    ]);

    const result = await verifyTrialBalance();
    const statusCheck = result.checks.find(c => c.name.includes('Statut'));
    expect(statusCheck?.status).toBe('warning');
    expect(statusCheck?.details).toContain('brouillon');
  });
});
