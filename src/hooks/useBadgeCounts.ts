/**
 * Hook pour les badges dynamiques de la sidebar.
 * Calcule les compteurs en temps réel depuis Dexie.
 */
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';

export interface BadgeCounts {
  draftEntries: number;
  pendingValidations: number;
  unreadNotifications: number;
  alerts: number;
}

export function useBadgeCounts(): BadgeCounts {
  const { data: counts } = useQuery({
    queryKey: ['badge-counts'],
    queryFn: async () => {
      const entries = await db.journalEntries.toArray();
      const draftEntries = entries.filter(e => e.status === 'draft').length;
      const pendingValidations = entries.filter(e => e.status === 'draft').length;
      const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1).length;

      return {
        draftEntries,
        pendingValidations,
        unreadNotifications: 0,
        alerts: unbalanced + draftEntries,
      };
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  return counts || { draftEntries: 0, pendingValidations: 0, unreadNotifications: 0, alerts: 0 };
}
