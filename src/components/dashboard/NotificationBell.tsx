import React, { useState } from 'react';
import { Bell, X, AlertTriangle, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui';
import { NotificationUtils } from '@/services/dashboardApi';
import type { NotificationSeverity, NotificationCategory } from '@/services/dashboardApi';

interface NotificationBellProps {
  /**
   * Activer le rafraîchissement automatique des notifications
   * @default true
   */
  autoRefresh?: boolean;

  /**
   * Intervalle de rafraîchissement en millisecondes
   * @default 30000 (30 secondes)
   */
  refreshInterval?: number;

  /**
   * Classes CSS additionnelles
   */
  className?: string;
}

/**
 * Composant NotificationBell
 *
 * Badge cliquable affichant le nombre de notifications non lues
 * avec un dropdown contenant les notifications récentes.
 *
 * @example
 * ```tsx
 * <NotificationBell autoRefresh={true} refreshInterval={30000} />
 * ```
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  className = '',
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const {
    notifications,
    unreadCount,
    criticalCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useNotifications({
    filters: { is_read: false },
    autoRefresh,
    refreshInterval,
  });

  /**
   * Retourne l'icône selon la sévérité
   */
  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'info':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  /**
   * Retourne la couleur de fond selon la sévérité
   */
  const getSeverityBgColor = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 hover:bg-red-100 border-red-200';
      case 'high':
        return 'bg-orange-50 hover:bg-orange-100 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
      case 'low':
        return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
      case 'info':
        return 'bg-green-50 hover:bg-green-100 border-green-200';
      default:
        return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
    }
  };

  /**
   * Gère le clic sur une notification
   */
  const handleNotificationClick = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (err) {
      console.error('Erreur lors du marquage comme lu:', err);
    }
  };

  /**
   * Gère le clic sur "Tout marquer comme lu"
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Erreur lors du marquage de toutes comme lues:', err);
    }
  };

  /**
   * Gère l'archivage d'une notification
   */
  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await archiveNotification(id);
    } catch (err) {
      console.error('Erreur lors de l\'archivage:', err);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative"
        disabled={loading}
      >
        <Bell className="h-5 w-5 text-[#f5f5f5]" />

        {/* Badge compteur */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Badge critique */}
        {criticalCount > 0 && (
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-red-600 border-2 border-white animate-pulse" />
        )}

        <span className="sr-only">Notifications</span>
      </Button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 max-h-[500px] bg-[#f5f5f5] rounded-lg shadow-lg border border-[#e5e5e5] z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#e5e5e5] bg-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#171717]">
                  Notifications {unreadCount > 0 && `(${unreadCount} non lues)`}
                </h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-[#171717] hover:text-[#525252] font-medium"
                      disabled={loading}
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="text-[#171717]/40 hover:text-[#171717]/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="px-4 py-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#171717] border-r-transparent"></div>
                <p className="mt-2 text-sm text-[#171717]/60">Chargement...</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="px-4 py-4 bg-red-50 border-b border-red-200">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}

            {/* Notifications list */}
            {!loading && (
              <div className="overflow-y-auto max-h-[400px]">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-[#e5e5e5]/50 cursor-pointer transition-colors ${getSeverityBgColor(notification.severity)}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icon */}
                        <div className="mt-0.5 flex-shrink-0">
                          {getSeverityIcon(notification.severity)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-semibold text-[#171717]">
                              {notification.title}
                            </p>

                            {/* Category emoji */}
                            <span className="ml-2 text-sm flex-shrink-0">
                              {NotificationUtils.getCategoryIcon(notification.category)}
                            </span>
                          </div>

                          {/* Severity badge */}
                          <div className="mt-1">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: NotificationUtils.getSeverityColor(notification.severity) + '20',
                                color: NotificationUtils.getSeverityColor(notification.severity),
                              }}
                            >
                              {notification.severity_display}
                            </span>
                            <span className="ml-2 text-xs text-[#171717]/60">
                              {notification.category_display}
                            </span>
                          </div>

                          {/* Time */}
                          <p className="text-xs text-[#171717]/50 mt-1">
                            {NotificationUtils.formatRelativeTime(notification.created_at)}
                          </p>
                        </div>

                        {/* Archive button */}
                        <button
                          onClick={(e) => handleArchive(e, notification.id)}
                          className="text-[#171717]/40 hover:text-[#171717]/60 flex-shrink-0"
                          title="Archiver"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-[#171717]/60">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                    <p className="font-medium">Aucune notification</p>
                    <p className="text-xs mt-1">Vous êtes à jour !</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {!loading && notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-[#e5e5e5] bg-[#e5e5e5]">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // TODO: Navigate to full notifications page
                    window.location.href = '/dashboard/notifications';
                  }}
                  className="text-xs text-[#171717] hover:text-[#525252] font-medium w-full text-center py-1"
                >
                  Voir toutes les notifications →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
