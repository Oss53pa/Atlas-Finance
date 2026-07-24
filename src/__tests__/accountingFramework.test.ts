/**
 * SYCEBNL + SMT — référentiel comptable, moteur de trésorerie, excédent/déficit.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import {
  FRAMEWORKS,
  resolveFramework,
  setFramework,
  isCashBasis,
  isNonProfit,
  formatResult,
  DEFAULT_FRAMEWORK,
} from '../services/framework/accountingFramework';
import { buildSMTStatement, smtToCSV, isTreasuryAccount } from '../services/framework/smtService';
import { computeSycebnlResult } from '../services/framework/sycebnlService';

let adapter: ReturnType<typeof createTestAdapter>;

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  await db.settings.clear();
  adapter = createTestAdapter();
});

async function addEntry(
  id: string, journal: string, date: string,
  lines: Array<{ accountCode: string; debit?: number; credit?: number }>,
) {
  await safeAddEntry(adapter, {
    id, entryNumber: id, journal, date, label: id, reference: id, status: 'validated',
    lines: lines.map((l, i) => ({
      id: `${id}-${i}`, accountCode: l.accountCode, accountName: l.accountCode,
      label: '', debit: l.debit ?? 0, credit: l.credit ?? 0,
    })),
    createdAt: `${date}T10:00:00Z`,
  } as any, { skipSyncValidation: true });
}

// ============================================================================
// Référentiel
// ============================================================================

describe('référentiel comptable', () => {
  it('déclare les 4 combinaisons SYSCOHADA/SYCEBNL × SN/SMT', () => {
    expect(Object.keys(FRAMEWORKS)).toHaveLength(4);
    expect(isCashBasis('SYSCOHADA_SMT')).toBe(true);
    expect(isCashBasis('SYSCOHADA_SN')).toBe(false);
    expect(isNonProfit('SYCEBNL_SN')).toBe(true);
    expect(isNonProfit('SYSCOHADA_SN')).toBe(false);
  });

  it('résout le défaut puis la valeur persistée', async () => {
    expect(await resolveFramework(adapter)).toBe(DEFAULT_FRAMEWORK);
    await setFramework(adapter, 'SYCEBNL_SMT');
    expect(await resolveFramework(adapter)).toBe('SYCEBNL_SMT');
  });

  it('formate le solde selon le vocabulaire du cadre', () => {
    expect(formatResult('SYSCOHADA_SN', 100).label).toBe('Bénéfice');
    expect(formatResult('SYSCOHADA_SN', -100).label).toBe('Perte');
    expect(formatResult('SYCEBNL_SN', 100).label).toBe('Excédent');
    expect(formatResult('SYCEBNL_SN', -100).label).toBe('Déficit');
    expect(formatResult('SYCEBNL_SN', -100).amount).toBe(100);
  });
});

// ============================================================================
// SMT — comptabilité de trésorerie
// ============================================================================

describe('SMT — état des recettes et des dépenses', () => {
  it('classe un compte de trésorerie (5x hors 58/59)', () => {
    expect(isTreasuryAccount('521000')).toBe(true);
    expect(isTreasuryAccount('571000')).toBe(true);
    expect(isTreasuryAccount('585000')).toBe(false); // virement interne
    expect(isTreasuryAccount('601000')).toBe(false);
  });

  it('produit recettes, dépenses et situation de trésorerie cohérente', async () => {
    // Ouverture : 1 000 000 en banque (à-nouveau).
    await addEntry('AN-1', 'AN', '2026-01-01', [
      { accountCode: '521000', debit: 1_000_000 },
      { accountCode: '110000', credit: 1_000_000 },
    ]);
    // Recette : encaissement d'une cotisation 300 000.
    await addEntry('REC-1', 'BQ', '2026-03-10', [
      { accountCode: '521000', debit: 300_000 },
      { accountCode: '706000', credit: 300_000 },
    ]);
    // Dépense : achat de fournitures 120 000.
    await addEntry('DEP-1', 'BQ', '2026-04-05', [
      { accountCode: '605000', debit: 120_000 },
      { accountCode: '521000', credit: 120_000 },
    ]);

    const smt = await buildSMTStatement(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });

    expect(smt.soldeOuverture).toBe(1_000_000);
    expect(smt.totalRecettes).toBe(300_000);
    expect(smt.totalDepenses).toBe(120_000);
    expect(smt.variationTresorerie).toBe(180_000);
    expect(smt.soldeCloture).toBe(1_180_000);
    expect(smt.coherent).toBe(true); // clôture = contrôle depuis tous les mouvements

    // Nature par contrepartie dominante.
    expect(smt.recettes[0].accountCode).toBe('706000');
    expect(smt.depenses[0].accountCode).toBe('605000');
  });

  it('exclut les virements internes 58 de la trésorerie', async () => {
    await addEntry('VIR-1', 'OD', '2026-05-01', [
      { accountCode: '571000', debit: 200_000 },   // caisse (trésorerie)
      { accountCode: '585000', credit: 200_000 },   // virement interne (exclu)
    ]);
    const smt = await buildSMTStatement(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    // Le mouvement net de trésorerie « réelle » = +200 000 sur 571 (l'autre
    // ligne 585 n'est pas comptée comme trésorerie) → recette de 200 000.
    expect(smt.totalRecettes).toBe(200_000);
  });

  it('exporte un CSV avec recettes, dépenses et soldes', async () => {
    await addEntry('REC-1', 'BQ', '2026-03-10', [
      { accountCode: '521000', debit: 300_000 },
      { accountCode: '706000', credit: 300_000 },
    ]);
    const smt = await buildSMTStatement(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    const csv = smtToCSV(smt);
    expect(csv).toContain('État des recettes et des dépenses');
    expect(csv).toContain('TOTAL RECETTES;300000');
  });
});

// ============================================================================
// SYCEBNL — excédent/déficit
// ============================================================================

describe('SYCEBNL — excédent/déficit', () => {
  it('excédent = produits − charges, SANS déduction d’IS', async () => {
    await addEntry('P-1', 'OD', '2026-06-01', [
      { accountCode: '411000', debit: 5_000_000 },
      { accountCode: '706000', credit: 5_000_000 },   // produits (dons/cotisations)
    ]);
    await addEntry('C-1', 'OD', '2026-06-02', [
      { accountCode: '605000', debit: 3_000_000 },     // charges
      { accountCode: '401000', credit: 3_000_000 },
    ]);
    // Une charge d'IS (classe 89) ne doit PAS être retranchée pour une ENBL.
    await addEntry('IS-1', 'OD', '2026-06-03', [
      { accountCode: '891000', debit: 500_000 },
      { accountCode: '441000', credit: 500_000 },
    ]);

    const r = await computeSycebnlResult(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(r.produits).toBe(5_000_000);
    expect(r.charges).toBe(3_000_000);
    expect(r.excedentDeficit).toBe(2_000_000); // 89 non déduit
    expect(r.label).toBe('Excédent');
  });

  it('déficit quand les charges excèdent les produits', async () => {
    await addEntry('P-1', 'OD', '2026-06-01', [
      { accountCode: '411000', debit: 1_000_000 },
      { accountCode: '706000', credit: 1_000_000 },
    ]);
    await addEntry('C-1', 'OD', '2026-06-02', [
      { accountCode: '605000', debit: 1_500_000 },
      { accountCode: '401000', credit: 1_500_000 },
    ]);
    const r = await computeSycebnlResult(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(r.excedentDeficit).toBe(-500_000);
    expect(r.label).toBe('Déficit');
  });
});
