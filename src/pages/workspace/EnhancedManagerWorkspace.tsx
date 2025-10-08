import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  Briefcase,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Bell,
  User,
  Home,
  MessageSquare,
  CheckSquare,
  ExternalLink,
  FileText,
  BookOpen,
  ChevronRight,
  LineChart,
  Calendar,
  Loader2
} from 'lucide-react';

// Import des modules internes
import EnhancedTasksModule from '../../components/tasks/EnhancedTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import ExecutiveDashboard from '../dashboard/ExecutiveDashboard';
import NotificationSystem from '../../components/notifications/NotificationSystem';

// Import des hooks API
import { useWorkspaceByRole, useSystemInfo } from '../../hooks';

const EnhancedManagerWorkspace: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<'dashboard' | 'tasks' | 'collaboration'>('dashboard');
  const [dashboardView, setDashboardView] = useState<'manager' | 'executive'>('manager');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Chargement du workspace Manager depuis l'API
  const { data: managerWorkspace, isLoading: loadingWorkspace } = useWorkspaceByRole('manager');
  const { data: systemInfo } = useSystemInfo();

  // Utiliser les données du workspace si disponibles
  const workspaceWidgets = managerWorkspace?.widgets || [];
  const workspaceActions = managerWorkspace?.quick_actions || [];
  const workspaceStats = managerWorkspace?.statistics || [];

  // Sample notifications for Manager
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-manager-1',
      type: 'task' as const,
      title: 'Revue budgétaire',
      message: 'La revue budgétaire du département commercial est prête pour validation',
      timestamp: new Date(),
      isRead: false,
      requireDismiss: true,
      taskDetails: {
        taskId: 'task-m001',
        assignedBy: 'Marie Dupont',
        priority: 'high' as const,
        dueDate: 'Demain 14h'
      }
    },
    {
      id: 'notif-manager-2',
      type: 'task' as const,
      title: 'Rapport mensuel',
      message: 'Le rapport mensuel de performance doit être finalisé',
      timestamp: new Date(Date.now() - 1800000),
      isRead: false,
      requireDismiss: true,
      taskDetails: {
        taskId: 'task-m002',
        assignedBy: 'Système',
        priority: 'medium' as const,
        dueDate: '3 jours'
      }
    },
    {
      id: 'notif-manager-3',
      type: 'info' as const,
      title: 'Mise à jour des objectifs',
      message: 'Les objectifs Q2 ont été mis à jour',
      timestamp: new Date(Date.now() - 7200000),
      isRead: false,
      requireDismiss: false
    }
  ]);

  const handleDismissNotification = (id: string) => {
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

  // KPIs du manager
  const kpis = [
    {
      title: 'Chiffre d\'affaires',
      value: '2.4M€',
      variation: +12,
      target: '2.5M€',
      progress: 96
    },
    {
      title: 'Marge nette',
      value: '18.5%',
      variation: +2.3,
      target: '20%',
      progress: 92
    },
    {
      title: t('navigation.treasury'),
      value: '450K€',
      variation: +8,
      target: '500K€',
      progress: 90
    },
    {
      title: 'Satisfaction client',
      value: '4.6/5',
      variation: +0.3,
      target: '4.8/5',
      progress: 96
    }
  ];

  // Liens rapides manager - Utiliser les actions rapides du workspace si disponibles, sinon fallback
  const managerLinks = workspaceActions.length > 0
    ? workspaceActions.filter(action => action.is_visible).map(action => ({
        id: action.id,
        label: action.label,
        icon: eval(action.icon) as any,
        path: action.action_target
      }))
    : [
        { id: 'chart', label: 'Plan comptable', icon: BookOpen, path: '/accounting/chart-of-accounts' },
        { id: 'closure', label: 'Calendrier de clôture', icon: Calendar, path: '/accounting/closure-calendar' },
        { id: 'financial', label: 'Analyse financière', icon: DollarSign, path: '/financial-analysis-advanced' },
        { id: 'performance', label: 'Performance', icon: TrendingUp, path: '/reporting/dashboards' },
        { id: 'forecasts', label: 'Prévisions', icon: Target, path: '/treasury/cash-flow' },
        { id: 'reports', label: 'Rapports', icon: PieChart, path: '/reports' },
        { id: 'teams', label: 'Équipes', icon: Users, path: '/security/users' },
        { id: 'objectives', label: 'Objectifs', icon: Briefcase, path: '/budgeting' }
      ];

  const renderDashboard = () => {
    // Afficher un loader pendant le chargement
    if (loadingWorkspace) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Chargement du workspace manager...</p>
          </div>
        </div>
      );
    }

    // Si la vue executive est sélectionnée, afficher le dashboard executive
    if (dashboardView === 'executive') {
      return <ExecutiveDashboard />;
    }

    // Sinon afficher le dashboard manager par défaut
    return (
    <div className="p-6">
      {/* Informations workspace en haut */}
      {managerWorkspace && (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-lg p-6 mb-6 text-white">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-blue-200 text-sm mb-1">Workspace</p>
              <p className="text-xl font-bold">{managerWorkspace.name}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">Rôle</p>
              <p className="text-xl font-bold">{managerWorkspace.role_display}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">Widgets actifs</p>
              <p className="text-xl font-bold">{managerWorkspace.widget_count}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">Actions rapides</p>
              <p className="text-xl font-bold">{managerWorkspace.action_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs principaux */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                kpi.variation > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.variation > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(kpi.variation)}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-700">Objectif</span>
                <span className="font-medium">{kpi.target}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    kpi.progress >= 95 ? 'bg-green-500' :
                    kpi.progress >= 80 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${kpi.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Accès rapide */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Accès rapide</h3>
          <button
            onClick={() => navigate('/executive')}
            className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            WiseBook Complet
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {managerLinks.map(link => (
            <button
              key={link.id}
              onClick={() => navigate(link.path)}
              className="flex items-center p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 gap-3"
            >
              <link.icon className="w-5 h-5 text-[#6A8A82]" />
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tableaux de bord */}
      <div className="grid grid-cols-2 gap-6">
        {/* Performance équipes */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance des équipes</h3>
          <div className="space-y-3">
            {[
              { team: 'Comptabilité', score: 92, tasks: 45, completed: 41 },
              { team: 'Commercial', score: 88, tasks: 62, completed: 55 },
              { team: 'Production', score: 95, tasks: 38, completed: 36 },
              { team: 'IT', score: 91, tasks: 28, completed: 25 }
            ].map((team, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{team.team}</p>
                  <p className="text-xs text-gray-700">
                    {team.completed}/{team.tasks} tâches complétées
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#6A8A82]">{team.score}%</p>
                    <p className="text-xs text-gray-700">Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes et actions */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes & Actions requises</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Budget dépassé - Projet CRM</p>
                <p className="text-xs text-red-700 mt-1">Dépassement de 15% - Action immédiate requise</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Validation budget Q2 en attente</p>
                <p className="text-xs text-yellow-700 mt-1">Échéance dans 3 jours</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Rapport mensuel à réviser</p>
                <p className="text-xs text-blue-700 mt-1">5 sections à valider</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Objectifs T1 atteints</p>
                <p className="text-xs text-green-700 mt-1">102% de réalisation</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique de tendance */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution du CA (12 derniers mois)</h3>
        <div className="h-64 flex items-end justify-between gap-2">
          {[180, 195, 185, 210, 205, 215, 195, 220, 235, 225, 240, 245].map((value, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-[#6A8A82] to-[#B87333] rounded-t transition-all duration-300 hover:opacity-80"
                style={{ height: `${(value / 250) * 100}%` }}
              />
              <span className="text-xs text-gray-700 mt-2">
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][idx]}
              </span>
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B87333] to-[#A86323] flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Espace Manager</h1>
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
                  ? 'bg-[#B87333] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('navigation.dashboard')}
                {activeModule === 'dashboard' && (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            </button>

            {/* Sous-menu Dashboard */}
            {activeModule === 'dashboard' && (
              <>
                <div className="w-px h-8 bg-gray-300" />
                <button
                  onClick={() => setDashboardView('manager')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    dashboardView === 'manager'
                      ? 'bg-[#6A8A82] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Vue Manager
                </button>
                <button
                  onClick={() => setDashboardView('executive')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    dashboardView === 'executive'
                      ? 'bg-[#6A8A82] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Vue Executive
                </button>
              </>
            )}
            <button
              onClick={() => setActiveModule('tasks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'tasks'
                  ? 'bg-[#B87333] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Mes Tâches
                <span className="px-2 py-0.5 bg-[#6A8A82] text-white text-xs rounded-full">8</span>
              </div>
            </button>
            <button
              onClick={() => setActiveModule('collaboration')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'collaboration'
                  ? 'bg-[#B87333] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat & Collaboration
                <span className="px-2 py-0.5 bg-[#6A8A82] text-white text-xs rounded-full">3</span>
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#B87333] to-[#A86323] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Jean Martin</p>
                <p className="text-xs text-gray-700">Manager</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="h-[calc(100vh-65px)]">
        {activeModule === 'dashboard' && renderDashboard()}
        {activeModule === 'tasks' && <EnhancedTasksModule userRole="manager" currentUserId="user2" currentUser="Jean Martin" />}
        {activeModule === 'collaboration' && <CollaborationModule />}
      </main>
    </div>
  );
};

export default EnhancedManagerWorkspace;