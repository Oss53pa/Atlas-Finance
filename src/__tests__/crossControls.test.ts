import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  runAllCrossControls,
  type CrossControlReport,
} from '../services/crossControlsService';

const adapter = createTestAdapter();

describe('crossControlsService', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.assets.clear();
    await db.accounts.clear();
  });

  it('should run all 20 controls and return a score', async () => {
    const report: CrossControlReport = await runAllCrossControls(
      adapter,
      'comp1',
      { code: '2025', start: '2025-01-01', end: '2025-12-31' }
    );

    expect(report.controls.length).toBe(20);
    // Certains contrôles sont informatifs (INFO) : la somme OK+ECART+ERROR+INFO = 20.
    const totalInfo = report.controls.filter(c => c.status === 'INFO').length;
    expect(report.totalOk + report.totalEcart + report.totalError + totalInfo).toBe(20);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('should detect balanced entries as OK', async () => {
    // Seed a balanced entry
    await adapter.saveJournalEntry({
      entryNumber: 'VE-001',
      journal: 'VE',
      date: '2025-03-15',
      reference: 'FAC-001',
      label: 'Vente marchandises',
      status: 'validated',
      lines: [
        { id: crypto.randomUUID(), accountCode: '411', accountName: 'Client', label: 'Vente', debit: 1180000, credit: 0 },
        { id: crypto.randomUUID(), accountCode: '701', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 1000000 },
        { id: crypto.randomUUID(), accountCode: '443', accountName: 'TVA collectée', label: 'TVA', debit: 0, credit: 180000 },
      ],
      totalDebit: 1180000,
      totalCredit: 1180000,
      updatedAt: new Date().toISOString(),
    });

    const report = await runAllCrossControls(
      adapter, 'comp1',
      { code: '2025', start: '2025-01-01', end: '2025-12-31' }
    );

    // P12 (entries balanced) should be OK
    const p12 = report.controls.find(c => c.id === 'P12');
    expect(p12!.status).toBe('OK');

    // P01 (client balance) should be OK since client balance is positive
    const p01 = report.controls.find(c => c.id === 'P01');
    expect(p01!.status).toBe('OK');
  });

  it('should have all control IDs from P01 to P20', async () => {
    const report = await runAllCrossControls(
      adapter, 'comp1',
      { code: '2025', start: '2025-01-01', end: '2025-12-31' }
    );

    for (let i = 1; i <= 20; i++) {
      const id = `P${String(i).padStart(2, '0')}`;
      expect(report.controls.find(c => c.id === id)).toBeTruthy();
    }
  });

  it('should compute score as percentage of OK controls', async () => {
    const report = await runAllCrossControls(
      adapter, 'comp1',
      { code: '2025', start: '2025-01-01', end: '2025-12-31' }
    );

    // Score = OK / contrôles ÉVALUÉS (hors INFO informatifs).
    const evalues = report.controls.filter(c => c.status !== 'INFO').length;
    const expectedScore = evalues > 0 ? Math.round((report.totalOk / evalues) * 100) : 100;
    expect(report.score).toBe(expectedScore);
  });
});
