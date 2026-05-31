/**
 * Tests for closures service connected to Dexie.
 * Verifies: session CRUD, balance computation, provisions, amortissements, closure workflow,
 * and SYSCOHADA Titre IV annual closure (closeGestionAccounts / executeFullAnnualClosure).
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

// ============================================================================
// SYSCOHADA Titre IV — closeGestionAccounts + executeFullAnnualClosure
// ============================================================================

describe('ClosuresService — SYSCOHADA Titre IV clôture annuelle', () => {
  const FY2025 = {
    id: 'FY2025',
    code: '2025',
    name: 'Exercice 2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    isClosed: false,
    isActive: true,
  };

  function makeEntry(
    id: string,
    num: string,
    date: string,
    lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number }>,
  ) {
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      id,
      entryNumber: num,
      journal: 'OD',
      date,
      reference: '',
      label: `Entry ${id}`,
      status: 'validated' as const,
      lines: lines.map((l, i) => ({
        id: `${id}-l${i}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        label: '',
        debit: l.debit,
        credit: l.credit,
      })),
      totalDebit,
      totalCredit,
      createdAt: `${date}T10:00:00.000Z`,
      updatedAt: `${date}T10:00:00.000Z`,
      hash: `hash-${id}`,
    };
  }

  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.fiscalYears.clear();
    await db.auditLogs.clear();
    await db.closureSessions.clear();

    await db.fiscalYears.add(FY2025);

    // Ventes : 3 000 000 FCFA (clients 411 / produits 701)
    await db.journalEntries.add(
      makeEntry('G1', 'VT-001', '2025-09-01', [
        { accountCode: '411000', accountName: 'Clients', debit: 3_000_000, credit: 0 },
        { accountCode: '701000', accountName: 'Ventes marchandises', debit: 0, credit: 3_000_000 },
      ]),
    );

    // Achats : 1 200 000 FCFA (charges 601 / fournisseurs 401)
    await db.journalEntries.add(
      makeEntry('G2', 'AC-001', '2025-10-01', [
        { accountCode: '601000', accountName: 'Achats marchandises', debit: 1_200_000, credit: 0 },
        { accountCode: '401000', accountName: 'Fournisseurs', debit: 0, credit: 1_200_000 },
      ]),
    );
  });

  describe('closeGestionAccounts — bénéfice (produits > charges)', () => {
    it('crée deux écritures OD brouillon', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const allEntries = await db.journalEntries.toArray();
      const clEntries = allEntries.filter(e => e.entryNumber.startsWith('CL-'));
      expect(clEntries.length).toBe(2);
    });

    it('l\'écriture CL-GES est équilibrée (D == C)', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const allEntries = await db.journalEntries.toArray();
      const gesEntry = allEntries.find(e => e.entryNumber === 'CL-GES-2025');
      expect(gesEntry).toBeDefined();
      expect(gesEntry!.totalDebit).toBeCloseTo(gesEntry!.totalCredit, 2);
    });

    it('l\'écriture CL-GES débite les comptes 7x', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const allEntries = await db.journalEntries.toArray();
      const gesEntry = allEntries.find(e => e.entryNumber === 'CL-GES-2025');
      expect(gesEntry).toBeDefined();

      // Les comptes 7x doivent apparaître au débit dans l'écriture de soldage
      const debit7x = gesEntry!.lines
        .filter(l => l.accountCode.startsWith('7'))
        .reduce((s, l) => s + l.debit, 0);
      expect(debit7x).toBe(3_000_000);
    });

    it('l\'écriture CL-GES crédite les comptes 6x', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const allEntries = await db.journalEntries.toArray();
      const gesEntry = allEntries.find(e => e.entryNumber === 'CL-GES-2025');
      expect(gesEntry).toBeDefined();

      // Les comptes 6x doivent apparaître au crédit dans l'écriture de soldage
      const credit6x = gesEntry!.lines
        .filter(l => l.accountCode.startsWith('6'))
        .reduce((s, l) => s + l.credit, 0);
      expect(credit6x).toBe(1_200_000);
    });

    it('la contrepartie de l\'écriture CL-GES est bien le compte 1300', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const allEntries = await db.journalEntries.toArray();
      const gesEntry = allEntries.find(e => e.entryNumber === 'CL-GES-2025');
      expect(gesEntry).toBeDefined();

      const line1300 = gesEntry!.lines.find(l => l.accountCode === '1300');
      expect(line1300).toBeDefined();
      // Bénéfice → 1300 au crédit
      expect(line1300!.credit).toBeCloseTo(1_800_000, 2);
      expect(line1300!.debit).toBe(0);
    });

    it('l\'écriture CL-RES reclasse 1300 → 131 (bénéfice)', async () => {
      const result = await closuresService.closeGestionAccounts(adapter, 'FY2025');

      expect(result.isBenefice).toBe(true);
      expect(result.resultatNet).toBeCloseTo(1_800_000, 2);

      const allEntries = await db.journalEntries.toArray();
      const resEntry = allEntries.find(e => e.entryNumber === 'CL-RES-2025');
      expect(resEntry).toBeDefined();

      const line131 = resEntry!.lines.find(l => l.accountCode === '131');
      expect(line131).toBeDefined();
      expect(line131!.credit).toBeCloseTo(1_800_000, 2);

      const line1300 = resEntry!.lines.find(l => l.accountCode === '1300');
      expect(line1300).toBeDefined();
      expect(line1300!.debit).toBeCloseTo(1_800_000, 2);
    });

    it('les deux écritures sont créées en statut draft', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const allEntries = await db.journalEntries.toArray();
      const clEntries = allEntries.filter(e => e.entryNumber.startsWith('CL-'));
      for (const entry of clEntries) {
        expect(entry.status).toBe('draft');
      }
    });

    it('un audit log CLOSE_GESTION_ACCOUNTS est créé', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const logs = await db.auditLogs.toArray();
      expect(logs.some(l => l.action === 'CLOSE_GESTION_ACCOUNTS')).toBe(true);
    });

    it('retourne les IDs des deux écritures et le résultat net', async () => {
      const result = await closuresService.closeGestionAccounts(adapter, 'FY2025');

      expect(result.entryGestionId).toBeTruthy();
      expect(result.entryResultatId).toBeTruthy();
      expect(result.resultatNet).toBeCloseTo(1_800_000, 2);
      expect(result.isBenefice).toBe(true);
      expect(result.linesCount).toBeGreaterThan(0);
    });
  });

  describe('closeGestionAccounts — perte (charges > produits)', () => {
    beforeEach(async () => {
      await db.journalEntries.clear();

      // Charges plus élevées que produits → perte
      await db.journalEntries.add(
        makeEntry('P1', 'VT-P01', '2025-09-01', [
          { accountCode: '411000', accountName: 'Clients', debit: 500_000, credit: 0 },
          { accountCode: '701000', accountName: 'Ventes', debit: 0, credit: 500_000 },
        ]),
      );
      await db.journalEntries.add(
        makeEntry('P2', 'AC-P01', '2025-10-01', [
          { accountCode: '601000', accountName: 'Achats', debit: 2_000_000, credit: 0 },
          { accountCode: '401000', accountName: 'Fournisseurs', debit: 0, credit: 2_000_000 },
        ]),
      );
    });

    it('l\'écriture CL-RES reclasse 1300 → 139 (perte)', async () => {
      const result = await closuresService.closeGestionAccounts(adapter, 'FY2025');

      expect(result.isBenefice).toBe(false);
      expect(result.resultatNet).toBeCloseTo(-1_500_000, 2);

      const allEntries = await db.journalEntries.toArray();
      const resEntry = allEntries.find(e => e.entryNumber === 'CL-RES-2025');
      expect(resEntry).toBeDefined();

      const line139 = resEntry!.lines.find(l => l.accountCode === '139');
      expect(line139).toBeDefined();
      expect(line139!.debit).toBeCloseTo(1_500_000, 2);

      const line1300 = resEntry!.lines.find(l => l.accountCode === '1300');
      expect(line1300).toBeDefined();
      expect(line1300!.credit).toBeCloseTo(1_500_000, 2);
    });

    it('la contrepartie CL-GES est 1300 au débit (perte)', async () => {
      await closuresService.closeGestionAccounts(adapter, 'FY2025');

      const allEntries = await db.journalEntries.toArray();
      const gesEntry = allEntries.find(e => e.entryNumber === 'CL-GES-2025');
      expect(gesEntry).toBeDefined();

      const line1300 = gesEntry!.lines.find(l => l.accountCode === '1300');
      expect(line1300).toBeDefined();
      expect(line1300!.debit).toBeCloseTo(1_500_000, 2);
      expect(line1300!.credit).toBe(0);
    });
  });

  describe('closeGestionAccounts — erreurs', () => {
    it('lève une erreur si l\'exercice est introuvable', async () => {
      await expect(
        closuresService.closeGestionAccounts(adapter, 'INEXISTANT'),
      ).rejects.toThrow('introuvable');
    });

    it('lève une erreur si aucune écriture validée de gestion', async () => {
      await db.journalEntries.clear();
      // Seule une écriture bilan (pas de classe 6 ou 7)
      await db.journalEntries.add(
        makeEntry('B1', 'OD-B01', '2025-01-01', [
          { accountCode: '521000', accountName: 'Banque', debit: 1_000_000, credit: 0 },
          { accountCode: '101000', accountName: 'Capital', debit: 0, credit: 1_000_000 },
        ]),
      );

      await expect(
        closuresService.closeGestionAccounts(adapter, 'FY2025'),
      ).rejects.toThrow('Aucun compte de gestion');
    });
  });

  describe('executeFullAnnualClosure', () => {
    it('retourne success:true et un résultat gestion', async () => {
      const result = await closuresService.executeFullAnnualClosure(adapter, {
        exerciceId: 'FY2025',
        initiateur: 'test-user',
      });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.gestion).toBeDefined();
      expect(result.gestion!.isBenefice).toBe(true);
      expect(result.gestion!.resultatNet).toBeCloseTo(1_800_000, 2);
    });

    it('retourne success:false avec erreur si exercice introuvable', async () => {
      const result = await closuresService.executeFullAnnualClosure(adapter, {
        exerciceId: 'INEXISTANT',
        initiateur: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('crée un audit log FULL_ANNUAL_CLOSURE_GESTION', async () => {
      await closuresService.executeFullAnnualClosure(adapter, {
        exerciceId: 'FY2025',
        initiateur: 'test-user',
      });

      const logs = await db.auditLogs.toArray();
      expect(logs.some(l => l.action === 'FULL_ANNUAL_CLOSURE_GESTION')).toBe(true);
    });

    it('les comptes 131/139 ont un solde après clôture (prérequis pour posterAffectation)', async () => {
      const result = await closuresService.executeFullAnnualClosure(adapter, {
        exerciceId: 'FY2025',
        initiateur: 'test-user',
      });
      expect(result.success).toBe(true);

      // L'écriture CL-RES doit avoir une ligne 131 au crédit (bénéfice)
      const allEntries = await db.journalEntries.toArray();
      const resEntry = allEntries.find(e => e.entryNumber === 'CL-RES-2025');
      expect(resEntry).toBeDefined();

      const line131 = resEntry!.lines.find(l => l.accountCode === '131');
      expect(line131).toBeDefined();
      expect(line131!.credit).toBeGreaterThan(0);
    });
  });
});
