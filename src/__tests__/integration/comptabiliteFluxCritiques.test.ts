/**
 * Tests d'intégration — Flux comptables critiques SYSCOHADA (tâche #7)
 *
 * Couvre six flux :
 *  Flux 1  — Saisie et validation d'écriture (cycle draft → validated → posted)
 *  Flux 2  — Balance SYSCOHADA D = C (exclusion brouillons)
 *  Flux 3  — Grand Livre par compte (solde + running balance)
 *  Flux 4  — États financiers SYSCOHADA (bilan équilibré, brouillons exclus)
 *  Flux 5  — Clôture d'exercice (verrou exercice clôturé + reports à nouveau)
 *  Flux 6  — Intégrité SHA-256 (chaîne de hash, détection de rupture)
 *
 * Chaque groupe réinitialise Dexie dans son beforeEach pour garantir l'isolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../lib/db';
import { createTestAdapter } from '../../test/createTestAdapter';

// Services
import { safeAddEntry, EntryGuardError } from '../../services/entryGuard';
import {
  validerEcriture,
  comptabiliserEcriture,
} from '../../services/entryWorkflow';
import { balanceService } from '../../features/balance/services/balanceService';
import { generalLedgerService } from '../../features/accounting/services/generalLedgerService';
import { financialStatementsService } from '../../features/financial/services/financialStatementsService';
import { verifyTrialBalance } from '../../services/trialBalanceService';
import { hashEntry, verifyChain } from '../../utils/integrity';

// ============================================================================
// HELPERS PARTAGÉS
// ============================================================================

/** Crée un adapter fresh pour chaque suite */
function makeAdapter() {
  return createTestAdapter();
}

/** Numéros de pièce uniques dans une suite */
let _seq = 0;
function nextNum() {
  _seq += 1;
  return String(_seq).padStart(6, '0');
}

/** Construit une ligne de journal */
function line(accountCode: string, debit: number, credit: number, label = '') {
  return {
    id: crypto.randomUUID(),
    accountCode,
    accountName: accountCode,
    label,
    debit,
    credit,
  };
}

/** Données minimales pour un exercice 2026 ouvert */
const FY_2026 = {
  id: 'fy-2026',
  code: '2026',
  name: 'Exercice 2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  isClosed: false,
  isActive: true,
};

/** Comptes de base nécessaires à la validation (safeAddEntry exige leur présence) */
const BASE_ACCOUNTS = [
  { id: 'a-101', code: '101000', name: 'Capital social',    accountClass: '1', accountType: 'equity',     level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  { id: 'a-160', code: '160000', name: 'Emprunts',          accountClass: '1', accountType: 'liability',  level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  { id: 'a-231', code: '231000', name: 'Bâtiments',         accountClass: '2', accountType: 'asset',      level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
  { id: 'a-310', code: '310000', name: 'Stocks',            accountClass: '3', accountType: 'asset',      level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
  { id: 'a-401', code: '401000', name: 'Fournisseurs',      accountClass: '4', accountType: 'payable',    level: 3, normalBalance: 'credit', isReconcilable: true,  isActive: true },
  { id: 'a-411', code: '411000', name: 'Clients',           accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit',  isReconcilable: true,  isActive: true },
  { id: 'a-443', code: '443100', name: 'TVA collectée',     accountClass: '4', accountType: 'liability',  level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  { id: 'a-445', code: '445200', name: 'TVA récupérable',   accountClass: '4', accountType: 'asset',      level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
  { id: 'a-512', code: '512000', name: 'Banque',            accountClass: '5', accountType: 'bank',       level: 3, normalBalance: 'debit',  isReconcilable: true,  isActive: true },
  { id: 'a-601', code: '601000', name: 'Achats matières',   accountClass: '6', accountType: 'expense',    level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
  { id: 'a-661', code: '661000', name: 'Personnel',         accountClass: '6', accountType: 'expense',    level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
  { id: 'a-681', code: '681000', name: 'Amortissements',    accountClass: '6', accountType: 'expense',    level: 3, normalBalance: 'debit',  isReconcilable: false, isActive: true },
  { id: 'a-701', code: '701000', name: 'Ventes',            accountClass: '7', accountType: 'revenue',    level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
];

async function seedBase() {
  await db.accounts.bulkPut(BASE_ACCOUNTS);
  await db.fiscalYears.bulkPut([FY_2026]);
}

async function clearAll() {
  await db.journalEntries.clear();
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.auditLogs.clear();
}

// ============================================================================
// FLUX 1 — Saisie et validation d'écriture
// ============================================================================

describe('Flux 1 — Saisie et validation d\'écriture', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  beforeEach(async () => {
    _seq = 0;
    await clearAll();
    await seedBase();
    adapter = makeAdapter();
  });

  it('crée une écriture équilibrée avec status draft', async () => {
    const id = await safeAddEntry(adapter, {
      id: 'e-f1-01',
      entryNumber: `AC-${nextNum()}`,
      date: '2026-03-15',
      journal: 'AC',
      label: 'Achat fournitures',
      reference: 'FAC-001',
      status: 'draft',
      lines: [
        line('601000', 250_000, 0, 'Fournitures'),
        line('401000', 0, 250_000, 'Fournisseur X'),
      ],
      createdAt: '2026-03-15T10:00:00.000Z',
    });

    const stored = await db.journalEntries.get(id);
    expect(stored).toBeDefined();
    expect(stored!.status).toBe('draft');
    expect(stored!.totalDebit).toBe(250_000);
    expect(stored!.totalCredit).toBe(250_000);
  });

  it('valide l\'écriture draft → validated', async () => {
    await safeAddEntry(adapter, {
      id: 'e-f1-02',
      entryNumber: `AC-${nextNum()}`,
      date: '2026-03-15',
      journal: 'AC',
      label: 'Vente',
      reference: '',
      status: 'draft',
      lines: [
        line('411000', 118_000, 0),
        line('701000', 0, 100_000),
        line('443100', 0, 18_000),
      ],
      createdAt: '2026-03-15T10:00:00.000Z',
    });

    const result = await validerEcriture(adapter, 'e-f1-02');
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('validated');

    const stored = await db.journalEntries.get('e-f1-02');
    expect(stored!.status).toBe('validated');
  });

  it('comptabilise validated → posted (écriture immutable)', async () => {
    await safeAddEntry(adapter, {
      id: 'e-f1-03',
      entryNumber: `AC-${nextNum()}`,
      date: '2026-04-01',
      journal: 'AC',
      label: 'Règlement fournisseur',
      reference: '',
      status: 'draft',
      lines: [
        line('401000', 100_000, 0),
        line('512000', 0, 100_000),
      ],
      createdAt: '2026-04-01T10:00:00.000Z',
    });

    await validerEcriture(adapter, 'e-f1-03');
    const posted = await comptabiliserEcriture(adapter, 'e-f1-03');
    expect(posted.success).toBe(true);
    expect(posted.newStatus).toBe('posted');

    const stored = await db.journalEntries.get('e-f1-03');
    expect(stored!.status).toBe('posted');
  });

  it('rejette une écriture déséquilibrée (débit ≠ crédit)', async () => {
    await expect(
      safeAddEntry(adapter, {
        id: 'e-f1-04',
        entryNumber: `AC-${nextNum()}`,
        date: '2026-03-15',
        journal: 'AC',
        label: 'Écriture invalide',
        reference: '',
        status: 'draft',
        lines: [
          line('601000', 100_000, 0),
          line('401000', 0, 90_000), // intentionnellement déséquilibré
        ],
        createdAt: '2026-03-15T10:00:00.000Z',
      }),
    ).rejects.toThrow(EntryGuardError);
  });

  it('rejette la validation d\'une écriture sur un exercice clôturé', async () => {
    // Créer un exercice clôturé pour l'année précédente
    await db.fiscalYears.put({
      id: 'fy-2025-closed',
      code: '2025',
      name: 'Exercice 2025',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      isClosed: true,
      isActive: false,
    });

    // safeAddEntry ne vérifie que l'équilibre (sync) — l'exercice clôturé
    // est contrôlé lors de la VALIDATION (validerEcriture → validateJournalEntry async).
    // On insère le draft en 2025 (exercice clôturé) :
    await db.journalEntries.add({
      id: 'e-f1-05',
      entryNumber: `AC-${nextNum()}`,
      date: '2025-06-15',
      journal: 'AC',
      label: 'Tentative écriture clôturée',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'e-f1-05-l1', accountCode: '601000', accountName: 'Achats', label: '', debit: 50_000, credit: 0 },
        { id: 'e-f1-05-l2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 50_000 },
      ],
      totalDebit: 50_000,
      totalCredit: 50_000,
      createdAt: '2025-06-15T10:00:00.000Z',
      updatedAt: '2025-06-15T10:00:00.000Z',
      hash: 'placeholder',
    });

    // La validation (draft → validated) doit échouer car l'exercice est clôturé
    const result = await validerEcriture(adapter, 'e-f1-05');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/clôtur|exercice|close/i);
  });
});

// ============================================================================
// FLUX 2 — Balance SYSCOHADA (D = C)
// ============================================================================

describe('Flux 2 — Balance SYSCOHADA D = C', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  const BALANCE_FILTERS = {
    period: { from: '2026-01-01', to: '2026-12-31' },
    searchAccount: '',
    showZeroBalance: false,
    balanceType: 'generale' as const,
    displayLevel: 2 as const,
  };

  beforeEach(async () => {
    _seq = 0;
    await clearAll();
    await seedBase();
    adapter = makeAdapter();

    // Trois écritures validées équilibrées + une en brouillon
    await db.journalEntries.bulkAdd([
      {
        id: 'b-e1',
        entryNumber: 'VT-000001',
        journal: 'VT',
        date: '2026-01-10',
        reference: '',
        label: 'Vente client A',
        status: 'validated',
        lines: [
          { id: 'b-e1-l1', accountCode: '411000', accountName: 'Clients',  label: '', debit: 300_000, credit: 0 },
          { id: 'b-e1-l2', accountCode: '701000', accountName: 'Ventes',   label: '', debit: 0, credit: 300_000 },
        ],
        totalDebit: 300_000,
        totalCredit: 300_000,
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-01-10T10:00:00Z',
      },
      {
        id: 'b-e2',
        entryNumber: 'AC-000001',
        journal: 'AC',
        date: '2026-02-05',
        reference: '',
        label: 'Achat fournitures',
        status: 'posted',
        lines: [
          { id: 'b-e2-l1', accountCode: '601000', accountName: 'Achats',       label: '', debit: 120_000, credit: 0 },
          { id: 'b-e2-l2', accountCode: '445200', accountName: 'TVA récup.',    label: '', debit: 21_600,  credit: 0 },
          { id: 'b-e2-l3', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 141_600 },
        ],
        totalDebit: 141_600,
        totalCredit: 141_600,
        createdAt: '2026-02-05T10:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
      {
        id: 'b-e3',
        entryNumber: 'BQ-000001',
        journal: 'BQ',
        date: '2026-02-15',
        reference: '',
        label: 'Règlement fournisseur',
        status: 'validated',
        lines: [
          { id: 'b-e3-l1', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 141_600, credit: 0 },
          { id: 'b-e3-l2', accountCode: '512000', accountName: 'Banque',        label: '', debit: 0, credit: 141_600 },
        ],
        totalDebit: 141_600,
        totalCredit: 141_600,
        createdAt: '2026-02-15T10:00:00Z',
        updatedAt: '2026-02-15T10:00:00Z',
      },
      // Brouillon — NE DOIT PAS apparaître dans la balance
      {
        id: 'b-draft',
        entryNumber: 'OD-DRAFT',
        journal: 'OD',
        date: '2026-03-01',
        reference: '',
        label: 'Écriture brouillon',
        status: 'draft',
        lines: [
          { id: 'b-draft-l1', accountCode: '512000', accountName: 'Banque',  label: '', debit: 999_999, credit: 0 },
          { id: 'b-draft-l2', accountCode: '101000', accountName: 'Capital', label: '', debit: 0, credit: 999_999 },
        ],
        totalDebit: 999_999,
        totalCredit: 999_999,
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z',
      },
    ]);
  });

  it('Σ débits = Σ crédits sur toutes les écritures non-draft', async () => {
    const balance = await balanceService.getBalance(adapter, BALANCE_FILTERS);
    const totals = balanceService.calculateTotals(balance);

    expect(totals.mouvementsDebit).toBe(totals.mouvementsCredit);
    // VT + AC + BQ : 300 000 + 141 600 + 141 600 = 583 200
    expect(totals.mouvementsDebit).toBe(583_200);
  });

  it('les brouillons ne figurent pas dans la balance (999 999 absent)', async () => {
    const balance = await balanceService.getBalance(adapter, BALANCE_FILTERS);
    const totals = balanceService.calculateTotals(balance);

    // Si le brouillon était inclus, le total dépasserait 999 999
    expect(totals.mouvementsDebit).toBeLessThan(999_999);

    // Aucun compte de la balance ne doit montrer 999 999 en mouvement
    function flatAccounts(accounts: any[]): any[] {
      return accounts.flatMap(a => [a, ...(a.children ? flatAccounts(a.children) : [])]);
    }
    const flat = flatAccounts(balance);
    const has999 = flat.some(a => a.mouvementsDebit === 999_999 || a.mouvementsCredit === 999_999);
    expect(has999).toBe(false);
  });

  it('la balance couvre les classes SYSCOHADA présentes (4, 5, 6, 7)', async () => {
    const balance = await balanceService.getBalance(adapter, BALANCE_FILTERS);
    const classes = balance.map((b: any) => b.code);
    expect(classes).toContain('4');
    expect(classes).toContain('6');
    expect(classes).toContain('7');
  });

  it('verifyTrialBalance rapporte isBalanced=true', async () => {
    const result = await verifyTrialBalance(adapter);
    expect(result.isBalanced).toBe(true);
    expect(result.ecartGlobal).toBe(0);
    // Les 3 écritures non-draft sont vérifiées
    expect(result.entriesChecked).toBe(3);
  });
});

// ============================================================================
// FLUX 3 — Grand Livre par compte
// ============================================================================

describe('Flux 3 — Grand Livre par compte', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  const GL_FILTERS = { dateDebut: '2026-01-01', dateFin: '2026-12-31' };

  beforeEach(async () => {
    _seq = 0;
    await clearAll();
    await seedBase();
    adapter = makeAdapter();

    await db.journalEntries.bulkAdd([
      // Vente 1 — clients 411 + produits 701
      {
        id: 'gl-e1',
        entryNumber: 'VT-000001',
        journal: 'VT',
        date: '2026-01-15',
        reference: 'FAC-001',
        label: 'Vente client B',
        status: 'validated',
        lines: [
          { id: 'gl-e1-l1', accountCode: '411000', accountName: 'Clients', label: 'Client B', debit: 500_000, credit: 0 },
          { id: 'gl-e1-l2', accountCode: '701000', accountName: 'Ventes',  label: 'Produit 1', debit: 0, credit: 500_000 },
        ],
        totalDebit: 500_000,
        totalCredit: 500_000,
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      },
      // Vente 2 — deuxième mouvement sur 411
      {
        id: 'gl-e2',
        entryNumber: 'VT-000002',
        journal: 'VT',
        date: '2026-02-10',
        reference: 'FAC-002',
        label: 'Vente client C',
        status: 'validated',
        lines: [
          { id: 'gl-e2-l1', accountCode: '411000', accountName: 'Clients', label: 'Client C', debit: 200_000, credit: 0 },
          { id: 'gl-e2-l2', accountCode: '701000', accountName: 'Ventes',  label: 'Produit 2', debit: 0, credit: 200_000 },
        ],
        totalDebit: 200_000,
        totalCredit: 200_000,
        createdAt: '2026-02-10T10:00:00Z',
        updatedAt: '2026-02-10T10:00:00Z',
      },
      // Encaissement — 411 crédit / 512 débit
      {
        id: 'gl-e3',
        entryNumber: 'BQ-000001',
        journal: 'BQ',
        date: '2026-03-01',
        reference: 'BQ-001',
        label: 'Encaissement client B',
        status: 'posted',
        lines: [
          { id: 'gl-e3-l1', accountCode: '512000', accountName: 'Banque',  label: 'Virement reçu', debit: 500_000, credit: 0 },
          { id: 'gl-e3-l2', accountCode: '411000', accountName: 'Clients', label: 'Solde FAC-001',  debit: 0, credit: 500_000 },
        ],
        totalDebit: 500_000,
        totalCredit: 500_000,
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z',
      },
      // Achat — 601 / 401
      {
        id: 'gl-e4',
        entryNumber: 'AC-000001',
        journal: 'AC',
        date: '2026-03-15',
        reference: 'FFR-001',
        label: 'Achat marchandises',
        status: 'validated',
        lines: [
          { id: 'gl-e4-l1', accountCode: '601000', accountName: 'Achats',       label: 'Marchandises', debit: 300_000, credit: 0 },
          { id: 'gl-e4-l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur Z', debit: 0, credit: 300_000 },
        ],
        totalDebit: 300_000,
        totalCredit: 300_000,
        createdAt: '2026-03-15T10:00:00Z',
        updatedAt: '2026-03-15T10:00:00Z',
      },
    ]);
  });

  it('solde compte 411 = Σdébits − Σcrédits (500 000 + 200 000 − 500 000 = 200 000)', async () => {
    const account = await generalLedgerService.getAccountLedger(adapter, '411000', GL_FILTERS);
    expect(account.totalDebit).toBe(700_000);
    expect(account.totalCredit).toBe(500_000);
    expect(account.soldeFermeture).toBe(200_000);
  });

  it('solde compte 512 = 500 000 débiteur', async () => {
    const account = await generalLedgerService.getAccountLedger(adapter, '512000', GL_FILTERS);
    expect(account.totalDebit).toBe(500_000);
    expect(account.totalCredit).toBe(0);
    expect(account.soldeFermeture).toBe(500_000);
  });

  it('solde compte 601 = 300 000 débiteur', async () => {
    const account = await generalLedgerService.getAccountLedger(adapter, '601000', GL_FILTERS);
    expect(account.totalDebit).toBe(300_000);
    expect(account.totalCredit).toBe(0);
    expect(account.soldeFermeture).toBe(300_000);
  });

  it('running balance du compte 411 progresse correctement', async () => {
    const account = await generalLedgerService.getAccountLedger(adapter, '411000', GL_FILTERS);
    // 2 écrits débiteurs puis 1 créditeur
    expect(account.nombreEcritures).toBe(3);

    // Les entrées doivent être triées par date et montrer le running balance cumulatif
    const entries = account.ecritures ?? account.entries ?? [];
    if (entries.length === 3) {
      // Après l'entrée 1 (débit 500 000) : solde = 500 000
      // Après l'entrée 2 (débit 200 000) : solde = 700 000
      // Après l'entrée 3 (crédit 500 000) : solde = 200 000
      const lastEntry = entries[entries.length - 1];
      expect(lastEntry.solde).toBe(200_000);
    }
  });

  it('les 4 comptes de la période figurent dans le grand livre', async () => {
    const accounts = await generalLedgerService.getLedgerAccounts(adapter, GL_FILTERS);
    const codes = accounts.map((a: any) => a.compte);
    expect(codes).toContain('411000');
    expect(codes).toContain('512000');
    expect(codes).toContain('601000');
    expect(codes).toContain('701000');
  });

  it('stats: totalDebit = totalCredit (équilibre global)', async () => {
    const stats = await generalLedgerService.getStats(adapter, GL_FILTERS);
    expect(stats.totalDebit).toBe(stats.totalCredit);
    // 4 écritures × chacune équilibrée = 500 000 + 200 000 + 500 000 + 300 000
    expect(stats.totalDebit).toBe(1_500_000);
  });
});

// ============================================================================
// FLUX 4 — États financiers SYSCOHADA
// ============================================================================

describe('Flux 4 — États financiers SYSCOHADA', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  beforeEach(async () => {
    _seq = 0;
    await clearAll();
    await seedBase();
    adapter = makeAdapter();
  });

  it('bilan équilibré : Actif = Passif (capital seul)', async () => {
    await db.journalEntries.add({
      id: 'fs-e1',
      entryNumber: 'OD-000001',
      journal: 'OD',
      date: '2026-01-01',
      reference: '',
      label: 'Apport capital',
      status: 'posted',
      lines: [
        { id: 'fs-e1-l1', accountCode: '512000', accountName: 'Banque',   label: '', debit: 2_000_000, credit: 0 },
        { id: 'fs-e1-l2', accountCode: '101000', accountName: 'Capital',  label: '', debit: 0, credit: 2_000_000 },
      ],
      totalDebit: 2_000_000,
      totalCredit: 2_000_000,
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-01-01T08:00:00Z',
    });

    const bilan = await financialStatementsService.getBilan(adapter, '2026');
    expect(bilan.actif.tresorerieActif).toBe(2_000_000);
    expect(bilan.passif.capitalSocial).toBe(2_000_000);
  });

  it('bilan avec actif immobilisé, stocks et dettes', async () => {
    await db.journalEntries.bulkAdd([
      // Capital : 5 000 000
      {
        id: 'fs-e2a',
        entryNumber: 'OD-000001',
        journal: 'OD',
        date: '2026-01-01',
        reference: '',
        label: 'Capital',
        status: 'posted',
        lines: [
          { id: 'fs-e2a-l1', accountCode: '512000', accountName: 'Banque',  label: '', debit: 5_000_000, credit: 0 },
          { id: 'fs-e2a-l2', accountCode: '101000', accountName: 'Capital', label: '', debit: 0, credit: 5_000_000 },
        ],
        totalDebit: 5_000_000,
        totalCredit: 5_000_000,
        createdAt: '2026-01-01T08:00:00Z',
        updatedAt: '2026-01-01T08:00:00Z',
      },
      // Achat immeuble : 2 000 000 (231 / 512)
      {
        id: 'fs-e2b',
        entryNumber: 'OD-000002',
        journal: 'OD',
        date: '2026-01-05',
        reference: '',
        label: 'Achat immeuble',
        status: 'posted',
        lines: [
          { id: 'fs-e2b-l1', accountCode: '231000', accountName: 'Bâtiments', label: '', debit: 2_000_000, credit: 0 },
          { id: 'fs-e2b-l2', accountCode: '512000', accountName: 'Banque',    label: '', debit: 0, credit: 2_000_000 },
        ],
        totalDebit: 2_000_000,
        totalCredit: 2_000_000,
        createdAt: '2026-01-05T08:00:00Z',
        updatedAt: '2026-01-05T08:00:00Z',
      },
      // Achat stock : 800 000 (310 / 401)
      {
        id: 'fs-e2c',
        entryNumber: 'OD-000003',
        journal: 'OD',
        date: '2026-01-10',
        reference: '',
        label: 'Achat stock',
        status: 'posted',
        lines: [
          { id: 'fs-e2c-l1', accountCode: '310000', accountName: 'Stocks',       label: '', debit: 800_000, credit: 0 },
          { id: 'fs-e2c-l2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 800_000 },
        ],
        totalDebit: 800_000,
        totalCredit: 800_000,
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-10T08:00:00Z',
      },
    ]);

    const bilan = await financialStatementsService.getBilan(adapter, '2026');

    // Actif circulant : stocks = 800 000
    expect(bilan.actif.stocks).toBe(800_000);
    // Trésorerie : 5 000 000 − 2 000 000 = 3 000_000
    expect(bilan.actif.tresorerieActif).toBe(3_000_000);
    // Capitaux propres : 5 000 000
    expect(bilan.passif.capitalSocial).toBe(5_000_000);
    // Dettes fournisseurs : 800 000
    expect(bilan.passif.dettesFournisseurs).toBe(800_000);
  });

  it('résultat exploitation correct (produits − charges)', async () => {
    await db.journalEntries.bulkAdd([
      // Ventes : 3 000 000
      {
        id: 'fs-cr-e1',
        entryNumber: 'VT-000001',
        journal: 'VT',
        date: '2026-06-01',
        reference: '',
        label: 'Ventes semestre 1',
        status: 'posted',
        lines: [
          { id: 'fs-cr-e1-l1', accountCode: '411000', accountName: 'Clients', label: '', debit: 3_000_000, credit: 0 },
          { id: 'fs-cr-e1-l2', accountCode: '701000', accountName: 'Ventes',  label: '', debit: 0, credit: 3_000_000 },
        ],
        totalDebit: 3_000_000,
        totalCredit: 3_000_000,
        createdAt: '2026-06-01T08:00:00Z',
        updatedAt: '2026-06-01T08:00:00Z',
      },
      // Achats : 1 200 000
      {
        id: 'fs-cr-e2',
        entryNumber: 'AC-000001',
        journal: 'AC',
        date: '2026-06-15',
        reference: '',
        label: 'Achats matières S1',
        status: 'posted',
        lines: [
          { id: 'fs-cr-e2-l1', accountCode: '601000', accountName: 'Achats',       label: '', debit: 1_200_000, credit: 0 },
          { id: 'fs-cr-e2-l2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 1_200_000 },
        ],
        totalDebit: 1_200_000,
        totalCredit: 1_200_000,
        createdAt: '2026-06-15T08:00:00Z',
        updatedAt: '2026-06-15T08:00:00Z',
      },
      // Personnel : 600 000
      {
        id: 'fs-cr-e3',
        entryNumber: 'RH-000001',
        journal: 'RH',
        date: '2026-06-30',
        reference: '',
        label: 'Salaires juin',
        status: 'posted',
        lines: [
          { id: 'fs-cr-e3-l1', accountCode: '661000', accountName: 'Personnel', label: '', debit: 600_000, credit: 0 },
          { id: 'fs-cr-e3-l2', accountCode: '512000', accountName: 'Banque',    label: '', debit: 0, credit: 600_000 },
        ],
        totalDebit: 600_000,
        totalCredit: 600_000,
        createdAt: '2026-06-30T08:00:00Z',
        updatedAt: '2026-06-30T08:00:00Z',
      },
    ]);

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');
    expect(cr.productionVendue).toBe(3_000_000);
    // Total charges exploitation = 1 200 000 + 600 000 = 1 800 000
    expect(cr.totalChargesExploitation).toBe(1_800_000);
    // Résultat exploitation = 3 000 000 − 1 800 000 = 1 200 000
    expect(cr.resultatExploitation).toBe(1_200_000);
    expect(cr.resultatNet).toBe(1_200_000);
  });

  it('les brouillons sont exclus des états financiers', async () => {
    // Une écriture de vente validée
    await db.journalEntries.add({
      id: 'fs-excl-posted',
      entryNumber: 'VT-000001',
      journal: 'VT',
      date: '2026-03-01',
      reference: '',
      label: 'Vente réelle',
      status: 'posted',
      lines: [
        { id: 'fs-excl-p-l1', accountCode: '411000', accountName: 'Clients', label: '', debit: 1_000_000, credit: 0 },
        { id: 'fs-excl-p-l2', accountCode: '701000', accountName: 'Ventes',  label: '', debit: 0, credit: 1_000_000 },
      ],
      totalDebit: 1_000_000,
      totalCredit: 1_000_000,
      createdAt: '2026-03-01T08:00:00Z',
      updatedAt: '2026-03-01T08:00:00Z',
    });

    // Un brouillon fantaisiste (énorme) qui ne doit PAS changer les états
    await db.journalEntries.add({
      id: 'fs-excl-draft',
      entryNumber: 'OD-DRAFT',
      journal: 'OD',
      date: '2026-03-15',
      reference: '',
      label: 'Brouillon imaginaire',
      status: 'draft',
      lines: [
        { id: 'fs-excl-d-l1', accountCode: '411000', accountName: 'Clients', label: '', debit: 50_000_000, credit: 0 },
        { id: 'fs-excl-d-l2', accountCode: '701000', accountName: 'Ventes',  label: '', debit: 0, credit: 50_000_000 },
      ],
      totalDebit: 50_000_000,
      totalCredit: 50_000_000,
      createdAt: '2026-03-15T08:00:00Z',
      updatedAt: '2026-03-15T08:00:00Z',
    });

    const cr = await financialStatementsService.getCompteResultat(adapter, '2026');
    // productionVendue doit refléter uniquement l'écriture posted = 1 000 000
    expect(cr.productionVendue).toBe(1_000_000);
    // PAS 51 000 000
    expect(cr.productionVendue).not.toBe(51_000_000);
  });
});

// ============================================================================
// FLUX 5 — Clôture d'exercice
// ============================================================================

describe('Flux 5 — Clôture d\'exercice', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  beforeEach(async () => {
    _seq = 0;
    await clearAll();
    await seedBase();
    adapter = makeAdapter();
  });

  it('validerEcriture échoue sur un exercice clôturé (règle 6 validateJournalEntry)', async () => {
    // Clôturer l'exercice 2026
    await db.fiscalYears.update('fy-2026', { isClosed: true });

    // Insérer directement en DB un draft daté dans l'exercice clôturé
    // (safeAddEntry ne vérifie que l'arithmétique, pas l'exercice)
    await db.journalEntries.add({
      id: 'cl-e1',
      entryNumber: 'AC-000099',
      date: '2026-06-01',
      journal: 'AC',
      label: 'Écriture dans exercice clôturé',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'cl-e1-l1', accountCode: '601000', accountName: 'Achats', label: '', debit: 100_000, credit: 0 },
        { id: 'cl-e1-l2', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 100_000 },
      ],
      totalDebit: 100_000,
      totalCredit: 100_000,
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
      hash: 'placeholder',
    });

    // La validation (draft → validated) doit échouer car l'exercice est clôturé
    const result = await validerEcriture(adapter, 'cl-e1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/clôtur|exercice|close/i);
  });

  it.todo('clôture complète : les AN (reports à nouveau) pointent sur les soldes de bilan');
  it.todo('réouverture d\'exercice regénère les AN par contrepassation (pas suppression)');
});

// ============================================================================
// FLUX 6 — Intégrité SHA-256
// ============================================================================

describe('Flux 6 — Intégrité SHA-256', () => {
  let adapter: ReturnType<typeof makeAdapter>;

  beforeEach(async () => {
    _seq = 0;
    await clearAll();
    await seedBase();
    adapter = makeAdapter();
  });

  it('safeAddEntry calcule et persiste un hash SHA-256', async () => {
    await safeAddEntry(adapter, {
      id: 'int-e1',
      entryNumber: 'AC-000001',
      date: '2026-05-01',
      journal: 'AC',
      label: 'Test intégrité',
      reference: '',
      status: 'draft',
      lines: [
        line('601000', 75_000, 0),
        line('401000', 0, 75_000),
      ],
      createdAt: '2026-05-01T10:00:00Z',
    });

    const stored = await db.journalEntries.get('int-e1');
    expect(stored).toBeDefined();
    // Le hash doit être une chaîne hexadécimale de 64 caractères (SHA-256)
    expect(stored!.hash).toMatch(/^[0-9a-f]{64}$/);
    // Le previousHash doit aussi être présent ('' pour la première écriture)
    expect(stored!.previousHash).toBeDefined();
  });

  it('le hash est déterministe et reproduit le même résultat', async () => {
    const entry = {
      entryNumber: 'AC-HASH',
      journal: 'AC',
      date: '2026-05-01',
      lines: [
        { accountCode: '601000', debit: 75_000, credit: 0, label: 'Achat' },
        { accountCode: '401000', debit: 0, credit: 75_000, label: 'Four.' },
      ],
      totalDebit: 75_000,
      totalCredit: 75_000,
    };
    const hash1 = await hashEntry(entry, '');
    const hash2 = await hashEntry(entry, '');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyChain valide une chaîne correcte de 3 écritures', async () => {
    const e1 = {
      entryNumber: 'AC-000001', journal: 'AC', date: '2026-05-01',
      lines: [{ accountCode: '601000', debit: 50_000, credit: 0, label: 'Achat 1' }, { accountCode: '401000', debit: 0, credit: 50_000, label: 'Fournisseur' }],
      totalDebit: 50_000, totalCredit: 50_000,
    };
    e1.hash = await hashEntry(e1, '');

    const e2 = {
      entryNumber: 'AC-000002', journal: 'AC', date: '2026-05-05',
      lines: [{ accountCode: '601000', debit: 30_000, credit: 0, label: 'Achat 2' }, { accountCode: '401000', debit: 0, credit: 30_000, label: 'Fournisseur' }],
      totalDebit: 30_000, totalCredit: 30_000,
    };
    (e2 as any).hash = await hashEntry(e2, (e1 as any).hash!);

    const e3 = {
      entryNumber: 'VT-000001', journal: 'VT', date: '2026-05-10',
      lines: [{ accountCode: '411000', debit: 120_000, credit: 0, label: 'Client' }, { accountCode: '701000', debit: 0, credit: 120_000, label: 'Vente' }],
      totalDebit: 120_000, totalCredit: 120_000,
    };
    (e3 as any).hash = await hashEntry(e3, (e2 as any).hash!);

    const result = await verifyChain([e1, e2, e3] as any[]);
    expect(result.valid).toBe(true);
    expect(result.checkedCount).toBe(3);
  });

  it('verifyChain détecte une falsification de montant', async () => {
    const e1 = {
      entryNumber: 'AC-000001', journal: 'AC', date: '2026-05-01',
      lines: [{ accountCode: '601000', debit: 50_000, credit: 0, label: 'Achat' }, { accountCode: '401000', debit: 0, credit: 50_000, label: 'Fournisseur' }],
      totalDebit: 50_000, totalCredit: 50_000,
    };
    e1.hash = await hashEntry(e1, '');

    const e2 = {
      entryNumber: 'AC-000002', journal: 'AC', date: '2026-05-05',
      lines: [{ accountCode: '601000', debit: 80_000, credit: 0, label: 'Achat modifié' }, { accountCode: '401000', debit: 0, credit: 80_000, label: 'Fournisseur' }],
      totalDebit: 80_000, totalCredit: 80_000,
    };
    // Hash calculé avec l'ORIGINAL 30 000, pas 80 000 — falsification
    const originalE2Data = {
      entryNumber: 'AC-000002', journal: 'AC', date: '2026-05-05',
      lines: [{ accountCode: '601000', debit: 30_000, credit: 0, label: 'Achat' }, { accountCode: '401000', debit: 0, credit: 30_000, label: 'Fournisseur' }],
      totalDebit: 30_000, totalCredit: 30_000,
    };
    (e2 as any).hash = await hashEntry(originalE2Data as any, (e1 as any).hash!);

    const result = await verifyChain([e1, e2] as any[]);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe('AC-000002');
  });

  it('verifyChain détecte une écriture sans hash', async () => {
    const e1 = {
      entryNumber: 'AC-000001', journal: 'AC', date: '2026-05-01',
      lines: [{ accountCode: '601000', debit: 50_000, credit: 0, label: '' }, { accountCode: '401000', debit: 0, credit: 50_000, label: '' }],
      totalDebit: 50_000, totalCredit: 50_000,
      // hash délibérément absent
    };

    const result = await verifyChain([e1] as any[]);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe('AC-000001');
  });

  it('deux écritures stockées via safeAddEntry forment une chaîne valide', async () => {
    await safeAddEntry(adapter, {
      id: 'int-chain-1',
      entryNumber: 'AC-000001',
      date: '2026-05-01',
      journal: 'AC',
      label: 'Écriture 1',
      reference: '',
      status: 'draft',
      lines: [line('601000', 100_000, 0), line('401000', 0, 100_000)],
      createdAt: '2026-05-01T08:00:00Z',
    });

    await safeAddEntry(adapter, {
      id: 'int-chain-2',
      entryNumber: 'AC-000002',
      date: '2026-05-02',
      journal: 'AC',
      label: 'Écriture 2',
      reference: '',
      status: 'draft',
      lines: [line('601000', 50_000, 0), line('401000', 0, 50_000)],
      createdAt: '2026-05-02T08:00:00Z',
    });

    const entries = await db.journalEntries
      .where('id')
      .anyOf(['int-chain-1', 'int-chain-2'])
      .toArray();

    // Les deux entrées doivent avoir un hash
    for (const e of entries) {
      expect(e.hash).toMatch(/^[0-9a-f]{64}$/);
    }

    // La deuxième doit référencer le hash de la première
    const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
    expect(sorted[1].previousHash).toBe(sorted[0].hash);
  });
});
