/**
 * Analytique · Lot A·3 v2a — axes conditionnels : contrôle C3 piloté par
 * regle_condition (classe de compte → type sémantique attendu). CDC §3.2, §6.
 */
import { describe, it, expect } from 'vitest';
import { evaluateControls, type ControlsInput } from '../features/budget/services/controlsService';
import { STANDARD_REGLE_CONDITION } from '../features/budget/services/analyticsService';

const baseInput = (): ControlsInput => ({
  reconcilie: true, couverturePct: 100, reliquatCount: 0,
  ventRows: [], transferRows: [], lineCode: new Map(), sectionMeta: new Map(), hasSecondaire: false,
});
const c3 = (input: ControlsInput) => evaluateControls(input).find(c => c.code === 'C3')!;

describe('C3 conditionnel (regle_condition)', () => {
  it('charge (6x) sur un axe attendu centre_cout → conforme', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'S', ligne_ecriture_id: 'l1', montant: 100 }],
      lineCode: new Map([['l1', '605000']]),
      sectionMeta: new Map([['S', { nature: 'principale', type_axe: 'centre_cout', regle_condition: STANDARD_REGLE_CONDITION }]]),
    };
    expect(c3(input).resultat).toBe('ok');
  });

  it('charge (6x) sur un axe attendu centre_revenu → rejet', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'S', ligne_ecriture_id: 'l1', montant: 100 }],
      lineCode: new Map([['l1', '605000']]),
      sectionMeta: new Map([['S', { nature: 'principale', type_axe: 'centre_revenu', regle_condition: STANDARD_REGLE_CONDITION }]]),
    };
    const r = c3(input);
    expect(r.resultat).toBe('ko');
    expect(r.detail.violations[0].attendu).toBe('centre_cout');
  });

  it('la règle conditionnelle est plus stricte que l’heuristique', () => {
    // 6x sur un axe 'projet' : l'heuristique laisserait passer (elle ne rejette que
    // 6x→centre_revenu), mais regle_condition {6: centre_cout} l'interdit.
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'S', ligne_ecriture_id: 'l1', montant: 100 }],
      lineCode: new Map([['l1', '641000']]),
      sectionMeta: new Map([['S', { nature: 'principale', type_axe: 'projet', regle_condition: { '6': 'centre_cout' } }]]),
    };
    expect(c3(input).resultat).toBe('ko');
  });

  it('sans regle_condition → heuristique (6x sur projet toléré)', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'S', ligne_ecriture_id: 'l1', montant: 100 }],
      lineCode: new Map([['l1', '641000']]),
      sectionMeta: new Map([['S', { nature: 'principale', type_axe: 'projet' }]]),
    };
    expect(c3(input).resultat).toBe('ok');
  });

  it('produit (7x) sur centre_revenu conditionnel → conforme', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'S', ligne_ecriture_id: 'l1', montant: -100 }],
      lineCode: new Map([['l1', '706000']]),
      sectionMeta: new Map([['S', { nature: 'principale', type_axe: 'centre_revenu', regle_condition: STANDARD_REGLE_CONDITION }]]),
    };
    expect(c3(input).resultat).toBe('ok');
  });
});

describe('C10 — axe projet renseigné sur un plan Projets', () => {
  const c10 = (input: ControlsInput) => evaluateControls(input).find(c => c.code === 'C10')!;
  it('plan sans axe projet → n/a', () => {
    expect(c10(baseInput()).resultat).toBe('na');
  });
  it('plan Projets sans reliquat → conforme', () => {
    expect(c10({ ...baseInput(), planHasProjetAxe: true, reliquatCount: 0 }).resultat).toBe('ok');
  });
  it('plan Projets avec reliquat → rejet bloquant (lignes sans projet)', () => {
    const r = c10({ ...baseInput(), planHasProjetAxe: true, reliquatCount: 4 });
    expect(r.resultat).toBe('ko');
    expect(r.severite).toBe('bloquant');
    expect(r.detail.lignes_sans_projet).toBe(4);
  });
});
