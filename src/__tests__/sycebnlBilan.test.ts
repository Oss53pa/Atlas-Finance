/**
 * Bilan SYCEBNL formaté — fonds propres, fonds dédiés, équilibre par le résultat.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import { buildBilanSycebnl, bilanSycebnlToCSV } from '../services/framework/sycebnlBilan';

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

describe('bilan SYCEBNL', () => {
  it('équilibre Actif = Passif via le résultat (excédent)', async () => {
    // Ouverture : immobilisation 5M / fonds propres sans droit de reprise 5M.
    await addEntry('AN', 'AN', '2026-01-01', [
      { accountCode: '210000', debit: 5_000_000 },
      { accountCode: '102000', credit: 5_000_000 },
    ]);
    // Subvention d'exploitation encaissée (produit).
    await addEntry('SUB', 'OD', '2026-03-01', [
      { accountCode: '521000', debit: 3_000_000 },
      { accountCode: '740000', credit: 3_000_000 },
    ]);
    // Charge d'achat non soldée (dette fournisseur).
    await addEntry('ACH', 'OD', '2026-04-01', [
      { accountCode: '601000', debit: 1_000_000 },
      { accountCode: '401000', credit: 1_000_000 },
    ]);

    const b = await buildBilanSycebnl(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });

    // Résultat = 3M produits − 1M charges = 2M excédent.
    expect(b.resultat).toBe(2_000_000);
    expect(b.resultatLabel).toBe('Excédent');

    // Actif = immo 5M + trésorerie 3M = 8M.
    expect(b.actif.find(a => a.label === 'Actif immobilisé')!.montant).toBe(5_000_000);
    expect(b.actif.find(a => a.label === 'Trésorerie-actif')!.montant).toBe(3_000_000);
    expect(b.totalActif).toBe(8_000_000);

    // Passif = fonds propres (5M + résultat 2M = 7M) + dette 1M = 8M.
    expect(b.passif.find(p => p.label.startsWith('Fonds propres'))!.montant).toBe(7_000_000);
    expect(b.passif.find(p => p.label.startsWith('Dettes (passif'))!.montant).toBe(1_000_000);
    expect(b.totalPassif).toBe(8_000_000);

    expect(b.equilibre).toBe(true);
  });

  it('isole les fonds dédiés (13x) au passif', async () => {
    await addEntry('AN', 'AN', '2026-01-01', [
      { accountCode: '521000', debit: 4_000_000 },
      { accountCode: '102000', credit: 3_000_000 },
      { accountCode: '131000', credit: 1_000_000 },   // fonds dédiés
    ]);
    const b = await buildBilanSycebnl(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    const fd = b.passif.find(p => p.label.startsWith('Fonds dédiés'))!;
    expect(fd.montant).toBe(1_000_000);
    // Les fonds dédiés ne sont PAS mélangés aux fonds propres.
    expect(b.passif.find(p => p.label.startsWith('Fonds propres'))!.montant).toBe(3_000_000);
    expect(b.equilibre).toBe(true);
  });

  it('place un compte de tiers créditeur au passif (par signe)', async () => {
    // Client 41 CRÉDITEUR (avance reçue) → dette, pas créance.
    await addEntry('AV', 'OD', '2026-05-01', [
      { accountCode: '521000', debit: 500_000 },
      { accountCode: '411000', credit: 500_000 },
      { accountCode: '102000', credit: 0 },
    ]);
    await addEntry('CAP', 'AN', '2026-01-01', [
      { accountCode: '521000', debit: 500_000 },
      { accountCode: '102000', credit: 500_000 },
    ]);
    const b = await buildBilanSycebnl(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    // 411 créditeur → dettes (passif circulant), jamais à l'actif.
    expect(b.passif.find(p => p.label.startsWith('Dettes (passif'))!.montant).toBe(500_000);
    expect(b.actif.find(a => a.label === 'Actif circulant')).toBeUndefined();
  });

  it('exporte un CSV avec actif, passif et totaux', async () => {
    await addEntry('AN', 'AN', '2026-01-01', [
      { accountCode: '210000', debit: 1_000_000 },
      { accountCode: '102000', credit: 1_000_000 },
    ]);
    const b = await buildBilanSycebnl(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    const csv = bilanSycebnlToCSV(b);
    expect(csv).toContain('Bilan SYCEBNL');
    expect(csv).toContain('TOTAL ACTIF');
    expect(csv).toContain('TOTAL PASSIF');
  });
});
