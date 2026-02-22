/**
 * Tests pour le service de workflow de validation des écritures comptables.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import type { DBJournalEntry, DBAccount, DBFiscalYear } from '../lib/db';
import {
  validateEntry,
  postEntry,
  rejectEntry,
  bulkValidate,
  getWorkflowHistory,
  isTransitionAllowed,
  getPossibleTransitions,
  isEntryEditable,
  canValidateEntry,
  canPostEntry,
  canRejectEntry,
  type WorkflowStatus,
} from '../services/workflow/workflowService';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// TEST SETUP
// ============================================================================

async function setupTestData() {
  // Créer un exercice fiscal ouvert
  await db.fiscalYears.add({
    id: 'fy-2026',
    code: '2026',
    name: 'Exercice 2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isClosed: false,
    isActive: true,
  });

  // Créer des comptes pour les tests
  await db.accounts.bulkAdd([
    {
      id: 'acc-512',
      code: '512000',
      name: 'Banque',
      accountClass: '5',
      accountType: 'Trésorerie',
      level: 3,
      normalBalance: 'debit',
      isReconcilable: true,
      isActive: true,
    },
    {
      id: 'acc-707',
      code: '707000',
      name: 'Ventes de marchandises',
      accountClass: '7',
      accountType: 'Produits',
      level: 3,
      normalBalance: 'credit',
      isReconcilable: false,
      isActive: true,
    },
    {
      id: 'acc-411',
      code: '411000',
      name: 'Clients',
      accountClass: '4',
      accountType: 'Tiers',
      level: 3,
      normalBalance: 'debit',
      isReconcilable: true,
      isActive: true,
    },
  ]);
}

function createValidEntry(id: string, status: WorkflowStatus, createdBy?: string): DBJournalEntry {
  return {
    id,
    entryNumber: `VE-${id.slice(-6)}`,
    journal: 'VE',
    date: '2026-02-15',
    reference: 'FACTURE-001',
    label: 'Vente de marchandises',
    status,
    lines: [
      {
        id: `${id}-line-1`,
        accountCode: '512000',
        accountName: 'Banque',
        label: 'Encaissement',
        debit: 10000,
        credit: 0,
      },
      {
        id: `${id}-line-2`,
        accountCode: '707000',
        accountName: 'Ventes de marchandises',
        label: 'Vente',
        debit: 0,
        credit: 10000,
      },
    ],
    totalDebit: 10000,
    totalCredit: 10000,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
    createdBy,
  };
}

function createUnbalancedEntry(id: string): DBJournalEntry {
  return {
    id,
    entryNumber: `VE-${id.slice(-6)}`,
    journal: 'VE',
    date: '2026-02-15',
    reference: 'FACTURE-002',
    label: 'Écriture déséquilibrée',
    status: 'draft',
    lines: [
      {
        id: `${id}-line-1`,
        accountCode: '512000',
        accountName: 'Banque',
        label: 'Encaissement',
        debit: 10000,
        credit: 0,
      },
      {
        id: `${id}-line-2`,
        accountCode: '707000',
        accountName: 'Ventes de marchandises',
        label: 'Vente',
        debit: 0,
        credit: 8000, // Déséquilibre
      },
    ],
    totalDebit: 10000,
    totalCredit: 8000,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await setupTestData();
});

// ============================================================================
// TESTS: validateEntry (draft → validated)
// ============================================================================

describe('validateEntry', () => {
  it('devrait valider une écriture en brouillon équilibrée', async () => {
    const entry = createValidEntry('entry-001', 'draft');
    await db.journalEntries.add(entry);

    const result = await validateEntry(adapter, 'entry-001', 'user-comptable');

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    const updated = await db.journalEntries.get('entry-001');
    expect(updated?.status).toBe('validated');
  });

  it('devrait rejeter une écriture déséquilibrée', async () => {
    const entry = createUnbalancedEntry('entry-002');
    await db.journalEntries.add(entry);

    const result = await validateEntry(adapter, 'entry-002', 'user-comptable');

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('déséquilibrée'))).toBe(true);

    const updated = await db.journalEntries.get('entry-002');
    expect(updated?.status).toBe('draft'); // Statut inchangé
  });

  it('devrait rejeter une écriture avec moins de 2 lignes', async () => {
    const entry = createValidEntry('entry-003', 'draft');
    entry.lines = [entry.lines[0]]; // Une seule ligne
    await db.journalEntries.add(entry);

    const result = await validateEntry(adapter, 'entry-003', 'user-comptable');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('minimum 2 lignes'))).toBe(true);
  });

  it('devrait rejeter la validation d\'une écriture déjà validée', async () => {
    const entry = createValidEntry('entry-004', 'validated');
    await db.journalEntries.add(entry);

    const result = await validateEntry(adapter, 'entry-004', 'user-comptable');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Transition invalide'))).toBe(true);
  });

  it('devrait rejeter la validation d\'une écriture comptabilisée', async () => {
    const entry = createValidEntry('entry-005', 'posted');
    await db.journalEntries.add(entry);

    const result = await validateEntry(adapter, 'entry-005', 'user-comptable');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Transition invalide'))).toBe(true);
  });

  it('devrait retourner une erreur pour une écriture inexistante', async () => {
    const result = await validateEntry(adapter, 'entry-999', 'user-comptable');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Écriture introuvable');
  });

  it('devrait logger la transition dans les audits', async () => {
    const entry = createValidEntry('entry-006', 'draft');
    await db.journalEntries.add(entry);

    await validateEntry(adapter, 'entry-006', 'user-comptable');

    const logs = await db.auditLogs
      .where('entityId')
      .equals('entry-006')
      .toArray();

    expect(logs.length).toBeGreaterThan(0);
    const workflowLog = logs.find(l => l.action === 'WORKFLOW_TRANSITION');
    expect(workflowLog).toBeDefined();

    const transition = JSON.parse(workflowLog!.details);
    expect(transition.fromStatus).toBe('draft');
    expect(transition.toStatus).toBe('validated');
    expect(transition.userId).toBe('user-comptable');
  });
});

// ============================================================================
// TESTS: postEntry (validated → posted)
// ============================================================================

describe('postEntry', () => {
  it('devrait comptabiliser une écriture validée', async () => {
    const entry = createValidEntry('entry-101', 'validated', 'user-creator');
    await db.journalEntries.add(entry);

    const result = await postEntry(adapter, 'entry-101', 'user-approver');

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    const updated = await db.journalEntries.get('entry-101');
    expect(updated?.status).toBe('posted');
    expect(updated?.hash).toBeDefined();
    expect(updated?.hash).not.toBe('');
  });

  it('devrait rejeter la comptabilisation si créateur = approbateur', async () => {
    const entry = createValidEntry('entry-102', 'validated', 'user-same');
    await db.journalEntries.add(entry);

    const result = await postEntry(adapter, 'entry-102', 'user-same');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Séparation des tâches'))).toBe(true);

    const updated = await db.journalEntries.get('entry-102');
    expect(updated?.status).toBe('validated'); // Statut inchangé
  });

  it('devrait rejeter la comptabilisation d\'une écriture en brouillon', async () => {
    const entry = createValidEntry('entry-103', 'draft');
    await db.journalEntries.add(entry);

    const result = await postEntry(adapter, 'entry-103', 'user-approver');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Transition invalide'))).toBe(true);
  });

  it('devrait rejeter la comptabilisation d\'une écriture déjà comptabilisée', async () => {
    const entry = createValidEntry('entry-104', 'posted');
    await db.journalEntries.add(entry);

    const result = await postEntry(adapter, 'entry-104', 'user-approver');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Transition invalide'))).toBe(true);
  });

  it('devrait logger la transition dans les audits', async () => {
    const entry = createValidEntry('entry-105', 'validated', 'user-creator');
    await db.journalEntries.add(entry);

    await postEntry(adapter, 'entry-105', 'user-approver');

    const logs = await db.auditLogs
      .where('entityId')
      .equals('entry-105')
      .toArray();

    const workflowLog = logs.find(l => l.action === 'WORKFLOW_TRANSITION');
    expect(workflowLog).toBeDefined();

    const transition = JSON.parse(workflowLog!.details);
    expect(transition.fromStatus).toBe('validated');
    expect(transition.toStatus).toBe('posted');
    expect(transition.userId).toBe('user-approver');
  });

  it('devrait générer un hash si absent', async () => {
    const entry = createValidEntry('entry-106', 'validated', 'user-creator');
    delete entry.hash;
    await db.journalEntries.add(entry);

    const result = await postEntry(adapter, 'entry-106', 'user-approver');

    expect(result.success).toBe(true);

    const updated = await db.journalEntries.get('entry-106');
    expect(updated?.hash).toBeDefined();
    expect(updated?.hash).not.toBe('');
  });
});

// ============================================================================
// TESTS: rejectEntry (validated → draft)
// ============================================================================

describe('rejectEntry', () => {
  it('devrait rejeter une écriture validée avec raison', async () => {
    const entry = createValidEntry('entry-201', 'validated');
    await db.journalEntries.add(entry);

    const result = await rejectEntry(adapter, 'entry-201', 'user-reviewer', 'Montant incorrect');

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    const updated = await db.journalEntries.get('entry-201');
    expect(updated?.status).toBe('draft');
  });

  it('devrait refuser le rejet sans raison', async () => {
    const entry = createValidEntry('entry-202', 'validated');
    await db.journalEntries.add(entry);

    const result = await rejectEntry(adapter, 'entry-202', 'user-reviewer', '');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('raison de rejet'))).toBe(true);

    const updated = await db.journalEntries.get('entry-202');
    expect(updated?.status).toBe('validated'); // Statut inchangé
  });

  it('devrait refuser le rejet d\'une écriture en brouillon', async () => {
    const entry = createValidEntry('entry-203', 'draft');
    await db.journalEntries.add(entry);

    const result = await rejectEntry(adapter, 'entry-203', 'user-reviewer', 'Test');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Transition invalide'))).toBe(true);
  });

  it('devrait refuser le rejet d\'une écriture comptabilisée', async () => {
    const entry = createValidEntry('entry-204', 'posted');
    await db.journalEntries.add(entry);

    const result = await rejectEntry(adapter, 'entry-204', 'user-reviewer', 'Test');

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Transition invalide'))).toBe(true);
  });

  it('devrait logger la transition avec la raison', async () => {
    const entry = createValidEntry('entry-205', 'validated');
    await db.journalEntries.add(entry);

    await rejectEntry(adapter, 'entry-205', 'user-reviewer', 'Compte incorrect');

    const logs = await db.auditLogs
      .where('entityId')
      .equals('entry-205')
      .toArray();

    const workflowLog = logs.find(l => l.action === 'WORKFLOW_TRANSITION');
    expect(workflowLog).toBeDefined();

    const transition = JSON.parse(workflowLog!.details);
    expect(transition.fromStatus).toBe('validated');
    expect(transition.toStatus).toBe('draft');
    expect(transition.reason).toBe('Compte incorrect');
  });
});

// ============================================================================
// TESTS: bulkValidate
// ============================================================================

describe('bulkValidate', () => {
  it('devrait valider plusieurs écritures en lot', async () => {
    await db.journalEntries.bulkAdd([
      createValidEntry('entry-301', 'draft'),
      createValidEntry('entry-302', 'draft'),
      createValidEntry('entry-303', 'draft'),
    ]);

    const result = await bulkValidate(adapter,
      ['entry-301', 'entry-302', 'entry-303'],
      'user-comptable'
    );

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);

    const entry1 = await db.journalEntries.get('entry-301');
    const entry2 = await db.journalEntries.get('entry-302');
    const entry3 = await db.journalEntries.get('entry-303');

    expect(entry1?.status).toBe('validated');
    expect(entry2?.status).toBe('validated');
    expect(entry3?.status).toBe('validated');
  });

  it('devrait séparer les succès et les échecs', async () => {
    await db.journalEntries.bulkAdd([
      createValidEntry('entry-401', 'draft'),
      createUnbalancedEntry('entry-402'), // Déséquilibrée
      createValidEntry('entry-403', 'draft'),
    ]);

    const result = await bulkValidate(adapter,
      ['entry-401', 'entry-402', 'entry-403'],
      'user-comptable'
    );

    expect(result.succeeded).toHaveLength(2);
    expect(result.succeeded).toContain('entry-401');
    expect(result.succeeded).toContain('entry-403');

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe('entry-402');
    expect(result.failed[0].errors.length).toBeGreaterThan(0);
  });

  it('devrait gérer les écritures inexistantes', async () => {
    const result = await bulkValidate(adapter, ['entry-999'], 'user-comptable');

    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].errors).toContain('Écriture introuvable');
  });
});

// ============================================================================
// TESTS: getWorkflowHistory
// ============================================================================

describe('getWorkflowHistory', () => {
  it('devrait retourner l\'historique complet des transitions', async () => {
    const entry = createValidEntry('entry-501', 'draft', 'user-creator');
    await db.journalEntries.add(entry);

    // draft → validated
    await validateEntry(adapter, 'entry-501', 'user-comptable');

    // validated → draft (rejet)
    await rejectEntry(adapter, 'entry-501', 'user-reviewer', 'Erreur détectée');

    // draft → validated (re-validation)
    await validateEntry(adapter, 'entry-501', 'user-comptable');

    const history = await getWorkflowHistory(adapter, 'entry-501');

    expect(history).toHaveLength(3);
    expect(history[0].fromStatus).toBe('draft');
    expect(history[0].toStatus).toBe('validated');
    expect(history[1].fromStatus).toBe('validated');
    expect(history[1].toStatus).toBe('draft');
    expect(history[1].reason).toBe('Erreur détectée');
    expect(history[2].fromStatus).toBe('draft');
    expect(history[2].toStatus).toBe('validated');
  });

  it('devrait retourner un tableau vide pour une écriture sans historique', async () => {
    const history = await getWorkflowHistory(adapter, 'entry-999');

    expect(history).toHaveLength(0);
  });

  it('devrait trier les transitions par timestamp croissant', async () => {
    const entry = createValidEntry('entry-502', 'draft', 'user-creator');
    await db.journalEntries.add(entry);

    await validateEntry(adapter, 'entry-502', 'user-comptable');
    await rejectEntry(adapter, 'entry-502', 'user-reviewer', 'Test');
    await validateEntry(adapter, 'entry-502', 'user-comptable');

    const history = await getWorkflowHistory(adapter, 'entry-502');

    // Vérifier l'ordre chronologique
    for (let i = 1; i < history.length; i++) {
      expect(history[i].timestamp >= history[i - 1].timestamp).toBe(true);
    }
  });
});

// ============================================================================
// TESTS: Utility Functions
// ============================================================================

describe('Utility Functions', () => {
  describe('isTransitionAllowed', () => {
    it('devrait autoriser draft → validated', () => {
      expect(isTransitionAllowed('draft', 'validated')).toBe(true);
    });

    it('devrait autoriser validated → posted', () => {
      expect(isTransitionAllowed('validated', 'posted')).toBe(true);
    });

    it('devrait autoriser validated → draft', () => {
      expect(isTransitionAllowed('validated', 'draft')).toBe(true);
    });

    it('devrait interdire draft → posted', () => {
      expect(isTransitionAllowed('draft', 'posted')).toBe(false);
    });

    it('devrait interdire posted → validated', () => {
      expect(isTransitionAllowed('posted', 'validated')).toBe(false);
    });

    it('devrait interdire posted → draft', () => {
      expect(isTransitionAllowed('posted', 'draft')).toBe(false);
    });
  });

  describe('getPossibleTransitions', () => {
    it('devrait retourner les transitions possibles depuis draft', () => {
      const transitions = getPossibleTransitions('draft');
      expect(transitions).toEqual(['validated']);
    });

    it('devrait retourner les transitions possibles depuis validated', () => {
      const transitions = getPossibleTransitions('validated');
      expect(transitions).toContain('posted');
      expect(transitions).toContain('draft');
    });

    it('devrait retourner un tableau vide pour posted', () => {
      const transitions = getPossibleTransitions('posted');
      expect(transitions).toEqual([]);
    });
  });

  describe('isEntryEditable', () => {
    it('devrait permettre la modification des brouillons', () => {
      expect(isEntryEditable('draft')).toBe(true);
    });

    it('devrait interdire la modification des écritures validées', () => {
      expect(isEntryEditable('validated')).toBe(false);
    });

    it('devrait interdire la modification des écritures comptabilisées', () => {
      expect(isEntryEditable('posted')).toBe(false);
    });
  });

  describe('canValidateEntry', () => {
    it('devrait permettre la validation des brouillons', () => {
      expect(canValidateEntry('draft')).toBe(true);
    });

    it('devrait interdire la validation des écritures déjà validées', () => {
      expect(canValidateEntry('validated')).toBe(false);
    });
  });

  describe('canPostEntry', () => {
    it('devrait permettre la comptabilisation des écritures validées', () => {
      expect(canPostEntry('validated')).toBe(true);
    });

    it('devrait interdire la comptabilisation des brouillons', () => {
      expect(canPostEntry('draft')).toBe(false);
    });
  });

  describe('canRejectEntry', () => {
    it('devrait permettre le rejet des écritures validées', () => {
      expect(canRejectEntry('validated')).toBe(true);
    });

    it('devrait interdire le rejet des brouillons', () => {
      expect(canRejectEntry('draft')).toBe(false);
    });

    it('devrait interdire le rejet des écritures comptabilisées', () => {
      expect(canRejectEntry('posted')).toBe(false);
    });
  });
});
