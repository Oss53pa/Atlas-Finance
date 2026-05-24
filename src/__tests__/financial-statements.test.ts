/**
 * Tests Fichier 4 — États financiers SYSCOHADA
 *
 * Vérifie :
 *  1. Total Actif == Total Passif (bilan équilibré)
 *  2. Résultat bilan == Résultat CR (cohérence F24)
 *  3. Compte 131 (résultat créditeur) classé en PASSIF (resultatEnInstance)
 *  4. Pas de double comptage
 *  5. Les brouillons sont exclus des états financiers
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { financialStatementsService } from '../features/financial/services/financialStatementsService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

type Status = 'draft' | 'validated' | 'posted';

function makeEntry(
  id: string,
  lines: Array<{ accountCode: string; debit: number; credit: number }>,
  date = '2026-06-15',
  status: Status = 'posted'
) {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  return {
    id,
    entryNumber: `OD-${id}`,
    date,
    journal: 'OD',
    label: `Entry ${id}`,
    reference: '',
    status,
    lines: lines.map((l, i) => ({
      id: `${id}-L${i}`,
      accountCode: l.accountCode,
      accountName: l.accountCode,
      label: '',
      debit: l.debit,
      credit: l.credit,
    })),
    totalDebit,
    totalCredit,
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    hash: `hash-${id}`,
  };
}

async function seedAccounts() {
  await db.accounts.bulkPut([
    { id: 'a01', code: '101000', name: 'Capital social',        accountClass: '1', accountType: 'equity',   level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a02', code: '120000', name: 'Report à nouveau',      accountClass: '1', accountType: 'equity',   level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a03', code: '131000', name: 'Résultat exercice',     accountClass: '1', accountType: 'equity',   level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a04', code: '160000', name: 'Emprunts',              accountClass: '1', accountType: 'liability',level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a05', code: '211000', name: 'Immo incorporelles',    accountClass: '2', accountType: 'asset',    level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
    { id: 'a06', code: '231000', name: 'Bâtiments',             accountClass: '2', accountType: 'asset',    level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
    { id: 'a07', code: '281000', name: 'Amortissements',        accountClass: '2', accountType: 'asset',    level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a08', code: '310000', name: 'Stocks',                accountClass: '3', accountType: 'asset',    level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
    { id: 'a09', code: '401000', name: 'Fournisseurs',          accountClass: '4', accountType: 'payable',  level: 3, normalBalance: 'credit', isReconcilable: true,  isActive: true },
    { id: 'a10', code: '411000', name: 'Clients',               accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: 'a11', code: '512000', name: 'Banque',                accountClass: '5', accountType: 'bank',     level: 3, normalBalance: 'debit',  isReconcilable: true,  isActive: true },
    { id: 'a12', code: '601000', name: 'Achats matières',       accountClass: '6', accountType: 'expense',  level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
    { id: 'a13', code: '661000', name: 'Charges de personnel',  accountClass: '6', accountType: 'expense',  level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
    { id: 'a14', code: '681000', name: 'Dotations amortissements', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a15', code: '701000', name: 'Ventes marchandises',   accountClass: '7', accountType: 'revenue',  level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  ]);
}

async function seedFiscalYear() {
  await db.fiscalYears.bulkPut([
    { id: 'FY2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
}

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await seedAccounts();
  await seedFiscalYear();
});

// ============================================================================
// TESTS — Bilan : Actif = Passif
// ============================================================================

describe('Bilan : Total Actif == Total Passif', () => {
  it('bilan parfaitement équilibré (capital → banque)', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { accountCode: '512000', debit: 5_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 5_000_000 },
      ]),
    ]);

    const bilan = await financialStatementsService.getBilan(adapter, '2026');

    // Actif : trésorerie 5M
    expect(bilan.actif.tresorerieActif).toBe(5_000_000);
    // Passif : capital 5M
    expect(bilan.passif.capitalSocial).toBe(5_000_000);
    // Équilibre total
    expect(bilan.actif.totalActif).toBe(bilan.passif.totalPassif);
  });

  it('bilan équilibré avec plusieurs comptes de bilan', async () => {
    await db.journalEntries.bulkAdd([
      // Apport capital
      makeEntry('e1', [
        { accountCode: '512000', debit: 8_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 8_000_000 },
      ]),
      // Achat immobilisation
      makeEntry('e2', [
        { accountCode: '231000', debit: 2_000_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 2_000_000 },
      ]),
      // Stocks
      makeEntry('e3', [
        { accountCode: '310000', debit: 1_000_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 1_000_000 },
      ]),
      // Vente → créance client
      makeEntry('e4', [
        { accountCode: '411000', debit: 3_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 3_000_000 },
      ]),
      // Charges personnel
      makeEntry('e5', [
        { accountCode: '661000', debit: 1_500_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 1_500_000 },
      ]),
    ]);

    const bilan = await financialStatementsService.getBilan(adapter, '2026');
    // totalActif et totalPassif peuvent différer légèrement si le résultat est intégré
    // Le résultat net (produits 3M - charges 1.5M = 1.5M) est dans les capitaux propres
    // Vérifier l'équilibre via la cohérence
    expect(bilan.actif.totalActif).toBeGreaterThan(0);
    expect(bilan.passif.totalPassif).toBeGreaterThan(0);

    // NOTE: Avec SYSCOHADA, totalActif peut légèrement différer de totalPassif
    // si le résultat net de l'exercice n'est pas encore affecté sur 131.
    // Dans ce cas, la cohérence est : Actif = Passif + Résultat
    const diff = Math.abs(bilan.actif.totalActif - bilan.passif.totalPassif);
    // Tolérance de 1 FCFA pour les arrondis (résultat peut être dans capitauxPropres)
    expect(diff).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// TESTS — Résultat bilan == Résultat CR
// ============================================================================

describe('Cohérence F24 : résultat bilan == résultat CR', () => {
  it('résultat net du CR == résultat exercice dans le bilan', async () => {
    await db.journalEntries.bulkAdd([
      // Capital
      makeEntry('e1', [
        { accountCode: '512000', debit: 10_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 10_000_000 },
      ]),
      // Ventes : 4 000 000
      makeEntry('e2', [
        { accountCode: '411000', debit: 4_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 4_000_000 },
      ]),
      // Achats : 1 500 000
      makeEntry('e3', [
        { accountCode: '601000', debit: 1_500_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 1_500_000 },
      ]),
      // Personnel : 800 000
      makeEntry('e4', [
        { accountCode: '661000', debit: 800_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 800_000 },
      ]),
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');
    const bilan = await financialStatementsService.getBilan(adapter, '2026');

    // Résultat net CR = 4M - 1.5M - 0.8M = 1 700 000
    expect(cr.resultatNet).toBe(1_700_000);

    // Le résultat de l'exercice dans le bilan doit être cohérent avec le CR
    // (il peut être dans resultatExercice OU dans resultatEnInstance selon le mapping)
    const resultatBilan = bilan.passif.resultatExercice !== 0
      ? bilan.passif.resultatExercice
      : bilan.passif.resultatEnInstance;

    expect(resultatBilan).toBe(cr.resultatNet);
  });
});

// ============================================================================
// TESTS — Compte 131 classé en PASSIF
// ============================================================================

describe('Compte 131 (résultat) classé en PASSIF', () => {
  it('le solde du compte 13x est dans resultatEnInstance du passif', async () => {
    await db.journalEntries.bulkAdd([
      // Capital
      makeEntry('e1', [
        { accountCode: '512000', debit: 5_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 5_000_000 },
      ]),
      // Écriture de détermination du résultat sur 131
      // (solde créditeur = bénéfice afecté au compte 13)
      makeEntry('e2', [
        { accountCode: '701000', debit: 2_000_000, credit: 0 },  // Zéroiser les produits
        { accountCode: '131000', debit: 0, credit: 2_000_000 },  // Résultat → classe 13
      ]),
      // Charges soldées
      makeEntry('e3', [
        { accountCode: '131000', debit: 500_000, credit: 0 },    // Résultat - charges
        { accountCode: '601000', debit: 0, credit: 500_000 },    // Zéroiser les charges
      ]),
    ]);

    const bilan = await financialStatementsService.getBilan(adapter, '2026');

    // Le compte 131 (classe 13) doit figurer dans resultatEnInstance (PASSIF)
    // et non dans l'actif
    // Selon computeBilan : resultatEnInstance = -netByPrefix(entries, '13')
    // Solde net 131 = D:500k - C:2M = -1 500 000 → résultat créditeur 1 500 000
    expect(bilan.passif.resultatEnInstance).toBeGreaterThan(0);
    expect(bilan.actif.totalActif).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS — Pas de double comptage
// ============================================================================

describe('Pas de double comptage', () => {
  it('impotsTaxes (64) n\'est pas inclus dans autresChargesExploitation (65)', async () => {
    await db.journalEntries.bulkAdd([
      // Vente
      makeEntry('e1', [
        { accountCode: '411000', debit: 2_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 2_000_000 },
      ]),
      // Achats
      makeEntry('e2', [
        { accountCode: '601000', debit: 500_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 500_000 },
      ]),
      // Impôts et taxes (64x) : 80 000
      makeEntry('e3', [
        { accountCode: '641000', debit: 80_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 80_000 },
      ]),
      // Autres charges (65x) : 40 000
      makeEntry('e4', [
        { accountCode: '650000', debit: 40_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 40_000 },
      ]),
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');

    // impotsTaxes = 80 000 uniquement
    expect(cr.impotsTaxes).toBe(80_000);
    // autresChargesExploitation = 40 000 uniquement (PAS 40k + 80k = 120k)
    expect(cr.autresChargesExploitation).toBe(40_000);
    // totalChargesExploitation = 500k + 80k + 40k = 620 000
    expect(cr.totalChargesExploitation).toBe(620_000);
  });

  it('productionVendue (70) ne contient pas productionStockee (71)', async () => {
    await db.journalEntries.bulkAdd([
      // Ventes marchandises 70 : 1 500 000
      makeEntry('e1', [
        { accountCode: '411000', debit: 1_500_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 1_500_000 },
      ]),
      // Production stockée 71 : 300 000 (variation de stocks)
      makeEntry('e2', [
        { accountCode: '310000', debit: 300_000, credit: 0 },
        { accountCode: '710000', debit: 0, credit: 300_000 },
      ]),
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');

    // productionVendue = uniquement compte 70 = 1 500 000
    expect(cr.productionVendue).toBe(1_500_000);
    // productionStockee = compte 71 = 300 000
    expect(cr.productionStockee).toBe(300_000);
    // Pas de mélange
    expect(cr.productionVendue).not.toBe(1_800_000);
  });
});

// ============================================================================
// TESTS — Exclusion des brouillons
// ============================================================================

describe('Exclusion des brouillons des états financiers', () => {
  it('les brouillons sont exclus du compte de résultat', async () => {
    await db.journalEntries.bulkAdd([
      // Vente validée : 1 000 000
      makeEntry('e1', [
        { accountCode: '411000', debit: 1_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 1_000_000 },
      ], '2026-05-01', 'validated'),
      // Vente brouillon : 500 000 — NE DOIT PAS être comptée
      makeEntry('e2', [
        { accountCode: '411000', debit: 500_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 500_000 },
      ], '2026-05-02', 'draft'),
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');

    // Seule la vente validée est comptée : productionVendue = 1 000 000
    expect(cr.productionVendue).toBe(1_000_000);
    expect(cr.resultatNet).toBe(1_000_000);
  });

  it('les brouillons sont exclus du bilan', async () => {
    await db.journalEntries.bulkAdd([
      // Capital réel : 3 000 000
      makeEntry('e1', [
        { accountCode: '512000', debit: 3_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 3_000_000 },
      ], '2026-01-01', 'validated'),
      // Capital brouillon : 1 000 000 — NE DOIT PAS apparaître dans le bilan
      makeEntry('e2', [
        { accountCode: '512000', debit: 1_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 1_000_000 },
      ], '2026-01-02', 'draft'),
    ]);

    const bilan = await financialStatementsService.getBilan(adapter, '2026');
    expect(bilan.actif.tresorerieActif).toBe(3_000_000);
    expect(bilan.passif.capitalSocial).toBe(3_000_000);
  });
});

// ============================================================================
// TESTS — Cohérence SIG
// ============================================================================

describe('SIG — Soldes Intermédiaires de Gestion', () => {
  it('CAF = résultat net + dotations amortissements (pas de cession)', async () => {
    await db.journalEntries.bulkAdd([
      // Capital
      makeEntry('ec', [
        { accountCode: '512000', debit: 10_000_000, credit: 0 },
        { accountCode: '101000', debit: 0, credit: 10_000_000 },
      ]),
      // Ventes : 6 000 000
      makeEntry('e1', [
        { accountCode: '411000', debit: 6_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 6_000_000 },
      ]),
      // Achats : 2 000 000
      makeEntry('e2', [
        { accountCode: '601000', debit: 2_000_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 2_000_000 },
      ]),
      // Dotations amortissements : 500 000
      makeEntry('e3', [
        { accountCode: '681000', debit: 500_000, credit: 0 },
        { accountCode: '281000', debit: 0, credit: 500_000 },
      ]),
    ]);

    const sig = await financialStatementsService.getSIG(adapter, '2026');

    // Résultat net = 6M - 2M - 0.5M = 3 500 000
    // CAF = Résultat net + dotations = 3 500 000 + 500 000 = 4 000 000
    expect(sig.capaciteAutofinancement).toBe(4_000_000);
  });
});
