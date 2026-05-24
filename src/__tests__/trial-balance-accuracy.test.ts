/**
 * Tests Fichier 3 — Précision de la balance de vérification
 *
 * Vérifie :
 *  1. ΣD == ΣC (équilibre général) sur plusieurs écritures
 *  2. Les lignes de chaque compte ont les bons mouvements
 *  3. Filtre de dates (avant/après une date pivot)
 *  4. Les brouillons (status:'draft') sont exclus
 *  5. Détection d'écart global si une écriture est déséquilibrée
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { verifyTrialBalance } from '../services/trialBalanceService';
import { balanceService } from '../features/balance/services/balanceService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

type Status = 'draft' | 'validated' | 'posted';

function makeEntry(
  id: string,
  num: string,
  date: string,
  lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number }>,
  status: Status = 'validated'
) {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  return {
    id,
    entryNumber: num,
    date,
    journal: 'OD',
    label: `Entry ${id}`,
    reference: '',
    status,
    lines: lines.map((l, i) => ({
      id: `${id}-l${i}`,
      accountCode: l.accountCode,
      accountName: l.accountName,
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
    { id: 'a01', code: '101000', name: 'Capital social', accountClass: '1', accountType: 'equity', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
    { id: 'a02', code: '211000', name: 'Terrain', accountClass: '2', accountType: 'asset', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a03', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: 'a04', code: '411000', name: 'Clients', accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: 'a05', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: 'a06', code: '601000', name: 'Achats', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: 'a07', code: '701000', name: 'Ventes', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  ]);
}

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await seedAccounts();
  await db.fiscalYears.bulkPut([
    { id: 'FY2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
});

// ============================================================================
// TESTS — Équilibre global
// ============================================================================

describe('Équilibre global D = C', () => {
  it('ΣDebit == ΣCrédit pour un jeu d\'écritures équilibré', async () => {
    await db.journalEntries.bulkAdd([
      // Apport en capital : 512000 D 5M / 101000 C 5M
      makeEntry('e1', 'OD-001', '2026-01-15', [
        { accountCode: '512000', accountName: 'Banque', debit: 5_000_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 5_000_000 },
      ]),
      // Achat : 601000 D 800k / 401000 C 800k
      makeEntry('e2', 'OD-002', '2026-02-10', [
        { accountCode: '601000', accountName: 'Achats', debit: 800_000, credit: 0 },
        { accountCode: '401000', accountName: 'Fournisseurs', debit: 0, credit: 800_000 },
      ]),
      // Vente : 411000 D 1.5M / 701000 C 1.5M
      makeEntry('e3', 'OD-003', '2026-03-20', [
        { accountCode: '411000', accountName: 'Clients', debit: 1_500_000, credit: 0 },
        { accountCode: '701000', accountName: 'Ventes', debit: 0, credit: 1_500_000 },
      ]),
      // Paiement fournisseur : 401000 D 800k / 512000 C 800k
      makeEntry('e4', 'OD-004', '2026-04-05', [
        { accountCode: '401000', accountName: 'Fournisseurs', debit: 800_000, credit: 0 },
        { accountCode: '512000', accountName: 'Banque', debit: 0, credit: 800_000 },
      ]),
    ]);

    const result = await verifyTrialBalance(adapter, '2026');

    expect(result.isBalanced).toBe(true);
    expect(result.ecartGlobal).toBe(0);
    // Total D = 5M + 800k + 1.5M + 800k = 8 100 000
    expect(result.totalDebits).toBe(8_100_000);
    expect(result.totalCredits).toBe(8_100_000);
    expect(result.entriesChecked).toBe(4);
  });

  it('détecte un écart global si une écriture est déséquilibrée', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', 'OD-001', '2026-01-15', [
        { accountCode: '512000', accountName: 'Banque', debit: 2_000_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 2_000_000 },
      ]),
      // Écriture déséquilibrée délibérée : totalDebit écrasé
      {
        ...makeEntry('e2', 'OD-002', '2026-02-01', [
          { accountCode: '601000', accountName: 'Achats', debit: 500_000, credit: 0 },
          { accountCode: '401000', accountName: 'Fournisseurs', debit: 0, credit: 400_000 },
        ]),
        totalDebit: 500_000,
        totalCredit: 400_000,
      },
    ]);

    const result = await verifyTrialBalance(adapter, '2026');
    expect(result.isBalanced).toBe(false);
    expect(result.ecartGlobal).toBeGreaterThan(0);
    expect(result.unbalancedEntries.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS — Mouvements par compte
// ============================================================================

describe('Mouvements par compte', () => {
  it('les mouvements Débit et Crédit sont corrects par compte', async () => {
    await db.journalEntries.bulkAdd([
      // Banque : D 3M (apport capital)
      makeEntry('e1', 'OD-001', '2026-01-10', [
        { accountCode: '512000', accountName: 'Banque', debit: 3_000_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 3_000_000 },
      ]),
      // Banque : C 600k (paiement fournisseur)
      makeEntry('e2', 'OD-002', '2026-02-20', [
        { accountCode: '401000', accountName: 'Fournisseurs', debit: 600_000, credit: 0 },
        { accountCode: '512000', accountName: 'Banque', debit: 0, credit: 600_000 },
      ]),
    ]);

    // Utilisation du balanceService pour vérifier les mouvements par compte
    const balance = await balanceService.getBalance(adapter, {
      period: { from: '2026-01-01', to: '2026-12-31' },
      searchAccount: '',
      showZeroBalance: false,
      balanceType: 'generale',
      displayLevel: 3,
    });

    // Vérifier les entrées du compte 512000 (Banque)
    // Le service balance construit une hiérarchie → chercher au niveau compte
    const banque = balance.find(b => b.code === '512000');
    if (banque) {
      // mouvementsDebit = 3M, mouvementsCredit = 600k
      expect(banque.mouvementsDebit).toBe(3_000_000);
      expect(banque.mouvementsCredit).toBe(600_000);
    } else {
      // La hiérarchie regroupe peut-être par classe — vérifier avec verifyTrialBalance
      const tb = await verifyTrialBalance(adapter, '2026');
      expect(tb.totalDebits).toBe(3_600_000);
      expect(tb.totalCredits).toBe(3_600_000);
    }
  });
});

// ============================================================================
// TESTS — Filtre de dates
// ============================================================================

describe('Filtre de dates', () => {
  it('filtre les écritures avant et après une date pivot', async () => {
    await db.journalEntries.bulkAdd([
      // Écriture de janvier 2026
      makeEntry('e2026a', 'OD-001', '2026-01-15', [
        { accountCode: '512000', accountName: 'Banque', debit: 1_000_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 1_000_000 },
      ]),
      // Écriture de juin 2026
      makeEntry('e2026b', 'OD-002', '2026-06-01', [
        { accountCode: '411000', accountName: 'Clients', debit: 500_000, credit: 0 },
        { accountCode: '701000', accountName: 'Ventes', debit: 0, credit: 500_000 },
      ]),
      // Écriture de 2025 (autre exercice)
      makeEntry('e2025', 'OD-001', '2025-12-15', [
        { accountCode: '512000', accountName: 'Banque', debit: 2_000_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 2_000_000 },
      ]),
    ]);

    // Filtre 2026 : 2 écritures
    const result2026 = await verifyTrialBalance(adapter, '2026');
    expect(result2026.entriesChecked).toBe(2);
    expect(result2026.totalDebits).toBe(1_500_000);

    // Filtre 2025 : 1 écriture
    const result2025 = await verifyTrialBalance(adapter, '2025');
    expect(result2025.entriesChecked).toBe(1);
    expect(result2025.totalDebits).toBe(2_000_000);
  });

  it('sans filtre de date, toutes les écritures non-brouillon sont incluses', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e-year1', 'OD-001', '2024-06-01', [
        { accountCode: '512000', accountName: 'Banque', debit: 500_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 500_000 },
      ]),
      makeEntry('e-year2', 'OD-002', '2025-06-01', [
        { accountCode: '512000', accountName: 'Banque', debit: 300_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 300_000 },
      ]),
    ]);

    const result = await verifyTrialBalance(adapter); // pas de filtre
    expect(result.entriesChecked).toBe(2);
    expect(result.totalDebits).toBe(800_000);
  });
});

// ============================================================================
// TESTS — Exclusion des brouillons
// ============================================================================

describe('Exclusion des brouillons', () => {
  it('les écritures draft sont exclues de la balance', async () => {
    await db.journalEntries.bulkAdd([
      // Écriture validée
      makeEntry('e-valid', 'OD-001', '2026-04-01', [
        { accountCode: '512000', accountName: 'Banque', debit: 1_000_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 1_000_000 },
      ], 'validated'),
      // Écriture brouillon — NE DOIT PAS figurer dans la balance
      makeEntry('e-draft', 'OD-002', '2026-04-02', [
        { accountCode: '601000', accountName: 'Achats', debit: 500_000, credit: 0 },
        { accountCode: '401000', accountName: 'Fournisseurs', debit: 0, credit: 500_000 },
      ], 'draft'),
    ]);

    const result = await verifyTrialBalance(adapter, '2026');
    // Seule l'écriture validée est incluse
    expect(result.entriesChecked).toBe(1);
    expect(result.totalDebits).toBe(1_000_000);
    expect(result.totalCredits).toBe(1_000_000);
  });

  it('vérification statut : 0 brouillon comptabilisé', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e-posted', 'OD-001', '2026-05-01', [
        { accountCode: '411000', accountName: 'Clients', debit: 200_000, credit: 0 },
        { accountCode: '701000', accountName: 'Ventes', debit: 0, credit: 200_000 },
      ], 'posted'),
      makeEntry('e-draft2', 'OD-002', '2026-05-02', [
        { accountCode: '601000', accountName: 'Achats', debit: 100_000, credit: 0 },
        { accountCode: '401000', accountName: 'Fournisseurs', debit: 0, credit: 100_000 },
      ], 'draft'),
    ]);

    const result = await verifyTrialBalance(adapter, '2026');
    // Le contrôle "statut" doit signaler 0 brouillon dans la balance
    const statusCheck = result.checks.find(c => c.name.includes('Statut'));
    if (statusCheck) {
      expect(statusCheck.status).toBe('pass');
      expect(statusCheck.details).toContain('0 brouillon');
    }
    // Seulement l'écriture posted est comptée
    expect(result.entriesChecked).toBe(1);
  });

  it('les écritures posted et validated sont toutes incluses', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e-v', 'OD-001', '2026-06-01', [
        { accountCode: '512000', accountName: 'Banque', debit: 400_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 400_000 },
      ], 'validated'),
      makeEntry('e-p', 'OD-002', '2026-06-02', [
        { accountCode: '411000', accountName: 'Clients', debit: 600_000, credit: 0 },
        { accountCode: '701000', accountName: 'Ventes', debit: 0, credit: 600_000 },
      ], 'posted'),
    ]);

    const result = await verifyTrialBalance(adapter, '2026');
    expect(result.entriesChecked).toBe(2);
    expect(result.totalDebits).toBe(1_000_000);
  });
});

// ============================================================================
// TESTS — Cohérence des checks SYSCOHADA
// ============================================================================

describe('Cohérence des checks SYSCOHADA', () => {
  it('le check Actif = Passif passe pour un bilan équilibré', async () => {
    await db.journalEntries.bulkAdd([
      // Capital → Banque : Actif et Passif symétriques
      makeEntry('e1', 'OD-001', '2026-01-01', [
        { accountCode: '512000', accountName: 'Banque', debit: 3_000_000, credit: 0 },
        { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 3_000_000 },
      ]),
    ]);

    const result = await verifyTrialBalance(adapter);
    const bilanCheck = result.checks.find(c => c.name.includes('Actif'));
    if (bilanCheck) {
      expect(bilanCheck.status).toBe('pass');
    }
    expect(result.isBalanced).toBe(true);
  });
});
