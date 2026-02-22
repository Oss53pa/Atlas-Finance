/**
 * Tests for ISA revisions service connected to Dexie.
 * Verifies: revision item CRUD, lead schedules, auto-generation, statistics.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { revisionsService } from '../features/closures/services/revisionsService';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

describe('RevisionsService (Dexie)', () => {
  const sessionId = 'REV-SESSION-001';

  beforeEach(async () => {
    await db.revisionItems.clear();
    await db.journalEntries.clear();
    await db.auditLogs.clear();

    // Seed journal entries for auto-generation
    await db.journalEntries.bulkAdd([
      {
        id: 'E1',
        entryNumber: 'VT-001',
        journal: 'VT',
        date: '2025-06-15',
        reference: 'FAC-001',
        label: 'Vente',
        status: 'validated',
        lines: [
          { id: 'L1', accountCode: '411000', accountName: 'Clients', label: 'Client', debit: 118000, credit: 0 },
          { id: 'L2', accountCode: '701000', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 100000 },
          { id: 'L3', accountCode: '443100', accountName: 'TVA collectée', label: 'TVA', debit: 0, credit: 18000 },
        ],
        totalDebit: 118000,
        totalCredit: 118000,
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
      {
        id: 'E2',
        entryNumber: 'BQ-001',
        journal: 'BQ',
        date: '2025-06-20',
        reference: 'VIR-001',
        label: 'Encaissement',
        status: 'validated',
        lines: [
          { id: 'L4', accountCode: '521000', accountName: 'Banque', label: 'Banque', debit: 118000, credit: 0 },
          { id: 'L5', accountCode: '411000', accountName: 'Clients', label: 'Client', debit: 0, credit: 118000 },
        ],
        totalDebit: 118000,
        totalCredit: 118000,
        createdAt: '2025-06-20T10:00:00Z',
        updatedAt: '2025-06-20T10:00:00Z',
      },
    ]);
  });

  describe('createRevisionItem', () => {
    it('should create a revision item', async () => {
      const item = await revisionsService.createRevisionItem(adapter, {
        sessionId,
        accountCode: '411000',
        accountName: 'Clients',
        isaAssertion: 'existence',
        riskLevel: 'high',
        testType: 'circularisation',
        status: 'en_attente',
        findings: '',
        conclusion: '',
        reviewer: 'Auditeur A',
      });

      expect(item.id).toBeDefined();
      expect(item.accountCode).toBe('411000');
      expect(item.isaAssertion).toBe('existence');
      expect(item.riskLevel).toBe('high');
    });

    it('should log audit trail', async () => {
      await revisionsService.createRevisionItem(adapter, {
        sessionId,
        accountCode: '521000',
        accountName: 'Banque',
        isaAssertion: 'existence',
        riskLevel: 'high',
        testType: 'inspection',
        status: 'en_attente',
        findings: '',
        conclusion: '',
        reviewer: 'Auditeur B',
      });

      const logs = await db.auditLogs.toArray();
      const revLog = logs.find(l => l.action === 'REVISION_ITEM_CREATE');
      expect(revLog).toBeDefined();
    });
  });

  describe('updateRevisionItem', () => {
    it('should update status and findings', async () => {
      const item = await revisionsService.createRevisionItem(adapter, {
        sessionId,
        accountCode: '411000',
        accountName: 'Clients',
        isaAssertion: 'exhaustivite',
        riskLevel: 'medium',
        testType: 'substantif',
        status: 'en_attente',
        findings: '',
        conclusion: '',
        reviewer: 'Auditeur A',
      });

      const updated = await revisionsService.updateRevisionItem(adapter, item.id, {
        status: 'en_cours',
        findings: 'Échantillon de 30 clients vérifié',
      });

      expect(updated.status).toBe('en_cours');
      expect(updated.findings).toBe('Échantillon de 30 clients vérifié');
    });
  });

  describe('autoGenerateRevisionItems', () => {
    it('should generate items for all accounts with movements', async () => {
      const count = await revisionsService.autoGenerateRevisionItems(adapter,
        sessionId,
        '2025-06-01',
        '2025-06-30',
        'Auditeur Principal'
      );

      // Accounts: 411000 (class 4), 701000 (class 7), 443100 (class 4), 521000 (class 5)
      // Class 4 assertions: existence, exhaustivite, valorisation, separation_exercices → 4 each × 2 accounts = 8
      // Class 5 assertions: existence, exhaustivite, exactitude → 3 × 1 account = 3
      // Class 7 assertions: existence, exhaustivite, separation_exercices, exactitude → 4 × 1 account = 4
      expect(count).toBe(15); // 8 + 3 + 4
    });

    it('should not create duplicates on second run', async () => {
      await revisionsService.autoGenerateRevisionItems(adapter, sessionId, '2025-06-01', '2025-06-30', 'A');
      const secondCount = await revisionsService.autoGenerateRevisionItems(adapter, sessionId, '2025-06-01', '2025-06-30', 'A');
      expect(secondCount).toBe(0);
    });
  });

  describe('getLeadSchedules', () => {
    it('should group items by SYSCOHADA class', async () => {
      await revisionsService.autoGenerateRevisionItems(adapter, sessionId, '2025-06-01', '2025-06-30', 'A');

      const schedules = await revisionsService.getLeadSchedules(adapter, sessionId);
      expect(schedules.length).toBeGreaterThan(0);

      const class4 = schedules.find(s => s.accountClass === '4');
      expect(class4).toBeDefined();
      expect(class4!.className).toBe('Tiers');
      expect(class4!.items.length).toBeGreaterThan(0);
    });

    it('should compute completion rate', async () => {
      await revisionsService.autoGenerateRevisionItems(adapter, sessionId, '2025-06-01', '2025-06-30', 'A');

      const schedules = await revisionsService.getLeadSchedules(adapter, sessionId);
      const class4 = schedules.find(s => s.accountClass === '4')!;
      expect(class4.completionRate).toBe(0); // All en_attente
    });
  });

  describe('getStats', () => {
    it('should return revision statistics', async () => {
      await revisionsService.autoGenerateRevisionItems(adapter, sessionId, '2025-06-01', '2025-06-30', 'A');

      const stats = await revisionsService.getStats(adapter, sessionId);
      expect(stats.totalItems).toBe(15);
      expect(stats.pending).toBe(15);
      expect(stats.completed).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    it('should count high risk items', async () => {
      await revisionsService.autoGenerateRevisionItems(adapter, sessionId, '2025-06-01', '2025-06-30', 'A');

      const stats = await revisionsService.getStats(adapter, sessionId);
      // Class 4 and 5 accounts are high risk
      expect(stats.highRiskItems).toBeGreaterThan(0);
    });
  });

  describe('getFindings', () => {
    it('should extract items with findings', async () => {
      const item = await revisionsService.createRevisionItem(adapter, {
        sessionId,
        accountCode: '411000',
        accountName: 'Clients',
        isaAssertion: 'existence',
        riskLevel: 'high',
        testType: 'circularisation',
        status: 'en_cours',
        findings: 'Écart de 50 000 XAF constaté',
        conclusion: 'Ajustement requis',
        reviewer: 'A',
      });

      const findings = await revisionsService.getFindings(adapter, sessionId);
      expect(findings.length).toBe(1);
      expect(findings[0].finding).toBe('Écart de 50 000 XAF constaté');
      expect(findings[0].recommendation).toBe('Ajustement requis');
    });
  });

  describe('exportReport', () => {
    it('should export as CSV', async () => {
      await revisionsService.autoGenerateRevisionItems(adapter, sessionId, '2025-06-01', '2025-06-30', 'A');
      const blob = await revisionsService.exportReport(adapter, sessionId);
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toContain('csv');
    });
  });

  describe('getAssertionLabels', () => {
    it('should return all ISA assertion labels', () => {
      const labels = revisionsService.getAssertionLabels();
      expect(labels['existence']).toContain('ISA 315');
      expect(labels['separation_exercices']).toContain('ISA 500');
    });
  });
});
