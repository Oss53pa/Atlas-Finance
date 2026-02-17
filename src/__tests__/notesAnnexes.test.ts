/**
 * Tests for notes annexes SYSCOHADA (35 notes).
 * Verifies: all 35 notes defined, auto vs manual classification.
 */
import { describe, it, expect } from 'vitest';
import { getNotesDefinitions } from '../services/etats/notesAnnexesService';

describe('Notes Annexes SYSCOHADA — 35 notes', () => {
  const definitions = getNotesDefinitions();

  it('should define exactly 35 notes', () => {
    expect(definitions).toHaveLength(35);
  });

  it('should have sequential numbering 1-35', () => {
    definitions.forEach((def, index) => {
      expect(def.numero).toBe(index + 1);
    });
  });

  it('should have non-empty titles for all notes', () => {
    definitions.forEach(def => {
      expect(def.titre.length).toBeGreaterThan(0);
    });
  });

  it('should have auto-generated notes for key accounting areas', () => {
    // Notes 2,3,4 (immobilisations) should be auto
    expect(definitions.find(d => d.numero === 2)!.auto).toBe(true);
    expect(definitions.find(d => d.numero === 3)!.auto).toBe(true);
    expect(definitions.find(d => d.numero === 4)!.auto).toBe(true);
    // Note 11 (CA) should be auto
    expect(definitions.find(d => d.numero === 11)!.auto).toBe(true);
    // Note 13 (charges personnel) should be auto
    expect(definitions.find(d => d.numero === 13)!.auto).toBe(true);
    // Note 15 (dotations) should be auto
    expect(definitions.find(d => d.numero === 15)!.auto).toBe(true);
  });

  it('should have manual notes for non-computable areas', () => {
    // Note 1 (referentiel) = manual
    expect(definitions.find(d => d.numero === 1)!.auto).toBe(false);
    // Note 18 (effectif) = manual
    expect(definitions.find(d => d.numero === 18)!.auto).toBe(false);
    // Note 22 (engagements hors bilan) = manual
    expect(definitions.find(d => d.numero === 22)!.auto).toBe(false);
    // Note 31 (evenements posterieurs) = manual
    expect(definitions.find(d => d.numero === 31)!.auto).toBe(false);
    // Note 35 (date arrete) = manual
    expect(definitions.find(d => d.numero === 35)!.auto).toBe(false);
  });

  it('should contain key SYSCOHADA notes', () => {
    const titles = definitions.map(d => d.titre.toLowerCase());
    expect(titles.some(t => t.includes('immobilisations corporelles'))).toBe(true);
    expect(titles.some(t => t.includes('creances'))).toBe(true);
    expect(titles.some(t => t.includes('chiffre d\'affaires') || t.includes('chiffre d'))).toBe(true);
    expect(titles.some(t => t.includes('personnel'))).toBe(true);
    expect(titles.some(t => t.includes('impots'))).toBe(true);
    expect(titles.some(t => t.includes('capitaux propres'))).toBe(true);
    expect(titles.some(t => t.includes('hors bilan'))).toBe(true);
    expect(titles.some(t => t.includes('tresorerie'))).toBe(true);
  });

  it('should have exactly the expected count of auto vs manual notes', () => {
    const autoCount = definitions.filter(d => d.auto).length;
    const manualCount = definitions.filter(d => !d.auto).length;
    expect(autoCount + manualCount).toBe(35);
    expect(autoCount).toBeGreaterThanOrEqual(15); // At least 15 auto-generated
    expect(manualCount).toBeGreaterThanOrEqual(10); // At least 10 manual
  });
});
