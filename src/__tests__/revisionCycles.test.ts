/**
 * Mode cabinet — dossier de révision par cycles (feuilles maîtresses).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import {
  buildRevisionDossier,
  saveCycleReview,
  revisionDossierToCSV,
  REVISION_CYCLES,
} from '../services/cabinet/revisionCyclesService';

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

describe('cycles de révision', () => {
  it('couvre les grands cycles SYSCOHADA', () => {
    const codes = REVISION_CYCLES.map(c => c.code);
    expect(codes).toEqual(expect.arrayContaining(['CAP', 'IMMO', 'STOCK', 'CLI', 'FRS', 'TRESO', 'CHARGES', 'PRODUITS']));
  });

  it('produit une feuille maîtresse par cycle avec solde et nb de comptes', async () => {
    await addEntry('VE-1', 'VE', '2026-03-01', [
      { accountCode: '411000', debit: 1_180_000 },
      { accountCode: '701000', credit: 1_000_000 },
      { accountCode: '443000', credit: 180_000 },
    ]);
    await addEntry('BQ-1', 'BQ', '2026-03-10', [
      { accountCode: '521000', debit: 1_180_000 },
      { accountCode: '411000', credit: 1_180_000 },
    ]);

    const d = await buildRevisionDossier(adapter, {
      exerciceId: 'FY2026', currentRange: { startDate: '2026-01-01', endDate: '2026-12-31' },
    });

    const cli = d.cycles.find(c => c.code === 'CLI')!;
    expect(cli.soldeN).toBe(0); // 411 débité puis crédité → soldé
    expect(cli.nbComptes).toBe(1);

    const treso = d.cycles.find(c => c.code === 'TRESO')!;
    expect(treso.soldeN).toBe(1_180_000); // 521 débiteur

    const produits = d.cycles.find(c => c.code === 'PRODUITS')!;
    expect(produits.soldeN).toBe(-1_000_000); // classe 7 créditrice (solde signé)
  });

  it('signale un client créditeur comme point d’attention → statut anomalie', async () => {
    // Client 411 CRÉDITEUR (avance reçue) : anomalie de sens à examiner.
    await addEntry('AV-1', 'BQ', '2026-04-01', [
      { accountCode: '521000', debit: 500_000 },
      { accountCode: '411000', credit: 500_000 },
    ]);
    const d = await buildRevisionDossier(adapter, {
      exerciceId: 'FY2026', currentRange: { startDate: '2026-01-01', endDate: '2026-12-31' },
    });
    const cli = d.cycles.find(c => c.code === 'CLI')!;
    expect(cli.pointsAttention).toHaveLength(1);
    expect(cli.pointsAttention[0].message).toMatch(/créditeur/i);
    expect(cli.pointsAttention[0].amount).toBe(500_000);
    expect(cli.status).toBe('anomalie');
  });

  it('signale un fournisseur débiteur et une caisse créditrice', async () => {
    await addEntry('AC-1', 'AC', '2026-05-01', [
      { accountCode: '401000', debit: 300_000 },   // fournisseur débiteur (acompte)
      { accountCode: '521000', credit: 300_000 },
    ]);
    const d = await buildRevisionDossier(adapter, {
      exerciceId: 'FY2026', currentRange: { startDate: '2026-01-01', endDate: '2026-12-31' },
    });
    const frs = d.cycles.find(c => c.code === 'FRS')!;
    expect(frs.pointsAttention.some(p => /débiteur/i.test(p.message))).toBe(true);
    const treso = d.cycles.find(c => c.code === 'TRESO')!;
    expect(treso.pointsAttention.some(p => /créditeur/i.test(p.message))).toBe(true);
  });

  it('calcule la variation N/N-1 quand l’exercice précédent est fourni', async () => {
    await addEntry('PREV', 'VE', '2025-06-01', [
      { accountCode: '701000', credit: 2_000_000 },
      { accountCode: '411000', debit: 2_000_000 },
    ]);
    await addEntry('CUR', 'VE', '2026-06-01', [
      { accountCode: '701000', credit: 3_000_000 },
      { accountCode: '411000', debit: 3_000_000 },
    ]);
    const d = await buildRevisionDossier(adapter, {
      exerciceId: 'FY2026',
      currentRange: { startDate: '2026-01-01', endDate: '2026-12-31' },
      priorRange: { startDate: '2025-01-01', endDate: '2025-12-31' },
    });
    const prod = d.cycles.find(c => c.code === 'PRODUITS')!;
    expect(prod.soldeN).toBe(-3_000_000);
    expect(prod.soldeN1).toBe(-2_000_000);
    expect(prod.variation).toBe(-1_000_000);
    expect(prod.variationPct).toBe(-50); // -1M / |−2M|
  });

  it('persiste le statut et la note de révision d’un cycle', async () => {
    await addEntry('VE-1', 'VE', '2026-03-01', [
      { accountCode: '701000', credit: 1_000_000 },
      { accountCode: '411000', debit: 1_000_000 },
    ]);
    await saveCycleReview(adapter, 'FY2026', 'PRODUITS', { status: 'revise', note: 'CA rapproché de la TVA.' });
    const d = await buildRevisionDossier(adapter, {
      exerciceId: 'FY2026', currentRange: { startDate: '2026-01-01', endDate: '2026-12-31' },
    });
    const prod = d.cycles.find(c => c.code === 'PRODUITS')!;
    expect(prod.status).toBe('revise');
    expect(prod.note).toBe('CA rapproché de la TVA.');
    expect(d.completion).toBeGreaterThan(0);
  });

  it('exporte un CSV des feuilles maîtresses', async () => {
    await addEntry('VE-1', 'VE', '2026-03-01', [
      { accountCode: '701000', credit: 1_000_000 },
      { accountCode: '411000', debit: 1_000_000 },
    ]);
    const d = await buildRevisionDossier(adapter, {
      exerciceId: 'FY2026', currentRange: { startDate: '2026-01-01', endDate: '2026-12-31' },
    });
    const csv = revisionDossierToCSV(d);
    expect(csv).toContain('feuilles maîtresses');
    expect(csv).toContain('Clients');
  });
});
