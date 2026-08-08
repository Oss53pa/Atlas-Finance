import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Persistance du bloc-notes : la note doit atterrir dans le magasin `settings`,
 * sous une clé qui cloisonne par utilisateur ET par espace. Une clé partagée
 * ferait écrire deux personnes dans la même note sans que rien ne l'indique.
 */

const adapter = {
  getById: vi.fn(),
  create: vi.fn(async (_t: string, row: unknown) => row),
  update: vi.fn(async (_t: string, _id: string, row: unknown) => row),
};
let currentUser: { id?: string; email?: string } | null = { id: 'u-42', email: 'pam@atlas.io' };

vi.mock('../contexts/DataContext', () => ({ useData: () => ({ adapter }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }));

import { useWorkspaceNotes } from '../hooks/useWorkspaceNotes';

describe('useWorkspaceNotes — persistance du bloc-notes', () => {
  beforeEach(() => {
    adapter.getById.mockReset().mockResolvedValue(null);
    adapter.create.mockClear();
    adapter.update.mockClear();
    currentUser = { id: 'u-42', email: 'pam@atlas.io' };
  });

  it("cloisonne la clé par espace et par utilisateur", () => {
    const compta = renderHook(() => useWorkspaceNotes('comptable')).result.current;
    const manager = renderHook(() => useWorkspaceNotes('manager')).result.current;

    expect(compta.storageKey).toBe('workspace_notes_comptable_u-42');
    expect(manager.storageKey).toBe('workspace_notes_manager_u-42');
    expect(compta.storageKey).not.toBe(manager.storageKey);
  });

  it("retombe sur l'e-mail puis sur un identifiant neutre sans compte résolu", () => {
    currentUser = { email: 'pam@atlas.io' };
    expect(renderHook(() => useWorkspaceNotes('comptable')).result.current.storageKey)
      .toBe('workspace_notes_comptable_pam@atlas.io');

    currentUser = null;
    expect(renderHook(() => useWorkspaceNotes('comptable')).result.current.storageKey)
      .toBe('workspace_notes_comptable_anonyme');
  });

  it('crée la ligne à la première écriture', async () => {
    const { result } = renderHook(() => useWorkspaceNotes('comptable'));
    await act(async () => { await result.current.save('k', 'ma première note'); });

    expect(adapter.create).toHaveBeenCalledTimes(1);
    expect(adapter.update).not.toHaveBeenCalled();
    const [table, row] = adapter.create.mock.calls[0];
    expect(table).toBe('settings');
    expect(row).toMatchObject({ key: 'k', value: 'ma première note' });
    expect(typeof (row as { updatedAt: string }).updatedAt).toBe('string');
  });

  it('met à jour la ligne existante ensuite — sans créer de doublon', async () => {
    adapter.getById.mockResolvedValue({ key: 'k' });
    const { result } = renderHook(() => useWorkspaceNotes('comptable'));
    await act(async () => { await result.current.save('k', 'note corrigée'); });

    expect(adapter.update).toHaveBeenCalledTimes(1);
    expect(adapter.create).not.toHaveBeenCalled();
    const [table, id, row] = adapter.update.mock.calls[0];
    expect(table).toBe('settings');
    expect(id).toBe('k');
    expect(row).toMatchObject({ value: 'note corrigée' });
  });

  it('relit la valeur enregistrée, et rend null quand la note n’existe pas', async () => {
    const { result } = renderHook(() => useWorkspaceNotes('comptable'));

    adapter.getById.mockResolvedValue({ value: 'contenu relu' });
    await expect(result.current.load('k')).resolves.toBe('contenu relu');

    adapter.getById.mockResolvedValue(null);
    await expect(result.current.load('k')).resolves.toBeNull();
  });
});
