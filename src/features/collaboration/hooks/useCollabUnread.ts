/**
 * Hook: compteur de messages non-lus (+ mentions) de l'espace collaboratif.
 * Utilisé par la sidebar (badge) et par la page.
 */
import { useCallback, useEffect, useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getUnread, type UnreadState } from '../services/collaborationService';

export function useCollabUnread(intervalMs = 20000) {
  const { adapter } = useData();
  const { user } = useAuth();
  const [state, setState] = useState<UnreadState>({ total: 0, mentions: 0, byChannel: {} });

  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const userId = user?.id || 'me';

  const refresh = useCallback(async () => {
    try { setState(await getUnread(adapter, tenantId, userId)); } catch { /* ignore */ }
  }, [adapter, tenantId, userId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs]);

  return { ...state, refresh };
}
