import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { financialStatementsService } from '../features/financial/services/financialStatementsService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// SEED DATA
// ============================================================================

async function seedAccounts() {
  await db.accounts.bulkPut([
    // Classe 1 — Capitaux propres
    { id: 'a10', code: '101000', name: 'Capital social', accountClass: '1', accountType: 'equity', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a12', code: '120000', name: 'Report à nouveau', accountClass: '1', accountType: 'equity', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a16', code: '160000', name: 'Emprunts', accountClass: '1', accountType: 'liability', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    // Classe 2 — Immobilisations
    { id: 'a21', code: '211000', name: 'Frais de développement', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a23', code: '231000', name: 'Bâtiments', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a28', code: '281000', name: 'Amortissements', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    // Classe 3 — Stocks
    { id: 'a31', code: '310000', name: 'Stocks', accountClass: '3', accountType: 'asset', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    // Classe 4 — Tiers
    { id: 'a40', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: 'a41', code: '411000', name: 'Clients', accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: 'a44', code: '441000', name: 'Etat, impôts', accountClass: '4', accountType: 'liability', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    // Classe 5 — Trésorerie
    { id: 'a51', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    // Classe 6 — Charges
    { id: 'a60', code: '601000', name: 'Achats matières', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a61', code: '610000', name: 'Services extérieurs', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a64', code: '641000', name: 'Impôts et taxes', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a65', code: '650000', name: 'Autres charges', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a66', code: '661000', name: 'Charges de personnel', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a68', code: '681000', name: 'Dotations amortissements', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    // Classe 7 — Produits
    { id: 'a70', code: '701000', name: 'Ventes marchandises', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a71', code: '710000', name: 'Production stockée', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a72', code: '720000', name: 'Production immobilisée', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    // Classe 8 — Comptes spéciaux
    { id: 'a81', code: '810000', name: 'VNC cessions', accountClass: '8', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a82', code: '820000', name: 'Produits cessions', accountClass: '8', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  ]);
}

async function seedFiscalYear() {
  await db.fiscalYears.bulkPut([
    { id: 'fy-2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
}

function makeEntry(id: string, lines: Array<{ accountCode: string; debit: number; credit: number }>) {
  return {
    id,
    entryNumber: `OD-${id}`,
    date: '2026-06-15',
    journal: 'OD',
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
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
    hash: `hash-${id}`,
  };
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.journalEntries.clear();
  await seedAccounts();
  await seedFiscalYear();
});

// ============================================================================
// P0-1 REGRESSION: productionVendue must NOT include account 71
// ============================================================================

describe('P0-1: productionVendue excludes account 71', () => {
  it('compte 71 ne doit PAS impacter productionVendue', async () => {
    await db.journalEntries.bulkAdd([
      // Vente de marchandises: 500 000
      makeEntry('e1', [
        { accountCode: '411000', debit: 500_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 500_000 },
      ]),
      // Production stockée: 100 000 au crédit du 71
      makeEntry('e2', [
        { accountCode: '310000', debit: 100_000, credit: 0 },
        { accountCode: '710000', debit: 0, credit: 100_000 },
      ]),
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');

    // productionVendue = uniquement compte 70 = 500 000
    expect(cr.productionVendue).toBe(500_000);
    // productionStockee = comptes 71 + 73 = 100 000
    expect(cr.productionStockee).toBe(100_000);
    // Les deux ne doivent pas se mélanger
    expect(cr.productionVendue).not.toBe(600_000);
  });
});

// ============================================================================
// P0-2 REGRESSION: impotsTaxes ne doit PAS être doublé
// ============================================================================

describe('P0-2: pas de double comptage impotsTaxes', () => {
  it('impotsTaxes apparait une seule fois dans totalChargesExploitation', async () => {
    await db.journalEntries.bulkAdd([
      // Vente: 1 000 000
      makeEntry('e1', [
        { accountCode: '411000', debit: 1_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 1_000_000 },
      ]),
      // Achat: 200 000
      makeEntry('e2', [
        { accountCode: '601000', debit: 200_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 200_000 },
      ]),
      // Impôts et taxes (64): 50 000
      makeEntry('e3', [
        { accountCode: '641000', debit: 50_000, credit: 0 },
        { accountCode: '441000', debit: 0, credit: 50_000 },
      ]),
      // Autres charges (65): 30 000
      makeEntry('e4', [
        { accountCode: '650000', debit: 30_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 30_000 },
      ]),
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');

    // impotsTaxes est un champ séparé = 50 000
    expect(cr.impotsTaxes).toBe(50_000);
    // autresChargesExploitation = uniquement compte 65 = 30 000 (PAS 30000 + 50000)
    expect(cr.autresChargesExploitation).toBe(30_000);
    // totalChargesExploitation = 200 000 + 50 000 + 30 000 = 280 000
    expect(cr.totalChargesExploitation).toBe(280_000);
    // Vérification: résultat exploitation = 1 000 000 - 280 000 = 720 000
    expect(cr.resultatExploitation).toBe(720_000);
  });
});

// ============================================================================
// BILAN: Actif = Passif
// ============================================================================

describe('Bilan: Actif = Passif', () => {
  it('bilan equilibre avec ecritures simples', async () => {
    await db.journalEntries.bulkAdd([
      // Capital: 1 000 000 (crédit 10 / débit 51)
      makeEntry('e1', [
        { accountCode: '512000', debit: 1_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 1_000_000 },
      ]),
    ]);

    const bilan = await financialStatementsService.getBilan(adapter, '2026');

    // Actif = trésorerie = 1 000 000
    expect(bilan.actif.tresorerieActif).toBe(1_000_000);
    // Passif = capitaux propres = 1 000 000
    expect(bilan.passif.capitalSocial).toBe(1_000_000);
  });
});

// ============================================================================
// CDR: Résultat net = Produits - Charges
// ============================================================================

describe('CDR: resultatNet correct', () => {
  it('calcule resultat exploitation, financier et net', async () => {
    await db.journalEntries.bulkAdd([
      // Ventes: 2 000 000
      makeEntry('e1', [
        { accountCode: '411000', debit: 2_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 2_000_000 },
      ]),
      // Achats: 800 000
      makeEntry('e2', [
        { accountCode: '601000', debit: 800_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 800_000 },
      ]),
      // Personnel: 500 000
      makeEntry('e3', [
        { accountCode: '661000', debit: 500_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 500_000 },
      ]),
      // Amortissements: 200 000
      makeEntry('e4', [
        { accountCode: '681000', debit: 200_000, credit: 0 },
        { accountCode: '281000', debit: 0, credit: 200_000 },
      ]),
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');

    expect(cr.totalProduitsExploitation).toBe(2_000_000);
    expect(cr.totalChargesExploitation).toBe(1_500_000);
    expect(cr.resultatExploitation).toBe(500_000);
    expect(cr.resultatNet).toBe(500_000);
  });
});

// ============================================================================
// SIG: CAF inclut dotations, reprises, cessions
// ============================================================================

describe('SIG: CAF complète', () => {
  it('CAF = ResultatNet + Dotations - Reprises + VNC - ProduitsCessions', async () => {
    await db.journalEntries.bulkAdd([
      // CA: 5 000 000
      makeEntry('e1', [
        { accountCode: '411000', debit: 5_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 5_000_000 },
      ]),
      // Achats: 2 000 000
      makeEntry('e2', [
        { accountCode: '601000', debit: 2_000_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 2_000_000 },
      ]),
      // Dotations amortissements: 400 000
      makeEntry('e3', [
        { accountCode: '681000', debit: 400_000, credit: 0 },
        { accountCode: '281000', debit: 0, credit: 400_000 },
      ]),
      // Cession immobilisation: VNC = 300 000, prix cession = 500 000
      makeEntry('e4', [
        { accountCode: '810000', debit: 300_000, credit: 0 },
        { accountCode: '231000', debit: 0, credit: 300_000 },
      ]),
      makeEntry('e5', [
        { accountCode: '512000', debit: 500_000, credit: 0 },
        { accountCode: '820000', debit: 0, credit: 500_000 },
      ]),
    ]);

    const sig = await financialStatementsService.getSIG(adapter, '2026');

    // Résultat net = 5 000 000 - 2 000 000 - 400 000 + (500 000 - 300 000) = 2 800 000
    // (les comptes 81/82 sont des comptes HAO en SYSCOHADA)
    // CAF = 2 800 000 + 400 000 + 300 000 - 500 000 = 3 000 000
    // CAF neutralise les cessions pour revenir au cash flow réel
    expect(sig.capaciteAutofinancement).toBe(3_000_000);
  });
});
