import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Users,
  Shield,
  Database,
  Globe,
  Lock,
  Key,
  Activity,
  Server,
  HardDrive,
  Cloud,
  ArrowLeft,
  Bell,
  User,
  Home,
  MessageSquare,
  CheckSquare,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Cpu,
  Wifi,
  WifiOff,
  BookOpen,
  Calendar,
  Loader2
} from 'lucide-react';

// Import des modules internes
import EnhancedTasksModule from '../../components/tasks/EnhancedTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import NotificationSystem from '../../components/notifications/NotificationSystem';

// Import des hooks API
import { useSystemInfo, useSystemStats, useSystemModules } from '../../hooks';
import { useCompanies, useMyWorkspace, useWorkspaceByRole } from '../../hooks';

const EnhancedAdminWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<'dashboard' | 'tasks' | 'collaboration'>('dashboard');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Chargement des données système via les hooks
  const { data: systemInfo, isLoading: loadingInfo } = useSystemInfo();
  const { data: systemStats, isLoading: loadingStats } = useSystemStats();
  const { data: systemModules, isLoading: loadingModules } = useSystemModules();
  const { data: companies, isLoading: loadingCompanies } = useCompanies();

  // Chargement du workspace Admin depuis l'API
  const { data: adminWorkspace, isLoading: loadingWorkspace } = useWorkspaceByRole('admin');

  // Utiliser les données du workspace si disponibles
  const workspaceWidgets = adminWorkspace?.widgets || [];
  const workspaceActions = adminWorkspace?.quick_actions || [];
  const workspaceStats = adminWorkspace?.statistics || [];

  // Sample notifications - In a real app, these would come from a backend or context
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-admin-1',
      type: 'task' as const,
      title: 'Nouvelle tâche urgente',
      message: 'Validation du rapport financier Q1 requise avant 17h',
      timestamp: new Date(),
      isRead: false,
      requireDismiss: true,
      taskDetails: {
        taskId: 'task-001',
        assignedBy: 'Direction',
        priority: 'high' as const,
        dueDate: 'Aujourd\'hui 17h'
      }
    },
    {
      id: 'notif-admin-2',
      type: 'alert' as const,
      title: 'Maintenance système',
      message: 'Une maintenance est prévue ce soir de 22h à 23h',
      timestamp: new Date(Date.now() - 3600000),
      isRead: false,
      requireDismiss: false
    }
  ]);

  const handleDismissNotification = (id: string) => {
    // In a real app, this would update the backend
    console.log('Notification dismissed:', id);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    setActiveModule('tasks');
  };

  // Métriques système - Utilisation des données réelles de l'API
  const systemMetrics = systemStats ? {
    users: { value: systemStats.users?.active || 0, total: systemStats.users?.total || 0, label: 'Utilisateurs actifs', unit: '', status: 'normal' },
    companies: { value: systemStats.companies?.active || 0, total: systemStats.companies?.total || 0, label: 'Sociétés actives', unit: '', status: 'normal' },
    uptime: { value: systemStats.system?.uptime || '99.9', label: 'Disponibilité', unit: '%', status: 'excellent' },
    database: { value: systemStats.system?.database === 'healthy' ? '100' : '0', label: 'Base de données', unit: '%', status: systemStats.system?.database === 'healthy' ? 'excellent' : 'error' }
  } : {
    users: { value: 0, total: 0, label: 'Utilisateurs actifs', unit: '', status: 'normal' },
    companies: { value: 0, total: 0, label: 'Sociétés actives', unit: '', status: 'normal' },
    uptime: { value: '0', label: 'Disponibilité', unit: '%', status: 'normal' },
    database: { value: '0', label: 'Base de données', unit: '%', status: 'normal' }
  };

  // Liens d'administration - Utiliser les actions rapides du workspace si disponibles, sinon fallback
  const adminLinks = workspaceActions.length > 0
    ? workspaceActions.filter(action => action.is_visible).map(action => ({
        id: action.id,
        label: action.label,
        icon: eval(action.icon) as any, // Convertir le nom de l'icône en composant
        path: action.action_target,
        count: undefined
      }))
    : [
        { id: 'chart', label: 'Plan comptable', icon: BookOpen, path: '/accounting/chart-of-accounts' },
        { id: 'closure', label: 'Calendrier de clôture', icon: Calendar, path: '/accounting/closure-calendar' },
        { id: 'users', label: 'Gestion utilisateurs', icon: Users, path: '/security/users', count: 125 },
        { id: 'roles', label: 'Rôles & Permissions', icon: Shield, path: '/security/roles', count: 8 },
        { id: 'config', label: 'Configuration système', icon: Settings, path: '/config' },
        { id: 'backup', label: 'Sauvegardes', icon: Database, path: '/settings/backup', count: 5 },
        { id: 'api', label: 'API & Intégrations', icon: Globe, path: '/settings/api', count: 12 },
        { id: 'security', label: 'Sécurité', icon: Lock, path: '/security' },
        { id: 'multi-company', label: 'Multi-sociétés', icon: Globe, path: '/multi-company' }
      ];

  const renderDashboard = () => {
    // Afficher un loader pendant le chargement des données
    if (loadingStats || loadingInfo || loadingModules || loadingCompanies || loadingWorkspace) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600">Chargement du workspace administrateur...</p>
          </div>
        </div>
      );
    }

    return (
    <div className="p-6">
      {/* Informations workspace en haut */}
      {adminWorkspace && (
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 mb-6 text-white">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-gray-300 text-sm mb-1">Workspace</p>
              <p className="text-xl font-bold">{adminWorkspace.name}</p>
            </div>
            <div>
              <p className="text-gray-300 text-sm mb-1">Rôle</p>
              <p className="text-xl font-bold">{adminWorkspace.role_display}</p>
            </div>
            <div>
              <p className="text-gray-300 text-sm mb-1">Widgets actifs</p>
              <p className="text-xl font-bold">{adminWorkspace.widget_count}</p>
            </div>
            <div>
              <p className="text-gray-300 text-sm mb-1">Actions rapides</p>
              <p className="text-xl font-bold">{adminWorkspace.action_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informations système */}
      {systemInfo && (
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-700 mb-1">Système</p>
              <p className="font-semibold text-gray-900">{systemInfo.name} v{systemInfo.version}</p>
            </div>
            <div>
              <p className="text-gray-700 mb-1">Environnement</p>
              <p className="font-semibold text-gray-900 capitalize">{systemInfo.environment}</p>
            </div>
            <div>
              <p className="text-gray-700 mb-1">Modules</p>
              <p className="font-semibold text-gray-900">{systemInfo.features?.modules_count || 0} actifs</p>
            </div>
            <div>
              <p className="text-gray-700 mb-1">Conformité</p>
              <p className="font-semibold text-green-600">SYSCOHADA ✓</p>
            </div>
          </div>
        </div>
      )}

      {/* Métriques système */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(systemMetrics).map(([key, metric]) => (
          <div key={key} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 text-sm">{metric.label}</span>
              <div className={`w-2 h-2 rounded-full ${
                metric.status === 'excellent' ? 'bg-green-500' :
                metric.status === 'normal' ? 'bg-blue-500' :
                metric.status === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              } animate-pulse`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metric.value}{metric.unit}
              {(key === 'users' || key === 'companies') && metric.total && (
                <span className="text-sm text-gray-700 font-normal ml-2">/ {metric.total}</span>
              )}
            </div>
            {key !== 'uptime' && key !== 'database' && metric.total && (
              <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 bg-blue-500"
                  style={{ width: `${(Number(metric.value) / Number(metric.total)) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Centre de contrôle */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Centre de contrôle</h3>
          <button
            onClick={() => navigate('/executive')}
            className="px-4 py-2 bg-[#444444] text-white rounded-lg hover:bg-[#333333] transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            WiseBook Complet
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {adminLinks.map(link => (
            <button
              key={link.id}
              onClick={() => navigate(link.path)}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <link.icon className="w-5 h-5 text-[#444444]" />
                <span className="text-sm font-medium text-gray-700">{link.label}</span>
              </div>
              {link.count && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {link.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Activité des utilisateurs */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité des utilisateurs</h3>
          <div className="space-y-3">
            {[
              { user: 'Marie Dupont', action: 'Connexion', time: 'Il y a 5 min', status: 'online' },
              { user: 'Jean Martin', action: 'Export données', time: 'Il y a 15 min', status: 'online' },
              { user: 'Pierre Durand', action: 'Modification droits', time: 'Il y a 1h', status: 'away' },
              { user: 'Sophie Leblanc', action: 'Sauvegarde', time: 'Il y a 2h', status: 'offline' }
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      activity.status === 'online' ? 'bg-green-500' :
                      activity.status === 'away' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                    <p className="text-xs text-gray-700">{activity.action}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-700">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes système */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes système</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Espace disque limité</p>
                <p className="text-xs text-yellow-700 mt-1">72% utilisé - Prévoir une extension</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Mise à jour disponible</p>
                <p className="text-xs text-blue-700 mt-1">Version 3.1 prête à installer</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Sauvegarde réussie</p>
                <p className="text-xs text-green-700 mt-1">Dernière sauvegarde il y a 4h</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">Scan sécurité complété</p>
                <p className="text-xs text-purple-700 mt-1">Aucune menace détectée</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services et statuts */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">État des services</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { service: 'Base de données', status: 'running', icon: Database, uptime: '99.9%' },
            { service: 'Serveur Web', status: 'running', icon: Server, uptime: '100%' },
            { service: 'API REST', status: 'running', icon: Zap, uptime: '99.7%' },
            { service: 'Backup Service', status: 'running', icon: Cloud, uptime: '100%' },
            { service: 'Email Service', status: 'running', icon: Globe, uptime: '99.5%' },
            { service: 'Cache Redis', status: 'warning', icon: Cpu, uptime: '98.2%' },
            { service: 'File Storage', status: 'running', icon: HardDrive, uptime: '100%' },
            { service: 'Monitoring', status: 'running', icon: Activity, uptime: '100%' }
          ].map((service, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <service.icon className="w-4 h-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{service.service}</p>
                  <p className="text-xs text-gray-700">Uptime: {service.uptime}</p>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                service.status === 'running' ? 'bg-green-500' :
                service.status === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              } animate-pulse`} />
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Navigation et logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-semibold text-gray-700">Retour</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-gray-700 to-gray-900 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Administration Système</h1>
                <p className="text-xs text-gray-700">WiseBook ERP v3.0</p>
              </div>
            </div>
          </div>

          {/* Onglets de navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'dashboard'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {t('navigation.dashboard')}
              </div>
            </button>
            <button
              onClick={() => setActiveModule('tasks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'tasks'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Mes Tâches
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">2</span>
              </div>
            </button>
            <button
              onClick={() => setActiveModule('collaboration')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'collaboration'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat & Collaboration
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">1</span>
              </div>
            </button>
          </div>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-3">
            <NotificationSystem
              notifications={notifications}
              onDismiss={handleDismissNotification}
              onMarkAsRead={handleMarkAsRead}
              onTaskClick={handleTaskClick}
            />

            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-700 to-gray-900 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Admin System</p>
                <p className="text-xs text-gray-700">Administrateur</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="h-[calc(100vh-65px)]">
        {activeModule === 'dashboard' && renderDashboard()}
        {activeModule === 'tasks' && <EnhancedTasksModule userRole="admin" currentUserId="admin1" currentUser="Admin System" />}
        {activeModule === 'collaboration' && <CollaborationModule />}
      </main>
    </div>
  );
};

export default EnhancedAdminWorkspace;