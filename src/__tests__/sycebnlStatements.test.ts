/**
 * États SYCEBNL formatés — tableau des ressources et des emplois.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import {
  buildTableauRessourcesEmplois,
  tableauToCSV,
} from '../services/framework/sycebnlStatements';

let adapter: ReturnType<typeof createTestAdapter>;

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
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

describe('tableau ressources / emplois', () => {
  it('ventile les produits et charges par rubrique SYCEBNL', async () => {
    // Ressources : cotisations 754, dons 7551, subvention 74.
    await addEntry('R-1', 'OD', '2026-02-01', [
      { accountCode: '521000', debit: 4_000_000 },
      { accountCode: '754000', credit: 1_000_000 },   // Cotisations
      { accountCode: '7551', credit: 1_500_000 },      // Dons
      { accountCode: '740000', credit: 1_500_000 },    // Subvention d'exploitation
    ]);
    // Emplois : achats 60, personnel 66.
    await addEntry('E-1', 'OD', '2026-03-01', [
      { accountCode: '601000', debit: 1_200_000 },     // Achats
      { accountCode: '661000', debit: 1_800_000 },     // Personnel
      { accountCode: '521000', credit: 3_000_000 },
    ]);

    const t = await buildTableauRessourcesEmplois(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });

    const cotis = t.ressources.find(r => r.label === 'Cotisations')!;
    expect(cotis.montant).toBe(1_000_000);
    expect(t.ressources.find(r => r.label === 'Dons, legs et libéralités')!.montant).toBe(1_500_000);
    expect(t.ressources.find(r => r.label === "Subventions d'exploitation")!.montant).toBe(1_500_000);
    expect(t.totalRessources).toBe(4_000_000);

    expect(t.emplois.find(e => e.label === 'Achats et variations de stocks')!.montant).toBe(1_200_000);
    expect(t.emplois.find(e => e.label === 'Charges de personnel')!.montant).toBe(1_800_000);
    expect(t.totalEmplois).toBe(3_000_000);

    expect(t.excedentDeficit).toBe(1_000_000);
    expect(t.label).toBe('Excédent');
    expect(t.equilibre).toBe(true);
  });

  it('isole les comptes SYCEBNL spécifiques (689 engagements, 657 aides, 789 report)', async () => {
    await addEntry('SPEC', 'OD', '2026-06-01', [
      { accountCode: '689', debit: 800_000 },          // engagements à réaliser (emploi spécifique)
      { accountCode: '657000', debit: 200_000 },       // aides accordées (emploi spécifique)
      { accountCode: '789', credit: 500_000 },         // report ressources N-1 (ressource spécifique)
      { accountCode: '521000', debit: 500_000 },
      { accountCode: '131000', credit: 800_000 },
      { accountCode: '521000', debit: 200_000 },
    ]);
    const t = await buildTableauRessourcesEmplois(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(t.emplois.find(e => /Engagements à réaliser/.test(e.label))!.montant).toBe(800_000);
    expect(t.emplois.find(e => /Aides/.test(e.label))!.montant).toBe(200_000);
    expect(t.ressources.find(r => /Report des ressources/.test(r.label))!.montant).toBe(500_000);
    // 689 ne doit PAS être capté par la rubrique générique 68 (dotations).
    expect(t.emplois.find(e => /Dotations/.test(e.label))).toBeUndefined();
  });

  it('produit un déficit quand les emplois excèdent les ressources', async () => {
    await addEntry('R', 'OD', '2026-02-01', [
      { accountCode: '754000', credit: 1_000_000 }, { accountCode: '521000', debit: 1_000_000 },
    ]);
    await addEntry('E', 'OD', '2026-03-01', [
      { accountCode: '601000', debit: 1_500_000 }, { accountCode: '401000', credit: 1_500_000 },
    ]);
    const t = await buildTableauRessourcesEmplois(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(t.excedentDeficit).toBe(-500_000);
    expect(t.label).toBe('Déficit');
  });

  it('exporte un CSV structuré emplois / ressources / solde', async () => {
    await addEntry('R', 'OD', '2026-02-01', [
      { accountCode: '754000', credit: 1_000_000 }, { accountCode: '521000', debit: 1_000_000 },
    ]);
    const t = await buildTableauRessourcesEmplois(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    const csv = tableauToCSV(t);
    expect(csv).toContain('Tableau des ressources et des emplois');
    expect(csv).toContain('TOTAL RESSOURCES');
    expect(csv).toContain('Cotisations');
  });
});
