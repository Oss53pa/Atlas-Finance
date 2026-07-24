/**
 * Analytique · Lot A·3 v1 — gouvernance : contrôle C5 (section gelée/close) et
 * gating de publication. Fonctions déterministes (CDC §6, §7).
 */
import { describe, it, expect } from 'vitest';
import { evaluateControls, hasBlockingFailure, type ControlsInput } from '../features/budget/services/controlsService';

const baseInput = (): ControlsInput => ({
  reconcilie: true, couverturePct: 100, reliquatCount: 0,
  ventRows: [], transferRows: [], lineCode: new Map(), sectionMeta: new Map(), hasSecondaire: false,
});
const control = (input: ControlsInput, code: string) => evaluateControls(input).find(c => c.code === code)!;

describe('C5 — section close/gelée ne reçoit rien', () => {
  it('OK quand seules des sections actives reçoivent', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'S1', ligne_ecriture_id: 'l1', montant: 100 }],
      sectionMeta: new Map([['S1', { nature: 'principale', type_axe: 'centre_cout', statut: 'active' }]]),
    };
    expect(control(input, 'C5').resultat).toBe('ok');
  });

  it('KO bloquant quand une section gelée reçoit de la ventilation', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'GEL', ligne_ecriture_id: 'l1', montant: 100 }],
      sectionMeta: new Map([['GEL', { nature: 'principale', type_axe: 'centre_cout', statut: 'gelee' }]]),
    };
    const c5 = control(input, 'C5');
    expect(c5.resultat).toBe('ko');
    expect(c5.severite).toBe('bloquant');
    expect(c5.detail.sections_verrouillees).toContain('GEL');
    expect(hasBlockingFailure(evaluateControls(input))).toBe(true);
  });

  it('KO aussi pour une section close', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'CLO', ligne_ecriture_id: 'l1', montant: 100 }],
      sectionMeta: new Map([['CLO', { nature: 'principale', type_axe: 'centre_cout', statut: 'close' }]]),
    };
    expect(control(input, 'C5').resultat).toBe('ko');
  });

  it('sans statut renseigné → considérée active (OK)', () => {
    const input: ControlsInput = {
      ...baseInput(),
      ventRows: [{ section_id: 'S1', ligne_ecriture_id: 'l1', montant: 100 }],
      sectionMeta: new Map([['S1', { nature: 'principale', type_axe: 'centre_cout' }]]),
    };
    expect(control(input, 'C5').resultat).toBe('ok');
  });
});

describe('gating de publication (hasBlockingFailure)', () => {
  it('bloque si un contrôle bloquant est en échec, autorise sinon', () => {
    const clean = evaluateControls(baseInput());
    expect(hasBlockingFailure(clean)).toBe(false); // C1..C6 ok/na → publiable

    const withFailure: ControlsInput = {
      ...baseInput(),
      reconcilie: false, // C1 ko bloquant
    };
    expect(hasBlockingFailure(evaluateControls(withFailure))).toBe(true);
  });

  it('un avertissement en échec ne bloque pas la publication', () => {
    // C7..C9 sont des avertissements (na en v1) — jamais bloquants.
    const controls = evaluateControls(baseInput());
    const avert = controls.filter(c => c.severite === 'avertissement');
    expect(avert.every(c => c.resultat !== 'ko' || c.severite === 'avertissement')).toBe(true);
    expect(hasBlockingFailure(controls)).toBe(false);
  });
});
