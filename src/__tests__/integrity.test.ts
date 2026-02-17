import { describe, it, expect } from 'vitest';
import { hashEntry, verifyChain, type HashableEntry } from '../utils/integrity';

const makeEntry = (num: string, debit: number, credit: number): HashableEntry => ({
  entryNumber: num,
  journal: 'AC',
  date: '2026-01-15',
  lines: [
    { accountCode: '607000', debit, credit: 0, label: 'Achat' },
    { accountCode: '401000', debit: 0, credit, label: 'Fournisseur' },
  ],
  totalDebit: debit,
  totalCredit: credit,
});

describe('hashEntry', () => {
  it('produces a 64-char hex string', async () => {
    const hash = await hashEntry(makeEntry('AC-000001', 100000, 100000));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic (same input = same hash)', async () => {
    const entry = makeEntry('AC-000001', 100000, 100000);
    const hash1 = await hashEntry(entry);
    const hash2 = await hashEntry(entry);
    expect(hash1).toBe(hash2);
  });

  it('changes when entry data changes', async () => {
    const hash1 = await hashEntry(makeEntry('AC-000001', 100000, 100000));
    const hash2 = await hashEntry(makeEntry('AC-000001', 100001, 100001));
    expect(hash1).not.toBe(hash2);
  });

  it('chains with previous hash', async () => {
    const hash1 = await hashEntry(makeEntry('AC-000001', 100000, 100000));
    const hash2 = await hashEntry(makeEntry('AC-000001', 100000, 100000), hash1);
    expect(hash2).not.toBe(hash1);
  });
});

describe('verifyChain', () => {
  it('validates a correct chain', async () => {
    const entry1 = makeEntry('AC-000001', 50000, 50000);
    entry1.hash = await hashEntry(entry1, '');

    const entry2 = makeEntry('AC-000002', 75000, 75000);
    entry2.hash = await hashEntry(entry2, entry1.hash!);

    const entry3 = makeEntry('AC-000003', 30000, 30000);
    entry3.hash = await hashEntry(entry3, entry2.hash!);

    const result = await verifyChain([
      { ...entry1, hash: entry1.hash },
      { ...entry2, hash: entry2.hash },
      { ...entry3, hash: entry3.hash },
    ]);

    expect(result.valid).toBe(true);
    expect(result.checkedCount).toBe(3);
  });

  it('detects a tampered entry', async () => {
    const entry1 = makeEntry('AC-000001', 50000, 50000);
    entry1.hash = await hashEntry(entry1, '');

    const entry2 = makeEntry('AC-000002', 75000, 75000);
    entry2.hash = await hashEntry(entry2, entry1.hash!);

    // Tamper with entry2's amount
    const tampered = { ...entry2, totalDebit: 99999, hash: entry2.hash };

    const result = await verifyChain([
      { ...entry1, hash: entry1.hash },
      tampered,
    ]);

    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe('AC-000002');
  });

  it('detects missing hash', async () => {
    const entry = makeEntry('AC-000001', 50000, 50000);
    const result = await verifyChain([entry]);
    expect(result.valid).toBe(false);
  });
});
