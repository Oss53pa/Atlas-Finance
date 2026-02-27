/**
 * Tests — recoveryService (P3-2)
 *
 * Couvre :
 * - CRUD dossiers de recouvrement
 * - Actions de relance
 * - Détection créances depuis comptes 411
 * - Statistiques temps réel
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  getDossiers,
  createDossier,
  updateDossier,
  deleteDossier,
  addAction,
  getActions,
  getCreances,
  getStats,
} from '../features/recovery/services/recoveryService';

const adapter = createTestAdapter();

beforeEach(async () => {
  await db.recoveryCases.clear();
  await db.journalEntries.clear();
});

// ============================================================================
// CRUD DOSSIERS
// ============================================================================

describe('CRUD dossiers de recouvrement', () => {
  it('crée un dossier et le récupère', async () => {
    const dossier = await createDossier(adapter, {
      client: 'COSMOS MALL',
      montantPrincipal: 5_000_000,
      interets: 250_000,
      frais: 50_000,
      responsable: 'Jean Dupont',
    });

    expect(dossier.id).toBeDefined();
    expect(dossier.client).toBe('COSMOS MALL');
    expect(dossier.montantTotal).toBe(5_300_000);

    const all = await getDossiers(adapter);
    expect(all).toHaveLength(1);
    expect(all[0].client).toBe('COSMOS MALL');
  });

  it('met à jour un dossier', async () => {
    const dossier = await createDossier(adapter, {
      client: 'Client A',
      montantPrincipal: 1_000_000,
    });

    const updated = await updateDossier(adapter, dossier.id, {
      montantPaye: 500_000,
      statut: 'suspendu',
    });

    expect(updated.montantPaye).toBe(500_000);
    expect(updated.statut).toBe('suspendu');
  });

  it('supprime un dossier', async () => {
    const dossier = await createDossier(adapter, { client: 'À supprimer' });
    await deleteDossier(adapter, dossier.id);

    const all = await getDossiers(adapter);
    expect(all).toHaveLength(0);
  });
});

// ============================================================================
// ACTIONS
// ============================================================================

describe('Actions de relance', () => {
  it('ajoute et récupère des actions', async () => {
    const dossier = await createDossier(adapter, { client: 'Client X' });

    await addAction(adapter, dossier.id, {
      type: 'APPEL',
      resultat: 'Client joint, promet paiement',
      responsable: 'Agent 1',
    });
    await addAction(adapter, dossier.id, {
      type: 'EMAIL',
      resultat: 'Relance envoyée',
      responsable: 'Agent 2',
    });

    const actions = await getActions(adapter, dossier.id);
    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe('APPEL');
    expect(actions[1].type).toBe('EMAIL');
  });
});

// ============================================================================
// CRÉANCES (depuis écritures 411)
// ============================================================================

describe('Détection créances depuis écritures', () => {
  it('détecte les créances clients avec solde débiteur', async () => {
    // Facture client : Débit 4110001, Crédit 701
    await db.journalEntries.add({
      id: 'e1',
      entryNumber: 'VE-001',
      journal: 'VE',
      date: '2025-01-15',
      reference: 'FA-001',
      label: 'Facture client A',
      status: 'posted',
      lines: [
        { id: 'l1', accountCode: '4110001', accountName: 'Client A', label: 'Facture', debit: 2_000_000, credit: 0 },
        { id: 'l2', accountCode: '701', accountName: 'Ventes', label: 'Facture', debit: 0, credit: 2_000_000 },
      ],
      totalDebit: 2_000_000,
      totalCredit: 2_000_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Paiement partiel : Débit 521, Crédit 4110001
    await db.journalEntries.add({
      id: 'e2',
      entryNumber: 'BQ-001',
      journal: 'BQ',
      date: '2025-02-10',
      reference: 'REG-001',
      label: 'Règlement client A',
      status: 'posted',
      lines: [
        { id: 'l3', accountCode: '521', accountName: 'Banque', label: 'Règlement', debit: 800_000, credit: 0 },
        { id: 'l4', accountCode: '4110001', accountName: 'Client A', label: 'Règlement', debit: 0, credit: 800_000 },
      ],
      totalDebit: 800_000,
      totalCredit: 800_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const creances = await getCreances(adapter);
    expect(creances).toHaveLength(1);
    expect(creances[0].client).toBe('Client A');
    expect(creances[0].montantRestant).toBe(1_200_000); // 2M - 800K
    expect(creances[0].jourRetard).toBeGreaterThan(0);
  });

  it('ignore les comptes soldés', async () => {
    await db.journalEntries.add({
      id: 'e3',
      entryNumber: 'VE-002',
      journal: 'VE',
      date: '2025-03-01',
      reference: 'FA-002',
      label: 'Facture soldée',
      status: 'posted',
      lines: [
        { id: 'l5', accountCode: '4110002', accountName: 'Client B', label: 'Facture', debit: 500_000, credit: 0 },
        { id: 'l6', accountCode: '701', accountName: 'Ventes', label: 'Facture', debit: 0, credit: 500_000 },
      ],
      totalDebit: 500_000,
      totalCredit: 500_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.journalEntries.add({
      id: 'e4',
      entryNumber: 'BQ-002',
      journal: 'BQ',
      date: '2025-03-15',
      reference: 'REG-002',
      label: 'Règlement total',
      status: 'posted',
      lines: [
        { id: 'l7', accountCode: '521', accountName: 'Banque', label: 'Règlement', debit: 500_000, credit: 0 },
        { id: 'l8', accountCode: '4110002', accountName: 'Client B', label: 'Règlement', debit: 0, credit: 500_000 },
      ],
      totalDebit: 500_000,
      totalCredit: 500_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const creances = await getCreances(adapter);
    expect(creances).toHaveLength(0);
  });
});

// ============================================================================
// STATISTIQUES
// ============================================================================

describe('Statistiques recouvrement', () => {
  it('calcule les stats depuis les dossiers réels', async () => {
    await createDossier(adapter, {
      client: 'Client A',
      montantPrincipal: 3_000_000,
      montantPaye: 1_000_000,
      statut: 'actif',
    });
    await createDossier(adapter, {
      client: 'Client B',
      montantPrincipal: 2_000_000,
      montantPaye: 2_000_000,
      statut: 'cloture',
    });

    const stats = await getStats(adapter);
    expect(stats.totalCreances).toBe(2);
    expect(stats.montantTotal).toBe(5_000_000);
    expect(stats.dossiersActifs).toBe(1);
    expect(stats.dossiersResolus).toBe(1);
    expect(stats.tauxRecouvrement).toBe(60); // 3M payé / 5M total
  });

  it('fallback sur créances comptables si pas de dossiers', async () => {
    await db.journalEntries.add({
      id: 'e5',
      entryNumber: 'VE-003',
      journal: 'VE',
      date: '2025-01-01',
      reference: 'FA-003',
      label: 'Facture impayée',
      status: 'posted',
      lines: [
        { id: 'l9', accountCode: '4110003', accountName: 'Client C', label: '', debit: 1_500_000, credit: 0 },
        { id: 'l10', accountCode: '701', accountName: 'Ventes', label: '', debit: 0, credit: 1_500_000 },
      ],
      totalDebit: 1_500_000,
      totalCredit: 1_500_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const stats = await getStats(adapter);
    expect(stats.totalCreances).toBe(1);
    expect(stats.montantTotal).toBe(1_500_000);
  });
});
