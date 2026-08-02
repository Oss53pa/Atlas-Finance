/**
 * Paramètres · Lot B·2 — blocage SoD dur à l'affectation (CDC §13, critère #4).
 */
import { describe, it, expect } from 'vitest';
import { wouldViolateSod } from '../services/param/userRoleService';
import type { SodRule } from '../services/param/sodService';

const rules: SodRule[] = [
  { permission_a: 'accounting.create', permission_b: 'accounting.validate', severite: 'eleve', libelle: 'Saisir ET valider' },
];

describe('wouldViolateSod', () => {
  it('bloque quand le rôle ajouté crée un cumul saisie+validation', () => {
    const v = wouldViolateSod(['accounting.create', 'dashboard.view'], ['accounting.validate'], rules);
    expect(v).toHaveLength(1);
  });
  it('n’intervient pas si le cumul n’apparaît pas', () => {
    expect(wouldViolateSod(['accounting.create'], ['reports.view'], rules)).toHaveLength(0);
    expect(wouldViolateSod(['dashboard.view'], ['accounting.validate'], rules)).toHaveLength(0);
  });
  it('détecte le conflit même si les deux permissions viennent du rôle ajouté', () => {
    expect(wouldViolateSod([], ['accounting.create', 'accounting.validate'], rules)).toHaveLength(1);
  });
});
