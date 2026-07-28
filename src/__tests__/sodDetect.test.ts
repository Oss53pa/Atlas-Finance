/**
 * Paramètres · Lot B·2 — détection SoD (CDC Paramètres §13, critère #4).
 */
import { describe, it, expect } from 'vitest';
import { detectSodViolations, type SodRule } from '../services/param/sodService';

const rules: SodRule[] = [
  { permission_a: 'accounting.create', permission_b: 'accounting.validate', severite: 'eleve', libelle: 'Saisir ET valider' },
  { permission_a: 'admin.users', permission_b: 'admin.roles', severite: 'eleve', libelle: 'Users ET rôles' },
];

describe('detectSodViolations', () => {
  it('détecte un conflit quand les DEUX permissions sont présentes', () => {
    const v = detectSodViolations(['accounting.create', 'accounting.validate', 'dashboard.view'], rules);
    expect(v).toHaveLength(1);
    expect(v[0].permission_a).toBe('accounting.create');
  });

  it('aucun conflit si une seule des deux est présente', () => {
    expect(detectSodViolations(['accounting.create', 'dashboard.view'], rules)).toHaveLength(0);
    expect(detectSodViolations(['accounting.validate'], rules)).toHaveLength(0);
  });

  it('détecte plusieurs conflits distincts', () => {
    const v = detectSodViolations(['accounting.create', 'accounting.validate', 'admin.users', 'admin.roles'], rules);
    expect(v).toHaveLength(2);
  });

  it('ensemble vide ou sans règle → aucun conflit', () => {
    expect(detectSodViolations([], rules)).toHaveLength(0);
    expect(detectSodViolations(['accounting.create', 'accounting.validate'], [])).toHaveLength(0);
  });
});
