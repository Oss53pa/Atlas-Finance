/**
 * Analytique · Lot A·1 — tests des fonctions déterministes (CDC §5.1, §6).
 * Couvre : comportement par nature (AC-1) et contrôles typés C1..C4 (AC-2, AC-4).
 */
import { describe, it, expect } from 'vitest';
import { defaultComportement } from '../features/budget/services/ventilationRunService';
import { evaluateControls, hasBlockingFailure, type ControlsInput } from '../features/budget/services/controlsService';

describe('defaultComportement — nature de compte SYSCOHADA', () => {
  it('60x = variable', () => {
    expect(defaultComportement('601000')).toBe('variable');
    expect(defaultComportement('6081')).toBe('variable');
  });
  it('61x / 62x = mixte', () => {
    expect(defaultComportement('611000')).toBe('mixte');
    expect(defaultComportement('625100')).toBe('mixte');
  });
  it('63x / 64x / 66x / 68x = fixe', () => {
    expect(defaultComportement('641000')).toBe('fixe');
    expect(defaultComportement('681000')).toBe('fixe');
    expect(defaultComportement('631')).toBe('fixe');
  });
  it('produits et autres natures = fixe par défaut', () => {
    expect(defaultComportement('706000')).toBe('fixe');
    expect(defaultComportement('')).toBe('fixe');
  });
});

const baseInput = (): ControlsInput => ({
  reconcilie: true,
  couverturePct: 100,
  reliquatCount: 0,
  ventRows: [],
  transferRows: [],
  lineCode: new Map(),
  sectionMeta: new Map(),
  hasSecondaire: false,
});
const control = (input: ControlsInput, code: string) => evaluateControls(input).find(c => c.code === code)!;

describe('evaluateControls — contrôles typés', () => {
  it('C1 : réconciliation OK / KO selon reconcilie (AC-4)', () => {
    expect(control(baseInput(), 'C1').resultat).toBe('ok');
    expect(control({ ...baseInput(), reconcilie: false }, 'C1').resultat).toBe('ko');
  });

  it('C2 : couverture KO dès qu’il reste des lignes à qualifier', () => {
    expect(control(baseInput(), 'C2').resultat).toBe('ok');
    expect(control({ ...baseInput(), reliquatCount: 3 }, 'C2').resultat).toBe('ko');
  });

  it('C3 : un produit (7x) sur un centre de coût est rejeté (AC-2)', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'sCout', ligne_ecriture_id: 'l1', montant: 500 }],
      lineCode: new Map([['l1', '706000']]),
      sectionMeta: new Map([['sCout', { nature: 'principale', type_axe: 'centre_cout' }]]),
    };
    const c3 = control(input, 'C3');
    expect(c3.resultat).toBe('ko');
    expect(c3.severite).toBe('bloquant');
    expect(c3.detail.count).toBe(1);
    expect(hasBlockingFailure(evaluateControls(input))).toBe(true);
  });

  it('C3 : un produit (7x) sur un centre de revenu est conforme', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'sRev', ligne_ecriture_id: 'l1', montant: 500 }],
      lineCode: new Map([['l1', '706000']]),
      sectionMeta: new Map([['sRev', { nature: 'principale', type_axe: 'centre_revenu' }]]),
    };
    expect(control(input, 'C3').resultat).toBe('ok');
  });

  it('C3 : une charge (6x) sur un centre de revenu est rejetée', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'sRev', ligne_ecriture_id: 'l1', montant: 500 }],
      lineCode: new Map([['l1', '641000']]),
      sectionMeta: new Map([['sRev', { nature: 'principale', type_axe: 'centre_revenu' }]]),
    };
    expect(control(input, 'C3').resultat).toBe('ko');
  });

  it('C4 : sans règle secondaire → n/a ; avec auxiliaire non soldée → ko', () => {
    expect(control(baseInput(), 'C4').resultat).toBe('na');
    const input: ControlsInput = {
      ...baseInput(),
      hasSecondaire: true,
      // section auxiliaire qui reçoit 1000 mais n'est jamais déversée → net ≠ 0
      ventRows: [{ section_id: 'aux', ligne_ecriture_id: 'l1', montant: 1000 }],
      sectionMeta: new Map([['aux', { nature: 'auxiliaire', type_axe: 'centre_cout' }]]),
    };
    expect(control(input, 'C4').resultat).toBe('ko');
  });

  it('C4 : auxiliaire entièrement déversée → soldée (ok)', () => {
    const input: ControlsInput = {
      ...baseInput(),
      hasSecondaire: true,
      ventRows: [{ section_id: 'aux', ligne_ecriture_id: 'l1', montant: 1000 }],
      transferRows: [{ from_section_id: 'aux', to_section_id: 'princ', montant: 1000 }],
      sectionMeta: new Map([
        ['aux', { nature: 'auxiliaire', type_axe: 'centre_cout' }],
        ['princ', { nature: 'principale', type_axe: 'centre_cout' }],
      ]),
    };
    expect(control(input, 'C4').resultat).toBe('ok');
  });

  it('produit toujours les 10 contrôles typés', () => {
    const codes = evaluateControls(baseInput()).map(c => c.code).sort();
    expect(codes).toEqual(['C1', 'C10', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9']);
  });
});
