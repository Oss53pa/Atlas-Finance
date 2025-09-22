import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Info, Clock, User, ChevronRight } from 'lucide-react';

interface Notification {
  id: string;
  type: 'task' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  requireDismiss: boolean;
  taskDetails?: {
    taskId: string;
    assignedBy?: string;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: string;
  };
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onTaskClick?: (taskId: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
  onMarkAsRead,
  onTaskClick
}) => {
  const [activePopups, setActivePopups] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter notifications that require popup
  useEffect(() => {
    // Filtrer les notifications qui doivent être affichées en pop-up
    const popupsToShow = notifications.filter(
      n => !n.isRead &&
           n.requireDismiss &&
           !dismissedIds.has(n.id)
    );

    // Mettre à jour les pop-ups actifs (sans doublons)
    setActivePopups(popupsToShow);
  }, [notifications, dismissedIds]);

  const handlePopupDismiss = (id: string) => {
    // Ajouter l'ID aux IDs fermés pour éviter la réapparition
    setDismissedIds(prev => new Set([...prev, id]));
    // Retirer de la liste des pop-ups actifs
    setActivePopups(prev => prev.filter(p => p.id !== id));
    // Appeler les callbacks
    onDismiss(id);
    onMarkAsRead(id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Clock className="w-5 h-5" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-500';
      case 'alert':
        return 'text-red-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      {/* Bell Icon with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Aucune notification
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (notification.taskDetails?.taskId && onTaskClick) {
                        onTaskClick(notification.taskDetails.taskId);
                      }
                      onMarkAsRead(notification.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${getIconColor(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            {notification.taskDetails && (
                              <div className="flex items-center gap-2 mt-2">
                                {notification.taskDetails.priority && (
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    getPriorityColor(notification.taskDetails.priority)
                                  }`}>
                                    {notification.taskDetails.priority === 'high' ? 'Urgent' :
                                     notification.taskDetails.priority === 'medium' ? 'Normal' : 'Faible'}
                                  </span>
                                )}
                                {notification.taskDetails.assignedBy && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {notification.taskDetails.assignedBy}
                                  </span>
                                )}
                                {notification.taskDetails.dueDate && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {notification.taskDetails.dueDate}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 text-center">
                <button
                  onClick={() => {
                    notifications.forEach(n => onMarkAsRead(n.id));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Marquer tout comme lu
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mandatory Pop-ups for New Tasks */}
      {activePopups.map((popup, index) => (
        <div
          key={popup.id}
          className="fixed z-[9999]"
          style={{
            top: `${80 + index * 120}px`,
            right: '20px',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-80 overflow-hidden">
            {/* Header */}
            <div className={`px-3 py-2 ${
              popup.type === 'task' ? 'bg-gradient-to-r from-[#6A8A82] to-[#5A7A72]' :
              popup.type === 'alert' ? 'bg-gradient-to-r from-[#B87333] to-[#A86323]' :
              popup.type === 'success' ? 'bg-green-600' :
              'bg-gray-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4">
                    {getIcon(popup.type)}
                  </div>
                  <span className="text-sm font-medium">
                    {popup.type === 'task' ? 'Nouvelle tâche' :
                     popup.type === 'alert' ? 'Alerte' :
                     popup.type === 'success' ? 'Succès' :
                     'Info'}
                  </span>
                </div>
                <button
                  onClick={() => handlePopupDismiss(popup.id)}
                  className="ml-4 p-0.5 rounded hover:bg-white/20 transition-colors flex items-center justify-center"
                  title="Fermer"
                >
                  <X className="w-4 h-4 text-white stroke-2" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">{popup.title}</h4>
              <p className="text-xs text-gray-600 mb-2">{popup.message}</p>

              {popup.taskDetails && (
                <div className="bg-gray-50 rounded p-2 mb-2">
                  <div className="space-y-1">
                    {popup.taskDetails.assignedBy && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Par:</span>
                        <span className="font-medium text-gray-700">{popup.taskDetails.assignedBy}</span>
                      </div>
                    )}
                    {popup.taskDetails.priority && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Priorité:</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          popup.taskDetails.priority === 'high' ? 'bg-red-100 text-red-700' :
                          popup.taskDetails.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {popup.taskDetails.priority === 'high' ? '🔴 Urgent' :
                           popup.taskDetails.priority === 'medium' ? '🟡 Normal' : '🟢 Faible'}
                        </span>
                      </div>
                    )}
                    {popup.taskDetails.dueDate && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Échéance:</span>
                        <span className="font-medium text-gray-700">{popup.taskDetails.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {popup.taskDetails?.taskId && onTaskClick && (
                  <button
                    onClick={() => {
                      onTaskClick(popup.taskDetails!.taskId);
                      handlePopupDismiss(popup.id);
                    }}
                    className="flex-1 px-3 py-1.5 bg-[#6A8A82] text-white rounded text-xs font-medium hover:bg-[#5A7A72] transition-colors"
                  >
                    Voir la tâche
                  </button>
                )}
                <button
                  onClick={() => handlePopupDismiss(popup.id)}
                  className={`${popup.taskDetails?.taskId ? 'flex-1' : 'w-full'} px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors`}
                >
                  Compris
                </button>
              </div>
            </div>

            {/* Footer with timestamp */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                {new Date(popup.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      ))}

    </>
  );
};

export default NotificationSystem;