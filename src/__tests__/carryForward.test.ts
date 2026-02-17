/**
 * Tests for carry-forward (report a nouveau) service.
 * Verifies: balance computation, preview, execution, duplication check.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculerSoldesCloture,
  previewCarryForward,
  executerCarryForward,
  hasCarryForward,
  supprimerCarryForward,
  type CarryForwardConfig,
} from '../services/cloture/carryForwardService';
import { db } from '../lib/db';

describe('CarryForward (Report A-Nouveau)', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.fiscalYears.clear();
    await db.auditLogs.clear();

    // Seed fiscal years
    await db.fiscalYears.bulkAdd([
      { id: 'FY2024', code: '2024', name: 'Exercice 2024', startDate: '2024-01-01', endDate: '2024-12-31', isClosed: true, isActive: false },
      { id: 'FY2025', code: '2025', name: 'Exercice 2025', startDate: '2025-01-01', endDate: '2025-12-31', isClosed: false, isActive: true },
    ]);

    // Seed journal entries with BALANCED bilan accounts only (classes 1-5)
    await db.journalEntries.bulkAdd([
      {
        id: 'E1',
        entryNumber: 'OD-001',
        journal: 'OD',
        date: '2024-01-01',
        reference: 'CAP-001',
        label: 'Apport capital initial',
        status: 'validated',
        lines: [
          { id: 'L1', accountCode: '521000', accountName: 'Banque', label: 'Apport capital', debit: 100000, credit: 0 },
          { id: 'L2', accountCode: '101000', accountName: 'Capital social', label: 'Capital initial', debit: 0, credit: 100000 },
        ],
        totalDebit: 100000,
        totalCredit: 100000,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      },
      {
        id: 'E2',
        entryNumber: 'BQ-001',
        journal: 'BQ',
        date: '2024-06-15',
        reference: 'EMP-001',
        label: 'Emprunt bancaire',
        status: 'validated',
        lines: [
          { id: 'L3', accountCode: '521000', accountName: 'Banque', label: 'Emprunt recu', debit: 50000, credit: 0 },
          { id: 'L4', accountCode: '162000', accountName: 'Emprunts bancaires', label: 'Emprunt', debit: 0, credit: 50000 },
        ],
        totalDebit: 50000,
        totalCredit: 50000,
        createdAt: '2024-06-15T10:00:00Z',
        updatedAt: '2024-06-15T10:00:00Z',
      },
    ]);
  });

  describe('calculerSoldesCloture', () => {
    it('should compute closing balances for bilan accounts', async () => {
      const soldes = await calculerSoldesCloture('FY2024');
      // 521000: D:150000 → solde D:150000
      // 101000: C:100000 → solde C:100000
      // 162000: C:50000 → solde C:50000
      expect(soldes.length).toBe(3);
      const codes = soldes.map(s => s.accountCode);
      expect(codes).toContain('521000');
      expect(codes).toContain('101000');
      expect(codes).toContain('162000');
    });

    it('should correctly compute debit/credit soldes', async () => {
      const soldes = await calculerSoldesCloture('FY2024');
      const banque = soldes.find(s => s.accountCode === '521000');
      expect(banque!.soldeDebiteur).toBe(150000);
      expect(banque!.soldeCrediteur).toBe(0);

      const capital = soldes.find(s => s.accountCode === '101000');
      expect(capital!.soldeDebiteur).toBe(0);
      expect(capital!.soldeCrediteur).toBe(100000);
    });

    it('should throw for unknown exercice', async () => {
      await expect(calculerSoldesCloture('UNKNOWN')).rejects.toThrow('introuvable');
    });
  });

  describe('previewCarryForward', () => {
    it('should preview carry-forward lines', async () => {
      const config: CarryForwardConfig = {
        closingExerciceId: 'FY2024',
        openingExerciceId: 'FY2025',
        openingDate: '2025-01-01',
      };
      const preview = await previewCarryForward(config);
      expect(preview.lignes.length).toBe(3);
      expect(preview.accountCount).toBe(3);
    });

    it('should be balanced (totalDebit == totalCredit)', async () => {
      const config: CarryForwardConfig = {
        closingExerciceId: 'FY2024',
        openingExerciceId: 'FY2025',
        openingDate: '2025-01-01',
      };
      const preview = await previewCarryForward(config);
      // D:150000 = C:100000 + C:50000
      expect(preview.totalDebit).toBe(150000);
      expect(preview.totalCredit).toBe(150000);
      expect(preview.isBalanced).toBe(true);
    });
  });

  describe('executerCarryForward', () => {
    const config: CarryForwardConfig = {
      closingExerciceId: 'FY2024',
      openingExerciceId: 'FY2025',
      openingDate: '2025-01-01',
    };

    it('should create AN journal entry', async () => {
      const result = await executerCarryForward(config);
      expect(result.success).toBe(true);
      expect(result.entryId).toBeDefined();
      expect(result.lineCount).toBe(3);
    });

    it('should store entry with journal AN', async () => {
      const result = await executerCarryForward(config);
      expect(result.success).toBe(true);
      const entry = await db.journalEntries.get(result.entryId!);
      expect(entry).toBeDefined();
      expect(entry!.journal).toBe('AN');
      expect(entry!.date).toBe('2025-01-01');
      expect(entry!.status).toBe('validated');
    });

    it('should produce a balanced entry', async () => {
      const result = await executerCarryForward(config);
      expect(result.success).toBe(true);
      expect(result.totalDebit).toBe(result.totalCredit);
      expect(result.totalDebit).toBe(150000);
    });

    it('should have a hash', async () => {
      const result = await executerCarryForward(config);
      expect(result.success).toBe(true);
      const entry = await db.journalEntries.get(result.entryId!);
      expect(entry!.hash).toBeTruthy();
      expect(entry!.hash!.length).toBeGreaterThan(10);
    });

    it('should log audit', async () => {
      const result = await executerCarryForward(config);
      expect(result.success).toBe(true);
      const logs = await db.auditLogs.toArray();
      expect(logs.some(l => l.action === 'CARRY_FORWARD')).toBe(true);
    });

    it('should fail for unknown fiscal year', async () => {
      const bad: CarryForwardConfig = { ...config, closingExerciceId: 'NOPE' };
      const result = await executerCarryForward(bad);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('hasCarryForward', () => {
    it('should return false when no AN entry exists', async () => {
      expect(await hasCarryForward('FY2025')).toBe(false);
    });

    it('should return true after carry-forward execution', async () => {
      const result = await executerCarryForward({
        closingExerciceId: 'FY2024',
        openingExerciceId: 'FY2025',
        openingDate: '2025-01-01',
      });
      expect(result.success).toBe(true);
      expect(await hasCarryForward('FY2025')).toBe(true);
    });
  });

  describe('supprimerCarryForward', () => {
    it('should delete AN entries', async () => {
      const result = await executerCarryForward({
        closingExerciceId: 'FY2024',
        openingExerciceId: 'FY2025',
        openingDate: '2025-01-01',
      });
      expect(result.success).toBe(true);
      expect(await hasCarryForward('FY2025')).toBe(true);

      await supprimerCarryForward('FY2025');
      expect(await hasCarryForward('FY2025')).toBe(false);
    });
  });
});
