/**
 * B1-post — écriture d'impôt sur le résultat depuis la détermination.
 *
 * Vérifie : complément = impotDu − classe 89 déjà comptabilisée · idempotence ·
 * cas IMF contraignant · reprise si sur-provision · équilibre.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import {
  buildTaxEntryPreview,
  postTaxEntry,
  isTaxPosted,
} from '../services/fiscal/taxPostingService';
import type { ResultatFiscalResult } from '../services/fiscal/resultatFiscalService';

let adapter: ReturnType<typeof createTestAdapter>;
const FY = 'fy-2026';

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  adapter = createTestAdapter();
});

/** Détermination minimale : seuls les champs lus par le posting comptent. */
function determination(over: Partial<ResultatFiscalResult> = {}): ResultatFiscalResult {
  return {
    countryCode: 'CI', fiscalYear: 2026, legalReference: 'CGI CI', parametersFallback: false,
    currency: 'XOF', resultatNetComptable: 0, chiffreAffaires: 0,
    reintegrations: [], deductions: [], totalReintegrations: 0, totalDeductions: 0,
    deficitsAnterieurs: 0, deficitsImputes: 0, resultatFiscal: 0,
    tauxIS: 0.25, impotTheorique: 0, impotMinimumForfaitaire: 0,
    impotDu: 0, acomptesVerses: 0, impotNet: 0, acomptesTrimestriels: 0,
    isResult: {} as any,
    ...over,
  };
}

/** Passe une charge en classe 89 (simule un IMF déjà comptabilisé). */
async function seedClass89(amount: number, code = '895000') {
  await safeAddEntry(adapter, {
    id: 'imf-1', entryNumber: 'IMF-1', journal: 'OD', date: '2026-06-30',
    label: 'IMF', reference: 'IMF', status: 'validated',
    lines: [
      { id: 'l1', accountCode: code, accountName: 'IMF', label: '', debit: amount, credit: 0 },
      { id: 'l2', accountCode: '441000', accountName: 'IS', label: '', debit: 0, credit: amount },
    ],
    createdAt: '2026-06-30T10:00:00Z',
  } as any, { skipSyncValidation: true });
}

describe('prévisualisation de l’écriture d’impôt', () => {
  it('calcule le complément = impôt dû − classe 89 déjà comptabilisée', async () => {
    await seedClass89(5_000_000); // IMF déjà passé
    const prev = await buildTaxEntryPreview(
      adapter, determination({ impotDu: 12_000_000, impotTheorique: 12_000_000, impotMinimumForfaitaire: 5_000_000 }),
      { fiscalYearId: FY },
    );
    expect(prev.alreadyBooked).toBe(5_000_000);
    expect(prev.complement).toBe(7_000_000);
    expect(prev.nothingToPost).toBe(false);
    // Débit 891 (IS) / crédit 441 (dette)
    const debit = prev.lines.find(l => l.debit > 0)!;
    const credit = prev.lines.find(l => l.credit > 0)!;
    expect(debit.accountCode).toBe('891000');
    expect(debit.debit).toBe(7_000_000);
    expect(credit.accountCode).toBe('441000');
    expect(credit.credit).toBe(7_000_000);
    expect(prev.balanced).toBe(true);
  });

  it('ne propose rien quand la classe 89 est déjà à l’impôt dû (IMF contraignant)', async () => {
    await seedClass89(5_000_000);
    const prev = await buildTaxEntryPreview(
      adapter, determination({ impotDu: 5_000_000, impotTheorique: 3_000_000, impotMinimumForfaitaire: 5_000_000 }),
      { fiscalYearId: FY },
    );
    expect(prev.complement).toBe(0);
    expect(prev.nothingToPost).toBe(true);
    expect(prev.imfBinding).toBe(true);
    expect(prev.lines).toHaveLength(0);
  });

  it('propose une reprise si la classe 89 dépasse l’impôt dû', async () => {
    await seedClass89(8_000_000);
    const prev = await buildTaxEntryPreview(
      adapter, determination({ impotDu: 5_000_000, impotMinimumForfaitaire: 5_000_000, impotTheorique: 2_000_000 }),
      { fiscalYearId: FY },
    );
    expect(prev.complement).toBe(-3_000_000);
    // Sens inversé : débit 441 / crédit 891
    const debit = prev.lines.find(l => l.debit > 0)!;
    const credit = prev.lines.find(l => l.credit > 0)!;
    expect(debit.accountCode).toBe('441000');
    expect(credit.accountCode).toBe('891000');
    expect(prev.balanced).toBe(true);
  });
});

describe('comptabilisation', () => {
  it('poste une écriture équilibrée et la marque validée', async () => {
    await seedClass89(5_000_000);
    const res = await postTaxEntry(
      adapter, determination({ impotDu: 12_000_000, impotTheorique: 12_000_000, impotMinimumForfaitaire: 5_000_000 }),
      { fiscalYearId: FY, fiscalYearLabel: 'Exercice 2026', entryDate: '2026-12-31' },
    );
    expect(res.posted).toBe(true);
    expect(res.amount).toBe(7_000_000);

    const entries = await db.journalEntries.toArray();
    const taxEntry = entries.find(e => e.reference === `IS-${FY}`)!;
    expect(taxEntry.status).toBe('validated');
    expect(taxEntry.totalDebit).toBe(7_000_000);
    expect(taxEntry.totalCredit).toBe(7_000_000);
    expect((taxEntry as any).sourceSystem).toBe('closure');
    expect(taxEntry.nature).toBe('cloture');
  });

  it('est idempotent : refuse le double-post', async () => {
    await seedClass89(5_000_000);
    const det = determination({ impotDu: 12_000_000, impotTheorique: 12_000_000, impotMinimumForfaitaire: 5_000_000 });
    const first = await postTaxEntry(adapter, det, { fiscalYearId: FY, entryDate: '2026-12-31' });
    expect(first.posted).toBe(true);
    expect(await isTaxPosted(adapter, FY)).toBe(true);

    const second = await postTaxEntry(adapter, det, { fiscalYearId: FY, entryDate: '2026-12-31' });
    expect(second.posted).toBe(false);
    expect(second.message).toContain('existe déjà');
    // Toujours une seule écriture d'impôt.
    const entries = await db.journalEntries.toArray();
    expect(entries.filter(e => e.reference === `IS-${FY}`)).toHaveLength(1);
  });

  it('après comptabilisation, la classe 89 atteint exactement l’impôt dû', async () => {
    await seedClass89(5_000_000);
    await postTaxEntry(
      adapter, determination({ impotDu: 12_000_000, impotTheorique: 12_000_000, impotMinimumForfaitaire: 5_000_000 }),
      { fiscalYearId: FY, entryDate: '2026-12-31' },
    );
    // Recalcul : classe 89 = 5M (IMF) + 7M (complément IS) = 12M = impôt dû.
    const prev = await buildTaxEntryPreview(
      adapter, determination({ impotDu: 12_000_000, impotTheorique: 12_000_000, impotMinimumForfaitaire: 5_000_000 }),
      { fiscalYearId: FY },
    );
    expect(prev.alreadyBooked).toBe(12_000_000);
    // (une écriture existe déjà → alreadyPosted ; mais alreadyBooked prouve le total)
    expect(prev.alreadyPosted).toBe(true);
  });

  it('ne poste rien quand il n’y a rien à comptabiliser', async () => {
    await seedClass89(5_000_000);
    const res = await postTaxEntry(
      adapter, determination({ impotDu: 5_000_000, impotMinimumForfaitaire: 5_000_000, impotTheorique: 3_000_000 }),
      { fiscalYearId: FY, entryDate: '2026-12-31' },
    );
    expect(res.posted).toBe(false);
    expect(res.message).toContain('Rien à comptabiliser');
  });
});
