/**
 * Tests for plan comptable service connected to Dexie.
 * Verifies: account CRUD, SYSCOHADA validation, hierarchy, seeding.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { planComptableService } from '../services/accounting/planComptableService';
import { db } from '../lib/db';

describe('PlanComptableService (Dexie)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.journalEntries.clear();
    await db.auditLogs.clear();
  });

  describe('createAccount', () => {
    it('should create an account with SYSCOHADA validation', async () => {
      const account = await planComptableService.createAccount({
        code: '411000',
        name: 'Clients',
        accountClass: '4',
        accountType: 'bilan',
        level: 4,
        normalBalance: 'debit',
        isReconcilable: true,
        isActive: true,
      });

      expect(account.id).toBeDefined();
      expect(account.code).toBe('411000');
      expect(account.accountClass).toBe('4');
    });

    it('should reject invalid class code', async () => {
      await expect(
        planComptableService.createAccount({
          code: '011000',
          name: 'Invalide',
          accountClass: '0',
          accountType: 'bilan',
          level: 4,
          normalBalance: 'debit',
          isReconcilable: false,
          isActive: true,
        })
      ).rejects.toThrow('Classe de compte invalide');
    });

    it('should reject duplicate code', async () => {
      await planComptableService.createAccount({
        code: '521000',
        name: 'Banque',
        accountClass: '5',
        accountType: 'bilan',
        level: 4,
        normalBalance: 'debit',
        isReconcilable: true,
        isActive: true,
      });

      await expect(
        planComptableService.createAccount({
          code: '521000',
          name: 'Banque duplicate',
          accountClass: '5',
          accountType: 'bilan',
          level: 4,
          normalBalance: 'debit',
          isReconcilable: true,
          isActive: true,
        })
      ).rejects.toThrow('existe déjà');
    });

    it('should reject short code', async () => {
      await expect(
        planComptableService.createAccount({
          code: '4',
          name: 'Trop court',
          accountClass: '4',
          accountType: 'bilan',
          level: 1,
          normalBalance: 'debit',
          isReconcilable: false,
          isActive: true,
        })
      ).rejects.toThrow('au moins 2 caractères');
    });

    it('should reject non-numeric code', async () => {
      await expect(
        planComptableService.createAccount({
          code: '41A000',
          name: 'Alpha',
          accountClass: '4',
          accountType: 'bilan',
          level: 4,
          normalBalance: 'debit',
          isReconcilable: false,
          isActive: true,
        })
      ).rejects.toThrow('que des chiffres');
    });
  });

  describe('getAccounts', () => {
    beforeEach(async () => {
      await planComptableService.createAccount({
        code: '101000', name: 'Capital social', accountClass: '1', accountType: 'bilan',
        level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true,
      });
      await planComptableService.createAccount({
        code: '411000', name: 'Clients', accountClass: '4', accountType: 'bilan',
        level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true,
      });
      await planComptableService.createAccount({
        code: '521000', name: 'Banque', accountClass: '5', accountType: 'bilan',
        level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true,
      });
    });

    it('should return all accounts sorted by code', async () => {
      const accounts = await planComptableService.getAccounts();
      expect(accounts.length).toBe(3);
      expect(accounts[0].code).toBe('101000');
      expect(accounts[2].code).toBe('521000');
    });

    it('should filter by class', async () => {
      const accounts = await planComptableService.getAccounts({ accountClass: '4' });
      expect(accounts.length).toBe(1);
      expect(accounts[0].code).toBe('411000');
    });

    it('should filter by search', async () => {
      const accounts = await planComptableService.getAccounts({ search: 'banque' });
      expect(accounts.length).toBe(1);
      expect(accounts[0].code).toBe('521000');
    });
  });

  describe('getAccountByCode', () => {
    it('should return account by code', async () => {
      await planComptableService.createAccount({
        code: '601000', name: 'Achats', accountClass: '6', accountType: 'gestion',
        level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true,
      });

      const account = await planComptableService.getAccountByCode('601000');
      expect(account).toBeDefined();
      expect(account!.name).toBe('Achats');
    });

    it('should return null for unknown code', async () => {
      const account = await planComptableService.getAccountByCode('999999');
      expect(account).toBeNull();
    });
  });

  describe('updateAccount', () => {
    it('should update account name', async () => {
      const account = await planComptableService.createAccount({
        code: '701000', name: 'Ventes', accountClass: '7', accountType: 'gestion',
        level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true,
      });

      const updated = await planComptableService.updateAccount(account.id, {
        name: 'Ventes de marchandises',
      });

      expect(updated.name).toBe('Ventes de marchandises');
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account without entries', async () => {
      const account = await planComptableService.createAccount({
        code: '471000', name: 'Comptes d\'attente', accountClass: '4', accountType: 'bilan',
        level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true,
      });

      await planComptableService.deactivateAccount(account.id);

      const found = await planComptableService.getAccountByCode('471000');
      expect(found!.isActive).toBe(false);
    });

    it('should throw for account with entries', async () => {
      const account = await planComptableService.createAccount({
        code: '411000', name: 'Clients', accountClass: '4', accountType: 'bilan',
        level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true,
      });

      // Add an entry referencing this account
      await db.journalEntries.add({
        id: 'E1',
        entryNumber: 'VT-001',
        journal: 'VT',
        date: '2025-06-15',
        reference: 'FAC-001',
        label: 'Vente',
        status: 'validated',
        lines: [
          { id: 'L1', accountCode: '411000', accountName: 'Clients', label: 'Client', debit: 100000, credit: 0 },
          { id: 'L2', accountCode: '701000', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 100000 },
        ],
        totalDebit: 100000,
        totalCredit: 100000,
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      });

      await expect(
        planComptableService.deactivateAccount(account.id)
      ).rejects.toThrow('a des écritures');
    });
  });

  describe('getHierarchy', () => {
    it('should group accounts by class', async () => {
      await planComptableService.createAccount({
        code: '101000', name: 'Capital', accountClass: '1', accountType: 'bilan',
        level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true,
      });
      await planComptableService.createAccount({
        code: '411000', name: 'Clients', accountClass: '4', accountType: 'bilan',
        level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true,
      });

      const hierarchy = await planComptableService.getHierarchy();
      expect(hierarchy.length).toBe(2);

      const class1 = hierarchy.find(h => h.classCode === '1');
      expect(class1).toBeDefined();
      expect(class1!.totalAccounts).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should compute statistics', async () => {
      await planComptableService.createAccount({
        code: '411000', name: 'Clients', accountClass: '4', accountType: 'bilan',
        level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true,
      });
      await planComptableService.createAccount({
        code: '701000', name: 'Ventes', accountClass: '7', accountType: 'gestion',
        level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true,
      });

      const stats = await planComptableService.getStats();
      expect(stats.totalAccounts).toBe(2);
      expect(stats.activeAccounts).toBe(2);
      expect(stats.reconcilableAccounts).toBe(1);
      expect(stats.classBreakdown.length).toBe(2);
    });
  });

  describe('seedDefaultPlan', () => {
    it('should seed default SYSCOHADA accounts', async () => {
      const count = await planComptableService.seedDefaultPlan();
      expect(count).toBeGreaterThan(30); // At least 30+ default accounts

      const accounts = await planComptableService.getAccounts();
      const codes = accounts.map(a => a.code);
      expect(codes).toContain('101000');
      expect(codes).toContain('411000');
      expect(codes).toContain('521000');
      expect(codes).toContain('601000');
      expect(codes).toContain('701000');
    });

    it('should not seed again if accounts exist', async () => {
      await planComptableService.seedDefaultPlan();
      const secondCount = await planComptableService.seedDefaultPlan();
      expect(secondCount).toBe(0);
    });
  });

  describe('exportPlanComptable', () => {
    it('should export as CSV', async () => {
      await planComptableService.createAccount({
        code: '411000', name: 'Clients', accountClass: '4', accountType: 'bilan',
        level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true,
      });

      const blob = await planComptableService.exportPlanComptable();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toContain('csv');
    });
  });

  describe('getClassDefinitions', () => {
    it('should return all SYSCOHADA classes', () => {
      const classes = planComptableService.getClassDefinitions();
      expect(Object.keys(classes).length).toBe(9);
      expect(classes['1'].name).toContain('Capitaux');
      expect(classes['6'].normalBalance).toBe('debit');
      expect(classes['7'].normalBalance).toBe('credit');
    });
  });
});
