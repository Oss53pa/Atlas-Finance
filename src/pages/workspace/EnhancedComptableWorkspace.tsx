import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  FileText,
  BookOpen,
  BarChart3,
  Users,
  Banknote,
  PieChart,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  DollarSign,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Home,
  ArrowLeft,
  Bell,
  HelpCircle,
  User,
  Search,
  Menu,
  X,
  Target,
  AlertCircle,
  MessageSquare,
  CheckSquare,
  Calendar
} from 'lucide-react';

// Import des modules internes
import EnhancedTasksModule from '../../components/tasks/EnhancedTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import NotificationSystem from '../../components/notifications/NotificationSystem';

const EnhancedComptableWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<'dashboard' | 'tasks' | 'collaboration'>('dashboard');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Sample notifications for Comptable (avec IDs uniques)
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-comptable-1',
      type: 'task' as const,
      title: 'Saisie d\'écritures urgente',
      message: 'Factures fournisseurs en attente de saisie',
      timestamp: new Date(),
      isRead: false,
      requireDismiss: true,
      taskDetails: {
        taskId: 'task-c001',
        assignedBy: 'Jean Martin',
        priority: 'high' as const,
        dueDate: 'Aujourd\'hui'
      }
    },
    {
      id: 'notif-comptable-2',
      type: 'task' as const,
      title: 'Rapprochement bancaire',
      message: 'Rapprochement du compte BNP à effectuer',
      timestamp: new Date(Date.now() - 3600000),
      isRead: false,
      requireDismiss: true,
      taskDetails: {
        taskId: 'task-c002',
        assignedBy: 'Jean Martin',
        priority: 'medium' as const,
        dueDate: 'Demain'
      }
    },
    {
      id: 'notif-comptable-3',
      type: 'task' as const,
      title: 'Clôture mensuelle',
      message: 'Préparation de la clôture du mois de mars',
      timestamp: new Date(Date.now() - 7200000),
      isRead: false,
      requireDismiss: true,
      taskDetails: {
        taskId: 'task-c003',
        assignedBy: 'Système',
        priority: 'low' as const,
        dueDate: '5 jours'
      }
    },
    {
      id: 'notif-comptable-4',
      type: 'success' as const,
      title: 'Balance validée',
      message: 'La balance du mois de février a été validée avec succès',
      timestamp: new Date(Date.now() - 10800000),
      isRead: false,
      requireDismiss: false
    },
    {
      id: 'notif-comptable-5',
      type: 'info' as const,
      title: 'Nouvelle note de frais',
      message: 'Une nouvelle note de frais est en attente de traitement',
      timestamp: new Date(Date.now() - 14400000),
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

  // Statistiques pour le dashboard
  const stats = {
    journalEntries: { value: 234, trend: 12, label: 'Écritures du mois' },
    pendingInvoices: { value: 45, trend: -8, label: 'Factures en attente' },
    cashFlow: { value: '125.4k€', trend: 15, label: 'Trésorerie' },
    monthlyRevenue: { value: '89.2k€', trend: 5, label: 'CA du mois' }
  };

  // Liens directs vers WiseBook
  const wiseBookLinks = [
    { id: 'chart', label: 'Plan comptable', icon: BookOpen, badge: 'SYSCOHADA', path: '/accounting/chart-of-accounts' },
    { id: 'closure', label: 'Calendrier de clôture', icon: Calendar, badge: null, path: '/accounting/closure-calendar' },
    { id: 'entries', label: 'Saisie d\'écritures', icon: FileText, badge: '5', path: '/accounting/entries' },
    { id: 'journals', label: 'Journaux', icon: BookOpen, path: '/accounting/journals' },
    { id: 'ledger', label: 'Grand livre', icon: Calculator, path: '/accounting/general-ledger' },
    { id: 'balance', label: 'Balance générale', icon: PieChart, path: '/accounting/balance' },
    { id: 'statements', label: 'États financiers', icon: TrendingUp, path: '/accounting/financial-statements' },
    { id: 'thirds', label: 'Gestion tiers', icon: Users, path: '/third-party' },
    { id: 'banking', label: 'Banque', icon: Banknote, path: '/treasury' },
  ];

  const renderDashboard = () => (
    <div className="p-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(stats).map(([key, stat]) => (
          <div key={key} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">{stat.label}</span>
              <span className={`text-xs font-bold ${stat.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend > 0 ? '↑' : '↓'} {Math.abs(stat.trend)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Accès rapide WiseBook */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Accès rapide WiseBook</h3>
          <button
            onClick={() => navigate('/executive')}
            className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            WiseBook Complet
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {wiseBookLinks.map(link => (
            <button
              key={link.id}
              onClick={() => navigate(link.path)}
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <link.icon className="w-6 h-6 text-[#6A8A82] mb-2" />
              <span className="text-sm text-gray-700 text-center">{link.label}</span>
              {link.badge && (
                <span className="mt-2 px-2 py-1 bg-[#B87333] text-white text-xs rounded-full">
                  {link.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Activités récentes */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dernières écritures</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900">Facture F2024-{100 + i}</div>
                  <div className="text-xs text-gray-500">Client ABC - {1250 + i * 100}€</div>
                </div>
                <span className="text-xs text-gray-500">Il y a {i}h</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Échéances à venir</h3>
          <div className="space-y-3">
            {[
              { label: 'TVA mensuelle', date: '15/03', amount: '12,450€', type: 'tax' },
              { label: 'Salaires', date: '25/03', amount: '45,200€', type: 'salary' },
              { label: 'Charges sociales', date: '30/03', amount: '18,750€', type: 'social' },
              { label: 'Loyer', date: '01/04', amount: '3,500€', type: 'rent' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.date} - {item.amount}</div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  item.type === 'tax' ? 'bg-orange-100 text-orange-700' :
                  item.type === 'salary' ? 'bg-blue-100 text-blue-700' :
                  item.type === 'social' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Navigation et logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-semibold text-gray-700">Retour</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Espace Comptable</h1>
                <p className="text-xs text-gray-500">WiseBook ERP v3.0</p>
              </div>
            </div>
          </div>

          {/* Onglets de navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'dashboard'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setActiveModule('tasks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'tasks'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Mes Tâches
                <span className="px-2 py-0.5 bg-[#B87333] text-white text-xs rounded-full">3</span>
              </div>
            </button>
            <button
              onClick={() => setActiveModule('collaboration')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeModule === 'collaboration'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat & Collaboration
                <span className="px-2 py-0.5 bg-[#B87333] text-white text-xs rounded-full">5</span>
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Marie Dupont</p>
                <p className="text-xs text-gray-500">Comptable</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="h-[calc(100vh-65px)]">
        {activeModule === 'dashboard' && renderDashboard()}
        {activeModule === 'tasks' && <EnhancedTasksModule userRole="comptable" currentUserId="user1" currentUser="Marie Dupont" />}
        {activeModule === 'collaboration' && <CollaborationModule />}
      </main>
    </div>
  );
};

export default EnhancedComptableWorkspace;