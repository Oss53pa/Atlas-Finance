import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import {
  parseBankStatementCSV,
  rapprochementAutomatique,
  genererEtatRapprochement,
  BankTransaction,
} from '../services/rapprochementBancaireService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

function makeEntry(id: string, lines: Array<{ accountCode: string; debit: number; credit: number; label?: string }>, ref?: string) {
  return {
    id,
    entryNumber: `BQ-${id}`,
    date: '2026-03-15',
    journal: 'BQ',
    label: `Entry ${id}`,
    reference: ref || '',
    status: 'posted' as const,
    lines: lines.map((l, i) => ({
      id: `${id}-L${i}`,
      accountCode: l.accountCode,
      accountName: l.accountCode,
      label: l.label || '',
      debit: l.debit,
      credit: l.credit,
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
});

// ============================================================================
// PARSE CSV
// ============================================================================

describe('parseBankStatementCSV', () => {
  it('parse un CSV standard', () => {
    const csv = `Date;Libellé;Référence;Débit;Crédit;Solde
15/03/2026;Virement client;VIR-001;0;500000;500000
16/03/2026;Chèque fournisseur;CHQ-001;200000;0;300000`;

    const txs = parseBankStatementCSV(csv);
    expect(txs).toHaveLength(2);
    expect(txs[0].amount).toBe(500_000); // credit = entrée
    expect(txs[1].amount).toBe(-200_000); // debit = sortie
  });

  it('retourne tableau vide pour CSV invalide', () => {
    expect(parseBankStatementCSV('')).toEqual([]);
    expect(parseBankStatementCSV('header only')).toEqual([]);
  });
});

// ============================================================================
// P0-4 REGRESSION: soldeReleve uses Money correctly (immutable)
// ============================================================================

describe('P0-4: soldeReleve calculé correctement avec Money', () => {
  it('le solde relevé reflète la somme des transactions bancaires', async () => {
    // Écritures comptables
    await db.journalEntries.bulkAdd([
      // Encaissement client: 500 000 (débit banque)
      makeEntry('e1', [
        { accountCode: '512000', debit: 500_000, credit: 0 },
        { accountCode: '411000', debit: 0, credit: 500_000 },
      ]),
      // Paiement fournisseur: 200 000 (crédit banque)
      makeEntry('e2', [
        { accountCode: '401000', debit: 200_000, credit: 0 },
        { accountCode: '512000', debit: 0, credit: 200_000 },
      ]),
    ]);

    // Transactions bancaires
    const bankTxs: BankTransaction[] = [
      { id: 'bk-1', date: '2026-03-15', label: 'Virement client', amount: 500_000 },
      { id: 'bk-2', date: '2026-03-15', label: 'Chèque fournisseur', amount: -200_000 },
    ];

    const result = await rapprochementAutomatique(adapter, bankTxs);

    // P0-4: soldeReleve doit être 500000 - 200000 = 300000 (pas 0 comme avec le bug)
    expect(result.soldeReleve).toBe(300_000);
    expect(result.soldeComptable).toBe(300_000);
    expect(result.ecart).toBe(0);
  });
});

// ============================================================================
// MATCHING EXACT
// ============================================================================

describe('Matching exact montant + date', () => {
  it('rapproche une transaction bancaire avec une écriture comptable', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { accountCode: '512000', debit: 100_000, credit: 0 },
        { accountCode: '411000', debit: 0, credit: 100_000 },
      ]),
    ]);

    const bankTxs: BankTransaction[] = [
      { id: 'bk-1', date: '2026-03-15', label: 'Encaissement', amount: 100_000 },
    ];

    const result = await rapprochementAutomatique(adapter, bankTxs);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].method).toBe('exact');
    expect(result.matches[0].bankAmount).toBe(100_000);
    expect(result.tauxRapprochement).toBe(100);
  });
});

// ============================================================================
// MATCHING PAR REFERENCE
// ============================================================================

describe('Matching par référence', () => {
  it('rapproche par référence identique + montant', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { accountCode: '512000', debit: 75_000, credit: 0 },
        { accountCode: '411000', debit: 0, credit: 75_000 },
      ], 'FAC-2026-001'),
      // Une autre écriture avec un montant différent
      makeEntry('e2', [
        { accountCode: '512000', debit: 75_000, credit: 0 },
        { accountCode: '411000', debit: 0, credit: 75_000 },
      ], 'FAC-2026-002'),
    ]);

    const bankTxs: BankTransaction[] = [
      { id: 'bk-1', date: '2026-03-15', label: 'Virement', reference: 'FAC-2026-001', amount: 75_000 },
    ];

    const result = await rapprochementAutomatique(adapter, bankTxs);

    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.unmatchedBank).toHaveLength(0);
  });
});

// ============================================================================
// UNMATCHED DETECTION
// ============================================================================

describe('Détection des non-rapprochés', () => {
  it('identifie les transactions bancaires non rapprochées', async () => {
    // Pas d'écritures comptables
    const bankTxs: BankTransaction[] = [
      { id: 'bk-1', date: '2026-03-15', label: 'Frais bancaires', amount: -5_000 },
    ];

    const result = await rapprochementAutomatique(adapter, bankTxs);

    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedBank).toHaveLength(1);
    expect(result.tauxRapprochement).toBe(0);
  });

  it('identifie les écritures non rapprochées', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { accountCode: '512000', debit: 100_000, credit: 0 },
        { accountCode: '411000', debit: 0, credit: 100_000 },
      ]),
    ]);

    const result = await rapprochementAutomatique(adapter, []);

    expect(result.unmatchedCompta).toHaveLength(1);
  });
});

// ============================================================================
// ÉTAT DE RAPPROCHEMENT
// ============================================================================

describe('État de rapprochement SYSCOHADA', () => {
  it('génère un état de rapprochement équilibré', async () => {
    await db.journalEntries.bulkAdd([
      makeEntry('e1', [
        { accountCode: '512000', debit: 300_000, credit: 0 },
        { accountCode: '411000', debit: 0, credit: 300_000 },
      ]),
    ]);

    const bankTxs: BankTransaction[] = [
      { id: 'bk-1', date: '2026-03-15', label: 'Virement', amount: 300_000 },
    ];

    const result = await rapprochementAutomatique(adapter, bankTxs);
    const etat = await genererEtatRapprochement('512000', bankTxs, result);

    expect(etat.isRapproche).toBe(true);
    expect(Math.abs(etat.soldeBanqueCorrige - etat.soldeComptaCorrige)).toBeLessThan(0.01);
  });
});
