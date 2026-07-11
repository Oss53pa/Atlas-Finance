import { describe, it, expect } from 'vitest';
import { engagementRestant, firstOfMonth } from '../features/budget/services/engagementService';
import { natureOfAccount, decideCheck, type MailleDisponible } from '../features/budget/services/budgetCheckService';

describe('engagement — reste net (Lot 2)', () => {
  it('reste = initial − facturé − dégagé, clampé à 0', () => {
    expect(engagementRestant({ montant_initial: 1000, montant_facture: 300, montant_degage: 0, statut: 'partiellement_facture' })).toBe(700);
    expect(engagementRestant({ montant_initial: 1000, montant_facture: 900, montant_degage: 200, statut: 'ouvert' })).toBe(0);
  });
  it('un engagement annulé ne pèse plus (reste 0)', () => {
    expect(engagementRestant({ montant_initial: 1000, montant_facture: 0, montant_degage: 0, statut: 'annule' })).toBe(0);
  });
});

describe('firstOfMonth — normalisation maille mensuelle', () => {
  it('ramène au 1er du mois', () => {
    expect(firstOfMonth('2027-03-17')).toBe('2027-03-01');
    expect(firstOfMonth('2027-12-01')).toBe('2027-12-01');
  });
});

describe('natureOfAccount — polarité SYSCOHADA', () => {
  it('classe 6 = opex, 2 = capex, 7 = revenus', () => {
    expect(natureOfAccount('6011')).toBe('opex');
    expect(natureOfAccount('2183')).toBe('capex');
    expect(natureOfAccount('2312')).toBe('capex');
    expect(natureOfAccount('7011')).toBe('revenus');
  });
});

describe('decideCheck — décision de contrôle budgétaire (Lot 2)', () => {
  const maille = (disponible: number, budget = 1000): MailleDisponible => ({ budget, engage: 0, realise: 0, disponible });

  it('dépassement + politique bloquante => blocked', () => {
    const r = decideCheck(maille(500), 800, 'bloquant');
    expect(r.decision).toBe('blocked');
    expect(r.seuil).toBe('depassement');
    expect(r.apresEngagement).toBe(-300);
  });
  it('dépassement + avertissement => warning', () => {
    expect(decideCheck(maille(500), 800, 'avertissement').decision).toBe('warning');
  });
  it('dépassement + passif => ok (tracé, non bloquant)', () => {
    expect(decideCheck(maille(500), 800, 'passif').decision).toBe('ok');
  });
  it('reste sous 10 % du budget => warning consommation_90', () => {
    const r = decideCheck(maille(200, 1000), 150, 'avertissement'); // reste 50 < 100
    expect(r.decision).toBe('warning');
    expect(r.seuil).toBe('consommation_90');
  });
  it('confortable => ok', () => {
    const r = decideCheck(maille(1000, 1000), 100, 'bloquant');
    expect(r.decision).toBe('ok');
    expect(r.seuil).toBeNull();
  });
});
