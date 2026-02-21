import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import {
  canTransition,
  allowedTransitions,
  transitionLabel,
  validerEcriture,
  comptabiliserEcriture,
  retourBrouillon,
  validerLot,
  comptabiliserLot,
} from '../services/entryWorkflow';

// ============================================================================
// SEED DATA
// ============================================================================

async function seedTestData() {
  await db.accounts.bulkPut([
    { id: '1', code: '601000', name: 'Achats', accountClass: '6', accountType: 'expense', level: 3, normalBalance: 'debit', isReconcilable: false, isActive: true },
    { id: '2', code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'payable', level: 3, normalBalance: 'credit', isReconcilable: true, isActive: true },
    { id: '3', code: '512000', name: 'Banque', accountClass: '5', accountType: 'bank', level: 3, normalBalance: 'debit', isReconcilable: true, isActive: true },
  ]);

  await db.fiscalYears.bulkPut([
    { id: 'fy-2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
}

function makeDraftEntry(id: string) {
  return {
    id,
    entryNumber: `AC-${id}`,
    date: '2026-03-15',
    journal: 'AC',
    label: 'Test achat',
    reference: '',
    status: 'draft' as const,
    lines: [
      { id: `${id}-l1`, accountCode: '601000', accountName: 'Achats', label: 'Fournitures', debit: 100_000, credit: 0 },
      { id: `${id}-l2`, accountCode: '401000', accountName: 'Fournisseurs', label: 'Fournisseur X', debit: 0, credit: 100_000 },
    ],
    totalDebit: 100_000,
    totalCredit: 100_000,
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    hash: 'abc',
  };
}

beforeEach(async () => {
  await db.accounts.clear();
  await db.fiscalYears.clear();
  await db.journalEntries.clear();
  await db.auditLogs.clear();
  await seedTestData();
});

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

describe('canTransition', () => {
  it('draft → validated est autorise', () => {
    expect(canTransition('draft', 'validated')).toBe(true);
  });

  it('validated → posted est autorise', () => {
    expect(canTransition('validated', 'posted')).toBe(true);
  });

  it('validated → draft est autorise', () => {
    expect(canTransition('validated', 'draft')).toBe(true);
  });

  it('posted → draft est interdit (immutable SYSCOHADA)', () => {
    expect(canTransition('posted', 'draft')).toBe(false);
  });

  it('posted → validated est interdit', () => {
    expect(canTransition('posted', 'validated')).toBe(false);
  });

  it('draft → posted est interdit (doit passer par validated)', () => {
    expect(canTransition('draft', 'posted')).toBe(false);
  });
});

describe('allowedTransitions', () => {
  it('draft peut aller vers validated uniquement', () => {
    expect(allowedTransitions('draft')).toEqual(['validated']);
  });

  it('validated peut aller vers posted ou draft', () => {
    expect(allowedTransitions('validated')).toEqual(['posted', 'draft']);
  });

  it('posted est immutable (aucune transition)', () => {
    expect(allowedTransitions('posted')).toEqual([]);
  });
});

describe('transitionLabel', () => {
  it('validated → Valider', () => {
    expect(transitionLabel('validated')).toBe('Valider');
  });

  it('posted → Comptabiliser', () => {
    expect(transitionLabel('posted')).toBe('Comptabiliser');
  });

  it('draft → Retour brouillon', () => {
    expect(transitionLabel('draft')).toBe('Retour brouillon');
  });
});

// ============================================================================
// ASYNC OPERATIONS — validerEcriture
// ============================================================================

describe('validerEcriture', () => {
  it('valide une ecriture draft equilibree', async () => {
    const entry = makeDraftEntry('001');
    await db.journalEntries.add(entry);

    const result = await validerEcriture('001');
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('validated');

    const updated = await db.journalEntries.get('001');
    expect(updated?.status).toBe('validated');
  });

  it('rejette une ecriture inexistante', async () => {
    const result = await validerEcriture('nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('introuvable');
  });

  it('rejette la validation depuis posted', async () => {
    const entry = { ...makeDraftEntry('002'), status: 'posted' as const };
    await db.journalEntries.add(entry);

    const result = await validerEcriture('002');
    expect(result.success).toBe(false);
    expect(result.error).toContain('non autorisée');
  });
});

// ============================================================================
// comptabiliserEcriture
// ============================================================================

describe('comptabiliserEcriture', () => {
  it('comptabilise une ecriture validated', async () => {
    const entry = { ...makeDraftEntry('003'), status: 'validated' as const };
    await db.journalEntries.add(entry);

    const result = await comptabiliserEcriture('003');
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('posted');

    const updated = await db.journalEntries.get('003');
    expect(updated?.status).toBe('posted');
  });

  it('rejette la comptabilisation depuis draft', async () => {
    const entry = makeDraftEntry('004');
    await db.journalEntries.add(entry);

    const result = await comptabiliserEcriture('004');
    expect(result.success).toBe(false);
    expect(result.error).toContain('non autorisée');
  });
});

// ============================================================================
// retourBrouillon
// ============================================================================

describe('retourBrouillon', () => {
  it('remet en brouillon une ecriture validated', async () => {
    const entry = { ...makeDraftEntry('005'), status: 'validated' as const };
    await db.journalEntries.add(entry);

    const result = await retourBrouillon('005');
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('draft');
  });

  it('refuse le retour brouillon depuis posted (SYSCOHADA immutabilite)', async () => {
    const entry = { ...makeDraftEntry('006'), status: 'posted' as const };
    await db.journalEntries.add(entry);

    const result = await retourBrouillon('006');
    expect(result.success).toBe(false);
    expect(result.error).toContain('brouillon');
  });
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

describe('validerLot', () => {
  it('valide un lot de drafts', async () => {
    await db.journalEntries.bulkAdd([
      makeDraftEntry('010'),
      makeDraftEntry('011'),
      makeDraftEntry('012'),
    ]);

    const result = await validerLot(['010', '011', '012']);
    expect(result.validated).toBe(3);
    expect(result.failures).toHaveLength(0);
  });

  it('rapporte les echecs dans le lot', async () => {
    await db.journalEntries.bulkAdd([
      makeDraftEntry('020'),
      { ...makeDraftEntry('021'), status: 'posted' as const },
    ]);

    const result = await validerLot(['020', '021']);
    expect(result.validated).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe('021');
  });
});

describe('comptabiliserLot', () => {
  it('comptabilise un lot de validated', async () => {
    await db.journalEntries.bulkAdd([
      { ...makeDraftEntry('030'), status: 'validated' as const },
      { ...makeDraftEntry('031'), status: 'validated' as const },
    ]);

    const result = await comptabiliserLot(['030', '031']);
    expect(result.posted).toBe(2);
    expect(result.failures).toHaveLength(0);
  });
});
