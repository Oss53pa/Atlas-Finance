/**
 * Plan de comptes SYCEBNL complet.
 */

import { describe, it, expect } from 'vitest';
import {
  SYCEBNL_PLAN,
  resolveSycebnlPlanAccount,
  sycebnlPlanByClasse,
  CLASSE_LABELS,
} from '../services/framework/sycebnlPlan';
import { getSycebnlLabel } from '../services/framework/sycebnlChart';

describe('plan de comptes SYCEBNL', () => {
  it('couvre les 8 classes', () => {
    const classes = new Set(SYCEBNL_PLAN.map(a => a.classe));
    for (let c = 1; c <= 8; c++) expect(classes.has(c)).toBe(true);
    expect(Object.keys(CLASSE_LABELS)).toHaveLength(8);
  });

  it('marque les comptes spécifiques SYCEBNL (fonds propres, fonds dédiés, ressources)', () => {
    const specifiques = SYCEBNL_PLAN.filter(a => a.specifique).map(a => a.code);
    expect(specifiques).toEqual(expect.arrayContaining(['102', '103', '13', '131', '689', '657', '754', '789']));
    // Un compte d'ossature SYSCOHADA n'est pas marqué spécifique.
    expect(SYCEBNL_PLAN.find(a => a.code === '52')!.specifique).toBe(false);
  });

  it('résout un compte par préfixe le plus long', () => {
    expect(resolveSycebnlPlanAccount('131200')!.code).toBe('131');
    expect(resolveSycebnlPlanAccount('521000')!.code).toBe('52');
    expect(resolveSycebnlPlanAccount('7551')!.code).toBe('7551');
    expect(resolveSycebnlPlanAccount('999')).toBeUndefined();
  });

  it('getSycebnlLabel couvre désormais tout le plan (pas seulement les différenciants)', () => {
    // Un compte non « différenciant » (classe 5) est maintenant libellé via le plan.
    expect(getSycebnlLabel('521000')).toContain('Banques');
    // Un différenciant reste prioritaire.
    expect(getSycebnlLabel('102')).toContain('sans droit de reprise');
  });

  it('regroupe le plan par classe, comptes triés', () => {
    const groups = sycebnlPlanByClasse();
    expect(groups[0].classe).toBe(1);
    expect(groups[groups.length - 1].classe).toBe(8);
    const classe1 = groups[0].comptes.map(c => c.code);
    expect(classe1).toEqual([...classe1].sort((a, b) => a.localeCompare(b)));
  });
});
