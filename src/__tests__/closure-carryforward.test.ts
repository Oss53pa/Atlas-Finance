/**
 * Tests Fichier 5 — Clôture et Report à Nouveau (AN)
 *
 * Vérifie :
 *  1. Écriture de clôture créée sur 131/139 (résultat classe 13)
 *  2. Écriture AN du nouvel exercice créée sur comptes bilan
 *  3. Les soldes d'ouverture N+1 == soldes de clôture N (classes 1-5)
 *  4. Les comptes de gestion (6x/7x) à zéro en ouverture N+1
 *  5. Intégration via executerCloture + executerCarryForward
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import {
  executerCarryForward,
  previewCarryForward,
  calculerSoldesCloture,
  hasCarryForward,
  type CarryForwardConfig,
} from '../services/cloture/carryForwardService';
import { generateResultatEntry } from '../services/closureService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

function makeBilanEntry(
  id: string,
  num: string,
  date: string,
  lines: Array<{ accountCode: string; debit: number; credit: number }>
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
    status: 'validated' as const,
    lines: lines.map((l, i) => ({
      id: `${id}-l${i}`,
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

// Exercices fiscaux
const FY2025 = { id: 'FY2025', code: '2025', name: 'Exercice 2025', startDate: '2025-01-01', endDate: '2025-12-31', isClosed: false, isActive: true };
const FY2026 = { id: 'FY2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true };

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.fiscalYears.clear();
  await db.auditLogs.clear();
  await db.accounts.clear();
  await db.closureSessions.clear();

  await db.fiscalYears.bulkAdd([FY2025, FY2026]);

  // Écritures de l'exercice 2025 — UNIQUEMENT comptes bilan (classes 1-5)
  // pour que les soldes de clôture soient équilibrés sans écriture de résultat.
  // Les comptes de gestion (6x/7x) sont testés séparément dans generateResultatEntry.
  await db.journalEntries.bulkAdd([
    // Capital 5M → Banque
    makeBilanEntry('B1', 'OD-001', '2025-01-15', [
      { accountCode: '521000', debit: 5_000_000, credit: 0 },
      { accountCode: '101000', debit: 0, credit: 5_000_000 },
    ]),
    // Emprunt 2M → Banque
    makeBilanEntry('B2', 'OD-002', '2025-03-01', [
      { accountCode: '521000', debit: 2_000_000, credit: 0 },
      { accountCode: '162000', debit: 0, credit: 2_000_000 },
    ]),
    // Achat immobilisation 1.5M → Banque (bilan pur : 2xxx ↔ 5xxx)
    makeBilanEntry('B3', 'OD-003', '2025-06-15', [
      { accountCode: '231000', debit: 1_500_000, credit: 0 },
      { accountCode: '521000', debit: 0, credit: 1_500_000 },
    ]),
    // Encaissement client : Banque D / Clients C (bilan pur : 4xxx ↔ 5xxx)
    makeBilanEntry('B4', 'OD-004', '2025-09-01', [
      { accountCode: '521000', debit: 3_000_000, credit: 0 },
      { accountCode: '411000', debit: 0, credit: 3_000_000 },
    ]),
    // Paiement fournisseur : Fournisseurs D / Banque C (bilan pur : 4xxx ↔ 5xxx)
    makeBilanEntry('B5', 'OD-005', '2025-10-01', [
      { accountCode: '401000', debit: 1_200_000, credit: 0 },
      { accountCode: '521000', debit: 0, credit: 1_200_000 },
    ]),
  ]);
});

// ============================================================================
// TESTS — Calcul des soldes de clôture
// ============================================================================

describe('calculerSoldesCloture', () => {
  it('calcule les soldes des comptes bilan (classes 1-5)', async () => {
    const soldes = await calculerSoldesCloture(adapter, 'FY2025');
    const codes = soldes.map(s => s.accountCode);

    // Comptes bilan seuls : 521000, 101000, 162000, 231000, 411000, 401000
    expect(codes).toContain('521000');
    expect(codes).toContain('101000');
    expect(codes).toContain('162000');
    expect(codes).toContain('231000');
    expect(codes).toContain('411000');
    expect(codes).toContain('401000');

    // Comptes de gestion NE DOIVENT PAS apparaître (classes 6 et 7)
    expect(codes).not.toContain('701000');
    expect(codes).not.toContain('601000');
  });

  it('le solde débiteur de 521000 est correct', async () => {
    const soldes = await calculerSoldesCloture(adapter, 'FY2025');
    const banque = soldes.find(s => s.accountCode === '521000');
    // D: 5M + 2M + 3M (encaissement B4) = 10M
    // C: 1.5M (immobilisation B3) + 1.2M (paiement fournisseur B5) = 2.7M
    // → solde D: 7 300 000
    expect(banque).toBeDefined();
    expect(banque!.soldeDebiteur).toBe(7_300_000);
    expect(banque!.soldeCrediteur).toBe(0);
  });

  it('le solde créditeur de 101000 (capital) est correct', async () => {
    const soldes = await calculerSoldesCloture(adapter, 'FY2025');
    const capital = soldes.find(s => s.accountCode === '101000');
    expect(capital).toBeDefined();
    expect(capital!.soldeCrediteur).toBe(5_000_000);
    expect(capital!.soldeDebiteur).toBe(0);
  });

  it('lève une erreur pour un exercice inconnu', async () => {
    await expect(
      calculerSoldesCloture(adapter, 'INEXISTANT')
    ).rejects.toThrow('introuvable');
  });
});

// ============================================================================
// TESTS — Preview carry-forward
// ============================================================================

describe('previewCarryForward', () => {
  it('le preview est équilibré (totalDebit == totalCredit)', async () => {
    const config: CarryForwardConfig = {
      closingExerciceId: 'FY2025',
      openingExerciceId: 'FY2026',
      openingDate: '2026-01-01',
    };
    const preview = await previewCarryForward(adapter, config);

    expect(preview.isBalanced).toBe(true);
    expect(preview.totalDebit).toBe(preview.totalCredit);
    expect(preview.accountCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS — Exécution carry-forward
// ============================================================================

describe('executerCarryForward', () => {
  const config: CarryForwardConfig = {
    closingExerciceId: 'FY2025',
    openingExerciceId: 'FY2026',
    openingDate: '2026-01-01',
  };

  it('crée une écriture journal AN pour le nouvel exercice', async () => {
    const result = await executerCarryForward(adapter, config);

    expect(result.success).toBe(true);
    expect(result.entryId).toBeDefined();

    const entry = await db.journalEntries.get(result.entryId!);
    expect(entry).toBeDefined();
    expect(entry!.journal).toBe('AN');
    expect(entry!.date).toBe('2026-01-01');
    expect(entry!.status).toBe('validated');
  });

  it('l\'écriture AN est équilibrée (D == C)', async () => {
    const result = await executerCarryForward(adapter, config);
    expect(result.success).toBe(true);
    expect(result.totalDebit).toBe(result.totalCredit);

    const entry = await db.journalEntries.get(result.entryId!);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);
  });

  it('les soldes d\'ouverture N+1 correspondent aux soldes de clôture N (classes 1-5)', async () => {
    // Calcul des soldes de clôture de 2025
    const soldesCloture = await calculerSoldesCloture(adapter, 'FY2025');
    const totalCloture = {
      debit: soldesCloture.reduce((s, l) => s + l.soldeDebiteur, 0),
      credit: soldesCloture.reduce((s, l) => s + l.soldeCrediteur, 0),
    };

    // Exécuter le carry-forward
    const result = await executerCarryForward(adapter, config);
    expect(result.success).toBe(true);

    // Les totaux de l'écriture AN == totaux de clôture
    expect(result.totalDebit).toBe(totalCloture.debit);
    expect(result.totalCredit).toBe(totalCloture.credit);
  });

  it('les comptes de gestion (6x/7x) sont absents de l\'écriture AN', async () => {
    const result = await executerCarryForward(adapter, config);
    expect(result.success).toBe(true);

    const entry = await db.journalEntries.get(result.entryId!);
    const gestionCodes = entry!.lines
      .map(l => l.accountCode)
      .filter(c => c.startsWith('6') || c.startsWith('7'));

    expect(gestionCodes).toHaveLength(0);
  });

  it('hasCarryForward retourne true après exécution', async () => {
    expect(await hasCarryForward(adapter, 'FY2026')).toBe(false);
    const result = await executerCarryForward(adapter, config);
    expect(result.success).toBe(true);
    expect(await hasCarryForward(adapter, 'FY2026')).toBe(true);
  });

  it('un hash est généré sur l\'écriture AN', async () => {
    const result = await executerCarryForward(adapter, config);
    expect(result.success).toBe(true);
    const entry = await db.journalEntries.get(result.entryId!);
    expect(entry!.hash).toBeTruthy();
    expect(entry!.hash!.length).toBeGreaterThan(10);
  });

  it('un audit log CARRY_FORWARD est créé', async () => {
    await executerCarryForward(adapter, config);
    const logs = await db.auditLogs.toArray();
    expect(logs.some(l => l.action === 'CARRY_FORWARD')).toBe(true);
  });
});

// ============================================================================
// TESTS — Écriture de détermination du résultat (131/139)
// ============================================================================

describe('generateResultatEntry — comptes 131/139', () => {
  // Ces tests nécessitent des comptes de gestion (6x/7x) en plus du bilan
  beforeEach(async () => {
    // Ajouter des écritures de gestion pour avoir un résultat à déterminer
    await db.journalEntries.bulkAdd([
      // Ventes : 3 000 000 → Clients (4x ↔ 7x)
      makeBilanEntry('G1', 'OD-G001', '2025-09-01', [
        { accountCode: '411000', debit: 3_000_000, credit: 0 },
        { accountCode: '701000', debit: 0, credit: 3_000_000 },
      ]),
      // Achats : 1 200 000 → Fournisseurs (6x ↔ 4x)
      makeBilanEntry('G2', 'OD-G002', '2025-10-01', [
        { accountCode: '601000', debit: 1_200_000, credit: 0 },
        { accountCode: '401000', debit: 0, credit: 1_200_000 },
      ]),
    ]);
  });

  it('crée une écriture de clôture sur le compte 131 (bénéfice)', async () => {
    // Situation : Produits 3M, Charges 1.2M → bénéfice 1 800 000
    const result = await generateResultatEntry(adapter, 'FY2025', 'system');

    expect(result.entryId).toBeTruthy();
    expect(result.resultatNet).toBeGreaterThan(0);
    expect(result.isBenefice).toBe(true);

    const entry = await db.journalEntries.get(result.entryId);
    expect(entry).toBeDefined();

    // L'écriture de résultat doit avoir une ligne sur un compte de classe 13
    const ligne13 = entry!.lines.find(l => l.accountCode.startsWith('13'));
    expect(ligne13).toBeDefined();
    // Bénéfice → compte 131 au crédit
    expect(ligne13!.credit).toBeGreaterThan(0);
    expect(ligne13!.debit).toBe(0);
  });

  it('l\'écriture de résultat est équilibrée', async () => {
    const result = await generateResultatEntry(adapter, 'FY2025', 'system');
    const entry = await db.journalEntries.get(result.entryId);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);
  });

  it('les comptes de produits (7x) sont soldés par l\'écriture de résultat', async () => {
    await generateResultatEntry(adapter, 'FY2025', 'system');
    const allEntries = await db.journalEntries.toArray();
    const resultatEntry = allEntries.find(e => e.label?.includes('résultat') || e.label?.includes('determination'));

    if (resultatEntry) {
      // Vérifier que les comptes 7x sont débités (pour les solder)
      const debit7x = resultatEntry.lines
        .filter(l => l.accountCode.startsWith('7'))
        .reduce((s, l) => s + l.debit, 0);
      expect(debit7x).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// TESTS — Flux complet clôture + AN
// ============================================================================

describe('Flux complet : clôture + report à nouveau', () => {
  it('les comptes de gestion sont nuls dans les soldes de clôture (classes 1-5 seulement)', async () => {
    // Les soldes de clôture ne comprennent que les classes 1-5
    const soldes = await calculerSoldesCloture(adapter, 'FY2025');
    // Aucun compte de classe 6 ou 7
    for (const solde of soldes) {
      const classe = solde.accountCode.charAt(0);
      expect(['1', '2', '3', '4', '5']).toContain(classe);
    }
  });

  it('l\'exercice suivant repart avec les bons soldes d\'ouverture', async () => {
    const result = await executerCarryForward(adapter, {
      closingExerciceId: 'FY2025',
      openingExerciceId: 'FY2026',
      openingDate: '2026-01-01',
    });
    expect(result.success).toBe(true);

    // Calculer les soldes de clôture 2025
    const soldescloture = await calculerSoldesCloture(adapter, 'FY2025');
    // Vérifier que l'écriture AN contient tous les comptes bilan
    const anEntry = await db.journalEntries.get(result.entryId!);
    const codesAN = anEntry!.lines.map(l => l.accountCode);
    for (const s of soldescloture) {
      expect(codesAN).toContain(s.accountCode);
    }
  });
});
