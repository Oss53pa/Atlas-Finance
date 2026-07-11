import { describe, it, expect } from 'vitest';
import { deriveAlerts, type MailleAgg } from '../features/budget/services/budgetAlertsService';

const m = (account_code: string, budget: number, engage: number, realise: number): MailleAgg =>
  ({ account_code, section_id: null, budget, engage, realise, disponible: budget - engage - realise });

describe('deriveAlerts — alertes OPEX (Lot 4)', () => {
  it('OPX-DEP (P1) quand disponible < 0', () => {
    const a = deriveAlerts([m('6011', 100, 80, 40)]); // dispo -20
    expect(a).toHaveLength(1);
    expect(a[0].code).toBe('OPX-DEP');
    expect(a[0].severity).toBe('P1');
  });

  it('OPX-90 quand consommation ≥ 90 % (sans dépassement)', () => {
    const a = deriveAlerts([m('6132', 100, 60, 32)]); // consommé 92, dispo 8
    expect(a[0].code).toBe('OPX-90');
    expect(a[0].severity).toBe('P2');
  });

  it('OPX-75 quand consommation ≥ 75 % et < 90 %', () => {
    const a = deriveAlerts([m('6222', 100, 50, 30)]); // consommé 80
    expect(a[0].code).toBe('OPX-75');
  });

  it('aucune alerte en dessous de 75 %', () => {
    expect(deriveAlerts([m('6011', 100, 20, 30)])).toHaveLength(0);
  });

  it('pas de division par zéro si budget 0 et pas de dépassement', () => {
    expect(deriveAlerts([m('6011', 0, 0, 0)])).toHaveLength(0);
  });

  it('trie par sévérité (P1 avant P2 avant P3)', () => {
    const a = deriveAlerts([m('6222', 100, 50, 30), m('6011', 100, 80, 40), m('6132', 100, 60, 32)]);
    expect(a.map((x) => x.severity)).toEqual(['P1', 'P2', 'P3']);
  });
});
