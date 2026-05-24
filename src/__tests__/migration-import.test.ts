/**
 * Tests Fichier 1 — Migration Import (Mode 2 : bascule début exercice)
 *
 * Simule l'import d'une balance CSV SYSCOHADA et vérifie :
 *  - Création de l'écriture AN-MIGRATION dans le journal 'AN'
 *  - Lignes avec les bons accountCode
 *  - Équilibre totalDebit == totalCredit
 *  - Persistance dans adapter (getAll)
 *  - Les soldes sont bien inclus dans la balance de vérification
 *
 * NOTE: Il n'existe pas de service "import CSV" dédié dans le codebase.
 * On teste donc la création manuelle d'une écriture AN via safeAddEntry
 * (c'est ce que le wizard d'import fait en interne), puis on vérifie
 * le comportement attendu. La logique "CSV → entrées de balance" est
 * une transformation de données que le composant DataMigrationImport.tsx
 * délègue à safeAddEntry/safeBulkAddEntries.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { safeAddEntry, safeBulkAddEntries, EntryGuardError } from '../services/entryGuard';
import { verifyTrialBalance } from '../services/trialBalanceService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Représente une ligne de balance CSV SYSCOHADA importée.
 * Format : code_compte, solde_debit, solde_credit
 */
interface BalanceCsvRow {
  accountCode: string;
  accountName: string;
  soldeDebit: number;
  soldeCredit: number;
}

/**
 * Convertit une balance CSV en écriture AN-MIGRATION équilibrée.
 * Chaque ligne débitrice → ligne débit, chaque ligne créditrice → ligne crédit.
 * Pour équilibrer : si ΣD > ΣC on ajoute une ligne crédit sur 100000 (capital) et inversement.
 */
function buildMigrationEntry(rows: BalanceCsvRow[], date: string) {
  const lines = rows.map((row, i) => ({
    id: `mig-l${i}`,
    accountCode: row.accountCode,
    accountName: row.accountName,
    label: `Solde reprise ${row.accountCode}`,
    debit: row.soldeDebit,
    credit: row.soldeCredit,
  }));

  const totalD = rows.reduce((s, r) => s + r.soldeDebit, 0);
  const totalC = rows.reduce((s, r) => s + r.soldeCredit, 0);

  return {
    id: 'mig-entry-001',
    entryNumber: 'AN-MIGRATION-001',
    journal: 'AN',
    date,
    reference: 'MIGRATION-N',
    label: 'Reprise de balance — bascule début exercice',
    status: 'validated' as const,
    lines,
    totalDebit: totalD,
    totalCredit: totalC,
    createdAt: `${date}T00:00:00.000Z`,
  };
}

// Balance de test : 9 comptes SYSCOHADA représentatifs
const BALANCE_CSV: BalanceCsvRow[] = [
  { accountCode: '101000', accountName: 'Capital social',           soldeDebit:         0, soldeCredit: 5_000_000 },
  { accountCode: '111000', accountName: 'Réserves légales',         soldeDebit:         0, soldeCredit:   500_000 },
  { accountCode: '121000', accountName: 'Report à nouveau',         soldeDebit:         0, soldeCredit:   200_000 },
  { accountCode: '211000', accountName: 'Frais de développement',   soldeDebit:   800_000, soldeCredit:         0 },
  { accountCode: '401000', accountName: 'Fournisseurs',             soldeDebit:         0, soldeCredit: 1_500_000 },
  { accountCode: '411000', accountName: 'Clients',                  soldeDebit: 2_000_000, soldeCredit:         0 },
  { accountCode: '512000', accountName: 'Banque',                   soldeDebit: 4_400_000, soldeCredit:         0 },
  { accountCode: '601000', accountName: 'Achats matières',          soldeDebit:         0, soldeCredit:         0 },
  { accountCode: '701000', accountName: 'Ventes',                   soldeDebit:         0, soldeCredit:         0 },
];

// Comptes courants : ΣD = 7 200 000 / ΣC = 7 200 000 → équilibre

async function seedFiscalYear() {
  await db.fiscalYears.bulkPut([
    {
      id: 'FY2026',
      code: '2026',
      name: 'Exercice 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      isClosed: false,
      isActive: true,
    },
  ]);
}

async function seedAccounts() {
  await db.accounts.bulkPut(
    BALANCE_CSV.map((r, i) => ({
      id: `acc-${i}`,
      code: r.accountCode,
      name: r.accountName,
      accountClass: r.accountCode.charAt(0),
      accountType: 'other',
      level: 3,
      normalBalance: r.soldeDebit > 0 ? 'debit' : ('credit' as 'debit' | 'credit'),
      isReconcilable: false,
      isActive: true,
    }))
  );
}

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.fiscalYears.clear();
  await db.accounts.clear();
  await seedFiscalYear();
  await seedAccounts();
});

// ============================================================================
// TESTS
// ============================================================================

describe('Migration Import — écriture AN', () => {
  it('crée une écriture avec journal AN et entryNumber AN-MIGRATION', async () => {
    const entry = buildMigrationEntry(BALANCE_CSV, '2026-01-01');
    await safeAddEntry(adapter, entry, { skipSyncValidation: true });

    const stored = await db.journalEntries.get('mig-entry-001');
    expect(stored).toBeDefined();
    expect(stored!.journal).toBe('AN');
    expect(stored!.entryNumber).toBe('AN-MIGRATION-001');
  });

  it('totalDebit == totalCredit (balance équilibrée)', async () => {
    // Seuls les comptes à solde non-nul sont dans la balance réelle
    // ΣD = 211000(800k) + 411000(2M) + 512000(4.4M) = 7 200 000
    // ΣC = 101000(5M) + 111000(500k) + 121000(200k) + 401000(1.5M) = 7 200 000
    const activeRows = BALANCE_CSV.filter(r => r.soldeDebit > 0 || r.soldeCredit > 0);
    const entry = buildMigrationEntry(activeRows, '2026-01-01');

    expect(entry.totalDebit).toBe(entry.totalCredit);

    await safeAddEntry(adapter, entry, { skipSyncValidation: true });

    const stored = await db.journalEntries.get('mig-entry-001');
    expect(stored!.totalDebit).toBe(7_200_000);
    expect(stored!.totalCredit).toBe(7_200_000);
  });

  it('les lignes ont les bons accountCode', async () => {
    const activeRows = BALANCE_CSV.filter(r => r.soldeDebit > 0 || r.soldeCredit > 0);
    const entry = buildMigrationEntry(activeRows, '2026-01-01');
    await safeAddEntry(adapter, entry, { skipSyncValidation: true });

    const stored = await db.journalEntries.get('mig-entry-001');
    const codes = stored!.lines.map(l => l.accountCode);

    expect(codes).toContain('101000');
    expect(codes).toContain('411000');
    expect(codes).toContain('512000');
    expect(codes).toContain('401000');
    expect(codes).toContain('211000');
    expect(codes).toContain('121000');
  });

  it('adapter.getAll retourne l\'écriture de migration', async () => {
    const activeRows = BALANCE_CSV.filter(r => r.soldeDebit > 0 || r.soldeCredit > 0);
    const entry = buildMigrationEntry(activeRows, '2026-01-01');
    await safeAddEntry(adapter, entry, { skipSyncValidation: true });

    const all = await adapter.getAll('journalEntries');
    expect(all).toHaveLength(1);
    expect((all[0] as any).journal).toBe('AN');
  });

  it('hash est généré sur l\'écriture AN-MIGRATION', async () => {
    const activeRows = BALANCE_CSV.filter(r => r.soldeDebit > 0 || r.soldeCredit > 0);
    const entry = buildMigrationEntry(activeRows, '2026-01-01');
    await safeAddEntry(adapter, entry, { skipSyncValidation: true });

    const stored = await db.journalEntries.get('mig-entry-001');
    expect(stored!.hash).toBeTruthy();
    expect(stored!.hash!.length).toBeGreaterThan(10);
  });

  it('la balance de vérification inclut les soldes importés', async () => {
    const activeRows = BALANCE_CSV.filter(r => r.soldeDebit > 0 || r.soldeCredit > 0);
    const entry = buildMigrationEntry(activeRows, '2026-01-01');
    await safeAddEntry(adapter, entry, { skipSyncValidation: true });

    const result = await verifyTrialBalance(adapter, '2026');
    expect(result.totalDebits).toBe(7_200_000);
    expect(result.totalCredits).toBe(7_200_000);
    expect(result.isBalanced).toBe(true);
  });

  it('une balance déséquilibrée est détectée par verifyTrialBalance', async () => {
    // Insérer directement une écriture déséquilibrée (via db, non validée par guard)
    await db.journalEntries.add({
      id: 'bad-001',
      entryNumber: 'AN-BAD-001',
      journal: 'AN',
      date: '2026-01-01',
      reference: 'MIGRATION-BAD',
      label: 'Balance déséquilibrée',
      status: 'validated',
      lines: [
        { id: 'bl1', accountCode: '512000', accountName: 'Banque', label: '', debit: 1_000_000, credit: 0 },
        { id: 'bl2', accountCode: '101000', accountName: 'Capital', label: '', debit: 0, credit: 900_000 },
      ],
      totalDebit: 1_000_000,
      totalCredit: 900_000,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await verifyTrialBalance(adapter, '2026');
    expect(result.isBalanced).toBe(false);
    expect(result.ecartGlobal).toBe(100_000);
  });

  it('safeBulkAddEntries insère plusieurs écritures AN en séquence', async () => {
    const entry1 = {
      id: 'mig-01',
      entryNumber: 'AN-MIGRATION-001',
      journal: 'AN',
      date: '2026-01-01',
      reference: 'MIG-1',
      label: 'Comptes bilan partie 1',
      status: 'validated' as const,
      lines: [
        { id: 'l1', accountCode: '512000', accountName: 'Banque', label: '', debit: 2_000_000, credit: 0 },
        { id: 'l2', accountCode: '101000', accountName: 'Capital', label: '', debit: 0, credit: 2_000_000 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const entry2 = {
      id: 'mig-02',
      entryNumber: 'AN-MIGRATION-002',
      journal: 'AN',
      date: '2026-01-01',
      reference: 'MIG-2',
      label: 'Comptes bilan partie 2',
      status: 'validated' as const,
      lines: [
        { id: 'l3', accountCode: '411000', accountName: 'Clients', label: '', debit: 500_000, credit: 0 },
        { id: 'l4', accountCode: '401000', accountName: 'Fournisseurs', label: '', debit: 0, credit: 500_000 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const ids = await safeBulkAddEntries(adapter, [entry1, entry2], { skipSyncValidation: true });
    expect(ids).toEqual(['mig-01', 'mig-02']);

    const count = await db.journalEntries.count();
    expect(count).toBe(2);
  });
});
