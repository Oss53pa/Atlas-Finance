import { describe, it, expect } from 'vitest';
import { volumeMontant } from '../features/budget/services/volumesService';

describe('volumeMontant — budget revenus volumes × prix (Lot 4, §14.1)', () => {
  it('montant = quantité × prix unitaire', () => {
    expect(volumeMontant(10, 5)).toBe(50);
    expect(volumeMontant(120, 2500)).toBe(300000);
  });
  it('gère les quantités décimales', () => {
    expect(volumeMontant(2.5, 4)).toBe(10);
    expect(volumeMontant(1.5, 2)).toBe(3);
  });
  it('zéro si quantité ou prix nul', () => {
    expect(volumeMontant(0, 100)).toBe(0);
    expect(volumeMontant(100, 0)).toBe(0);
  });
});
