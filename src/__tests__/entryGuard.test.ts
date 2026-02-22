import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { safeAddEntry, safeBulkAddEntries, EntryGuardError } from '../services/entryGuard';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// SEED DATA
// ============================================================================

async function seedTestData() {
  await db.accounts.bulkPut([
    { id: '1', code: '601000', name: 'Achats', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: '2', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: '3', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
  ]);

  await db.fiscalYears.bulkPut([
    { id: 'fy-2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.journalEntries.clear();
  await seedTestData();
});

// ============================================================================
// TESTS
// ============================================================================

describe('safeAddEntry', () => {
  it('insere une ecriture equilibree et calcule totalDebit/totalCredit', async () => {
    const id = await safeAddEntry(adapter, {
      id: 'entry-1',
      entryNumber: 'AC-001',
      date: '2026-03-15',
      journal: 'AC',
      label: 'Achat fournitures',
      reference: 'FAC-001',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 250_000, credit: 0 },
        { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur X', debit: 0, credit: 250_000 },
      ],
      createdAt: '2026-03-15T10:00:00.000Z',
    });

    expect(id).toBe('entry-1');

    const stored = await db.journalEntries.get('entry-1');
    expect(stored).toBeDefined();
    expect(stored!.totalDebit).toBe(250_000);
    expect(stored!.totalCredit).toBe(250_000);
    expect(stored!.hash).toBeTruthy();
    expect(stored!.updatedAt).toBeTruthy();
  });

  it('rejette une ecriture desequilibree (D != C)', async () => {
    await expect(
      safeAddEntry(adapter, {
        id: 'entry-bad',
        entryNumber: 'AC-002',
        date: '2026-03-15',
        journal: 'AC',
        label: 'Achat déséquilibré',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'l1', accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 300_000, credit: 0 },
          { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur', debit: 0, credit: 200_000 },
        ],
        createdAt: '2026-03-15T10:00:00.000Z',
      })
    ).rejects.toThrow(EntryGuardError);
  });

  it('accepte une ecriture systeme avec skipSyncValidation', async () => {
    // An entry with only 1 line would normally fail validation,
    // but skipSyncValidation bypasses the sync check
    const id = await safeAddEntry(adapter,
      {
        id: 'sys-1',
        entryNumber: 'SYS-001',
        date: '2026-03-15',
        journal: 'OD',
        label: 'Extourne système',
        reference: '',
        status: 'posted',
        lines: [
          { id: 'l1', accountCode: '601000', accountName: 'Achats', label: 'Extourne', debit: 100_000, credit: 0 },
          { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Extourne', debit: 0, credit: 100_000 },
        ],
        createdAt: '2026-03-15T10:00:00.000Z',
      },
      { skipSyncValidation: true },
    );

    expect(id).toBe('sys-1');
  });

  it('chaine les hashes entre ecritures successives', async () => {
    await safeAddEntry(adapter, {
      id: 'chain-1',
      entryNumber: 'AC-010',
      date: '2026-03-15',
      journal: 'AC',
      label: 'Première écriture',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '601000', accountName: 'Achats', label: 'A', debit: 50_000, credit: 0 },
        { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'B', debit: 0, credit: 50_000 },
      ],
      createdAt: '2026-03-15T10:00:00.000Z',
    });

    await safeAddEntry(adapter, {
      id: 'chain-2',
      entryNumber: 'AC-011',
      date: '2026-03-16',
      journal: 'AC',
      label: 'Deuxième écriture',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l3', accountCode: '601000', accountName: 'Achats', label: 'C', debit: 75_000, credit: 0 },
        { id: 'l4', accountCode: '401000', accountName: 'Fournisseurs', label: 'D', debit: 0, credit: 75_000 },
      ],
      createdAt: '2026-03-16T10:00:00.000Z',
    });

    const first = await db.journalEntries.get('chain-1');
    const second = await db.journalEntries.get('chain-2');

    expect(first!.hash).toBeTruthy();
    expect(second!.hash).toBeTruthy();
    expect(second!.hash).not.toBe(first!.hash);
    expect(second!.previousHash).toBe(first!.hash);
  });
});

describe('safeBulkAddEntries', () => {
  it('insere plusieurs ecritures en sequence', async () => {
    const ids = await safeBulkAddEntries(adapter, [
      {
        id: 'bulk-1',
        entryNumber: 'AC-100',
        date: '2026-04-01',
        journal: 'AC',
        label: 'Bulk 1',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'b1-l1', accountCode: '601000', accountName: 'Achats', label: 'A', debit: 10_000, credit: 0 },
          { id: 'b1-l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'B', debit: 0, credit: 10_000 },
        ],
        createdAt: '2026-04-01T10:00:00.000Z',
      },
      {
        id: 'bulk-2',
        entryNumber: 'AC-101',
        date: '2026-04-02',
        journal: 'AC',
        label: 'Bulk 2',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'b2-l1', accountCode: '601000', accountName: 'Achats', label: 'C', debit: 20_000, credit: 0 },
          { id: 'b2-l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'D', debit: 0, credit: 20_000 },
        ],
        createdAt: '2026-04-02T10:00:00.000Z',
      },
    ]);

    expect(ids).toEqual(['bulk-1', 'bulk-2']);

    const count = await db.journalEntries.count();
    expect(count).toBe(2);
  });
});
