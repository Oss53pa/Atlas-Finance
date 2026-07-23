/**
 * Vague B — tests de la détermination du résultat fiscal et de l'export FEC.
 *
 * Réf. docs/fiscal-dsf-multipays/DESIGN.md § 4 « Tests exigés »
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  resolveFiscalParameters,
  getFiscalCountries,
  getFiscalYears,
} from '../services/fiscal/fiscalParameters';
import { determineResultatFiscal } from '../services/fiscal/resultatFiscalService';
import { exportFEC } from '../services/fiscal/fecExportService';

const adapter = createTestAdapter();

/**
 * Petit exercice de test :
 *   - CA (701) : 100 000 000 crédit
 *   - Achats (601) : 60 000 000 débit
 *   → résultat comptable avant impôt = 40 000 000
 *   - Charge d'IS (891) : 5 000 000 débit (non déductible → réintégrée)
 *   - Amende (6714) : 2 000 000 débit (non déductible → réintégrée)
 */
async function seedExercice() {
  await db.journalEntries.clear();

  await db.journalEntries.add({
    id: 'e-ca',
    entryNumber: 'VE-2026-000001',
    journal: 'VE',
    date: '2026-03-15',
    reference: 'FA-001',
    label: 'Vente de prestations',
    status: 'validated',
    lines: [
      { id: 'l1', accountCode: '411000', accountName: 'Clients', label: 'Client', debit: 100_000_000, credit: 0 },
      { id: 'l2', accountCode: '701000', accountName: 'Ventes', label: 'CA', debit: 0, credit: 100_000_000 },
    ],
    totalDebit: 100_000_000, totalCredit: 100_000_000,
    createdAt: '2026-03-15T10:00:00.000Z', updatedAt: '2026-03-15T10:00:00.000Z',
  } as any);

  await db.journalEntries.add({
    id: 'e-achat',
    entryNumber: 'AC-2026-000001',
    journal: 'AC',
    date: '2026-04-10',
    reference: 'FF-001',
    label: 'Achat de marchandises',
    status: 'validated',
    lines: [
      { id: 'l3', accountCode: '601000', accountName: 'Achats', label: 'Achat', debit: 60_000_000, credit: 0 },
      { id: 'l4', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fourn.', debit: 0, credit: 60_000_000 },
    ],
    totalDebit: 60_000_000, totalCredit: 60_000_000,
    createdAt: '2026-04-10T10:00:00.000Z', updatedAt: '2026-04-10T10:00:00.000Z',
  } as any);

  await db.journalEntries.add({
    id: 'e-is',
    entryNumber: 'OD-2026-000001',
    journal: 'OD',
    date: '2026-12-31',
    reference: 'IS-2026',
    label: 'Charge d’impôt',
    status: 'validated',
    lines: [
      { id: 'l5', accountCode: '891000', accountName: 'IS', label: 'IS', debit: 5_000_000, credit: 0 },
      { id: 'l6', accountCode: '441000', accountName: 'État, IS', label: 'Dette IS', debit: 0, credit: 5_000_000 },
    ],
    totalDebit: 5_000_000, totalCredit: 5_000_000,
    createdAt: '2026-12-31T10:00:00.000Z', updatedAt: '2026-12-31T10:00:00.000Z',
  } as any);

  await db.journalEntries.add({
    id: 'e-amende',
    entryNumber: 'OD-2026-000002',
    journal: 'OD',
    date: '2026-06-30',
    reference: 'AM-001',
    label: 'Amende fiscale',
    status: 'validated',
    lines: [
      { id: 'l7', accountCode: '671400', accountName: 'Amendes', label: 'Amende', debit: 2_000_000, credit: 0 },
      { id: 'l8', accountCode: '521000', accountName: 'Banque', label: 'Paiement', debit: 0, credit: 2_000_000 },
    ],
    totalDebit: 2_000_000, totalCredit: 2_000_000,
    createdAt: '2026-06-30T10:00:00.000Z', updatedAt: '2026-06-30T10:00:00.000Z',
  } as any);
}

beforeEach(async () => {
  await seedExercice();
});

// ============================================================================
// B0 — Paramètres versionnés
// ============================================================================

describe('B0 — paramètres fiscaux versionnés', () => {
  it('résout le jeu exact (pays, année)', () => {
    const r = resolveFiscalParameters('CI', 2026);
    expect(r.fallback).toBe(false);
    expect(r.parameters.is.rateStandard).toBe(25);
    expect(r.parameters.legalReference).toContain('2026');
  });

  it('replie sur la loi antérieure la plus récente', () => {
    const r = resolveFiscalParameters('CI', 2030);
    expect(r.fallback).toBe(true);
    expect(r.parameters.fiscalYear).toBe(2026);
    expect(r.warning).toBeTruthy();
  });

  it('replie sur CI avec avertissement fort pour un pays inconnu', () => {
    const r = resolveFiscalParameters('ZZ', 2026);
    expect(r.fallback).toBe(true);
    expect(r.parameters.countryCode).toBe('CI');
    expect(r.warning).toMatch(/pays/i);
  });

  it('expose plusieurs pays et leurs exercices', () => {
    expect(getFiscalCountries()).toEqual(expect.arrayContaining(['CI', 'SN', 'BJ', 'CM']));
    expect(getFiscalYears('CI')).toEqual([2026, 2025, 2024]);
  });

  it('porte des taux d’IS distincts par pays', () => {
    expect(resolveFiscalParameters('SN', 2026).parameters.is.rateStandard).toBe(30);
    expect(resolveFiscalParameters('CM', 2026).parameters.is.rateStandard).toBe(33);
  });
});

// ============================================================================
// B1 — Détermination du résultat fiscal
// ============================================================================

describe('B1 — détermination du résultat fiscal', () => {
  it('part du résultat NET comptable calculé depuis le GL (après IS)', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2026,
      startDate: '2026-01-01', endDate: '2026-12-31',
    });
    // 100M produits − 62M charges (601+671) − 5M IS (classe 89) = 33M net
    expect(r.resultatNetComptable).toBe(33_000_000);
    expect(r.chiffreAffaires).toBe(100_000_000);
  });

  it('réintègre la charge d’IS (classe 89) — sinon la base est minorée', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2026,
      startDate: '2026-01-01', endDate: '2026-12-31',
    });
    const isLine = r.reintegrations.find(l => l.code === 'REINT_IMPOT_SOCIETE');
    expect(isLine).toBeTruthy();
    expect(isLine!.amount).toBe(5_000_000);
    expect(isLine!.origin).toBe('account');
  });

  it('réintègre les amendes et pénalités', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2026,
      startDate: '2026-01-01', endDate: '2026-12-31',
    });
    const amende = r.reintegrations.find(l => l.code === 'REINT_AMENDES_PENALITES');
    expect(amende!.amount).toBe(2_000_000);
  });

  it('calcule un résultat fiscal cohérent : comptable + réintégrations', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2026,
      startDate: '2026-01-01', endDate: '2026-12-31',
    });
    // 33M + 5M (IS) + 2M (amende) − 0 déduction = 40M
    expect(r.totalReintegrations).toBe(7_000_000);
    expect(r.resultatFiscal).toBe(40_000_000);
    // IS théorique = 40M × 25 % = 10M
    expect(r.impotTheorique).toBe(10_000_000);
  });

  it('applique le maximum entre IS théorique et IMF', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2026,
      startDate: '2026-01-01', endDate: '2026-12-31',
    });
    // IMF = 0,5 % × 100M = 500k, plancher 3M → IMF = 3M. IS théorique 10M > IMF.
    expect(r.impotMinimumForfaitaire).toBe(3_000_000);
    expect(r.impotDu).toBe(10_000_000);
  });

  it('prend un ajustement manuel motivé en compte', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2026,
      startDate: '2026-01-01', endDate: '2026-12-31',
      manualAdjustments: { REINT_DONS_LIBERALITES: 1_000_000 },
    });
    const don = r.reintegrations.find(l => l.code === 'REINT_DONS_LIBERALITES');
    expect(don!.amount).toBe(1_000_000);
    expect(don!.origin).toBe('manual');
    expect(r.resultatFiscal).toBe(41_000_000);
  });

  it('impute les déficits antérieurs sans rendre le résultat négatif', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2026,
      startDate: '2026-01-01', endDate: '2026-12-31',
      deficitsAnterieurs: 100_000_000, // supérieur au résultat
    });
    expect(r.deficitsImputes).toBe(40_000_000);
    expect(r.resultatFiscal).toBe(0);
    expect(r.impotTheorique).toBe(0);
    // Plus d'IS théorique → l'IMF (3M) devient l'impôt dû.
    expect(r.impotDu).toBe(3_000_000);
  });

  it('signale un repli de paramètres', async () => {
    const r = await determineResultatFiscal(adapter, {
      countryCode: 'CI', fiscalYear: 2030,
      startDate: '2026-01-01', endDate: '2026-12-31',
    });
    expect(r.parametersFallback).toBe(true);
    expect(r.parametersWarning).toBeTruthy();
  });
});

// ============================================================================
// B3 — Export FEC
// ============================================================================

describe('B3 — export FEC', () => {
  it('produit un FEC conforme avec en-tête 18 colonnes', async () => {
    const r = await exportFEC(adapter, {
      startDate: '2026-01-01', endDate: '2026-12-31', fiscalYear: 2026, taxId: 'CI-123',
    });
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
    const header = r.content.split('\r\n')[0].split('|');
    expect(header).toHaveLength(18);
    expect(header[0]).toBe('JournalCode');
    expect(header[11]).toBe('Debit');
  });

  it('exporte une ligne FEC par ligne d’écriture, débit = crédit', async () => {
    const r = await exportFEC(adapter, {
      startDate: '2026-01-01', endDate: '2026-12-31', fiscalYear: 2026,
    });
    // 4 écritures × 2 lignes = 8 lignes de données + 1 en-tête
    expect(r.content.split('\r\n')).toHaveLength(9);
    expect(r.stats.lines).toBe(8);
    expect(r.stats.totalDebit).toBe(r.stats.totalCredit);
  });

  it('exclut les brouillons', async () => {
    await db.journalEntries.add({
      id: 'e-draft', entryNumber: 'OD-DRAFT', journal: 'OD', date: '2026-05-01',
      reference: 'DR', label: 'Brouillon', status: 'draft',
      lines: [
        { id: 'd1', accountCode: '601000', accountName: 'A', label: 'x', debit: 999, credit: 0 },
        { id: 'd2', accountCode: '401000', accountName: 'B', label: 'y', debit: 0, credit: 999 },
      ],
      totalDebit: 999, totalCredit: 999,
      createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
    } as any);
    const r = await exportFEC(adapter, {
      startDate: '2026-01-01', endDate: '2026-12-31', fiscalYear: 2026,
    });
    expect(r.content).not.toContain('OD-DRAFT');
    expect(r.stats.entries).toBe(4);
  });

  it('REFUSE d’exporter un FEC déséquilibré', async () => {
    await db.journalEntries.add({
      id: 'e-bad', entryNumber: 'OD-BAD', journal: 'OD', date: '2026-07-01',
      reference: 'BAD', label: 'Déséquilibrée', status: 'validated',
      lines: [
        { id: 'b1', accountCode: '601000', accountName: 'A', label: 'x', debit: 1000, credit: 0 },
        { id: 'b2', accountCode: '401000', accountName: 'B', label: 'y', debit: 0, credit: 400 },
      ],
      totalDebit: 1000, totalCredit: 400,
      createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
    } as any);
    const r = await exportFEC(adapter, {
      startDate: '2026-01-01', endDate: '2026-12-31', fiscalYear: 2026,
    });
    expect(r.ok).toBe(false);
    expect(r.content).toBe('');
    expect(r.issues.some(i => i.code === 'ENTRY_UNBALANCED')).toBe(true);
    expect(r.issues.some(i => i.code === 'GLOBAL_UNBALANCED')).toBe(true);
  });

  it('neutralise le séparateur dans les libellés', async () => {
    await db.journalEntries.add({
      id: 'e-pipe', entryNumber: 'OD-PIPE', journal: 'OD', date: '2026-08-01',
      reference: 'P', label: 'Vente A|B|C', status: 'validated',
      lines: [
        { id: 'p1', accountCode: '601000', accountName: 'A', label: 'lib|avec|pipe', debit: 500, credit: 0 },
        { id: 'p2', accountCode: '401000', accountName: 'B', label: 'ok', debit: 0, credit: 500 },
      ],
      totalDebit: 500, totalCredit: 500,
      createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
    } as any);
    const r = await exportFEC(adapter, {
      startDate: '2026-01-01', endDate: '2026-12-31', fiscalYear: 2026,
    });
    const pipeLine = r.content.split('\r\n').find(l => l.includes('lib avec pipe'));
    expect(pipeLine).toBeTruthy();
    // La ligne a exactement 18 colonnes : le pipe du libellé a été neutralisé.
    expect(pipeLine!.split('|')).toHaveLength(18);
  });

  it('le total du FEC égale la balance de la période', async () => {
    const r = await exportFEC(adapter, {
      startDate: '2026-01-01', endDate: '2026-12-31', fiscalYear: 2026,
    });
    // 100M + 60M + 5M + 2M = 167M au débit comme au crédit
    expect(r.stats.totalDebit).toBe(167_000_000);
    expect(r.stats.totalCredit).toBe(167_000_000);
  });
});
