import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import {
  validateJournalEntry,
  validateJournalEntrySync,
  getNextPieceNumber,
} from '../validators/journalEntryValidator';

// Seed données de base
async function seedTestData() {
  await db.accounts.bulkPut([
    { id: '1', code: '101000', name: 'Capital social', accountClass: '1', accountType: 'equity', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: '2', code: '411000', name: 'Clients', accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: '3', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: '4', code: '601000', name: 'Achats', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: '5', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: '6', code: '701000', name: 'Ventes', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  ]);

  await db.fiscalYears.bulkPut([
    { id: 'fy-2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
    { id: 'fy-2025', code: '2025', name: 'Exercice 2025', startDate: '2025-01-01', endDate: '2025-12-31', isClosed: true, isActive: false },
  ]);
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.journalEntries.clear();
  await seedTestData();
});

describe('validateJournalEntry — Validation complete', () => {
  it('accepte une ecriture equilibree et valide', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: 'Achat de fournitures',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 500_000, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur X', debit: 0, credit: 500_000 },
      ],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejette une ecriture desequilibree de 1 FCFA', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: 'Achat',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 500_001, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur X', debit: 0, credit: 500_000 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('déséquilibrée'))).toBe(true);
    expect(result.errors.some(e => e.includes('1'))).toBe(true);
  });

  it('rejette une ecriture avec 1 seule ligne', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: 'Test',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 500_000, credit: 0 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('minimum 2 lignes'))).toBe(true);
  });

  it('rejette une ligne avec debit ET credit', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: 'Test',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Test', debit: 500_000, credit: 100_000 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Test', debit: 0, credit: 400_000 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('débit') && e.includes('crédit'))).toBe(true);
  });

  it('rejette une ligne vide (debit=0, credit=0)', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: 'Test',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Test', debit: 500_000, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Test', debit: 0, credit: 500_000 },
        { id: '3', accountCode: '512000', accountName: 'Banque', label: 'Test', debit: 0, credit: 0 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('non nul'))).toBe(true);
  });

  it('rejette une ecriture sur periode cloturee', async () => {
    const result = await validateJournalEntry({
      date: '2025-06-15',
      journal: 'AC',
      label: 'Achat ancien',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Test', debit: 500_000, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Test', debit: 0, credit: 500_000 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('clôturé'))).toBe(true);
  });

  it('rejette une ecriture avec compte inexistant', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: 'Test',
      lines: [
        { id: '1', accountCode: '999999', accountName: 'Inconnu', label: 'Test', debit: 500_000, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Test', debit: 0, credit: 500_000 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('999999') && e.includes('n\'existe pas'))).toBe(true);
  });

  it('rejette les montants negatifs', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: 'Test',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Test', debit: -500_000, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Test', debit: 0, credit: -500_000 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('négatif'))).toBe(true);
  });

  it('signale un warning si le libelle est vide', async () => {
    const result = await validateJournalEntry({
      date: '2026-03-15',
      journal: 'AC',
      label: '',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Test', debit: 500_000, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Test', debit: 0, credit: 500_000 },
      ],
    });
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('libellé'))).toBe(true);
  });

  it('rejette une ecriture sans exercice couvrant la date', async () => {
    const result = await validateJournalEntry({
      date: '2030-01-01',
      journal: 'AC',
      label: 'Date future',
      lines: [
        { id: '1', accountCode: '601000', accountName: 'Achats', label: 'Test', debit: 500_000, credit: 0 },
        { id: '2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Test', debit: 0, credit: 500_000 },
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('exercice'))).toBe(true);
  });
});

describe('validateJournalEntrySync — Validation legere', () => {
  it('accepte une ecriture equilibree', () => {
    const result = validateJournalEntrySync([
      { accountCode: '601000', debit: 1_000_000, credit: 0 },
      { accountCode: '401000', debit: 0, credit: 1_000_000 },
    ]);
    expect(result.isValid).toBe(true);
  });

  it('detecte un desequilibre', () => {
    const result = validateJournalEntrySync([
      { accountCode: '601000', debit: 1_000_000, credit: 0 },
      { accountCode: '401000', debit: 0, credit: 999_999 },
    ]);
    expect(result.isValid).toBe(false);
  });

  it('rejette une seule ligne', () => {
    const result = validateJournalEntrySync([
      { accountCode: '601000', debit: 500_000, credit: 0 },
    ]);
    expect(result.isValid).toBe(false);
  });
});

describe('getNextPieceNumber', () => {
  it('retourne XX-000001 quand il n\'y a pas d\'ecritures', async () => {
    const num = await getNextPieceNumber('AC');
    expect(num).toBe('AC-000001');
  });

  it('incremente le numero existant', async () => {
    await db.journalEntries.add({
      id: 'e1',
      entryNumber: 'AC-000005',
      journal: 'AC',
      date: '2026-01-15',
      reference: 'REF-001',
      label: 'Test',
      status: 'validated',
      lines: [],
      totalDebit: 100_000,
      totalCredit: 100_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const num = await getNextPieceNumber('AC');
    expect(num).toBe('AC-000006');
  });

  it('gere des journaux differents independamment', async () => {
    await db.journalEntries.add({
      id: 'e1',
      entryNumber: 'VE-000010',
      journal: 'VE',
      date: '2026-01-15',
      reference: 'REF-001',
      label: 'Test',
      status: 'validated',
      lines: [],
      totalDebit: 100_000,
      totalCredit: 100_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const numAC = await getNextPieceNumber('AC');
    const numVE = await getNextPieceNumber('VE');
    expect(numAC).toBe('AC-000001');
    expect(numVE).toBe('VE-000011');
  });
});
