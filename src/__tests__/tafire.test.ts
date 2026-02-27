import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { calculateTAFIRE, analyzeTAFIRE } from '../services/financial/tafireService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

function makeEntry(id: string, date: string, journal: string, lines: Array<{ accountCode: string; debit: number; credit: number }>) {
  return {
    id,
    entryNumber: `${journal}-${id}`,
    date,
    journal,
    label: `Entry ${id}`,
    reference: '',
    status: 'posted' as const,
    lines: lines.map((l, i) => ({
      id: `${id}-L${i}`,
      accountCode: l.accountCode,
      accountName: l.accountCode,
      label: '',
      debit: l.debit,
      credit: l.credit,
    })),
    totalDebit: lines.reduce((s, l) => s + l.debit, 0),
    totalCredit: lines.reduce((s, l) => s + l.credit, 0),
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    hash: `hash-${id}`,
  };
}

async function seedAccounts() {
  await db.accounts.bulkPut([
    { id: 'a10', code: '101000', name: 'Capital', accountClass: '1', accountType: 'equity', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a16', code: '160000', name: 'Emprunts', accountClass: '1', accountType: 'liability', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a21', code: '211000', name: 'Brevets', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a23', code: '231000', name: 'Bâtiments', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a28', code: '281000', name: 'Amortissements', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a40', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: 'a41', code: '411000', name: 'Clients', accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: 'a51', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: 'a60', code: '601000', name: 'Achats', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a66', code: '661000', name: 'Personnel', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a68', code: '681000', name: 'Dotations', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a70', code: '701000', name: 'Ventes', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a81', code: '810000', name: 'VNC cessions', accountClass: '8', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a82', code: '820000', name: 'Produits cessions', accountClass: '8', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  ]);
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.journalEntries.clear();
  await seedAccounts();
});

// ============================================================================
// P0-3 REGRESSION: acquisitions = débit classe 2 uniquement
// ============================================================================

describe('P0-3: fixedAssetsAcquisitions = débits classe 2 hors 28', () => {
  it('acquisition de 100 000 avec amortissement de 20 000 → acquisitions = 100 000', async () => {
    await db.journalEntries.bulkAdd([
      // Acquisition immobilisation: 100 000
      makeEntry('e1', '2026-03-01', 'OD', [
        { accountCode: '231000', debit: 100_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 100_000 },
      ]),
      // Amortissement: 20 000
      makeEntry('e2', '2026-12-31', 'OD', [
        { accountCode: '681000', debit: 20_000, credit: 0 },
        { accountCode: '281000', debit: 0, credit: 20_000 },
      ]),
    ]);

    const tafire = await calculateTAFIRE(adapter, '2026');

    // Acquisitions = débits classe 2 (hors 28) = 100 000
    expect(tafire.fixedAssetsAcquisitions).toBe(100_000);
    // NOT 100 000 - 20 000 = 80 000 (old bug) or other
  });
});

// ============================================================================
// P0-3: Cessions d'immobilisations
// ============================================================================

describe('P0-3: fixedAssetsDisposals lit les comptes 82', () => {
  it('cession à 150 000 → disposals = 150 000', async () => {
    await db.journalEntries.bulkAdd([
      // Cession: VNC = 80 000 (débit 81, crédit 23)
      makeEntry('e1', '2026-06-15', 'OD', [
        { accountCode: '810000', debit: 80_000, credit: 0 },
        { accountCode: '231000', debit: 0, credit: 80_000 },
      ]),
      // Prix de cession: 150 000 (débit 51, crédit 82)
      makeEntry('e2', '2026-06-15', 'OD', [
        { accountCode: '512000', debit: 150_000, credit: 0 },
        { accountCode: '820000', debit: 0, credit: 150_000 },
      ]),
    ]);

    const tafire = await calculateTAFIRE(adapter, '2026');

    // Cessions = produits de cession (compte 82) = 150 000
    expect(tafire.fixedAssetsDisposals).toBe(150_000);
  });
});

// ============================================================================
// P0-3: CAF inclut VNC et produits cessions
// ============================================================================

describe('P0-3: CAF complète SYSCOHADA', () => {
  it('CAF neutralise les cessions', async () => {
    await db.journalEntries.bulkAdd([
      // CA: 1 000 000
      makeEntry('e1', '2026-06-15', 'OD', [
        { accountCode: '411000', debit: 1_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 1_000_000 },
      ]),
      // Achats: 400 000
      makeEntry('e2', '2026-06-15', 'OD', [
        { accountCode: '601000', debit: 400_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 400_000 },
      ]),
      // Dotations: 100 000
      makeEntry('e3', '2026-12-31', 'OD', [
        { accountCode: '681000', debit: 100_000, credit: 0 },
        { accountCode: '281000', debit: 0, credit: 100_000 },
      ]),
      // VNC cession: 200 000
      makeEntry('e4', '2026-12-31', 'OD', [
        { accountCode: '810000', debit: 200_000, credit: 0 },
        { accountCode: '231000', debit: 0, credit: 200_000 },
      ]),
      // Produits cession: 300 000
      makeEntry('e5', '2026-12-31', 'OD', [
        { accountCode: '512000', debit: 300_000, credit: 0 },
        { accountCode: '820000', debit: 0, credit: 300_000 },
      ]),
    ]);

    const tafire = await calculateTAFIRE(adapter, '2026');

    // Résultat net = (1 000 000 - 400 000 - 100 000) + (300 000 - 200 000) = 600 000
    expect(tafire.netIncome).toBe(600_000);

    // CAF = 600 000 + 100 000 (dotations) + 200 000 (VNC) - 300 000 (produits cession) = 600 000
    expect(tafire.selfFinancingCapacity).toBe(600_000);
  });
});

// ============================================================================
// P0-3: Solde d'ouverture trésorerie (journal AN)
// ============================================================================

describe('P0-3: openingCashBalance depuis écritures AN', () => {
  it('lit le solde de trésorerie depuis le journal AN', async () => {
    await db.journalEntries.bulkAdd([
      // Écriture à-nouveaux: trésorerie d'ouverture = 500 000
      makeEntry('e-an', '2026-01-01', 'AN', [
        { accountCode: '512000', debit: 500_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 500_000 },
      ]),
      // CA: 200 000 (encaissé en banque)
      makeEntry('e1', '2026-06-15', 'OD', [
        { accountCode: '512000', debit: 200_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 200_000 },
      ]),
    ]);

    const tafire = await calculateTAFIRE(adapter, '2026');

    // Solde d'ouverture = 500 000 (depuis journal AN)
    expect(tafire.openingCashBalance).toBe(500_000);
    // Solde de clôture = net(5) = 500 000 + 200 000 = 700 000
    expect(tafire.closingCashBalance).toBe(700_000);
  });
});

// ============================================================================
// TAFIRE analyse
// ============================================================================

describe('analyzeTAFIRE', () => {
  it('detecte CAF positive', () => {
    const data = {
      selfFinancingCapacity: 1_000_000,
      freeCashFlow: 500_000,
      workingCapitalVariation: 100_000,
      investmentCashFlow: -200_000,
    } as any;

    const analysis = analyzeTAFIRE(data);
    expect(analysis.strengths).toContain("CAF positive - Bonne capacité d'autofinancement");
    expect(analysis.strengths).toContain("Free Cash Flow positif - Capacité d'investissement démontrée");
  });

  it('detecte CAF negative', () => {
    const data = {
      selfFinancingCapacity: -500_000,
      freeCashFlow: -800_000,
      workingCapitalVariation: 100_000,
      investmentCashFlow: -300_000,
    } as any;

    const analysis = analyzeTAFIRE(data);
    expect(analysis.weaknesses).toContain("CAF négative - Difficultés de génération de cash");
    expect(analysis.riskLevel).toBe('HIGH');
  });
});
