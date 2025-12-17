import React, { useState } from 'react';
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

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Comptable',
    password: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsBackingUp(false);
    alert('Sauvegarde effectuée avec succès !');
  };

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    alert(`Utilisateur ${newUser.name} créé avec succès !`);
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
    alert(`Utilisateur ${selectedUser?.name} supprimé avec succès !`);
    setShowDeleteUserModal(false);
    setSelectedUser(null);
  };

  // Métriques système
  const systemMetrics = [
    {
      title: 'Utilisateurs Actifs',
      value: '24',
      change: '+3 cette semaine',
      color: 'blue',
      icon: Users,
      status: 'normal'
    },
    {
      title: 'CPU Usage',
      value: '23%',
      change: 'Optimal',
      color: 'green',
      icon: Cpu,
      status: 'good'
    },
    {
      title: 'Stockage',
      value: '68%',
      change: '12GB disponibles',
      color: 'orange',
      icon: HardDrive,
      status: 'warning'
    },
    {
      title: 'Sécurité',
      value: '100%',
      change: 'Aucune menace',
      color: 'green',
      icon: Shield,
      status: 'good'
    }
  ];

  const users = [
    { id: 1, name: 'Marie Dupont', email: 'marie@example.com', role: 'Comptable', status: 'active', lastLogin: '2h' },
    { id: 2, name: 'Jean Martin', email: 'jean@example.com', role: 'Manager', status: 'active', lastLogin: '1h' },
    { id: 3, name: 'Sophie Bernard', email: 'sophie@example.com', role: 'Comptable', status: 'inactive', lastLogin: '2j' },
    { id: 4, name: 'Pierre Durand', email: 'pierre@example.com', role: 'Admin', status: 'active', lastLogin: '30min' },
  ];

  const securityLogs = [
    { time: '10:45', event: 'Connexion réussie', user: 'marie@example.com', ip: '192.168.1.100', type: 'success' },
    { time: '10:30', event: 'Tentative connexion échouée', user: 'unknown', ip: '203.45.67.89', type: 'warning' },
    { time: '10:15', event: 'Modification permissions', user: 'pierre@example.com', ip: '192.168.1.105', type: 'info' },
    { time: '09:45', event: 'Backup automatique', user: 'system', ip: 'localhost', type: 'success' },
  ];

  const tabs = [
    { id: 'system', label: 'Système', icon: Server },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'database', label: 'Base de données', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* Header Admin */}
      <header className="bg-white border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Administration</h1>
            <p className="text-[var(--color-text-primary)]">Gestion système et sécurité</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse"></div>
              <span>Système en ligne</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]"
              aria-label="Actualiser"
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
                      ? 'border-purple-500 text-[var(--color-info)]' 
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
                      <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{metric.value}</h3>
                      <p className="text-[var(--color-text-primary)] text-sm mb-1">{metric.title}</p>
                      <p className="text-[var(--color-text-secondary)] text-xs">{metric.change}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monitoring en temps réel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Performance Serveur</h2>
                <div className="space-y-4">
                  {[
                    { label: 'CPU', value: '23%', color: 'green' },
                    { label: 'RAM', value: '45%', color: 'blue' },
                    { label: 'Disque', value: '68%', color: 'orange' },
                    { label: 'Réseau', value: '12%', color: 'green' },
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--color-text-primary)]">{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="w-full bg-[var(--color-border)] rounded-full h-2">
                        <div 
                          className={`bg-${item.color}-500 h-2 rounded-full transition-all duration-300`}
                          style={{ width: item.value }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Activité Réseau</h2>
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-2" />
                    <p className="text-[var(--color-text-primary)] text-sm">Graphique réseau temps réel</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Gestion des Utilisateurs</h2>
                <button
                  onClick={() => setShowNewUserModal(true)}
                  className="bg-[var(--color-info)] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Nouvel utilisateur</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Dernière connexion</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Actions</th>
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
                          {user.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                        Il y a {user.lastLogin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-[var(--color-success)] hover:text-[var(--color-success-darker)]"
                            aria-label="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-[var(--color-error)] hover:text-[var(--color-error-darker)]"
                            aria-label="Supprimer"
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
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Journal de Sécurité</h2>
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
                          <p className="text-xs text-[var(--color-text-secondary)]">Utilisateur: {log.user} | IP: {log.ip}</p>
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
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Paramètres de Sécurité</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">Authentification 2FA</span>
                    <div className="w-12 h-6 bg-[var(--color-success)] rounded-full p-1">
                      <div className="w-4 h-4 bg-white rounded-full ml-6 transition-all"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">Sessions automatiques</span>
                    <div className="w-12 h-6 bg-[var(--color-success)] rounded-full p-1">
                      <div className="w-4 h-4 bg-white rounded-full ml-6 transition-all"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">Logs détaillés</span>
                    <div className="w-12 h-6 bg-[var(--color-success)] rounded-full p-1">
                      <div className="w-4 h-4 bg-white rounded-full ml-6 transition-all"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Sauvegarde</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">Dernière sauvegarde</span>
                    <span className="text-sm text-[var(--color-success)]">Il y a 2h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">Fréquence</span>
                    <span className="text-sm text-[var(--color-text-primary)]">Toutes les 4h</span>
                  </div>
                  <button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="w-full bg-[var(--color-primary)] text-white py-2 rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sauvegarde en cours...</span>
                      </>
                    ) : (
                      <span>Sauvegarder maintenant</span>
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
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Nouvel Utilisateur</h2>
                </div>
                <button onClick={() => setShowNewUserModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Nom Prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Comptable">Comptable</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowNewUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg hover:bg-purple-700"
              >
                Créer l'utilisateur
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
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Détails Utilisateur</h2>
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
                  <span className="text-gray-600">Rôle</span>
                  <span className="font-medium">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Statut</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    selectedUser.status === 'active'
                      ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedUser.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Dernière connexion</span>
                  <span className="font-medium">Il y a {selectedUser.lastLogin}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end">
              <button
                onClick={() => setShowUserDetailModal(false)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
              >
                Fermer
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
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Modifier Utilisateur</h2>
                <button onClick={() => setShowEditUserModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  defaultValue={selectedUser.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  defaultValue={selectedUser.role}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Comptable">Comptable</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  defaultValue={selectedUser.status}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Utilisateur ${selectedUser.name} modifié avec succès !`);
                  setShowEditUserModal(false);
                }}
                className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-darker)]"
              >
                Enregistrer
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
                <h2 className="text-xl font-semibold text-[var(--color-error)]">Supprimer Utilisateur</h2>
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
                Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser.name}</strong> ?
              </p>
              <p className="text-center text-sm text-gray-500">
                Cette action est irréversible.
              </p>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;