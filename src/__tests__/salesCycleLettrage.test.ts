/**
 * Cycle vente — câblage Atlas Trade → GL + lettrage auto 411 à l'encaissement.
 *
 * Vérifie le flux end-to-end : facture (411/70x/443) postée par le moteur, puis
 * encaissement (5xx/411) qui LETTRE automatiquement la facture au 411.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { safeAddEntry } from '../services/entryGuard';
import { autoLettrerPayment } from '../services/integration/paymentLettrage';

let adapter: ReturnType<typeof createTestAdapter>;

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  adapter = createTestAdapter();
});

/** Écriture avec code tiers sur les lignes 411. */
async function addEntry(
  id: string, journal: string, date: string,
  lines: Array<{ accountCode: string; debit?: number; credit?: number; thirdPartyCode?: string }>,
) {
  await safeAddEntry(adapter, {
    id, entryNumber: id, journal, date, label: id, reference: id, status: 'validated',
    lines: lines.map((l, i) => ({
      id: `${id}-${i}`, accountCode: l.accountCode, accountName: l.accountCode,
      label: '', debit: l.debit ?? 0, credit: l.credit ?? 0, thirdPartyCode: l.thirdPartyCode,
    })),
    createdAt: `${date}T10:00:00Z`,
  } as any, { skipSyncValidation: true });
}

/** Une facture de vente : 411 D / 701 C / 443 C. */
async function facture(id: string, date: string, client: string, ht: number, tva: number) {
  await addEntry(id, 'VE', date, [
    { accountCode: '411000', debit: ht + tva, thirdPartyCode: client },
    { accountCode: '701000', credit: ht },
    { accountCode: '443000', credit: tva },
  ]);
}

/** Un encaissement : 521 D / 411 C. */
async function encaissement(id: string, date: string, client: string, montant: number) {
  await addEntry(id, 'BQ', date, [
    { accountCode: '521000', debit: montant },
    { accountCode: '411000', credit: montant, thirdPartyCode: client },
  ]);
}

async function lettrageOf(lineAccountPrefix: string, entryId: string): Promise<string | undefined> {
  const entries = await db.journalEntries.toArray();
  const e = entries.find(x => x.id === entryId)!;
  const l = e.lines.find(x => x.accountCode.startsWith(lineAccountPrefix));
  return (l as any)?.lettrageCode;
}

describe('lettrage auto à l’encaissement', () => {
  it('lettre la facture soldée par un encaissement de même montant', async () => {
    await facture('FAC-1', '2026-03-01', 'C0042', 1_000_000, 180_000);
    await encaissement('ENC-1', '2026-03-20', 'C0042', 1_180_000);

    const res = await autoLettrerPayment(adapter, {
      paymentEntryId: 'ENC-1', thirdPartyCode: 'C0042', accountPrefix: '411',
    });

    expect(res.lettered).toBe(true);
    expect(res.matchedEntryIds).toContain('FAC-1');
    // Les deux lignes 411 portent le même code.
    const cFac = await lettrageOf('411', 'FAC-1');
    const cEnc = await lettrageOf('411', 'ENC-1');
    expect(cFac).toBeTruthy();
    expect(cFac).toBe(cEnc);
  });

  it('lettre plusieurs factures FIFO soldées par un règlement global', async () => {
    await facture('FAC-1', '2026-03-01', 'C0042', 500_000, 90_000);   // 590 000
    await facture('FAC-2', '2026-03-05', 'C0042', 500_000, 90_000);   // 590 000
    await encaissement('ENC-1', '2026-03-20', 'C0042', 1_180_000);    // solde les deux

    const res = await autoLettrerPayment(adapter, {
      paymentEntryId: 'ENC-1', thirdPartyCode: 'C0042', accountPrefix: '411',
    });
    expect(res.lettered).toBe(true);
    expect(res.matchedEntryIds).toEqual(expect.arrayContaining(['FAC-1', 'FAC-2']));
  });

  it('NE lettre PAS un règlement partiel (laissé au manuel)', async () => {
    await facture('FAC-1', '2026-03-01', 'C0042', 1_000_000, 180_000); // 1 180 000
    await encaissement('ENC-1', '2026-03-20', 'C0042', 500_000);       // partiel

    const res = await autoLettrerPayment(adapter, {
      paymentEntryId: 'ENC-1', thirdPartyCode: 'C0042', accountPrefix: '411',
    });
    expect(res.lettered).toBe(false);
    expect(res.reason).toMatch(/partiel|exactement/i);
    expect(await lettrageOf('411', 'FAC-1')).toBeUndefined();
  });

  it('n’attrape pas les factures d’un AUTRE client', async () => {
    await facture('FAC-A', '2026-03-01', 'C0001', 1_000_000, 180_000);
    await facture('FAC-B', '2026-03-02', 'C0002', 1_000_000, 180_000);
    await encaissement('ENC-B', '2026-03-20', 'C0002', 1_180_000);

    const res = await autoLettrerPayment(adapter, {
      paymentEntryId: 'ENC-B', thirdPartyCode: 'C0002', accountPrefix: '411',
    });
    expect(res.lettered).toBe(true);
    expect(res.matchedEntryIds).toEqual(['FAC-B']);
    // La facture de l'autre client reste ouverte.
    expect(await lettrageOf('411', 'FAC-A')).toBeUndefined();
  });

  it('sans code tiers, ne fait rien', async () => {
    await encaissement('ENC-1', '2026-03-20', '', 100_000);
    const res = await autoLettrerPayment(adapter, {
      paymentEntryId: 'ENC-1', thirdPartyCode: '', accountPrefix: '411',
    });
    expect(res.lettered).toBe(false);
  });
});
