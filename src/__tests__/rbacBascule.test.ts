/**
 * Paramètres · Lot B·2 — préparation bascule RBAC phase 3 (CDC §13).
 * Delta rôle legacy (profiles.role) ↔ effectif (user_role) : garantit qu'on ne
 * bascule jamais un utilisateur en le verrouillant hors de ses accès actuels.
 */
import { describe, it, expect } from 'vitest';
import { diffRoles, safeToSwitch, canonicalRole, type RoleCrosswalkRow } from '../services/param/rbacBascule';

const CANON = ['super_admin', 'admin', 'manager', 'comptable', 'accountant', 'user', 'viewer'];
const XWALK: RoleCrosswalkRow[] = [
  { source_vocab: 'profiles', source_value: 'client', canonical_role: 'viewer', statut: 'confirme', note: null },
  { source_vocab: 'roles_name', source_value: 'auditor', canonical_role: 'viewer', statut: 'confirme', note: null },
  { source_vocab: 'roles_name', source_value: 'member', canonical_role: 'user', statut: 'confirme', note: null },
  { source_vocab: 'profiles', source_value: 'partenaire', canonical_role: 'user', statut: 'a_trancher', note: null },
];

describe('canonicalRole', () => {
  it('applique le crosswalk confirmé (client→viewer, auditor→viewer, member→user)', () => {
    expect(canonicalRole('profiles', 'client', XWALK, CANON)).toBe('viewer');
    expect(canonicalRole('roles_name', 'auditor', XWALK, CANON)).toBe('viewer');
    expect(canonicalRole('roles_name', 'member', XWALK, CANON)).toBe('user');
  });
  it('laisse passer une valeur déjà canonique sans mapping', () => {
    expect(canonicalRole('user_role', 'admin', XWALK, CANON)).toBe('admin');
  });
  it('ignore les mappings à_trancher (non résolu → null, aucun accès)', () => {
    expect(canonicalRole('profiles', 'partenaire', XWALK, CANON)).toBeNull();
  });
  it('valeur inconnue et non canonique → null', () => {
    expect(canonicalRole('profiles', 'zzz', XWALK, CANON)).toBeNull();
    expect(canonicalRole('profiles', null, XWALK, CANON)).toBeNull();
  });
});

describe('diffRoles', () => {
  it('backfill nominal (rôle unique = effectif) → aligné, écart nul', () => {
    const d = diffRoles('admin', ['admin']);
    expect(d.aligned).toBe(true);
    expect(d.perd).toEqual([]);
    expect(d.gagne).toEqual([]);
  });

  it('rôle legacy absent de l’effectif → perd (verrouillage détecté)', () => {
    const d = diffRoles('admin', ['viewer']);
    expect(d.aligned).toBe(false);
    expect(d.perd).toEqual(['admin']);
    expect(d.gagne).toEqual(['viewer']);
  });

  it('multi-rôles couvrant le legacy → aligné + accès gagnés listés', () => {
    const d = diffRoles('comptable', ['comptable', 'manager']);
    expect(d.aligned).toBe(true);
    expect(d.perd).toEqual([]);
    expect(d.gagne).toEqual(['manager']);
  });

  it('legacy null (aucun rôle à préserver) → aligné', () => {
    expect(diffRoles(null, ['viewer']).aligned).toBe(true);
    expect(diffRoles(null, []).aligned).toBe(true);
  });

  it('déduplique les rôles effectifs', () => {
    expect(diffRoles('admin', ['admin', 'admin']).effective).toEqual(['admin']);
  });

  it('safeToSwitch = vrai seulement si tous alignés (et non vide)', () => {
    expect(safeToSwitch([diffRoles('admin', ['admin']), diffRoles('user', ['user', 'viewer'])])).toBe(true);
    expect(safeToSwitch([diffRoles('admin', ['admin']), diffRoles('client', ['viewer'])])).toBe(false);
    expect(safeToSwitch([])).toBe(false);
  });
});
