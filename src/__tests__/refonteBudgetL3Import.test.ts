import { describe, it, expect } from 'vitest';
import { classifyImportRows, parseMontantFR, type RawImportRow, type ClassifyContext } from '../features/budget/services/budgetImportService';

const ctx: ClassifyContext = {
  validSectionCodes: new Set(['CC1', 'CC2']),
  knownAccounts: new Set(['6011', '6132', '7011', '2183']),
  allowedClasses: ['6', '7', '2'],
};

const row = (rowNumber: number, account_code: string, section_code: string | null, periods: Record<number, number | string>): RawImportRow =>
  ({ rowNumber, account_code, section_code, periods });

describe('parseMontantFR', () => {
  it('parse le format FR (espaces + virgule)', () => {
    expect(parseMontantFR('1 234,56')).toBeCloseTo(1234.56, 2);
    expect(parseMontantFR('2 500')).toBe(2500);       // espace insécable
    expect(parseMontantFR(42)).toBe(42);
    expect(parseMontantFR('')).toBe(0);
  });
  it('renvoie NaN sur non-numérique', () => {
    expect(Number.isNaN(parseMontantFR('abc'))).toBe(true);
  });
});

describe('classifyImportRows — 3 passes (Lot 3)', () => {
  it('accepte une ligne valide', () => {
    const r = classifyImportRows([row(1, '6132', 'CC1', { 1: '2 500', 2: 2500 })], ctx);
    expect(r.rejected).toHaveLength(0);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].budget_type).toBe('exploitation');
    expect(r.valid[0].periods[1]).toBe(2500);
  });

  it('rejette compte manquant, classe interdite, compte inconnu, section inconnue', () => {
    const r = classifyImportRows([
      row(1, '', 'CC1', {}),
      row(2, '4011', 'CC1', {}),     // classe 4 non autorisée
      row(3, '6999', 'CC1', {}),     // inconnu au plan
      row(4, '6011', 'ZZZ', {}),     // section inconnue
    ], ctx);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected).toHaveLength(4);
    expect(r.rejected[0].reasons).toContain('Compte manquant');
    expect(r.rejected[1].reasons.some((x) => x.includes('Classe 4'))).toBe(true);
    expect(r.rejected[2].reasons).toContain('Compte inconnu au plan comptable');
    expect(r.rejected[3].reasons.some((x) => x.includes('inconnue'))).toBe(true);
  });

  it('rejette montant non numérique et négatif', () => {
    const r = classifyImportRows([row(1, '6011', 'CC1', { 1: 'abc', 2: -5 })], ctx);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0].reasons.some((x) => x.includes('non numérique'))).toBe(true);
    expect(r.rejected[0].reasons.some((x) => x.includes('négatif'))).toBe(true);
  });

  it('détecte les doublons de maille dans le lot', () => {
    const r = classifyImportRows([
      row(1, '6011', 'CC1', { 1: 100 }),
      row(2, '6011', 'CC1', { 1: 200 }),   // même maille
    ], ctx);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected).toHaveLength(2);
    expect(r.rejected.every((x) => x.reasons.some((m) => m.includes('doublon')))).toBe(true);
  });

  it('même compte sur deux sections différentes = pas un doublon', () => {
    const r = classifyImportRows([
      row(1, '6011', 'CC1', { 1: 100 }),
      row(2, '6011', 'CC2', { 1: 200 }),
    ], ctx);
    expect(r.valid).toHaveLength(2);
    expect(r.rejected).toHaveLength(0);
  });
});
