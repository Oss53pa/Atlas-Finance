/**
 * Tests for the 22 journal entry templates (SYSCOHADA).
 * Verifies: all templates generate balanced entries, correct accounts, formula engine.
 */
import { describe, it, expect } from 'vitest';
import {
  JOURNAL_TEMPLATES,
  applyTemplate,
  getTemplatesByCategory,
  getTemplateById,
  getTemplateCategories,
  type TemplateCategorie,
} from '../services/templates/journalTemplates';

describe('Journal Entry Templates — SYSCOHADA', () => {
  it('should have exactly 22 templates', () => {
    expect(JOURNAL_TEMPLATES).toHaveLength(22);
  });

  it('should have 6 categories', () => {
    const categories = getTemplateCategories();
    expect(categories).toHaveLength(6);
    const names = categories.map(c => c.categorie);
    expect(names).toContain('ACHATS');
    expect(names).toContain('VENTES');
    expect(names).toContain('TRESORERIE');
    expect(names).toContain('PAIE');
    expect(names).toContain('OD');
    expect(names).toContain('FISCALITE');
  });

  it('should have 4 ACHATS templates', () => {
    expect(getTemplatesByCategory('ACHATS')).toHaveLength(4);
  });

  it('should have 4 VENTES templates', () => {
    expect(getTemplatesByCategory('VENTES')).toHaveLength(4);
  });

  it('should have 4 TRESORERIE templates', () => {
    expect(getTemplatesByCategory('TRESORERIE')).toHaveLength(4);
  });

  it('should have 4 PAIE templates', () => {
    expect(getTemplatesByCategory('PAIE')).toHaveLength(4);
  });

  it('should have 4 OD templates', () => {
    expect(getTemplatesByCategory('OD')).toHaveLength(4);
  });

  it('should have 2 FISCALITE templates', () => {
    expect(getTemplatesByCategory('FISCALITE')).toHaveLength(2);
  });

  it('should find template by ID', () => {
    const tpl = getTemplateById('TPL-ACH-001');
    expect(tpl).toBeDefined();
    expect(tpl!.code).toBe('ACH-MARCH');
  });

  it('should have unique IDs', () => {
    const ids = JOURNAL_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have unique codes', () => {
    const codes = JOURNAL_TEMPLATES.map(t => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  // -- Balance tests for each template --

  describe('Achat marchandises (ACH-MARCH)', () => {
    it('should generate balanced entry with TVA', () => {
      const result = applyTemplate(JOURNAL_TEMPLATES[0], {
        montantHT: 100000,
        tauxTVA: 18,
        tiers: 'FOURNISSEUR-001',
      });
      expect(result.success).toBe(true);
      expect(result.lines).toHaveLength(3);
      const totalD = result.lines!.reduce((s, l) => s + l.debit, 0);
      const totalC = result.lines!.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalD - totalC)).toBeLessThan(0.01);
      // Check amounts
      expect(result.lines![0].debit).toBe(100000);  // HT
      expect(result.lines![1].debit).toBe(18000);   // TVA 18%
      expect(result.lines![2].credit).toBe(118000);  // TTC
    });
  });

  describe('Vente marchandises (VTE-MARCH)', () => {
    it('should generate balanced entry', () => {
      const tpl = getTemplateById('TPL-VTE-001')!;
      const result = applyTemplate(tpl, {
        montantHT: 500000,
        tauxTVA: 18,
        tiers: 'CLIENT-001',
      });
      expect(result.success).toBe(true);
      const totalD = result.lines!.reduce((s, l) => s + l.debit, 0);
      const totalC = result.lines!.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalD - totalC)).toBeLessThan(0.01);
      expect(result.lines![0].debit).toBe(590000); // Client TTC
      expect(result.lines![1].credit).toBe(500000); // Vente HT
      expect(result.lines![2].credit).toBe(90000);  // TVA
    });
  });

  describe('Encaissement client (TRE-ENCAIS)', () => {
    it('should generate balanced entry without TVA', () => {
      const tpl = getTemplateById('TPL-TRE-001')!;
      const result = applyTemplate(tpl, { montantTTC: 590000, tiers: 'CLIENT-001' });
      expect(result.success).toBe(true);
      expect(result.lines).toHaveLength(2);
      const totalD = result.lines!.reduce((s, l) => s + l.debit, 0);
      const totalC = result.lines!.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalD - totalC)).toBeLessThan(0.01);
    });
  });

  describe('Salaires (PAI-SAL)', () => {
    it('should generate balanced payroll entry', () => {
      const tpl = getTemplateById('TPL-PAI-001')!;
      const result = applyTemplate(tpl, {
        salaireBrut: 300000,
        cotisationsSalariales: 50000,
        impotSalaire: 30000,
      });
      expect(result.success).toBe(true);
      expect(result.lines).toHaveLength(4);
      const totalD = result.lines!.reduce((s, l) => s + l.debit, 0);
      const totalC = result.lines!.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalD - totalC)).toBeLessThan(0.01);
      // Salaire net = brut - cotis - impot
      expect(result.lines![3].credit).toBe(220000);
    });
  });

  describe('Dotation amortissement (OD-DOTAMORT)', () => {
    it('should generate balanced depreciation entry', () => {
      const tpl = getTemplateById('TPL-OD-001')!;
      const result = applyTemplate(tpl, { montantDotation: 2000000 });
      expect(result.success).toBe(true);
      expect(result.lines).toHaveLength(2);
      const totalD = result.lines!.reduce((s, l) => s + l.debit, 0);
      const totalC = result.lines!.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalD - totalC)).toBeLessThan(0.01);
    });
  });

  describe('TVA collectee/deductible (FISC-TVA)', () => {
    it('should generate TVA liquidation entry', () => {
      const tpl = getTemplateById('TPL-FISC-001')!;
      const result = applyTemplate(tpl, {
        tvaCollectee: 90000,
        tvaDeductible: 50000,
      });
      expect(result.success).toBe(true);
      expect(result.lines).toHaveLength(3);
      const totalD = result.lines!.reduce((s, l) => s + l.debit, 0);
      const totalC = result.lines!.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalD - totalC)).toBeLessThan(0.01);
      // TVA due = collectee - deductible = 40000
      expect(result.lines![2].credit).toBe(40000);
    });
  });

  // -- All templates balanced test --
  it('should generate balanced entries for ALL 22 templates', () => {
    const testValues: Record<string, Record<string, string | number>> = {
      'TPL-ACH-001': { montantHT: 100000, tauxTVA: 18, tiers: 'FOURN-001' },
      'TPL-ACH-002': { montantHT: 200000, tauxTVA: 18, tiers: 'FOURN-001' },
      'TPL-ACH-003': { montantHT: 50000, tauxTVA: 18, tiers: 'FOURN-001' },
      'TPL-ACH-004': { montantHT: 5000000, tauxTVA: 18, tiers: 'FOURN-001', compteImmo: '241' },
      'TPL-VTE-001': { montantHT: 300000, tauxTVA: 18, tiers: 'CLIENT-001' },
      'TPL-VTE-002': { montantHT: 400000, tauxTVA: 18, tiers: 'CLIENT-001' },
      'TPL-VTE-003': { montantHT: 150000, tauxTVA: 18, tiers: 'CLIENT-001' },
      'TPL-VTE-004': { montantHT: 80000, tauxTVA: 18, tiers: 'CLIENT-001' },
      'TPL-TRE-001': { montantTTC: 354000, tiers: 'CLIENT-001' },
      'TPL-TRE-002': { montantTTC: 236000, tiers: 'FOURN-001' },
      'TPL-TRE-003': { montantTTC: 1000000, compteDest: '5211', compteOrig: '5212' },
      'TPL-TRE-004': { montantTTC: 500000, fraisEscompte: 10000 },
      'TPL-PAI-001': { salaireBrut: 300000, cotisationsSalariales: 50000, impotSalaire: 30000 },
      'TPL-PAI-002': { chargesPatronales: 80000 },
      'TPL-PAI-003': { cotisationsSalariales: 50000 },
      'TPL-PAI-004': { montantAcompte: 100000 },
      'TPL-OD-001': { montantDotation: 2000000 },
      'TPL-OD-002': { montantProvision: 500000 },
      'TPL-OD-003': { montantReprise: 300000 },
      'TPL-OD-004': { montantRegul: 150000, typeRegul: 'CCA', compteRegul: '486', compteCharge: '616' },
      'TPL-FISC-001': { tvaCollectee: 90000, tvaDeductible: 50000 },
      'TPL-FISC-002': { montantIS: 1200000 },
    };

    for (const tpl of JOURNAL_TEMPLATES) {
      const values = testValues[tpl.id];
      expect(values).toBeDefined();
      const result = applyTemplate(tpl, values);
      expect(result.success).toBe(true);
      const totalD = result.lines!.reduce((s, l) => s + l.debit, 0);
      const totalC = result.lines!.reduce((s, l) => s + l.credit, 0);
      expect(Math.abs(totalD - totalC)).toBeLessThanOrEqual(0.01);
    }
  });

  it('should reject template with missing required fields', () => {
    const tpl = getTemplateById('TPL-ACH-001')!;
    const result = applyTemplate(tpl, {}); // missing montantHT
    expect(result.success).toBe(false);
    expect(result.error).toContain('obligatoire');
  });
});
