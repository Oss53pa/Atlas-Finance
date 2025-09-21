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
    <div className="min-h-screen bg-gray-50">
      {/* Header Admin */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
            <p className="text-gray-600">Gestion système et sécurité</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Système en ligne</span>
            </div>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-gray-200">
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
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${metric.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${metric.color}-600`} />
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        metric.status === 'good' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                      <p className="text-gray-600 text-sm mb-1">{metric.title}</p>
                      <p className="text-gray-500 text-xs">{metric.change}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monitoring en temps réel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Serveur</h2>
                <div className="space-y-4">
                  {[
                    { label: 'CPU', value: '23%', color: 'green' },
                    { label: 'RAM', value: '45%', color: 'blue' },
                    { label: 'Disque', value: '68%', color: 'orange' },
                    { label: 'Réseau', value: '12%', color: 'green' },
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`bg-${item.color}-500 h-2 rounded-full transition-all duration-300`}
                          style={{ width: item.value }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité Réseau</h2>
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Graphique réseau temps réel</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Gestion des Utilisateurs</h2>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors">
                  <UserPlus className="w-4 h-4" />
                  <span>Nouvel utilisateur</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière connexion</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'Manager' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Il y a {user.lastLogin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-800">
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
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Journal de Sécurité</h2>
              <div className="space-y-3">
                {securityLogs.map((log, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    log.type === 'success' ? 'bg-green-50 border-green-400' :
                    log.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {log.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {log.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                        {log.type === 'info' && <Clock className="w-5 h-5 text-blue-600" />}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.event}</p>
                          <p className="text-xs text-gray-500">Utilisateur: {log.user} | IP: {log.ip}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration sécurité */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres de Sécurité</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Authentification 2FA</span>
                    <div className="w-12 h-6 bg-green-500 rounded-full p-1">
                      <div className="w-4 h-4 bg-white rounded-full ml-6 transition-all"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Sessions automatiques</span>
                    <div className="w-12 h-6 bg-green-500 rounded-full p-1">
                      <div className="w-4 h-4 bg-white rounded-full ml-6 transition-all"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Logs détaillés</span>
                    <div className="w-12 h-6 bg-green-500 rounded-full p-1">
                      <div className="w-4 h-4 bg-white rounded-full ml-6 transition-all"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sauvegarde</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Dernière sauvegarde</span>
                    <span className="text-sm text-green-600">Il y a 2h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Fréquence</span>
                    <span className="text-sm text-gray-900">Toutes les 4h</span>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Sauvegarder maintenant
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;