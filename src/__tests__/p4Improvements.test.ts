/**
 * P4 Improvements Tests
 * P4-2: Cash control (caisse >= 0)
 * P4-3: Abnormal balance alerts
 * P4-5: Asset disposal automation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { safeAddEntry, EntryGuardError } from '../services/entryGuard';
import { createTestAdapter } from '../test/createTestAdapter';
import { computeDepreciations, disposeAsset } from '../features/assets/services/depreciationPostingService';
import { detectAbnormalBalances } from '../features/balance/services/balanceService';
import { Money } from '../utils/money';
import type { DBAsset } from '../lib/db';

/** Helper: compute expected depreciation values the same way the service does */
function expectedDepreciation(acqDate: string, dispDate: string, acqValue: number, residual: number, years: number) {
  const base = acqValue - residual;
  const annualDep = base / years;
  const acq = new Date(acqDate);
  const disp = new Date(dispDate);
  const yearsElapsed = Math.min(
    (disp.getTime() - acq.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    years,
  );
  const amort = new Money(annualDep).multiply(yearsElapsed).round().toNumber();
  const vnc = new Money(acqValue).subtract(new Money(amort)).toNumber();
  return { amort, vnc, yearsElapsed };
}

const adapter = createTestAdapter();

// ============================================================================
// SEED DATA
// ============================================================================

async function seedAccounts() {
  await db.accounts.bulkPut([
    { id: '1', code: '601000', name: 'Achats', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: '2', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: '3', code: '571000', name: 'Caisse', accountClass: '5', accountType: 'cash', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: '4', code: '521000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: '5', code: '411000', name: 'Clients', accountClass: '4', accountType: 'receivable', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
    { id: '6', code: '701000', name: 'Ventes', accountClass: '7', accountType: 'revenue', level: 3, normalBalance: 'credit', isReconcilable: false, isActive: true },
  ]);

  await db.fiscalYears.bulkPut([
    { id: 'fy-2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.journalEntries.clear();
  await db.assets.clear();
  await seedAccounts();
});

// ============================================================================
// P4-2 : Controle caisse >= 0
// ============================================================================

describe('P4-2: Cash control (caisse >= 0)', () => {
  it('autorise un debit caisse (entree de fonds)', async () => {
    const id = await safeAddEntry(adapter, {
      id: 'cash-in-1',
      entryNumber: 'CA-001',
      date: '2026-03-01',
      journal: 'CA',
      label: 'Encaissement client',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '571000', accountName: 'Caisse', label: 'Encaissement', debit: 500_000, credit: 0 },
        { id: 'l2', accountCode: '411000', accountName: 'Clients', label: 'Client X', debit: 0, credit: 500_000 },
      ],
      createdAt: '2026-03-01T10:00:00.000Z',
    });
    expect(id).toBe('cash-in-1');
  });

  it('autorise un credit caisse si le solde reste positif', async () => {
    // Seed: caisse a 500_000
    await safeAddEntry(adapter, {
      id: 'cash-seed',
      entryNumber: 'CA-010',
      date: '2026-03-01',
      journal: 'CA',
      label: 'Encaissement initial',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '571000', accountName: 'Caisse', label: 'Encaissement', debit: 500_000, credit: 0 },
        { id: 'l2', accountCode: '411000', accountName: 'Clients', label: 'Client', debit: 0, credit: 500_000 },
      ],
      createdAt: '2026-03-01T10:00:00.000Z',
    });

    // Retrait de 300_000 -> solde reste 200_000 >= 0
    const id = await safeAddEntry(adapter, {
      id: 'cash-out-ok',
      entryNumber: 'CA-011',
      date: '2026-03-02',
      journal: 'CA',
      label: 'Paiement fournisseur',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l3', accountCode: '601000', accountName: 'Achats', label: 'Achat', debit: 300_000, credit: 0 },
        { id: 'l4', accountCode: '571000', accountName: 'Caisse', label: 'Paiement', debit: 0, credit: 300_000 },
      ],
      createdAt: '2026-03-02T10:00:00.000Z',
    });
    expect(id).toBe('cash-out-ok');
  });

  it('rejette un credit caisse rendant le solde negatif', async () => {
    // Caisse vide (solde = 0) -> retrait de 100_000 -> solde = -100_000
    await expect(
      safeAddEntry(adapter, {
        id: 'cash-negative',
        entryNumber: 'CA-020',
        date: '2026-03-01',
        journal: 'CA',
        label: 'Paiement impossible',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'l1', accountCode: '601000', accountName: 'Achats', label: 'Achat', debit: 100_000, credit: 0 },
          { id: 'l2', accountCode: '571000', accountName: 'Caisse', label: 'Paiement', debit: 0, credit: 100_000 },
        ],
        createdAt: '2026-03-01T10:00:00.000Z',
      })
    ).rejects.toThrow(EntryGuardError);
  });

  it('rejette un credit caisse depassant le solde existant', async () => {
    // Seed: caisse a 200_000
    await safeAddEntry(adapter, {
      id: 'cash-seed2',
      entryNumber: 'CA-030',
      date: '2026-03-01',
      journal: 'CA',
      label: 'Encaissement',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '571000', accountName: 'Caisse', label: 'Encaissement', debit: 200_000, credit: 0 },
        { id: 'l2', accountCode: '411000', accountName: 'Clients', label: 'Client', debit: 0, credit: 200_000 },
      ],
      createdAt: '2026-03-01T10:00:00.000Z',
    });

    // Retrait de 500_000 > solde 200_000
    await expect(
      safeAddEntry(adapter, {
        id: 'cash-exceed',
        entryNumber: 'CA-031',
        date: '2026-03-02',
        journal: 'CA',
        label: 'Paiement excessif',
        reference: '',
        status: 'draft',
        lines: [
          { id: 'l3', accountCode: '601000', accountName: 'Achats', label: 'Achat', debit: 500_000, credit: 0 },
          { id: 'l4', accountCode: '571000', accountName: 'Caisse', label: 'Paiement', debit: 0, credit: 500_000 },
        ],
        createdAt: '2026-03-02T10:00:00.000Z',
      })
    ).rejects.toThrow('Solde caisse négatif interdit');
  });

  it('ne bloque pas les ecritures sur des comptes non-caisse', async () => {
    // Banque peut avoir un solde negatif (decouvert)
    const id = await safeAddEntry(adapter, {
      id: 'bank-ok',
      entryNumber: 'BQ-001',
      date: '2026-03-01',
      journal: 'BQ',
      label: 'Paiement par banque',
      reference: '',
      status: 'draft',
      lines: [
        { id: 'l1', accountCode: '601000', accountName: 'Achats', label: 'Achat', debit: 1_000_000, credit: 0 },
        { id: 'l2', accountCode: '521000', accountName: 'Banque', label: 'Paiement', debit: 0, credit: 1_000_000 },
      ],
      createdAt: '2026-03-01T10:00:00.000Z',
    });
    expect(id).toBe('bank-ok');
  });
});

// ============================================================================
// P4-3 : Alertes soldes anormaux
// ============================================================================

describe('P4-3: Abnormal balance alerts', () => {
  it('detecte un client avec solde crediteur', async () => {
    // Ecriture: credit 411000 > debit 411000 -> solde crediteur
    await db.journalEntries.add({
      id: 'je-abn1',
      entryNumber: 'VT-001',
      date: '2026-03-01',
      journal: 'VT',
      label: 'Avoir client',
      reference: '',
      status: 'posted',
      lines: [
        { id: 'l1', accountCode: '701000', accountName: 'Ventes', label: 'Avoir', debit: 100_000, credit: 0 },
        { id: 'l2', accountCode: '411000', accountName: 'Clients', label: 'Avoir client', debit: 0, credit: 100_000 },
      ],
      totalDebit: 100_000,
      totalCredit: 100_000,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    } as any);

    const alerts = await detectAbnormalBalances(adapter, {
      period: { from: '2026-01-01', to: '2026-12-31' },
      displayLevel: 3,
      showZeroBalance: false,
    });

    const clientAlert = alerts.find(a => a.type === 'client_crediteur');
    expect(clientAlert).toBeDefined();
    expect(clientAlert!.accountCode).toBe('411000');
  });

  it('detecte un fournisseur avec solde debiteur', async () => {
    // Ecriture: debit 401000 > credit 401000 -> solde debiteur
    await db.journalEntries.add({
      id: 'je-abn2',
      entryNumber: 'AC-001',
      date: '2026-03-01',
      journal: 'AC',
      label: 'Avance fournisseur',
      reference: '',
      status: 'posted',
      lines: [
        { id: 'l1', accountCode: '401000', accountName: 'Fournisseurs', label: 'Avance', debit: 200_000, credit: 0 },
        { id: 'l2', accountCode: '521000', accountName: 'Banque', label: 'Paiement', debit: 0, credit: 200_000 },
      ],
      totalDebit: 200_000,
      totalCredit: 200_000,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    } as any);

    const alerts = await detectAbnormalBalances(adapter, {
      period: { from: '2026-01-01', to: '2026-12-31' },
      displayLevel: 3,
      showZeroBalance: false,
    });

    const fournAlert = alerts.find(a => a.type === 'fournisseur_debiteur');
    expect(fournAlert).toBeDefined();
    expect(fournAlert!.accountCode).toBe('401000');
  });

  it('retourne vide quand aucun solde anormal', async () => {
    // Ecriture normale: debit 601, credit 401
    await db.journalEntries.add({
      id: 'je-normal',
      entryNumber: 'AC-010',
      date: '2026-03-01',
      journal: 'AC',
      label: 'Achat normal',
      reference: '',
      status: 'posted',
      lines: [
        { id: 'l1', accountCode: '601000', accountName: 'Achats', label: 'Achat', debit: 100_000, credit: 0 },
        { id: 'l2', accountCode: '401000', accountName: 'Fournisseurs', label: 'Fourn', debit: 0, credit: 100_000 },
      ],
      totalDebit: 100_000,
      totalCredit: 100_000,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    } as any);

    const alerts = await detectAbnormalBalances(adapter, {
      period: { from: '2026-01-01', to: '2026-12-31' },
      displayLevel: 3,
      showZeroBalance: false,
    });

    expect(alerts).toHaveLength(0);
  });
});

// ============================================================================
// P4-5 : Cession d'immobilisation
// ============================================================================

const makeAsset = (overrides?: Partial<DBAsset>): DBAsset => ({
  id: 'asset-1',
  code: 'IMM-001',
  name: 'Vehicule utilitaire',
  category: 'Materiel de transport',
  acquisitionDate: '2022-01-01',
  acquisitionValue: 10_000_000,
  residualValue: 1_000_000,
  depreciationMethod: 'linear',
  usefulLifeYears: 5,
  accountCode: '245',
  depreciationAccountCode: '2845',
  status: 'active',
  ...overrides,
});

describe('P4-5: Asset disposal (cession)', () => {
  it('calcule la VNC et la plus-value correctement', async () => {
    const asset = makeAsset();
    await db.assets.add(asset);

    const prixCession = 6_000_000;
    const result = await disposeAsset(adapter, {
      assetId: 'asset-1',
      disposalDate: '2025-01-01',
      prixCession,
    });

    const exp = expectedDepreciation('2022-01-01', '2025-01-01', 10_000_000, 1_000_000, 5);

    expect(result.valeurBrute).toBe(10_000_000);
    expect(result.amortissementsCumules).toBe(exp.amort);
    expect(result.vnc).toBe(exp.vnc);
    expect(result.plusOuMoinsValue).toBe(new Money(prixCession).subtract(new Money(exp.vnc)).toNumber());
  });

  it('genere l ecriture comptable SYSCOHADA correcte', async () => {
    const asset = makeAsset();
    await db.assets.add(asset);

    const exp = expectedDepreciation('2022-01-01', '2025-01-01', 10_000_000, 1_000_000, 5);

    const result = await disposeAsset(adapter, {
      assetId: 'asset-1',
      disposalDate: '2025-01-01',
      prixCession: 6_000_000,
    });

    const entry = await db.journalEntries.get(result.journalEntryId);
    expect(entry).toBeDefined();
    expect(entry!.lines.length).toBe(5);

    // Debit 2845 : reprise amortissements
    const amortLine = entry!.lines.find(l => l.accountCode === '2845');
    expect(amortLine).toBeDefined();
    expect(amortLine!.debit).toBe(exp.amort);

    // Debit 81 : VNC
    const vncLine = entry!.lines.find(l => l.accountCode === '81');
    expect(vncLine).toBeDefined();
    expect(vncLine!.debit).toBe(exp.vnc);

    // Credit 245 : sortie immobilisation (valeur brute)
    const assetLine = entry!.lines.find(l => l.accountCode === '245');
    expect(assetLine).toBeDefined();
    expect(assetLine!.credit).toBe(10_000_000);

    // Debit 521 : tresorerie (produit cession)
    const bankLine = entry!.lines.find(l => l.accountCode === '521');
    expect(bankLine).toBeDefined();
    expect(bankLine!.debit).toBe(6_000_000);

    // Credit 82 : produit cession HAO
    const prodLine = entry!.lines.find(l => l.accountCode === '82');
    expect(prodLine).toBeDefined();
    expect(prodLine!.credit).toBe(6_000_000);

    // Equilibre D = C
    expect(entry!.totalDebit).toBe(entry!.totalCredit);
  });

  it('met a jour le statut de l immobilisation a disposed', async () => {
    const asset = makeAsset();
    await db.assets.add(asset);

    await disposeAsset(adapter, {
      assetId: 'asset-1',
      disposalDate: '2025-01-01',
      prixCession: 3_000_000,
    });

    const updated = await db.assets.get('asset-1');
    expect(updated!.status).toBe('disposed');
  });

  it('calcule une moins-value quand prix < VNC', async () => {
    const asset = makeAsset();
    await db.assets.add(asset);

    const prixCession = 2_000_000;
    const exp = expectedDepreciation('2022-01-01', '2023-01-01', 10_000_000, 1_000_000, 5);

    const result = await disposeAsset(adapter, {
      assetId: 'asset-1',
      disposalDate: '2023-01-01',
      prixCession,
    });

    expect(result.vnc).toBe(exp.vnc);
    // Moins-value = prix - VNC
    expect(result.plusOuMoinsValue).toBe(new Money(prixCession).subtract(new Money(exp.vnc)).toNumber());
    expect(result.plusOuMoinsValue).toBeLessThan(0); // Confirms it's a loss
  });

  it('gere une cession a prix zero (mise au rebut)', async () => {
    const asset = makeAsset({ id: 'asset-scrap', code: 'IMM-002' });
    await db.assets.add(asset);

    const result = await disposeAsset(adapter, {
      assetId: 'asset-scrap',
      disposalDate: '2025-01-01',
      prixCession: 0,
    });

    expect(result.prixCession).toBe(0);

    const entry = await db.journalEntries.get(result.journalEntryId);
    // Pas de lignes 521/82 quand prix = 0
    expect(entry!.lines.length).toBe(3);
    expect(entry!.lines.find(l => l.accountCode === '521')).toBeUndefined();
    expect(entry!.lines.find(l => l.accountCode === '82')).toBeUndefined();
  });

  it('rejette une cession sur immobilisation inexistante', async () => {
    await expect(
      disposeAsset(adapter, {
        assetId: 'non-existent',
        disposalDate: '2025-01-01',
        prixCession: 1_000_000,
      })
    ).rejects.toThrow('Immobilisation introuvable');
  });

  it('rejette une cession sur immobilisation deja disposee', async () => {
    const asset = makeAsset({ id: 'asset-disposed', status: 'disposed' });
    await db.assets.add(asset);

    await expect(
      disposeAsset(adapter, {
        assetId: 'asset-disposed',
        disposalDate: '2025-01-01',
        prixCession: 1_000_000,
      })
    ).rejects.toThrow('déjà sortie');
  });
});
