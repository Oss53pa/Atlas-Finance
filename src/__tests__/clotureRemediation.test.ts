import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  buildRemediations,
  applyRemediation,
  COMPTE_ATTENTE,
  type ControleLike,
} from '../services/cloture/remediationService';

const adapter = createTestAdapter();

function controle(partial: Partial<ControleLike> & { id: string }): ControleLike {
  const anomalies = partial.anomalies ?? [];
  return {
    nom: partial.id,
    statut: 'non_conforme',
    anomaliesTotal: anomalies.length,
    ...partial,
    anomalies,
  };
}

describe('remediationService — construction des propositions', () => {
  it('ne propose rien sur un contrôle conforme', () => {
    expect(buildRemediations(controle({ id: 'C8', statut: 'conforme' }))).toEqual([]);
  });

  it('ne propose rien sur un contrôle non applicable', () => {
    expect(buildRemediations(controle({ id: 'C7', statut: 'non_applicable' }))).toEqual([]);
  });

  it('C8 : ne cible en automatique QUE les brouillons équilibrés', () => {
    const props = buildRemediations(controle({
      id: 'C8',
      statut: 'attention',
      anomalies: [
        { ref: 'OD-1', libelle: 'ok', entryId: 'e1', corrigeable: true },
        { ref: 'OD-2', libelle: 'ok', entryId: 'e2', corrigeable: true },
        { ref: 'OD-3', libelle: 'déséquilibrée', entryId: 'e3', corrigeable: false },
      ],
    }));
    const auto = props.find(p => p.action === 'VALIDER_BROUILLONS');
    expect(auto).toBeDefined();
    expect(auto!.mode).toBe('auto');
    expect(auto!.cibles).toBe(2);
    // Le brouillon déséquilibré est renvoyé vers la saisie, pas validé en masse.
    const manuel = props.find(p => p.action === 'NAVIGUER');
    expect(manuel?.cibles).toBe(1);
  });

  it('C2 : propose un équilibrage sur compte d\'attente avec le bon sens', () => {
    const excesDebit = buildRemediations(controle({
      id: 'C2',
      anomalies: [{ ref: 'OD-9', libelle: 'x', entryId: 'e9', montant: 5000, corrigeable: true }],
    }));
    const p = excesDebit.find(x => x.action === 'EQUILIBRER_SUR_ATTENTE')!;
    expect(p.mode).toBe('assistee');
    // Excès de débit (+5000) → la ligne d'équilibrage est au CRÉDIT.
    expect(p.preview![0]).toMatchObject({ accountCode: COMPTE_ATTENTE, credit: 5000, debit: 0 });

    const excesCredit = buildRemediations(controle({
      id: 'C2',
      anomalies: [{ ref: 'OD-10', libelle: 'x', entryId: 'e10', montant: -5000, corrigeable: true }],
    }));
    const p2 = excesCredit.find(x => x.action === 'EQUILIBRER_SUR_ATTENTE')!;
    expect(p2.preview![0]).toMatchObject({ accountCode: COMPTE_ATTENTE, debit: 5000, credit: 0 });
  });

  it('C13 : propose le lettrage automatique en mode auto', () => {
    const props = buildRemediations(controle({
      id: 'C13',
      anomalies: [{ ref: 'VE-1', libelle: 'non lettrée', entryId: 'e1', lineId: 'l1', corrigeable: true }],
    }));
    expect(props.find(p => p.action === 'AUTO_LETTRAGE')?.mode).toBe('auto');
  });

  it('C4 : ne propose pas de dotation quand aucune immobilisation n\'est en défaut', () => {
    const props = buildRemediations(controle({ id: 'C4', statut: 'attention', anomalies: [] }));
    expect(props.find(p => p.action === 'POSTER_DOTATIONS')).toBeUndefined();
    // Le renvoi vers le registre reste proposé (le contrôle est en écart).
    expect(props.find(p => p.action === 'NAVIGUER')).toBeDefined();
  });

  it('les contrôles sans automatisation ne proposent que de la navigation', () => {
    for (const id of ['C3', 'C6', 'C11', 'C14', 'C17']) {
      const props = buildRemediations(controle({
        id,
        anomalies: [{ ref: '411001', libelle: 'solde anormal', accountCode: '411001' }],
      }));
      expect(props.length).toBeGreaterThan(0);
      expect(props.every(p => p.mode === 'manuelle')).toBe(true);
    }
  });
});

describe('remediationService — application réelle', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
  });

  it('VALIDER_BROUILLONS passe les brouillons ciblés en validé', async () => {
    await db.journalEntries.bulkAdd([
      {
        id: 'e1', entryNumber: 'OD-1', journal: 'OD', date: '2025-03-01', reference: '', label: 'brouillon ok',
        status: 'draft', totalDebit: 1000, totalCredit: 1000, createdAt: '', updatedAt: '',
        lines: [
          { id: 'l1', accountCode: '601', accountName: 'Achats', label: 'a', debit: 1000, credit: 0 },
          { id: 'l2', accountCode: '401', accountName: 'Fourn.', label: 'a', debit: 0, credit: 1000 },
        ],
      },
      {
        id: 'e2', entryNumber: 'OD-2', journal: 'OD', date: '2025-03-02', reference: '', label: 'brouillon KO',
        status: 'draft', totalDebit: 1000, totalCredit: 500, createdAt: '', updatedAt: '',
        lines: [{ id: 'l3', accountCode: '601', accountName: 'Achats', label: 'a', debit: 1000, credit: 0 }],
      },
    ] as any);

    const c = controle({
      id: 'C8',
      statut: 'attention',
      anomalies: [
        { ref: 'OD-1', libelle: 'brouillon ok', entryId: 'e1', corrigeable: true },
        { ref: 'OD-2', libelle: 'brouillon KO', entryId: 'e2', corrigeable: false },
      ],
    });
    const proposal = buildRemediations(c).find(p => p.action === 'VALIDER_BROUILLONS')!;
    const outcome = await applyRemediation(adapter, c, proposal);

    expect(outcome.ok).toBe(true);
    expect(outcome.applied).toBe(1);
    expect((await db.journalEntries.get('e1'))!.status).toBe('validated');
    // Le brouillon déséquilibré NE DOIT PAS être validé.
    expect((await db.journalEntries.get('e2'))!.status).toBe('draft');
  });

  it('EQUILIBRER_SUR_ATTENTE rend la pièce équilibrée via le compte d\'attente', async () => {
    await db.journalEntries.add({
      id: 'e9', entryNumber: 'OD-9', journal: 'OD', date: '2025-04-01', reference: '', label: 'déséquilibrée',
      status: 'validated', totalDebit: 10000, totalCredit: 7000, createdAt: '', updatedAt: '',
      lines: [
        { id: 'l1', accountCode: '601', accountName: 'Achats', label: 'a', debit: 10000, credit: 0 },
        { id: 'l2', accountCode: '401', accountName: 'Fourn.', label: 'a', debit: 0, credit: 7000 },
      ],
    } as any);

    const c = controle({
      id: 'C2',
      anomalies: [{ ref: 'OD-9', libelle: 'déséquilibrée', entryId: 'e9', montant: 3000, corrigeable: true }],
    });
    const proposal = buildRemediations(c).find(p => p.action === 'EQUILIBRER_SUR_ATTENTE')!;
    const outcome = await applyRemediation(adapter, c, proposal);

    expect(outcome.ok).toBe(true);
    const entry = await db.journalEntries.get('e9');
    expect(entry!.lines).toHaveLength(3);
    const ligne = entry!.lines.find(l => l.accountCode === COMPTE_ATTENTE)!;
    expect(ligne.credit).toBe(3000);
    expect(entry!.totalDebit).toBe(entry!.totalCredit);
  });

  it('une proposition manuelle n\'écrit rien', async () => {
    const c = controle({
      id: 'C17',
      anomalies: [{ ref: '241000', libelle: 'solde anormal', accountCode: '241000' }],
    });
    const proposal = buildRemediations(c)[0];
    const outcome = await applyRemediation(adapter, c, proposal);
    expect(outcome.ok).toBe(false);
    expect(outcome.applied).toBe(0);
  });
});
