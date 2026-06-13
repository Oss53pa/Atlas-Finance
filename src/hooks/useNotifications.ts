/**
 * useNotifications — Centre de notifications connecté aux DONNÉES RÉELLES.
 *
 * Avant, la cloche affichait deux notifications codées en dur (« 3 nouvelles
 * factures », « clôture de janvier »). Ce hook dérive les notifications des
 * vrais signaux de l'application :
 *   - écritures en brouillon à valider           (useBadgeCounts)
 *   - écritures déséquilibrées                    (useBadgeCounts)
 *   - déclarations fiscales en retard / urgentes  (useFiscalAlerts)
 *
 * L'état « lu » est persisté en localStorage (par id stable + signature de
 * contenu, pour qu'un changement de volume re-notifie).
 */
import { useCallback, useMemo, useState } from 'react';
import { useBadgeCounts } from './useBadgeCounts';
import { useFiscalAlerts } from './useFiscalAlerts';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  /** Route à ouvrir au clic (optionnel) */
  path?: string;
}

const READ_KEY = 'wb_notifications_read';

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...ids])); } catch { /* quota */ }
}

export function useNotifications() {
  const badge = useBadgeCounts();
  const { data: fiscalAlerts = [] } = useFiscalAlerts();
  const [readIds, setReadIds] = useState<Set<string>>(() => loadRead());

  const notifications = useMemo<AppNotification[]>(() => {
    const list: Omit<AppNotification, 'read'>[] = [];

    if (badge.draftEntries > 0) {
      list.push({
        // l'id encode le volume → re-notifie si le nombre change
        id: `draft-entries:${badge.draftEntries}`,
        title: 'Écritures à valider',
        message: `${badge.draftEntries} écriture(s) en brouillon en attente de validation`,
        type: 'warning',
        timestamp: new Date(),
        path: '/accounting/entries',
      });
    }

    // badge.alerts = déséquilibrées + brouillons → on isole les déséquilibrées
    const unbalanced = Math.max(0, badge.alerts - badge.draftEntries);
    if (unbalanced > 0) {
      list.push({
        id: `unbalanced:${unbalanced}`,
        title: 'Écritures déséquilibrées',
        message: `${unbalanced} écriture(s) avec un écart débit / crédit`,
        type: 'error',
        timestamp: new Date(),
        path: '/accounting/entries',
      });
    }

    const overdue = fiscalAlerts.filter(a => a.isOverdue);
    if (overdue.length > 0) {
      list.push({
        id: `fiscal-overdue:${overdue.length}`,
        title: 'Déclarations fiscales en retard',
        message: `${overdue.length} déclaration(s) dépassent leur échéance`,
        type: 'error',
        timestamp: new Date(),
        path: '/taxation/echeances',
      });
    }

    const urgent = fiscalAlerts.filter(a => a.isUrgent);
    if (urgent.length > 0) {
      list.push({
        id: `fiscal-urgent:${urgent.length}`,
        title: 'Échéances fiscales proches',
        message: `${urgent.length} déclaration(s) à faire sous 7 jours`,
        type: 'warning',
        timestamp: new Date(),
        path: '/taxation/echeances',
      });
    }

    return list.map(n => ({ ...n, read: readIds.has(n.id) }));
  }, [badge.draftEntries, badge.alerts, fiscalAlerts, readIds]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev); next.add(id); saveRead(next); return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      saveRead(next); return next;
    });
  }, [notifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
