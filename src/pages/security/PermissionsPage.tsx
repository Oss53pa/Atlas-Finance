import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Key, Lock, ArrowLeft, Home, Plus, Edit, Eye,
  CheckCircle, X, Settings, UserCheck, Clock, AlertTriangle
} from 'lucide-react';

const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('matrix');

  // Onglets permissions
  const tabs = [
    { id: 'matrix', label: 'Matrice Permissions', icon: Shield },
    { id: 'roles', label: 'Rôles', icon: Users, badge: '6' },
    { id: 'users', label: 'Utilisateurs', icon: UserCheck, badge: '24' },
    { id: 'policies', label: 'Politiques', icon: Lock },
    { id: 'audit', label: 'Audit', icon: Clock },
  ];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/security')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Sécurité</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B85450] to-[#A84440] flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Gestion des Permissions</h1>
                <p className="text-sm text-[#767676]">Contrôle d'accès RBAC</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/dashboard/admin')}
              className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Admin</span>
            </button>
            
            <button className="px-4 py-2 bg-[#B85450] text-white rounded-lg hover:bg-[#A84440] transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span className="text-sm">Nouveau rôle</span>
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

        {/* Contenu organisé */}
        <div className="p-6">
          {activeTab === 'matrix' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">🔐 Matrice des Permissions</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E8E8E8]">
                        <th className="text-left py-3 text-xs font-medium text-[#767676] uppercase">Module</th>
                        <th className="text-center py-3 text-xs font-medium text-[#767676] uppercase">Comptable</th>
                        <th className="text-center py-3 text-xs font-medium text-[#767676] uppercase">Manager</th>
                        <th className="text-center py-3 text-xs font-medium text-[#767676] uppercase">Admin</th>
                        <th className="text-center py-3 text-xs font-medium text-[#767676] uppercase">Consultant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { module: 'Saisie écritures', comptable: true, manager: false, admin: true, consultant: false },
                        { module: 'Validation', comptable: true, manager: true, admin: true, consultant: false },
                        { module: 'États financiers', comptable: true, manager: true, admin: true, consultant: true },
                        { module: 'Configuration', comptable: false, manager: false, admin: true, consultant: false },
                        { module: 'Utilisateurs', comptable: false, manager: false, admin: true, consultant: false },
                        { module: 'Rapports', comptable: true, manager: true, admin: true, consultant: true }
                      ].map((perm, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 text-sm font-medium text-[#191919]">{perm.module}</td>
                          <td className="py-3 text-center">
                            {perm.comptable ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-red-400 mx-auto" />
                            )}
                          </td>
                          <td className="py-3 text-center">
                            {perm.manager ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-red-400 mx-auto" />
                            )}
                          </td>
                          <td className="py-3 text-center">
                            {perm.admin ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-red-400 mx-auto" />
                            )}
                          </td>
                          <td className="py-3 text-center">
                            {perm.consultant ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-red-400 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div key={index} className="bg-white rounded-lg p-6 border border-[#E8E8E8] hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-[#191919]">{role.role}</h4>
                      <div 
                        className="w-8 h-8 rounded-lg text-white flex items-center justify-center text-sm font-bold"
                        style={{backgroundColor: role.color}}
                      >
                        {role.users}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {role.permissions.map((perm, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-[#444444]">{perm}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="flex-1 px-3 py-2 border rounded-lg text-xs hover:bg-gray-50" style={{borderColor: role.color, color: role.color}}>
                        Modifier
                      </button>
                      <button className="flex-1 px-3 py-2 text-white rounded-lg text-xs hover:bg-opacity-90" style={{backgroundColor: role.color}}>
                        Gérer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionsPage;