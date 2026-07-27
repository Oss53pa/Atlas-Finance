/**
 * Paramètres · Lot B·3 — calcul d'échéance des conditions de paiement (CDC §8).
 */
import { describe, it, expect } from 'vitest';
import { computeEcheance } from '../services/param/referentielsService';

describe('computeEcheance', () => {
  it('comptant (0 jour) = date de base', () => {
    expect(computeEcheance('2026-01-15', 0, false)).toBe('2026-01-15');
  });
  it('30 jours = +30 jours', () => {
    expect(computeEcheance('2026-01-15', 30, false)).toBe('2026-02-14');
  });
  it('30 jours fin de mois = +30 puis dernier jour du mois', () => {
    expect(computeEcheance('2026-01-15', 30, true)).toBe('2026-02-28');
  });
  it('fin de mois gère les fins de mois variables (bissextile)', () => {
    // 2024 est bissextile → 29 février.
    expect(computeEcheance('2024-01-15', 30, true)).toBe('2024-02-29');
  });
  it('franchit correctement l’année', () => {
    expect(computeEcheance('2026-12-20', 30, false)).toBe('2027-01-19');
  });
  it('45 jours', () => {
    expect(computeEcheance('2026-03-01', 45, false)).toBe('2026-04-15');
  });
});
