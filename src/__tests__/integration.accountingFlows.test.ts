/**
 * Tests d'INTÉGRATION (suite 2) — flux comptables complets contre le vrai
 * DexieAdapter (@atlas/data) + vrais services :
 *  - Contrepassation (reverseEntry) : écriture inverse + marquage reversed/reversedBy
 *  - À-nouveaux : exécution + régénération PAR CONTREPASSATION (pas suppression)
 *  - Balance de vérification : équilibre + exclusion des brouillons
 *  - Verrou de période : écriture dans un exercice clôturé refusée
 */
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { DexieAdapter } from '@atlas/data';
import { reverseEntry } from '../utils/reversalService';
import { executerCarryForward, supprimerCarryForward, hasCarryForward } from '../services/cloture/carryForwardService';
import { verifyTrialBalance } from '../services/trialBalanceService';

let dbCounter = 0;
function freshAdapter() {
  dbCounter += 1;
  return new DexieAdapter(`iflow-${Date.now()}-${dbCounter}`);
}
function line(accountCode: string, debit: number, credit: number) {
  return { id: crypto.randomUUID(), accountCode, accountName: accountCode, label: 'x', debit, credit };
}
function entry(over: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(), entryNumber: 'OD-001', journal: 'OD', date: '2025-06-01',
    reference: 'REF', label: 'Test', status: 'validated', totalDebit: 0, totalCredit: 0,
    lines: [], createdAt: new Date().toISOString(), ...over,
  };
}

describe('Intégration — flux comptables (DexieAdapter réel)', () => {
  describe('Contrepassation (SYSCOHADA Art. 19)', () => {
    it('crée une écriture inverse et marque l originale reversed/reversedBy', async () => {
      const a = freshAdapter();
      const origId = 'orig-1';
      await a.create('journalEntries', entry({
        id: origId, journal: 'VE', entryNumber: 'VE-000001', status: 'validated',
        lines: [line('411', 1000, 0), line('701', 0, 1000)],
      }));

      const res = await reverseEntry(a, { originalEntryId: origId, reversalDate: '2025-07-01', reason: 'erreur' });
      expect(res.success).toBe(true);
      expect(res.reversalEntry).toBeTruthy();

      // Originale marquée contrepassée, avec un reversedBy qui pointe sur un id RÉEL.
      const orig: any = await a.getById('journalEntries', origId);
      expect(orig.reversed).toBe(true);
      expect(orig.reversedBy).toBeTruthy();
      const reversal: any = await a.getById('journalEntries', orig.reversedBy);
      expect(reversal).toBeTruthy(); // l id pointe bien dans la base (fix F2-4)
      expect(reversal.reversalOf).toBe(origId);
      // Lignes inversées : le débit d origine devient crédit.
      const l411 = reversal.lines.find((l: any) => l.accountCode === '411');
      expect(l411.credit).toBeCloseTo(1000, 2);
      expect(l411.debit).toBeCloseTo(0, 2);
    });
  });

  describe('À-nouveaux : exécution + régénération par contrepassation', () => {
    it('régénère sans suppression physique (contrepasse l AN validé)', async () => {
      const a = freshAdapter();
      await a.create('fiscalYears', { id: 'fy2024', code: '2024', name: 'Exercice 2024', startDate: '2024-01-01', endDate: '2024-12-31', isClosed: false, isActive: false });
      await a.create('fiscalYears', { id: 'fy2025', code: '2025', name: 'Exercice 2025', startDate: '2025-01-01', endDate: '2025-12-31', isClosed: false, isActive: true });
      // Soldes de bilan 2024 (classes 1-5) : banque 1000 / capital 1000
      await a.create('journalEntries', entry({ id: 'cap', journal: 'OD', date: '2024-03-01', lines: [line('521', 1000, 0), line('101', 0, 1000)] }));

      const r = await executerCarryForward(a, { closingExerciceId: 'fy2024', openingExerciceId: 'fy2025', openingDate: '2025-01-01' });
      expect(r.success).toBe(true);
      expect(await hasCarryForward(a, 'fy2025')).toBe(true);
      const anId = r.entryId!;

      await supprimerCarryForward(a, 'fy2025');

      // P0-4/F4-2 : l AN validé n est PAS supprimé physiquement — il est contrepassé.
      const original: any = await a.getById('journalEntries', anId);
      expect(original).toBeTruthy();
      expect(original.reversed).toBe(true);
      const all: any[] = await a.getAll('journalEntries');
      expect(all.some(e => e.reversalOf === anId)).toBe(true);
    });
  });

  describe('Balance de vérification', () => {
    it('équilibrée et excluant les brouillons', async () => {
      const a = freshAdapter();
      await a.create('journalEntries', entry({ id: 'b1', date: '2025-02-01', status: 'validated', lines: [line('521', 500, 0), line('701', 0, 500)] }));
      await a.create('journalEntries', entry({ id: 'b2', date: '2025-02-02', status: 'posted', lines: [line('601', 300, 0), line('401', 0, 300)] }));
      // Brouillon déséquilibré : ne doit PAS casser la balance (exclu).
      await a.create('journalEntries', entry({ id: 'b3', date: '2025-02-03', status: 'draft', lines: [line('601', 999, 0), line('401', 0, 1), line('512', 0, 998)] }));

      const res = await verifyTrialBalance(a);
      expect(res.isBalanced).toBe(true);
      expect(res.ecartGlobal).toBe(0);
      // Le brouillon déséquilibré n est pas compté parmi les écritures vérifiées.
      expect(res.unbalancedEntries.length).toBe(0);
    });
  });

  describe('Verrou de période', () => {
    it('refuse une écriture dans un exercice clôturé', async () => {
      const a = freshAdapter();
      await a.create('fiscalYears', { id: 'fyc', code: '2023', name: 'Exercice 2023', startDate: '2023-01-01', endDate: '2023-12-31', isClosed: true, isActive: false });
      await expect(
        a.create('journalEntries', entry({ date: '2023-06-15', lines: [line('601', 100, 0), line('401', 0, 100)] })),
      ).rejects.toThrow(/cloture|verrouill|Exercice/i);
    });
  });
});
