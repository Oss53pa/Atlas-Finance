import { describe, it, expect } from 'vitest';
import { detectHeaderRowByColumnNames } from './migrationWorkbook';
import { getModeTemplate, MIGRATION_MODE_TEMPLATES, requiredSlotsForMode } from './migrationModeTemplates';

// A1 — détection d'en-tête par noms de colonnes (robustesse aux bannières)
describe('A1 — detectHeaderRowByColumnNames', () => {
  it("détecte la ligne d'en-tête sous une bannière + ligne vide", () => {
    const aoa: unknown[][] = [
      ["ATLAS F&A — MODÈLE D'IMPORT"],
      [],
      ['COMPTE', 'LIBELLE', 'DATE', 'JOURNAL', 'NUMERO DE SAISIE', 'DESCRIPTION', 'LETTRAGE', 'DEBIT', 'CREDIT'],
      ['411000', 'Clients', '2026-01-01', 'VE', 'VE-1', 'Facture', '', '100', '0'],
    ];
    const idx = detectHeaderRowByColumnNames(aoa, ['COMPTE', 'DATE', 'JOURNAL', 'DEBIT', 'CREDIT']);
    expect(idx).toBe(2);
  });

  it('insensible à la casse/accents', () => {
    const aoa: unknown[][] = [['compte', 'débit', 'crédit', 'journal']];
    expect(detectHeaderRowByColumnNames(aoa, ['COMPTE', 'DEBIT', 'CREDIT', 'JOURNAL'])).toBe(0);
  });

  it('retourne -1 quand aucune colonne attendue', () => {
    expect(detectHeaderRowByColumnNames([['x', 'y']], [])).toBe(-1);
  });
});

// Templates par mode — conformité à la configuration des 3 modes
describe('Templates de migration par mode', () => {
  it('Mode 2 (recommandé) exige la Balance de clôture N-1 (slot reportAN)', () => {
    const t = getModeTemplate(2);
    expect(t.recommended).toBe(true);
    expect(requiredSlotsForMode(2)).toContain('reportAN');
    // pas de Grand Livre obligatoire en Mode 2
    expect(requiredSlotsForMode(2)).not.toContain('grandLivre');
  });

  it('Mode 1 exige le Grand Livre (et pas de fichier AN séparé obligatoire)', () => {
    expect(requiredSlotsForMode(1)).toEqual(['grandLivre']);
  });

  it('Mode 3 : Grand Livre Historique + Balances Clôture obligatoires, avec colonne EXERCICE', () => {
    const req = requiredSlotsForMode(3);
    expect(req).toContain('grandLivre');
    expect(req).toContain('reportAN');
    const gl = MIGRATION_MODE_TEMPLATES[3].sheets.find(s => s.slot === 'grandLivre');
    const bal = MIGRATION_MODE_TEMPLATES[3].sheets.find(s => s.slot === 'reportAN');
    expect(gl?.hasExercice).toBe(true);
    expect(bal?.hasExercice).toBe(true);
  });

  it('chaque mode embarque les feuilles optionnelles partagées (plan, tiers, immos)', () => {
    for (const mode of [1, 2, 3] as const) {
      const slots = MIGRATION_MODE_TEMPLATES[mode].sheets.map(s => s.slot);
      expect(slots).toEqual(expect.arrayContaining(['planComptable', 'tiers', 'immobilisations']));
    }
  });
});
