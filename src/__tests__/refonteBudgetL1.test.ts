import { describe, it, expect } from 'vitest';
import { canTransitionCampagne } from '../features/budget/services/campagneService';
import { resolveController, type SectionOrgNode } from '../features/budget/services/sectionGovernanceService';

describe('campagne — transitions de statut (Lot 1)', () => {
  it('autorise le flux nominal preparation → … → cloturee', () => {
    expect(canTransitionCampagne('preparation', 'ouverte')).toBe(true);
    expect(canTransitionCampagne('ouverte', 'consolidation')).toBe(true);
    expect(canTransitionCampagne('consolidation', 'arbitrage')).toBe(true);
    expect(canTransitionCampagne('arbitrage', 'votee')).toBe(true);
    expect(canTransitionCampagne('votee', 'cloturee')).toBe(true);
  });

  it('autorise les retours arrière prévus', () => {
    expect(canTransitionCampagne('consolidation', 'ouverte')).toBe(true);
    expect(canTransitionCampagne('arbitrage', 'consolidation')).toBe(true);
  });

  it('refuse les sauts illégaux', () => {
    expect(canTransitionCampagne('preparation', 'votee')).toBe(false);
    expect(canTransitionCampagne('ouverte', 'cloturee')).toBe(false);
    expect(canTransitionCampagne('cloturee', 'preparation')).toBe(false);
    expect(canTransitionCampagne('preparation', 'cloturee')).toBe(false);
  });
});

describe('gouvernance — résolution ascendante du contrôleur (Lot 1)', () => {
  // Direction → Département → Centre de coût. Seule la direction porte un contrôleur.
  const nodes: SectionOrgNode[] = [
    { id: 'dir', code: 'D1', libelle: 'Direction', parent_id: null, axe_id: 'a', type_axe: 'centre_cout',
      responsable: null, owner_user_id: null, controller_user_id: 'ctrl-dir' },
    { id: 'dep', code: 'DP1', libelle: 'Département', parent_id: 'dir', axe_id: 'a', type_axe: 'centre_cout',
      responsable: null, owner_user_id: null, controller_user_id: null },
    { id: 'cc', code: 'CC1', libelle: 'Centre', parent_id: 'dep', axe_id: 'a', type_axe: 'centre_cout',
      responsable: null, owner_user_id: 'own-cc', controller_user_id: null },
  ];

  it('hérite du contrôleur de la direction quand la feuille n’en a pas', () => {
    expect(resolveController(nodes, 'cc')).toBe('ctrl-dir');
  });

  it('préfère le contrôleur propre de la section s’il existe', () => {
    const withOwn = nodes.map((n) => (n.id === 'dep' ? { ...n, controller_user_id: 'ctrl-dep' } : n));
    expect(resolveController(withOwn, 'cc')).toBe('ctrl-dep');
  });

  it('renvoie null si aucun contrôleur dans la chaîne', () => {
    const none = nodes.map((n) => ({ ...n, controller_user_id: null }));
    expect(resolveController(none, 'cc')).toBeNull();
  });

  it('ne boucle pas sur un cycle parent_id accidentel', () => {
    const cyclic: SectionOrgNode[] = [
      { id: 'x', code: 'X', libelle: 'X', parent_id: 'y', axe_id: 'a', type_axe: 'centre_cout',
        responsable: null, owner_user_id: null, controller_user_id: null },
      { id: 'y', code: 'Y', libelle: 'Y', parent_id: 'x', axe_id: 'a', type_axe: 'centre_cout',
        responsable: null, owner_user_id: null, controller_user_id: null },
    ];
    expect(resolveController(cyclic, 'x')).toBeNull();
  });
});
