import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import { runAllCrossControls } from '../services/crossControlsService';

describe('CrossControlsService', () => {
  const adapter = createTestAdapter();

  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.accounts.clear();
    await db.assets.clear();
  });

  it('should run all 20 controls without error', async () => {
    const report = await runAllCrossControls(adapter, 'default', {
      code: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
    });

    expect(report.controls.length).toBe(20);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('should return OK for all controls with empty database', async () => {
    const report = await runAllCrossControls(adapter, 'default', {
      code: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
    });

    // With empty data, most controls should pass (no inconsistencies)
    expect(report.totalError).toBe(0);
  });

  it('should detect balanced journal entries', async () => {
    await db.journalEntries.add({
      id: 'E1',
      entryNumber: 'VT-001',
      journal: 'VT',
      date: '2025-06-15',
      reference: 'FAC-001',
      label: 'Vente test',
      status: 'validated',
      lines: [
        { id: 'L1', accountCode: '411', accountName: 'Clients', label: 'Client A', debit: 118000, credit: 0 },
        { id: 'L2', accountCode: '701', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 100000 },
        { id: 'L3', accountCode: '443', accountName: 'TVA', label: 'TVA 18%', debit: 0, credit: 18000 },
      ],
      totalDebit: 118000,
      totalCredit: 118000,
      createdAt: '2025-06-15T00:00:00Z',
      updatedAt: '2025-06-15T00:00:00Z',
    });

    const report = await runAllCrossControls(adapter, 'default', {
      code: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
    });

    const control12 = report.controls.find(c => c.id === 'P12');
    expect(control12?.status).toBe('OK');
  });

  it('should detect unbalanced journal entry', async () => {
    await db.journalEntries.add({
      id: 'E2',
      entryNumber: 'VT-002',
      journal: 'VT',
      date: '2025-06-16',
      reference: 'FAC-002',
      label: 'Écriture déséquilibrée',
      status: 'validated',
      lines: [
        { id: 'L4', accountCode: '411', accountName: 'Clients', label: 'Client', debit: 100000, credit: 0 },
        { id: 'L5', accountCode: '701', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 90000 },
      ],
      totalDebit: 100000,
      totalCredit: 90000,
      createdAt: '2025-06-16T00:00:00Z',
      updatedAt: '2025-06-16T00:00:00Z',
    });

    const report = await runAllCrossControls(adapter, 'default', {
      code: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
    });

    const control12 = report.controls.find(c => c.id === 'P12');
    expect(control12?.status).toBe('ECART');
  });

  it('should verify cash is never negative (P10)', async () => {
    const report = await runAllCrossControls(adapter, 'default', {
      code: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
    });

    const control10 = report.controls.find(c => c.id === 'P10');
    expect(control10).toBeTruthy();
    expect(control10?.status).toBe('OK'); // Empty = zero = OK
  });

  it('should report correct score percentage', async () => {
    const report = await runAllCrossControls(adapter, 'default', {
      code: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
    });

    expect(report.score).toBe(Math.round((report.totalOk / 20) * 100));
  });

  it('should have all control IDs from P01 to P20', async () => {
    const report = await runAllCrossControls(adapter, 'default', {
      code: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
    });

    for (let i = 1; i <= 20; i++) {
      const id = `P${String(i).padStart(2, '0')}`;
      expect(report.controls.find(c => c.id === id)).toBeTruthy();
    }
  });
});
