/**
 * Tests Fichier 2 — Cycle de vie d'une écriture comptable
 *
 * Vérifie :
 *  1. Création brouillon via safeAddEntry (hash, équilibre)
 *  2. Détection de doublon (même entryNumber)
 *  3. Écriture déséquilibrée → EntryGuardError
 *  4. Tentative de modification d'une écriture validée → erreur (Art.19)
 *  5. Extourne (contrepassation) → montants inversés, marquage reversed
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { safeAddEntry, EntryGuardError } from '../services/entryGuard';
import { reverseEntry, isEntryEditable, isEntryReversible } from '../utils/reversalService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// SEED
// ============================================================================

async function seedBaseData() {
  await db.accounts.bulkPut([
    { id: 'a1', code: '601000', name: 'Achats matières', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a2', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: 'a3', code: '411000', name: 'Clients', accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: 'a4', code: '701000', name: 'Ventes', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a5', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
  ]);

  await db.fiscalYears.bulkPut([
    { id: 'FY2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
}

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.auditLogs.clear();
  await seedBaseData();
});

// ============================================================================
// TESTS — Création brouillon
// ============================================================================

describe('Création d\'une écriture brouillon', () => {
  it('insère une écriture équilibrée avec hash et totalDebit/totalCredit', async () => {
    const id = await safeAddEntry(adapter, {
      id: 'e-draft-001',
      entryNumber: 'AC-001',
      date: '2026-03-15',
      journal: 'AC',
      label: 'Achat fournitures bureau',
      reference: 'FAC-2026-001',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '601000', accountName: 'Achats matières', label: 'Fournitures', debit: 350_000, credit: 0 },
        { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur Alpha', debit: 0, credit: 350_000 },
      ],
      createdAt: '2026-03-15T09:00:00.000Z',
    });

    expect(id).toBe('e-draft-001');

    const stored = await db.journalEntries.get('e-draft-001');
    expect(stored).toBeDefined();
    expect(stored!.totalDebit).toBe(350_000);
    expect(stored!.totalCredit).toBe(350_000);
    expect(stored!.hash).toBeTruthy();
    expect(stored!.updatedAt).toBeTruthy();
    expect(stored!.status).toBe('draft');
  });

  it('le statut draft indique l\'écriture comme modifiable', () => {
    expect(isEntryEditable('draft')).toBe(true);
    expect(isEntryEditable('validated')).toBe(false);
    expect(isEntryEditable('posted')).toBe(false);
  });
});

// ============================================================================
// TESTS — Détection de doublon
// ============================================================================

describe('Détection de doublon (entryNumber)', () => {
  it('rejette une 2ème écriture avec le même entryNumber', async () => {
    await safeAddEntry(adapter, {
      id: 'e-orig-001',
      entryNumber: 'VT-001',
      date: '2026-04-10',
      journal: 'VT',
      label: 'Vente client A',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '411000', accountName: 'Clients', label: 'Client A', debit: 200_000, credit: 0 },
        { id: 'l2', accountCode: '701000', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 200_000 },
      ],
      createdAt: '2026-04-10T10:00:00.000Z',
    });

    await expect(
      safeAddEntry(adapter, {
        id: 'e-dup-001',
        entryNumber: 'VT-001', // même numéro → doublon
        date: '2026-04-11',
        journal: 'VT',
        label: 'Doublon vente',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'l3', accountCode: '411000', accountName: 'Clients', label: 'Client B', debit: 100_000, credit: 0 },
          { id: 'l4', accountCode: '701000', accountName: 'Ventes', label: 'Vente B', debit: 0, credit: 100_000 },
        ],
        createdAt: '2026-04-11T10:00:00.000Z',
      })
    ).rejects.toThrow(EntryGuardError);
  });

  it('le message d\'erreur mentionne le numéro de pièce dupliqué', async () => {
    await safeAddEntry(adapter, {
      id: 'e-first',
      entryNumber: 'OD-999',
      date: '2026-05-01',
      journal: 'OD',
      label: 'Première',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '512000', accountName: 'Banque', label: '', debit: 50_000, credit: 0 },
        { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 50_000 },
      ],
      createdAt: '2026-05-01T00:00:00.000Z',
    });

    let caughtError: EntryGuardError | null = null;
    try {
      await safeAddEntry(adapter, {
        id: 'e-second',
        entryNumber: 'OD-999',
        date: '2026-05-02',
        journal: 'OD',
        label: 'Doublon',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'l3', accountCode: '512000', accountName: 'Banque', label: '', debit: 30_000, credit: 0 },
          { id: 'l4', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 30_000 },
        ],
        createdAt: '2026-05-02T00:00:00.000Z',
      });
    } catch (err) {
      if (err instanceof EntryGuardError) caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('OD-999');
  });
});

// ============================================================================
// TESTS — Écriture déséquilibrée
// ============================================================================

describe('Écriture déséquilibrée', () => {
  it('rejette une écriture où D ≠ C avec EntryGuardError', async () => {
    await expect(
      safeAddEntry(adapter, {
        id: 'e-unbal',
        entryNumber: 'AC-999',
        date: '2026-06-01',
        journal: 'AC',
        label: 'Écriture déséquilibrée',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'l1', accountCode: '601000', accountName: 'Achats', label: '', debit: 500_000, credit: 0 },
          { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 400_000 },
          // Écart : 100 000 manquants
        ],
        createdAt: '2026-06-01T00:00:00.000Z',
      })
    ).rejects.toThrow(EntryGuardError);
  });

  it('une écriture à une seule ligne est refusée (non équilibrée)', async () => {
    await expect(
      safeAddEntry(adapter, {
        id: 'e-oneline',
        entryNumber: 'OD-010',
        date: '2026-06-05',
        journal: 'OD',
        label: 'Ligne unique',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'l1', accountCode: '512000', accountName: 'Banque', label: '', debit: 100_000, credit: 0 },
        ],
        createdAt: '2026-06-05T00:00:00.000Z',
      })
    ).rejects.toThrow(EntryGuardError);
  });
});

// ============================================================================
// TESTS — Immuabilité (SYSCOHADA Art.19)
// ============================================================================

describe('Immuabilité des écritures validées (SYSCOHADA Art.19)', () => {
  it('isEntryEditable retourne false pour validated et posted', () => {
    expect(isEntryEditable('validated')).toBe(false);
    expect(isEntryEditable('posted')).toBe(false);
  });

  it('isEntryReversible retourne true pour validated/posted non retournées', () => {
    expect(isEntryReversible({ status: 'validated' })).toBe(true);
    expect(isEntryReversible({ status: 'posted' })).toBe(true);
  });

  it('isEntryReversible retourne false pour draft', () => {
    expect(isEntryReversible({ status: 'draft' })).toBe(false);
  });

  it('isEntryReversible retourne false si déjà contrepassée', () => {
    expect(isEntryReversible({ status: 'validated', reversed: true })).toBe(false);
  });
});

// ============================================================================
// TESTS — Extourne (contrepassation)
// ============================================================================

describe('Extourne (contrepassation)', () => {
  it('crée une écriture de contrepassation avec montants inversés', async () => {
    // Insérer l'écriture originale validée
    await db.journalEntries.add({
      id: 'e-orig-rev',
      entryNumber: 'VT-100',
      journal: 'VT',
      date: '2026-07-10',
      reference: 'FAC-100',
      label: 'Vente client A',
      status: 'validated',
      lines: [
        { id: 'lo1', accountCode: '411000', accountName: 'Clients', label: 'Client A', debit: 750_000, credit: 0 },
        { id: 'lo2', accountCode: '701000', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 750_000 },
      ],
      totalDebit: 750_000,
      totalCredit: 750_000,
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
      hash: 'hash-orig-rev',
    });

    const result = await reverseEntry(adapter, {
      originalEntryId: 'e-orig-rev',
      reversalDate: '2026-07-31',
      reason: 'Annulation vente erreur',
    });

    expect(result.success).toBe(true);
    expect(result.reversalEntry).toBeDefined();

    const reversal = result.reversalEntry!;
    // Montants inversés : débit ↔ crédit
    const line411 = reversal.lines.find(l => l.accountCode === '411000');
    const line701 = reversal.lines.find(l => l.accountCode === '701000');

    expect(line411).toBeDefined();
    expect(line411!.debit).toBe(0);
    expect(line411!.credit).toBe(750_000);

    expect(line701).toBeDefined();
    expect(line701!.debit).toBe(750_000);
    expect(line701!.credit).toBe(0);
  });

  it('l\'écriture originale est marquée reversed = true', async () => {
    await db.journalEntries.add({
      id: 'e-rev-mark',
      entryNumber: 'OD-200',
      journal: 'OD',
      date: '2026-08-01',
      reference: 'OD-200',
      label: 'Écriture à annuler',
      status: 'validated',
      lines: [
        { id: 'lm1', accountCode: '512000', accountName: 'Banque', label: '', debit: 100_000, credit: 0 },
        { id: 'lm2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 100_000 },
      ],
      totalDebit: 100_000,
      totalCredit: 100_000,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      hash: 'hash-rev-mark',
    });

    await reverseEntry(adapter, {
      originalEntryId: 'e-rev-mark',
      reversalDate: '2026-08-15',
      reason: 'Test immuabilité',
    });

    const original = await db.journalEntries.get('e-rev-mark');
    expect(original!.reversed).toBe(true);
    expect(original!.reversedBy).toBeTruthy();
  });

  it('l\'écriture de contrepassation est équilibrée', async () => {
    await db.journalEntries.add({
      id: 'e-rev-bal',
      entryNumber: 'AC-300',
      journal: 'AC',
      date: '2026-09-01',
      reference: 'FFR-300',
      label: 'Achat à contrepasser',
      status: 'validated',
      lines: [
        { id: 'lb1', accountCode: '601000', accountName: 'Achats', label: '', debit: 1_200_000, credit: 0 },
        { id: 'lb2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 1_200_000 },
      ],
      totalDebit: 1_200_000,
      totalCredit: 1_200_000,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      hash: 'hash-rev-bal',
    });

    const result = await reverseEntry(adapter, {
      originalEntryId: 'e-rev-bal',
      reversalDate: '2026-09-30',
      reason: 'Test équilibre contrepassation',
    });

    expect(result.success).toBe(true);
    const rev = result.reversalEntry!;
    expect(rev.totalDebit).toBe(rev.totalCredit);
    expect(rev.totalDebit).toBe(1_200_000);
  });

  it('ne peut pas contrepasser une écriture brouillon', async () => {
    await db.journalEntries.add({
      id: 'e-draft-rev',
      entryNumber: 'OD-999',
      journal: 'OD',
      date: '2026-10-01',
      reference: '',
      label: 'Brouillon',
      status: 'draft',
      lines: [
        { id: 'ld1', accountCode: '512000', accountName: 'Banque', label: '', debit: 50_000, credit: 0 },
        { id: 'ld2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 50_000 },
      ],
      totalDebit: 50_000,
      totalCredit: 50_000,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      hash: 'hash-draft',
    });

    const result = await reverseEntry(adapter, {
      originalEntryId: 'e-draft-rev',
      reversalDate: '2026-10-15',
      reason: 'Tentative',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('ne peut pas contrepasser une écriture déjà contrepassée', async () => {
    await db.journalEntries.add({
      id: 'e-already-rev',
      entryNumber: 'OD-888',
      journal: 'OD',
      date: '2026-11-01',
      reference: '',
      label: 'Déjà contrepassée',
      status: 'validated',
      reversed: true,
      lines: [
        { id: 'la1', accountCode: '512000', accountName: 'Banque', label: '', debit: 20_000, credit: 0 },
        { id: 'la2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 20_000 },
      ],
      totalDebit: 20_000,
      totalCredit: 20_000,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      hash: 'hash-already',
    });

    const result = await reverseEntry(adapter, {
      originalEntryId: 'e-already-rev',
      reversalDate: '2026-11-15',
      reason: 'Double annulation',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('déjà été contrepassée');
  });

  it('reversalOf est défini sur l\'écriture de contrepassation', async () => {
    await db.journalEntries.add({
      id: 'e-link',
      entryNumber: 'VT-500',
      journal: 'VT',
      date: '2026-12-01',
      reference: '',
      label: 'Vente à annuler',
      status: 'validated',
      lines: [
        { id: 'lk1', accountCode: '411000', accountName: 'Clients', label: '', debit: 300_000, credit: 0 },
        { id: 'lk2', accountCode: '701000', accountName: 'Ventes', label: '', debit: 0, credit: 300_000 },
      ],
      totalDebit: 300_000,
      totalCredit: 300_000,
      createdAt: '2026-12-01T00:00:00.000Z',
      updatedAt: '2026-12-01T00:00:00.000Z',
      hash: 'hash-link',
    });

    const result = await reverseEntry(adapter, {
      originalEntryId: 'e-link',
      reversalDate: '2026-12-15',
      reason: 'Annulation vente',
    });

    expect(result.success).toBe(true);
    expect(result.reversalEntry!.reversalOf).toBe('e-link');
  });
});
