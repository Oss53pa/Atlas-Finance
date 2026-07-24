/**
 * Vague D — balance générale de clôture + registre pays OHADA.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import {
  resolveOhadaCountry,
  currencyForCountry,
  countriesByZone,
  OHADA_COUNTRIES,
} from '../services/fiscal/ohadaCountries';
import {
  buildClosingBalance,
  closingBalanceToCSV,
} from '../services/fiscal/closingBalanceService';

// ============================================================================
// Registre pays OHADA
// ============================================================================

describe('registre pays OHADA', () => {
  it('couvre les 14 pays UEMOA + CEMAC', () => {
    expect(OHADA_COUNTRIES).toHaveLength(14);
    expect(countriesByZone('UEMOA')).toHaveLength(8);
    expect(countriesByZone('CEMAC')).toHaveLength(6);
  });

  it('résout un pays en texte libre (avec/sans accents)', () => {
    expect(resolveOhadaCountry("Côte d'Ivoire")?.code).toBe('CI');
    expect(resolveOhadaCountry('Cote d Ivoire')?.code).toBe('CI');
    expect(resolveOhadaCountry('CI')?.code).toBe('CI');
    expect(resolveOhadaCountry('Cameroun')?.code).toBe('CM');
    expect(resolveOhadaCountry('senegal')?.code).toBe('SN');
  });

  it('associe la bonne devise à la zone (XOF UEMOA, XAF CEMAC)', () => {
    expect(currencyForCountry("Côte d'Ivoire")).toBe('XOF');
    expect(currencyForCountry('Gabon')).toBe('XAF');
    expect(currencyForCountry('Tchad')).toBe('XAF');
  });

  it('retourne undefined hors zone OHADA', () => {
    expect(resolveOhadaCountry('France')).toBeUndefined();
    expect(resolveOhadaCountry('')).toBeUndefined();
  });
});

// ============================================================================
// Balance de clôture
// ============================================================================

let adapter: ReturnType<typeof createTestAdapter>;

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  adapter = createTestAdapter();
});

/** Écriture équilibrée simple pour peupler le GL. */
async function addEntry(
  id: string, journal: string, date: string,
  lines: Array<{ accountCode: string; debit?: number; credit?: number }>,
) {
  await safeAddEntry(adapter, {
    id, entryNumber: id, journal, date,
    label: id, reference: '', status: 'validated',
    lines: lines.map((l, i) => ({
      id: `${id}-${i}`, accountCode: l.accountCode, accountName: l.accountCode,
      label: '', debit: l.debit ?? 0, credit: l.credit ?? 0,
    })),
    createdAt: `${date}T10:00:00.000Z`,
  } as any);
}

describe('balance de clôture', () => {
  it('sépare ouverture (à-nouveau) et mouvements de période', async () => {
    // À-nouveau : capital 1 000 000 au crédit / banque 1 000 000 au débit
    await addEntry('AN-1', 'AN', '2026-01-01', [
      { accountCode: '521000', debit: 1_000_000 },
      { accountCode: '101000', credit: 1_000_000 },
    ]);
    // Mouvement : vente 500 000 (banque au débit, produit au crédit)
    await addEntry('VE-1', 'VE', '2026-06-15', [
      { accountCode: '521000', debit: 500_000 },
      { accountCode: '701000', credit: 500_000 },
    ]);

    const bal = await buildClosingBalance(
      adapter,
      { startDate: '2026-01-01', endDate: '2026-12-31' },
      { countryInput: "Côte d'Ivoire" },
    );

    const banque = bal.rows.find(r => r.accountCode === '521000')!;
    expect(banque.openingDebit).toBe(1_000_000);
    expect(banque.movementDebit).toBe(500_000);
    expect(banque.closingDebit).toBe(1_500_000);

    const capital = bal.rows.find(r => r.accountCode === '101000')!;
    expect(capital.openingCredit).toBe(1_000_000);
    expect(capital.closingCredit).toBe(1_000_000);
  });

  it('est équilibrée (Σ soldes débit = Σ soldes crédit)', async () => {
    await addEntry('AN-1', 'AN', '2026-01-01', [
      { accountCode: '521000', debit: 1_000_000 },
      { accountCode: '101000', credit: 1_000_000 },
    ]);
    await addEntry('VE-1', 'VE', '2026-06-15', [
      { accountCode: '411000', debit: 590_000 },
      { accountCode: '701000', credit: 500_000 },
      { accountCode: '443000', credit: 90_000 },
    ]);

    const bal = await buildClosingBalance(adapter, { endDate: '2026-12-31' });
    expect(bal.balanced).toBe(true);
    expect(bal.totals.closingDebit).toBe(bal.totals.closingCredit);
  });

  it('place un compte à solde inversé du bon côté (jamais Math.max)', async () => {
    // 46 (compte de tiers) devient CRÉDITEUR : doit apparaître en solde crédit.
    await addEntry('OD-1', 'OD', '2026-05-01', [
      { accountCode: '521000', debit: 300_000 },
      { accountCode: '462000', credit: 300_000 },
    ]);
    const bal = await buildClosingBalance(adapter, { endDate: '2026-12-31' });
    const tiers = bal.rows.find(r => r.accountCode === '462000')!;
    expect(tiers.closingCredit).toBe(300_000);
    expect(tiers.closingDebit).toBe(0);
  });

  it('exclut les écritures postérieures à la date de clôture', async () => {
    await addEntry('VE-1', 'VE', '2026-06-15', [
      { accountCode: '521000', debit: 100_000 },
      { accountCode: '701000', credit: 100_000 },
    ]);
    // Écriture de l'exercice suivant : ne doit pas entrer dans la clôture 2026.
    await addEntry('VE-2', 'VE', '2027-02-01', [
      { accountCode: '521000', debit: 999_999 },
      { accountCode: '701000', credit: 999_999 },
    ]);
    const bal = await buildClosingBalance(adapter, { endDate: '2026-12-31' });
    const banque = bal.rows.find(r => r.accountCode === '521000')!;
    expect(banque.closingDebit).toBe(100_000);
  });

  it('renseigne pays, zone, devise et une empreinte d’intégrité', async () => {
    await addEntry('VE-1', 'VE', '2026-06-15', [
      { accountCode: '521000', debit: 100_000 },
      { accountCode: '701000', credit: 100_000 },
    ]);
    const bal = await buildClosingBalance(
      adapter, { endDate: '2026-12-31' }, { countryInput: 'Gabon' },
    );
    expect(bal.countryCode).toBe('GA');
    expect(bal.zone).toBe('CEMAC');
    expect(bal.currency).toBe('XAF');
    expect(bal.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(bal.state).toBe('after_inventory_before_appropriation');
  });

  it('exporte un CSV avec en-tête et ligne de total', async () => {
    await addEntry('VE-1', 'VE', '2026-06-15', [
      { accountCode: '521000', debit: 100_000 },
      { accountCode: '701000', credit: 100_000 },
    ]);
    const bal = await buildClosingBalance(adapter, { endDate: '2026-12-31' });
    const csv = closingBalanceToCSV(bal);
    expect(csv.split('\n')[0]).toContain('Compte');
    expect(csv).toContain('TOTAL');
    expect(csv).toContain('521000');
  });
});
