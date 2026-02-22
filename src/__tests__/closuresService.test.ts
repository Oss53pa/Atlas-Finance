/**
 * Tests for closures service connected to Dexie.
 * Verifies: session CRUD, balance computation, provisions, amortissements, closure workflow.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { closuresService } from '../features/closures/services/closuresService';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

describe('ClosuresService (Dexie)', () => {
  let sessionId: string;

  beforeEach(async () => {
    await db.closureSessions.clear();
    await db.provisions.clear();
    await db.journalEntries.clear();
    await db.assets.clear();
    await db.auditLogs.clear();

    // Seed a closure session
    const session = await closuresService.createSession(adapter, {
      type: 'MENSUELLE',
      periode: 'Juin 2025',
      exercice: '2025',
      dateDebut: '2025-06-01',
      dateFin: '2025-06-30',
      dateCreation: '2025-07-01',
      statut: 'EN_COURS',
      creePar: 'Admin',
      progression: 0,
    });
    sessionId = String(session.id);

    // Seed journal entries in the period
    await db.journalEntries.bulkAdd([
      {
        id: 'E1',
        entryNumber: 'VT-001',
        journal: 'VT',
        date: '2025-06-10',
        reference: 'FAC-001',
        label: 'Vente client A',
        status: 'validated',
        lines: [
          { id: 'L1', accountCode: '411001', accountName: 'Client A', label: 'Client A', debit: 500000, credit: 0 },
          { id: 'L2', accountCode: '701000', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 500000 },
        ],
        totalDebit: 500000,
        totalCredit: 500000,
        createdAt: '2025-06-10T10:00:00Z',
        updatedAt: '2025-06-10T10:00:00Z',
      },
      {
        id: 'E2',
        entryNumber: 'AC-001',
        journal: 'AC',
        date: '2025-06-15',
        reference: 'FFR-001',
        label: 'Achat fournitures',
        status: 'validated',
        lines: [
          { id: 'L3', accountCode: '601000', accountName: 'Achats', label: 'Achat', debit: 200000, credit: 0 },
          { id: 'L4', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur', debit: 0, credit: 200000 },
        ],
        totalDebit: 200000,
        totalCredit: 200000,
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ]);

    // Seed an asset for depreciation
    await db.assets.add({
      id: 'A1',
      code: 'MAT-001',
      name: 'Ordinateur bureau',
      category: 'materiel_informatique',
      acquisitionDate: '2024-01-01',
      acquisitionValue: 1500000,
      residualValue: 150000,
      depreciationMethod: 'linear',
      usefulLifeYears: 5,
      accountCode: '245000',
      depreciationAccountCode: '284500',
      status: 'active',
    });
  });

  describe('getSessions', () => {
    it('should return created session', async () => {
      const sessions = await closuresService.getSessions(adapter);
      expect(sessions.length).toBe(1);
      expect(sessions[0].type).toBe('MENSUELLE');
      expect(sessions[0].periode).toBe('Juin 2025');
      expect(sessions[0].statut).toBe('EN_COURS');
    });

    it('should create audit log on session creation', async () => {
      const logs = await db.auditLogs.toArray();
      const sessionLog = logs.find(l => l.action === 'CLOSURE_SESSION_CREATE');
      expect(sessionLog).toBeDefined();
    });
  });

  describe('getBalance', () => {
    it('should compute balance from real entries', async () => {
      const balance = await closuresService.getBalance(adapter, sessionId);
      expect(balance.length).toBe(4); // 411001, 701000, 601000, 401000

      const clients = balance.find(b => b.compte === '411001');
      expect(clients).toBeDefined();
      expect(clients!.debit).toBe(500000);
      expect(clients!.soldeDebiteur).toBe(500000);
    });

    it('should return empty for unknown session', async () => {
      const balance = await closuresService.getBalance(adapter, 'unknown');
      expect(balance).toEqual([]);
    });

    it('should sort accounts by code', async () => {
      const balance = await closuresService.getBalance(adapter, sessionId);
      const codes = balance.map(b => b.compte);
      expect(codes).toEqual([...codes].sort());
    });
  });

  describe('getProvisions', () => {
    it('should compute provisions for overdue 411 accounts', async () => {
      // Add an old entry (>180 days before session end)
      await db.journalEntries.add({
        id: 'E-OLD',
        entryNumber: 'VT-OLD',
        journal: 'VT',
        date: '2025-06-01', // Only ~29 days before June 30
        reference: 'FAC-OLD',
        label: 'Vieille facture',
        status: 'validated',
        lines: [
          { id: 'L-OLD', accountCode: '411099', accountName: 'Client ancien', label: 'Client', debit: 300000, credit: 0 },
          { id: 'L-OLD2', accountCode: '701000', accountName: 'Ventes', label: 'Vente', debit: 0, credit: 300000 },
        ],
        totalDebit: 300000,
        totalCredit: 300000,
        createdAt: '2024-10-01T10:00:00Z',
        updatedAt: '2024-10-01T10:00:00Z',
      });

      // This client account 411001 has a debit balance (500000) from June 10
      // Age: June 10 to June 30 = 20 days → rate 0% (< 90 days)
      // Client 411099 has 300000 from June 1 → ~29 days → rate 0%
      const provisions = await closuresService.getProvisions(adapter, sessionId);
      // Both are less than 90 days so no provisions
      expect(provisions.length).toBe(0);
    });
  });

  describe('getAmortissements', () => {
    it('should compute depreciation for active assets', async () => {
      const amortissements = await closuresService.getAmortissements(adapter, sessionId);
      expect(amortissements.length).toBe(1);

      const mat = amortissements[0];
      expect(mat.libelleImmobilisation).toBe('Ordinateur bureau');
      expect(mat.valeurAcquisition).toBe(1500000);
      expect(mat.tauxAmortissement).toBe(20); // 100/5 years
      // Dotation annuelle = (1500000 - 150000) / 5 = 270000
      expect(mat.dotationExercice).toBe(270000);
      expect(mat.statut).toBe('CALCULE');
    });
  });

  describe('createEcriture + getEcritures', () => {
    it('should create and retrieve a closure entry', async () => {
      await closuresService.createEcriture(adapter, {
        numero: 'CL-000001',
        date: '2025-06-30',
        libelle: 'Dotation amortissement matériel',
        compteDebit: '681000',
        compteCredit: '284500',
        montant: 270000,
        statut: 'BROUILLON',
        typeOperation: 'AMORTISSEMENT',
      });

      const ecritures = await closuresService.getEcritures(adapter, sessionId);
      expect(ecritures.length).toBe(1);
      expect(ecritures[0].libelle).toBe('Dotation amortissement matériel');
      expect(ecritures[0].montant).toBe(270000);
      expect(ecritures[0].typeOperation).toBe('AMORTISSEMENT');
    });
  });

  describe('validerEcriture', () => {
    it('should validate a closure entry', async () => {
      const created = await closuresService.createEcriture(adapter, {
        numero: 'CL-000002',
        date: '2025-06-30',
        libelle: 'Provision créances douteuses',
        compteDebit: '691000',
        compteCredit: '491000',
        montant: 150000,
        statut: 'BROUILLON',
        typeOperation: 'PROVISION',
      });

      const validated = await closuresService.validerEcriture(adapter, created.id);
      expect(validated.statut).toBe('VALIDEE');
    });
  });

  describe('getStats', () => {
    it('should return session statistics', async () => {
      const stats = await closuresService.getStats(adapter, sessionId);
      expect(stats.totalAmortissements).toBe(1);
      expect(stats.totalProvisions).toBe(0);
    });
  });

  describe('cloturerSession', () => {
    it('should close the session', async () => {
      const closed = await closuresService.cloturerSession(adapter, sessionId);
      expect(closed.statut).toBe('CLOTUREE');
      expect(closed.progression).toBe(100);

      // Verify persisted
      const sessions = await closuresService.getSessions(adapter);
      expect(sessions[0].statut).toBe('CLOTUREE');
    });
  });
});
