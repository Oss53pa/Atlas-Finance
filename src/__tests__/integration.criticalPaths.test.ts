/**
 * Tests d'INTÉGRATION sur les chemins comptables critiques — exécutés contre le
 * VRAI DexieAdapter (@atlas/data) + les vrais services, pas l'adaptateur de test
 * divergent. Ils verrouillent les correctifs P0/P1 :
 *  - P1-A : exclusion des brouillons (draft) des soldes/états
 *  - P0-4 : équilibre obligatoire + immuabilité des écritures `posted` + id respecté
 *  - P0-3 : détermination du résultat sur 131/139 (classe 13), pas 1200/1290
 *  - P1-C : TVA limitée aux écritures validées/comptabilisées
 */
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { DexieAdapter } from '@atlas/data';
import { generateResultatEntry } from '../services/closureService';
import { calculerDeclarationTVA } from '../features/taxation/services/taxationService';

let dbCounter = 0;
function freshAdapter() {
  dbCounter += 1;
  return new DexieAdapter(`itest-${Date.now()}-${dbCounter}`);
}

function line(accountCode: string, debit: number, credit: number, extra: Record<string, unknown> = {}) {
  return { id: crypto.randomUUID(), accountCode, accountName: accountCode, label: 'x', debit, credit, ...extra };
}

function entry(over: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    entryNumber: 'OD-001',
    journal: 'OD',
    date: '2025-06-01',
    reference: 'REF',
    label: 'Test',
    status: 'validated',
    totalDebit: 0,
    totalCredit: 0,
    lines: [],
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('Intégration — DexieAdapter réel', () => {
  describe('P0-4 — garde-fous d écriture', () => {
    it('refuse une écriture déséquilibrée via create()', async () => {
      const a = freshAdapter();
      await expect(
        a.create('journalEntries', entry({ lines: [line('601', 100, 0), line('401', 0, 90)] })),
      ).rejects.toThrow(/déséquilibrée|Débit/i);
    });

    it('respecte l id fourni (pas d écrasement)', async () => {
      const a = freshAdapter();
      const id = 'fixed-id-123';
      await a.create('journalEntries', entry({ id, lines: [line('601', 100, 0), line('401', 0, 100)] }));
      const got = await a.getById('journalEntries', id);
      expect(got).toBeTruthy();
      expect((got as any).id).toBe(id);
    });

    it('interdit la suppression d une écriture comptabilisée (posted)', async () => {
      const a = freshAdapter();
      const id = 'posted-1';
      await a.create('journalEntries', entry({ id, status: 'posted', lines: [line('601', 100, 0), line('401', 0, 100)] }));
      await expect(a.delete('journalEntries', id)).rejects.toThrow(/immuable|Art\. 19/i);
    });

    it('interdit la modification du montant d une écriture posted, autorise une métadonnée (lettrage)', async () => {
      const a = freshAdapter();
      const id = 'posted-2';
      await a.create('journalEntries', entry({
        id, status: 'posted',
        lines: [line('411', 100, 0, { id: 'L1' }), line('701', 0, 100, { id: 'L2' })],
      }));
      // Changer un montant -> refusé
      await expect(
        a.update('journalEntries', id, { lines: [line('411', 999, 0, { id: 'L1' }), line('701', 0, 999, { id: 'L2' })] }),
      ).rejects.toThrow(/immuable|Art\. 19/i);
      // Changer un champ d entête figé -> refusé
      await expect(a.update('journalEntries', id, { journal: 'VE' })).rejects.toThrow(/immuable|Art\. 19/i);
      // Ajouter un lettrageCode sans toucher comptes/montants -> autorisé
      await a.update('journalEntries', id, {
        lines: [line('411', 100, 0, { id: 'L1', lettrageCode: 'A' }), line('701', 0, 100, { id: 'L2', lettrageCode: 'A' })],
      });
      const got: any = await a.getById('journalEntries', id);
      expect(got.lines[0].lettrageCode).toBe('A');
    });
  });

  describe('P1-A — exclusion des brouillons des soldes', () => {
    it('getAccountBalance et getBalanceByAccount ignorent les draft', async () => {
      const a = freshAdapter();
      await a.create('journalEntries', entry({ id: 'v', status: 'validated', lines: [line('601', 100, 0), line('401', 0, 100)] }));
      await a.create('journalEntries', entry({ id: 'd', status: 'draft', lines: [line('601', 50, 0), line('401', 0, 50)] }));

      const bal = await a.getAccountBalance(['601']);
      expect(bal.debit).toBe(100); // 100 (validé) sans les 50 (brouillon)

      const map = await a.getBalanceByAccount();
      expect(map.get('601')?.debit).toBe(100);
    });
  });

  describe('P0-3 — détermination du résultat sur classe 13 (131/139)', () => {
    it('impute un bénéfice sur 131 (crédit), jamais sur 1200/1290', async () => {
      const a = freshAdapter();
      await a.create('fiscalYears', {
        id: 'fy1', code: '2025', name: 'Exercice 2025',
        startDate: '2025-01-01', endDate: '2025-12-31', isClosed: false, isActive: true,
      });
      // Produits 1000 (701 crédit), charges 600 (601 débit) -> bénéfice 400
      await a.create('journalEntries', entry({ id: 've', journal: 'VE', date: '2025-06-01', lines: [line('411', 1000, 0), line('701', 0, 1000)] }));
      await a.create('journalEntries', entry({ id: 'ac', journal: 'AC', date: '2025-06-02', lines: [line('601', 600, 0), line('401', 0, 600)] }));

      const res = await generateResultatEntry(a, 'fy1', 'test');
      expect(res.isBenefice).toBe(true);

      const created: any = await a.getById('journalEntries', res.entryId);
      expect(created).toBeTruthy();
      const codes = created.lines.map((l: any) => l.accountCode);
      expect(codes).toContain('131');
      expect(codes).not.toContain('1200');
      expect(codes).not.toContain('1290');
      const ligne131 = created.lines.find((l: any) => l.accountCode === '131');
      expect(ligne131.credit).toBeCloseTo(400, 2);
      // équilibre de l écriture de détermination
      const td = created.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
      const tc = created.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
      expect(td).toBeCloseTo(tc, 2);
    });
  });

  describe('P1-C — TVA limitée aux écritures validées', () => {
    it('exclut les brouillons de la déclaration TVA', async () => {
      const a = freshAdapter();
      // TVA collectée validée : 443 crédit 180 (sur vente 1000 + tva 180)
      await a.create('journalEntries', entry({ id: 'tva-v', journal: 'VE', date: '2025-03-10', status: 'validated', lines: [line('411', 1180, 0), line('701', 0, 1000), line('443', 0, 180)] }));
      // TVA collectée brouillon : 443 crédit 90 (ne doit PAS compter)
      await a.create('journalEntries', entry({ id: 'tva-d', journal: 'VE', date: '2025-03-12', status: 'draft', lines: [line('411', 590, 0), line('701', 0, 500), line('443', 0, 90)] }));

      const decl = await calculerDeclarationTVA(a, '2025-01-01', '2025-12-31');
      expect(decl.tvaCollectee).toBeCloseTo(180, 2); // 180 seulement, pas 270
    });
  });
});
