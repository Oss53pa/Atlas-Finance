import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Key, Lock, Activity, AlertTriangle, CheckCircle,
  ArrowLeft, Home, Eye, Edit, Plus, Download, Settings, Server,
  UserCheck, Clock, Globe, Smartphone, Monitor, Database
} from 'lucide-react';

const SecurityModuleV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Onglets sécurité
  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Shield },
    { id: 'users', label: 'Utilisateurs', icon: Users, badge: '24' },
    { id: 'roles', label: 'Rôles & Permissions', icon: Key },
    { id: 'sessions', label: 'Sessions', icon: Activity },
    { id: 'audit', label: 'Audit Trail', icon: Clock },
    { id: 'policies', label: 'Politiques', icon: Lock },
  ];

  // Métriques sécurité
  const securityMetrics = [
    { title: 'Utilisateurs actifs', value: '24', color: '#7A99AC', icon: Users, status: 'normal' },
    { title: 'Sessions en cours', value: '18', color: '#6A8A82', icon: Activity, status: 'normal' },
    { title: 'Tentatives échouées', value: '3', color: '#B87333', icon: AlertTriangle, status: 'attention' },
    { title: 'Score sécurité', value: '98%', color: '#6A8A82', icon: Shield, status: 'excellent' }
  ];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Admin</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B85450] to-[#A84440] flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Centre de Sécurité</h1>
                <p className="text-sm text-[#767676]">Gestion sécurité et permissions</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              <Shield className="w-4 h-4" />
              <span>Système sécurisé</span>
            </div>
            
            <button 
              onClick={() => navigate('/config')}
              className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Configuration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
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
                      ? 'border-[#B85450] text-[#B85450]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${activeTab === tab.id ? 'bg-[#B85450] text-white' : 'bg-blue-100 text-blue-600'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu sécurité */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Métriques sécurité */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {securityMetrics.map((metric, index) => {
                  const IconComponent = metric.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <div className="flex items-center justify-between mb-3">
                        <IconComponent className="w-6 h-6" style={{color: metric.color}} />
                        <div className={`w-3 h-3 rounded-full ${
                          metric.status === 'excellent' ? 'bg-green-500' :
                          metric.status === 'normal' ? 'bg-blue-500' :
                          metric.status === 'attention' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <h3 className="text-2xl font-bold text-[#191919] mb-1">{metric.value}</h3>
                      <p className="text-sm text-[#444444]">{metric.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Connexions actives */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🌐 Connexions Actives</h3>
                  <div className="space-y-2">
                    {[
                      { user: 'Marie Dupont', device: 'Desktop', location: 'Douala', time: '2h', status: 'active' },
                      { user: 'Jean Martin', device: 'Mobile', location: 'Yaoundé', time: '1h', status: 'active' },
                      { user: 'Sophie Bernard', device: 'Tablet', location: 'Garoua', time: '30min', status: 'active' }
                    ].map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#7A99AC] text-white flex items-center justify-center text-sm font-bold">
                            {session.user.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{session.user}</p>
                            <p className="text-xs text-[#767676]">{session.device} - {session.location}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#767676]">Actif depuis {session.time}</span>
                          <div className="w-2 h-2 bg-green-500 rounded-full ml-auto mt-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Événements sécurité */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🔍 Événements Récents</h3>
                  <div className="space-y-2">
                    {[
                      { heure: '14:30', event: 'Connexion réussie', user: 'marie@company.com', type: 'success' },
                      { heure: '12:15', event: 'Modification permissions', user: 'admin@company.com', type: 'info' },
                      { heure: '09:45', event: 'Tentative échouée', user: 'unknown', type: 'warning' }
                    ].map((event, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        event.type === 'success' ? 'bg-green-50 border-green-400' :
                        event.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{event.event}</p>
                            <p className="text-xs text-[#767676]">{event.user}</p>
                          </div>
                          <span className="text-xs text-[#767676]">{event.heure}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#191919]">🔑 Matrice des Permissions</h3>
                  <button className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Nouveau rôle</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      role: 'Comptable',
                      users: 8,
                      permissions: ['Saisie écritures', 'Consultation', 'Validation', 'États financiers'],
                      color: '#6A8A82'
                    },
                    {
                      role: 'Manager', 
                      users: 4,
                      permissions: ['Consultation avancée', 'Analyses', 'Rapports', 'Budgets'],
                      color: '#B87333'
                    },
                    {
                      role: 'Administrateur',
                      users: 2, 
                      permissions: ['Gestion complète', 'Configuration', 'Sécurité', 'Système'],
                      color: '#7A99AC'
                    }
                  ].map((role, index) => (
                    <div key={index} className="p-4 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-[#191919]">{role.role}</h4>
                        <div 
                          className="w-8 h-8 rounded-lg text-white flex items-center justify-center text-sm font-bold"
                          style={{backgroundColor: role.color}}
                        >
                          {role.users}
                        </div>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        {role.permissions.map((perm, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-[#444444]">{perm}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="flex-1 px-2 py-1 border border-current rounded text-xs hover:bg-opacity-10" style={{color: role.color}}>
                          Modifier
                        </button>
                        <button className="flex-1 px-2 py-1 text-white rounded text-xs hover:bg-opacity-90" style={{backgroundColor: role.color}}>
                          Gérer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#191919]">📋 Audit Trail</h3>
                  <div className="flex items-center space-x-2">
                    <select className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm">
                      <option>Aujourd'hui</option>
                      <option>Cette semaine</option>
                      <option>Ce mois</option>
                    </select>
                    <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
                      <Download className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {[
                    { heure: '15:45', action: 'Création utilisateur', details: 'Sophie Bernard - Comptable', user: 'admin@company.com', type: 'creation' },
                    { heure: '14:30', action: 'Modification permissions', details: 'Ajout droit validation', user: 'pierre@company.com', type: 'modification' },
                    { heure: '13:20', action: 'Connexion système', details: 'Dashboard Executive', user: 'jean@company.com', type: 'connexion' },
                    { heure: '12:15', action: 'Export données', details: 'Balance générale PDF', user: 'marie@company.com', type: 'export' },
                    { heure: '11:30', action: 'Sauvegarde automatique', details: 'Base de données complète', user: 'system', type: 'systeme' }
                  ].map((audit, index) => (
                    <div key={index} className="flex items-start justify-between p-3 rounded-lg border border-[#E8E8E8] hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          audit.type === 'creation' ? 'bg-green-100 text-green-600' :
                          audit.type === 'modification' ? 'bg-yellow-100 text-yellow-600' :
                          audit.type === 'connexion' ? 'bg-blue-100 text-blue-600' :
                          audit.type === 'export' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {audit.type === 'creation' && <Plus className="w-4 h-4" />}
                          {audit.type === 'modification' && <Edit className="w-4 h-4" />}
                          {audit.type === 'connexion' && <Activity className="w-4 h-4" />}
                          {audit.type === 'export' && <Download className="w-4 h-4" />}
                          {audit.type === 'systeme' && <Server className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#191919]">{audit.action}</p>
                          <p className="text-xs text-[#767676] mb-1">{audit.details}</p>
                          <p className="text-xs text-[#444444]">Par: {audit.user}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#767676] mt-1">{audit.heure}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityModuleV2;