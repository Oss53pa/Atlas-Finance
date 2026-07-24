import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { formatNumber } from '../../utils/formatters';
import {
  Settings,
  Users,
  Shield,
  Database,
  Activity,
  Server,
  Key,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DBAuditLog } from '../../lib/db';

const AdminDashboard: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('system');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<{ entries: number; accounts: number; thirdParties: number; assets: number } | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [liveAuditLogs, setLiveAuditLogs] = useState<Array<{ time: string; event: string; user: string; ip: string; type: string }>>([]);

  // Load real data from IndexedDB on mount
  const loadLiveData = useCallback(async () => {
    try {
      const [entriesCount, accountsCount, tpCount, assetsCount, allLogs] = await Promise.all([
        adapter.count('journalEntries'),
        adapter.count('accounts'),
        adapter.count('thirdParties'),
        adapter.count('assets'),
        adapter.getAll<DBAuditLog>('auditLogs'),
      ]);
      const logs = allLogs
        .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
        .slice(0, 10);
      setLiveMetrics({ entries: entriesCount, accounts: accountsCount, thirdParties: tpCount, assets: assetsCount });
      setLiveAuditLogs(logs.map(l => ({
        time: new Date(l.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        event: l.action,
        user: l.userId || 'system',
        ip: 'local',
        type: l.action.includes('ERROR') ? 'warning' : 'success',
      })));
    } catch (err) { /* silent */
      // Fallback silently if DB not available
    }
  }, [adapter]);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // New user form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Comptable',
    password: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLiveData();
    setIsRefreshing(false);
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const data = {
        journalEntries: await adapter.getAll('journalEntries'),
        accounts: await adapter.getAll('accounts'),
        thirdParties: await adapter.getAll('thirdParties'),
        assets: await adapter.getAll('assets'),
        settings: await adapter.getAll('settings'),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wisebook-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastBackup(new Date().toLocaleString('fr-FR'));
      toast.success(t('adminDashboard.backupDownloaded'));
    } catch (err) {
      console.error('[AdminDashboard] Erreur sauvegarde:', err);
      toast.error(t('adminDashboard.backupError'));
    }
    setIsBackingUp(false);
  };

  const handleCreateUser = () => {
    // Pas de faux "créé avec succès" : la vraie création (invitation email + rôle + RLS)
    // se fait dans Espace Admin › Utilisateurs. On redirige plutôt que de simuler.
    toast.info(t('adminDashboard.createUserRedirect'));
    setShowNewUserModal(false);
    setNewUser({ name: '', email: '', role: 'Comptable', password: '' });
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowUserDetailModal(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setShowDeleteUserModal(true);
  };

  const confirmDeleteUser = () => {
    // Pas de faux "supprimé avec succès" : la suppression réelle (avec RLS) est dans
    // Espace Admin › Utilisateurs & Droits.
    toast.info(t('adminDashboard.deleteUserRedirect'));
    setShowDeleteUserModal(false);
    setSelectedUser(null);
  };

  // Metriques systeme — donnees reelles depuis IndexedDB
  const systemMetrics = [
    {
      title: t('adminDashboard.metricEntriesTitle'),
      value: liveMetrics ? formatNumber(liveMetrics.entries) : '...',
      change: t('adminDashboard.metricEntriesChange'),
      color: 'blue',
      icon: Database,
      status: 'normal'
    },
    {
      title: t('adminDashboard.metricAccountsTitle'),
      value: liveMetrics ? formatNumber(liveMetrics.accounts) : '...',
      change: t('adminDashboard.metricAccountsChange'),
      color: 'green',
      icon: Activity,
      status: 'good'
    },
    {
      title: t('adminDashboard.metricThirdPartiesTitle'),
      value: liveMetrics ? formatNumber(liveMetrics.thirdParties) : '...',
      change: t('adminDashboard.metricThirdPartiesChange'),
      color: 'orange',
      icon: Users,
      status: liveMetrics && liveMetrics.thirdParties === 0 ? 'warning' : 'good'
    },
    {
      title: t('adminDashboard.metricAssetsTitle'),
      value: liveMetrics ? formatNumber(liveMetrics.assets) : '...',
      change: t('adminDashboard.metricAssetsChange'),
      color: 'green',
      icon: HardDrive,
      status: 'good'
    }
  ];

  // TODO: wire to real user management when auth backend is available
  const users: Array<{ id: number; name: string; email: string; role: string; status: string; lastLogin: string }> = [];

  const securityLogs = liveAuditLogs.length > 0 ? liveAuditLogs : [
    { time: '--:--', event: t('adminDashboard.noEventRecorded'), user: 'system', ip: 'local', type: 'info' },
  ];

  const tabs = [
    { id: 'system', label: t('adminDashboard.tabSystem'), icon: Server },
    { id: 'users', label: t('adminDashboard.tabUsers'), icon: Users },
    { id: 'security', label: t('adminDashboard.tabSecurity'), icon: Shield },
    { id: 'database', label: t('adminDashboard.tabDatabase'), icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* Header Admin */}
      <header className="bg-white border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t('adminDashboard.title')}</h1>
            <p className="text-[var(--color-text-primary)]">{t('adminDashboard.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse"></div>
              <span>{t('adminDashboard.systemOnline')}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]"
              aria-label={t('adminDashboard.refresh')}
            >
              <RefreshCw className={`w-4 h-4 text-[var(--color-text-secondary)] ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-10 h-10 bg-[var(--color-info-lighter)] rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--color-info)]" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-primary-500 text-[var(--color-info)]' 
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="p-6">
        {activeTab === 'system' && (
          <>
            {/* Métriques système */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {systemMetrics.map((metric, index) => {
                const IconComponent = metric.icon;
                return (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${metric.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${metric.color}-600`} />
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        metric.status === 'good' ? 'bg-[var(--color-success)]' :
                        metric.status === 'warning' ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">{metric.value}</h3>
                      <p className="text-[var(--color-text-primary)] text-sm mb-1">{metric.title}</p>
                      <p className="text-[var(--color-text-secondary)] text-xs">{metric.change}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Volumétrie réelle de la base (un client web ne peut pas mesurer le CPU/RAM
                du serveur — on affiche des métriques réelles et utiles à la place). */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('adminDashboard.dbVolumeTitle')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('adminDashboard.volEntries'), value: liveMetrics?.entries },
                  { label: t('adminDashboard.volAccounts'), value: liveMetrics?.accounts },
                  { label: t('adminDashboard.volThirdParties'), value: liveMetrics?.thirdParties },
                  { label: t('adminDashboard.volAssets'), value: liveMetrics?.assets },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-lg bg-[var(--color-background-secondary)] text-center">
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{item.value != null ? formatNumber(item.value) : '…'}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('adminDashboard.usersManagement')}</h2>
                <button
                  onClick={() => setShowNewUserModal(true)}
                  className="bg-[var(--color-info)] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('adminDashboard.newUser')}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('adminDashboard.thUser')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('adminDashboard.thRole')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('adminDashboard.thStatus')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('adminDashboard.thLastLogin')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('adminDashboard.thActions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--color-background-secondary)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-[var(--color-primary)]" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-[var(--color-text-primary)]">{user.name}</div>
                            <div className="text-sm text-[var(--color-text-secondary)]">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'Admin' ? 'bg-[var(--color-info-lighter)] text-[var(--color-info-darker)]' :
                          user.role === 'Manager' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'active' 
                            ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                            : 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                        }`}>
                          {user.status === 'active' ? t('adminDashboard.statusActive') : t('adminDashboard.statusInactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                        {t('adminDashboard.lastLoginAgo', { time: user.lastLogin })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]"
                            aria-label={t('adminDashboard.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-[var(--color-success)] hover:text-[var(--color-success-darker)]"
                            aria-label={t('adminDashboard.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-[var(--color-error)] hover:text-[var(--color-error-darker)]"
                            aria-label={t('adminDashboard.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Alertes sécurité */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('adminDashboard.securityLog')}</h2>
              <div className="space-y-3">
                {securityLogs.map((log, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    log.type === 'success' ? 'bg-[var(--color-success-lightest)] border-green-400' :
                    log.type === 'warning' ? 'bg-[var(--color-warning-lightest)] border-yellow-400' :
                    'bg-[var(--color-primary-lightest)] border-blue-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {log.type === 'success' && <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />}
                        {log.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />}
                        {log.type === 'info' && <Clock className="w-5 h-5 text-[var(--color-primary)]" />}
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{log.event}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{t('adminDashboard.logUserIp', { user: log.user, ip: log.ip })}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration sécurité */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('adminDashboard.securityParams')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('adminDashboard.securityConfigDesc1')}<strong>{t('adminDashboard.securityConfigDescStrong')}</strong>{t('adminDashboard.securityConfigDesc2')}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('adminDashboard.backup')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">{t('adminDashboard.lastBackup')}</span>
                    <span className="text-sm text-[var(--color-success)]">{lastBackup || t('adminDashboard.noBackupSession')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">{t('adminDashboard.frequency')}</span>
                    <span className="text-sm text-[var(--color-text-primary)]">{t('adminDashboard.manual')}</span>
                  </div>
                  <button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="w-full bg-[var(--color-primary)] text-white py-2 rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('adminDashboard.backingUp')}</span>
                      </>
                    ) : (
                      <span>{t('adminDashboard.backupNow')}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Nouvel Utilisateur */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--color-info-lighter)] rounded-lg flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-[var(--color-info)]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('adminDashboard.newUserModalTitle')}</h2>
                </div>
                <button onClick={() => setShowNewUserModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.fullNameRequired')}</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('adminDashboard.phFullName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.emailRequired')}</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.roleRequired')}</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Comptable">{t('adminDashboard.roleComptable')}</option>
                  <option value="Manager">{t('adminDashboard.roleManager')}</option>
                  <option value="Admin">{t('adminDashboard.roleAdmin')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.passwordRequired')}</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowNewUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('adminDashboard.cancel')}
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg hover:bg-primary-700"
              >
                {t('adminDashboard.createUser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails Utilisateur */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('adminDashboard.userDetails')}</h2>
                <button onClick={() => setShowUserDetailModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('adminDashboard.thRole')}</span>
                  <span className="font-medium">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('adminDashboard.thStatus')}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    selectedUser.status === 'active'
                      ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedUser.status === 'active' ? t('adminDashboard.statusActive') : t('adminDashboard.statusInactive')}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">{t('adminDashboard.thLastLogin')}</span>
                  <span className="font-medium">{t('adminDashboard.lastLoginAgo', { time: selectedUser.lastLogin })}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end">
              <button
                onClick={() => setShowUserDetailModal(false)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
              >
                {t('adminDashboard.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Utilisateur */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('adminDashboard.editUser')}</h2>
                <button onClick={() => setShowEditUserModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.fullName')}</label>
                <input
                  type="text"
                  defaultValue={selectedUser.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.emailLabel')}</label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.roleLabel')}</label>
                <select
                  defaultValue={selectedUser.role}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Comptable">{t('adminDashboard.roleComptable')}</option>
                  <option value="Manager">{t('adminDashboard.roleManager')}</option>
                  <option value="Admin">{t('adminDashboard.roleAdmin')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('adminDashboard.statusLabel')}</label>
                <select
                  defaultValue={selectedUser.status}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="active">{t('adminDashboard.statusActive')}</option>
                  <option value="inactive">{t('adminDashboard.statusInactive')}</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('adminDashboard.cancel')}
              </button>
              <button
                onClick={() => {
                  // Pas de faux "modifié avec succès" : l'édition réelle (persistée) se fait dans
                  // Espace Admin › Utilisateurs & Droits. On redirige plutôt que de simuler.
                  toast.info(t('adminDashboard.editUserRedirect'));
                  setShowEditUserModal(false);
                }}
                className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-darker)]"
              >
                {t('adminDashboard.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supprimer Utilisateur */}
      {showDeleteUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-error)]">{t('adminDashboard.deleteUserTitle')}</h2>
                <button onClick={() => setShowDeleteUserModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-[var(--color-error)]" />
                </div>
              </div>
              <p className="text-center text-gray-700 mb-4">
                {t('adminDashboard.deleteConfirmPrefix')}<strong>{selectedUser.name}</strong>{t('adminDashboard.deleteConfirmSuffix')}
              </p>
              <p className="text-center text-sm text-gray-500">
                {t('adminDashboard.irreversible')}
              </p>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('adminDashboard.cancel')}
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg hover:bg-red-700"
              >
                {t('adminDashboard.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;