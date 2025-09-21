import React, { useState } from 'react';
import { Menu, Search, Bell, User, LogOut, AlertTriangle, Clock, AlertCircle, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui';
import { useUiStore } from '@/store/ui';

interface HeaderProps {
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { setTheme, theme } = useUiStore();
  const [showNotifications, setShowNotifications] = useState(false);

  // Notifications mockées pour la démo
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'error',
      title: 'Journaux non équilibrés',
      message: '2 journaux nécessitent votre attention (AC, OD)',
      time: 'Il y a 5 min',
      read: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Écritures en attente',
      message: '8 écritures en attente de validation',
      time: 'Il y a 30 min',
      read: false
    },
    {
      id: '3',
      type: 'info',
      title: 'Comptes incomplets',
      message: '3 écritures avec comptes manquants',
      time: 'Il y a 1 heure',
      read: false
    },
    {
      id: '4',
      type: 'success',
      title: 'Clôture mensuelle',
      message: 'La clôture de novembre a été effectuée avec succès',
      time: 'Il y a 2 heures',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'info':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'bg-orange-50 hover:bg-orange-100';
      case 'info':
        return 'bg-blue-50 hover:bg-blue-100';
      case 'success':
        return 'bg-green-50 hover:bg-green-100';
      default:
        return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-300 bg-white shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation</span>
          </Button>

          {/* Search bar */}
          <div className="hidden w-96 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher dans WiseBook..."
                className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
          >
            {theme === 'light' ? '🌙' : '☀️'}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-96 max-h-[500px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications ({notifications.length})
                      </h3>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Tout marquer comme lu
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notifications list */}
                  <div className="overflow-y-auto max-h-[400px]">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                            !notification.read ? 'bg-blue-50/50' : ''
                          } ${getNotificationBgColor(notification.type)}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.time}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        Aucune notification
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center">
                        Voir toutes les notifications
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>

            {/* User avatar */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </div>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="border-t px-6 py-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>
    </header>
  );
};