import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import {
  autoLettrage,
  applyLettrage,
  applyManualLettrage,
  delettrage,
  getLettrageStats,
} from '../services/lettrageService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

function makeEntry(id: string, lines: Array<{
  id: string;
  accountCode: string;
  debit: number;
  credit: number;
  reference?: string;
  lettrageCode?: string;
}>) {
  return {
    id,
    entryNumber: `OD-${id}`,
    date: '2026-03-15',
    journal: 'OD',
    label: `Entry ${id}`,
    reference: lines[0]?.reference || '',
    status: 'posted' as const,
    lines: lines.map(l => ({
      id: l.id,
      accountCode: l.accountCode,
      accountName: l.accountCode,
      label: '',
      debit: l.debit,
      credit: l.credit,
      thirdPartyCode: undefined,
      lettrageCode: l.lettrageCode,
    })),
    totalDebit: lines.reduce((s, l) => s + l.debit, 0),
    totalCredit: lines.reduce((s, l) => s + l.credit, 0),
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    hash: `hash-${id}`,
  };
}

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.auditLogs.clear();
});

// ============================================================================
// autoLettrage
// ============================================================================

describe('autoLettrage', () => {
  it('rapproche des montants exacts sur le meme compte 401', async () => {
    // Facture fournisseur: débit 401
    // Règlement: crédit 401
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '401000', debit: 500_000, credit: 0 },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 500_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '401000', debit: 0, credit: 500_000 },
        { id: 'e2-l2', accountCode: '512000', debit: 500_000, credit: 0 },
      ]),
    ]);

    const result = await autoLettrage(adapter, { parMontant: true });

    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    const match = result.matches.find(m => m.compte === '401000');
    expect(match).toBeDefined();
    expect(match!.method).toBe('exact');
    expect(match!.totalDebit).toBe(500_000);
    expect(match!.totalCredit).toBe(500_000);
    expect(match!.ecart).toBe(0);
  });

  it('rapproche par reference croisee', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '411000', debit: 300_000, credit: 0, reference: 'FAC-2026-001' },
        { id: 'e1-l2', accountCode: '701000', debit: 0, credit: 300_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '411000', debit: 0, credit: 300_000, reference: 'FAC-2026-001' },
        { id: 'e2-l2', accountCode: '512000', debit: 300_000, credit: 0 },
      ]),
    ]);

    const result = await autoLettrage(adapter, { parMontant: true, parReference: true });

    expect(result.matches.length).toBeGreaterThanOrEqual(1);
  });

  it('ignore les lignes deja lettrees', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '401000', debit: 100_000, credit: 0, lettrageCode: 'AA' },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 100_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '401000', debit: 0, credit: 100_000, lettrageCode: 'AA' },
        { id: 'e2-l2', accountCode: '512000', debit: 100_000, credit: 0 },
      ]),
    ]);

    const result = await autoLettrage(adapter);

    // Already lettered lines should be excluded → no new matches on 401000
    const match401 = result.matches.find(m => m.compte === '401000');
    expect(match401).toBeUndefined();
  });

  it('ignore les comptes hors classes 40/41', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '512000', debit: 100_000, credit: 0 },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 100_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '512000', debit: 0, credit: 100_000 },
        { id: 'e2-l2', accountCode: '701000', debit: 100_000, credit: 0 },
      ]),
    ]);

    const result = await autoLettrage(adapter);

    // 512000 and 601000 are not eligible for lettrage
    expect(result.matches).toHaveLength(0);
  });

  it('retourne les statistiques correctes', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '401000', debit: 200_000, credit: 0 },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 200_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '401000', debit: 0, credit: 200_000 },
        { id: 'e2-l2', accountCode: '512000', debit: 200_000, credit: 0 },
      ]),
      makeEntry('e3', [
        { id: 'e3-l1', accountCode: '401000', debit: 150_000, credit: 0 },
        { id: 'e3-l2', accountCode: '601000', debit: 0, credit: 150_000 },
      ]),
    ]);

    const result = await autoLettrage(adapter);

    // e1-l1 (debit 200k) matches e2-l1 (credit 200k) → 2 matched
    // e3-l1 (debit 150k) has no matching credit → 1 unmatched
    expect(result.totalMatched).toBe(2);
    expect(result.totalUnmatched).toBe(1);
  });
});

// ============================================================================
// applyLettrage
// ============================================================================

describe('applyLettrage', () => {
  it('persiste les codes de lettrage sur les lignes', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '401000', debit: 100_000, credit: 0 },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 100_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '401000', debit: 0, credit: 100_000 },
        { id: 'e2-l2', accountCode: '512000', debit: 100_000, credit: 0 },
      ]),
    ]);

    const result = await autoLettrage(adapter);
    expect(result.matches.length).toBeGreaterThan(0);

    const applied = await applyLettrage(adapter, result.matches);
    expect(applied).toBeGreaterThan(0);

    // Check that lettrage codes were written
    const e1 = await db.journalEntries.get('e1');
    const e2 = await db.journalEntries.get('e2');
    const l1 = e1!.lines.find(l => l.id === 'e1-l1');
    const l2 = e2!.lines.find(l => l.id === 'e2-l1');
    expect(l1?.lettrageCode).toBeTruthy();
    expect(l2?.lettrageCode).toBeTruthy();
    expect(l1?.lettrageCode).toBe(l2?.lettrageCode);
  });
});

// ============================================================================
// applyManualLettrage
// ============================================================================

describe('applyManualLettrage', () => {
  it('assigne un code commun aux lignes selectionnees', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '411000', debit: 750_000, credit: 0 },
        { id: 'e1-l2', accountCode: '701000', debit: 0, credit: 750_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '411000', debit: 0, credit: 750_000 },
        { id: 'e2-l2', accountCode: '512000', debit: 750_000, credit: 0 },
      ]),
    ]);

    const code = await applyManualLettrage(adapter, [
      { entryId: 'e1', lineId: 'e1-l1' },
      { entryId: 'e2', lineId: 'e2-l1' },
    ]);

    expect(code).toBeTruthy();
    expect(code.length).toBe(2); // 2-letter code (AA, AB, etc.)

    const e1 = await db.journalEntries.get('e1');
    expect(e1!.lines[0].lettrageCode).toBe(code);
  });
});

// ============================================================================
// delettrage
// ============================================================================

describe('delettrage', () => {
  it('supprime le code de lettrage des lignes', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '401000', debit: 100_000, credit: 0, lettrageCode: 'AB' },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 100_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '401000', debit: 0, credit: 100_000, lettrageCode: 'AB' },
        { id: 'e2-l2', accountCode: '512000', debit: 100_000, credit: 0 },
      ]),
    ]);

    const count = await delettrage(adapter, 'AB');
    expect(count).toBe(2);

    const e1 = await db.journalEntries.get('e1');
    expect(e1!.lines[0].lettrageCode).toBeUndefined();
  });
});

// ============================================================================
// getLettrageStats
// ============================================================================

describe('getLettrageStats', () => {
  it('calcule les statistiques de lettrage', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '401000', debit: 100_000, credit: 0, lettrageCode: 'AA' },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 100_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '401000', debit: 0, credit: 100_000, lettrageCode: 'AA' },
        { id: 'e2-l2', accountCode: '512000', debit: 100_000, credit: 0 },
      ]),
      makeEntry('e3', [
        { id: 'e3-l1', accountCode: '411000', debit: 200_000, credit: 0 },
        { id: 'e3-l2', accountCode: '701000', debit: 0, credit: 200_000 },
      ]),
    ]);

    const stats = await getLettrageStats(adapter);

    expect(stats.totalLines).toBe(3); // 2 on 401 + 1 on 411
    expect(stats.letteredLines).toBe(2);
    expect(stats.unletteredLines).toBe(1);
    expect(stats.codes).toBe(1); // Only 'AA'
    expect(stats.tauxLettrage).toBeCloseTo(66.67, 0);
  });

  it('filtre par prefixe de compte', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { id: 'e1-l1', accountCode: '401000', debit: 100_000, credit: 0, lettrageCode: 'AA' },
        { id: 'e1-l2', accountCode: '601000', debit: 0, credit: 100_000 },
      ]),
      makeEntry('e2', [
        { id: 'e2-l1', accountCode: '411000', debit: 200_000, credit: 0 },
        { id: 'e2-l2', accountCode: '701000', debit: 0, credit: 200_000 },
      ]),
    ]);

    const stats40 = await getLettrageStats(adapter, '40');
    expect(stats40.totalLines).toBe(1);
    expect(stats40.letteredLines).toBe(1);

    const stats41 = await getLettrageStats(adapter, '41');
    expect(stats41.totalLines).toBe(1);
    expect(stats41.letteredLines).toBe(0);
  });
});
