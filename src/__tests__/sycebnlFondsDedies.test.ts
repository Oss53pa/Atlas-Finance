/**
 * SYCEBNL approfondi — plan de comptes + fonds dédiés par projet/bailleur.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import {
  getSycebnlLabel,
  isFondsDedies,
  natureRessourceEmploi,
  SYCEBNL_ACCOUNTS,
} from '../services/framework/sycebnlChart';
import {
  buildFondsDediesStatement,
  fondsDediesToCSV,
} from '../services/framework/fondsDediesService';

let adapter: ReturnType<typeof createTestAdapter>;

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  adapter = createTestAdapter();
});

async function addEntry(
  id: string, journal: string, date: string,
  lines: Array<{ accountCode: string; debit?: number; credit?: number; analyticalCode?: string }>,
) {
  await safeAddEntry(adapter, {
    id, entryNumber: id, journal, date, label: id, reference: id, status: 'validated',
    lines: lines.map((l, i) => ({
      id: `${id}-${i}`, accountCode: l.accountCode, accountName: l.accountCode,
      label: '', debit: l.debit ?? 0, credit: l.credit ?? 0, analyticalCode: l.analyticalCode,
    })),
    createdAt: `${date}T10:00:00Z`,
  } as any, { skipSyncValidation: true });
}

// ============================================================================
// Plan de comptes SYCEBNL
// ============================================================================

describe('plan de comptes SYCEBNL', () => {
  it('fournit les comptes différenciants (fonds propres, fonds dédiés, ressources)', () => {
    const codes = SYCEBNL_ACCOUNTS.map(a => a.code);
    expect(codes).toEqual(expect.arrayContaining(['102', '103', '131', '754', '7551', '689', '789']));
  });

  it('libelle par préfixe le plus long', () => {
    expect(getSycebnlLabel('102')).toContain('sans droit de reprise');
    expect(getSycebnlLabel('7551')).toContain('Dons manuels');
    expect(getSycebnlLabel('131000')).toContain('Fonds dédiés'); // préfixe 131
    expect(getSycebnlLabel('999')).toBe('');
  });

  it('reconnaît les comptes de fonds dédiés (13x) et la nature ressource/emploi', () => {
    expect(isFondsDedies('131000')).toBe(true);
    expect(isFondsDedies('102')).toBe(false);
    expect(natureRessourceEmploi('754000')).toBe('ressource');
    expect(natureRessourceEmploi('605000')).toBe('emploi');
    expect(natureRessourceEmploi('411000')).toBe('autre');
  });
});

// ============================================================================
// Fonds dédiés par projet
// ============================================================================

describe('fonds dédiés par projet/bailleur', () => {
  it('calcule ouverture, ressources, emplois et solde à reporter par projet', async () => {
    // Projet PROJ-A : subvention 10 000 000 reçue, 6 000 000 employés → reste 4 000 000.
    await addEntry('SUB-A', 'OD', '2026-02-01', [
      { accountCode: '521000', debit: 10_000_000 },
      { accountCode: '740000', credit: 10_000_000, analyticalCode: 'PROJ-A' },
    ]);
    await addEntry('DEP-A', 'OD', '2026-06-01', [
      { accountCode: '605000', debit: 6_000_000, analyticalCode: 'PROJ-A' },
      { accountCode: '401000', credit: 6_000_000 },
    ]);
    // Projet PROJ-B : don affecté 3 000 000, entièrement employé → reste 0.
    await addEntry('DON-B', 'OD', '2026-03-01', [
      { accountCode: '521000', debit: 3_000_000 },
      { accountCode: '7551', credit: 3_000_000, analyticalCode: 'PROJ-B' },
    ]);
    await addEntry('DEP-B', 'OD', '2026-07-01', [
      { accountCode: '605000', debit: 3_000_000, analyticalCode: 'PROJ-B' },
      { accountCode: '401000', credit: 3_000_000 },
    ]);

    const s = await buildFondsDediesStatement(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });

    const a = s.projets.find(p => p.projet === 'PROJ-A')!;
    expect(a.ressourcesAffectees).toBe(10_000_000);
    expect(a.emplois).toBe(6_000_000);
    expect(a.cloture).toBe(4_000_000);

    const b = s.projets.find(p => p.projet === 'PROJ-B')!;
    expect(b.cloture).toBe(0);

    expect(s.totalCloture).toBe(4_000_000);
  });

  it('reporte le solde antérieur en ouverture', async () => {
    // Ressource affectée reçue AVANT la période (exercice précédent).
    await addEntry('SUB-PREV', 'OD', '2025-11-01', [
      { accountCode: '521000', debit: 5_000_000 },
      { accountCode: '740000', credit: 5_000_000, analyticalCode: 'PROJ-C' },
    ]);
    // Emploi dans la période courante.
    await addEntry('DEP-C', 'OD', '2026-04-01', [
      { accountCode: '605000', debit: 2_000_000, analyticalCode: 'PROJ-C' },
      { accountCode: '401000', credit: 2_000_000 },
    ]);

    const s = await buildFondsDediesStatement(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    const c = s.projets.find(p => p.projet === 'PROJ-C')!;
    expect(c.ouverture).toBe(5_000_000);   // reçu avant période
    expect(c.emplois).toBe(2_000_000);
    expect(c.cloture).toBe(3_000_000);      // 5M − 2M
  });

  it('neutralise les écritures de report (689 dotation / 789 reprise)', async () => {
    // La dotation aux fonds dédiés (689 D / 131 C) ne doit pas compter comme emploi.
    await addEntry('DOT', 'OD', '2026-12-31', [
      { accountCode: '689', debit: 1_000_000, analyticalCode: 'PROJ-D' },
      { accountCode: '131000', credit: 1_000_000, analyticalCode: 'PROJ-D' },
    ]);
    const s = await buildFondsDediesStatement(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    // Aucun mouvement économique réel (que du report) → projet absent ou à 0.
    const d = s.projets.find(p => p.projet === 'PROJ-D');
    expect(d?.emplois ?? 0).toBe(0);
    expect(d?.ressourcesAffectees ?? 0).toBe(0);
  });

  it('exporte un CSV avec les projets et le total', async () => {
    await addEntry('SUB', 'OD', '2026-02-01', [
      { accountCode: '521000', debit: 1_000_000 },
      { accountCode: '740000', credit: 1_000_000, analyticalCode: 'PROJ-X' },
    ]);
    const s = await buildFondsDediesStatement(adapter, { startDate: '2026-01-01', endDate: '2026-12-31' });
    const csv = fondsDediesToCSV(s);
    expect(csv).toContain('État des fonds dédiés');
    expect(csv).toContain('PROJ-X');
    expect(csv).toContain('TOTAL');
  });
});
