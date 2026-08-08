import { useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Persistance du bloc-notes des espaces de travail.
 *
 * Stocké dans le magasin `settings` (clé/valeur, déjà présent : aucune migration
 * nécessaire), sous une clé qui porte l'identifiant de l'utilisateur ET l'espace.
 * Deux personnes qui partagent un poste ne se marchent donc pas dessus, et les
 * notes de l'espace Comptable ne se mélangent pas à celles de l'espace Manager.
 *
 * `upsert` ne fait pas partie du contrat DataAdapter : on lit puis on écrit,
 * comme le reste de l'application (voir AdminCompany).
 */
export function useWorkspaceNotes(space: string) {
  const { adapter } = useData();
  const { user } = useAuth();
  const owner = user?.id || user?.email || 'anonyme';
  const storageKey = `workspace_notes_${space}_${owner}`;

  const load = useCallback(async (key: string): Promise<string | null> => {
    const row = await adapter.getById<{ value: string }>('settings', key);
    return row?.value ?? null;
  }, [adapter]);

  const save = useCallback(async (key: string, value: string): Promise<void> => {
    const row = { key, value, updatedAt: new Date().toISOString() };
    const existing = await adapter.getById<{ key: string }>('settings', key);
    if (existing) await adapter.update('settings', key, row);
    else await adapter.create('settings', row);
  }, [adapter]);

  return { storageKey, load, save };
}
