import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import {
  Shield, Users, Key, Lock, ArrowLeft, Home, Plus, Edit, Eye,
  CheckCircle, X, Settings, UserCheck, Clock, AlertTriangle
} from 'lucide-react';

interface PermissionMatrixRow {
  module: string;
  comptable: boolean;
  manager: boolean;
  admin: boolean;
  consultant: boolean;
}

interface RoleCard {
  role: string;
  users: number;
  permissions: string[];
  color: string;
}

const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('matrix');
  const [matrixSetting, setMatrixSetting] = useState<any>(undefined);
  const [rolesSetting, setRolesSetting] = useState<any>(undefined);

  useEffect(() => {
    const load = async () => {
      const [ms, rs] = await Promise.all([
        adapter.getById('settings', 'permission_matrix'),
        adapter.getById('settings', 'roles_config'),
      ]);
      setMatrixSetting(ms);
      setRolesSetting(rs);
    };
    load();
  }, [adapter]);

  // Load permission matrix
  const permissionMatrix: PermissionMatrixRow[] = matrixSetting ? JSON.parse(matrixSetting.value) : [];

  // Load roles cards
  const rolesCards: RoleCard[] = useMemo(() => {
    if (!rolesSetting) return [];
    const parsed = JSON.parse(rolesSetting.value);
    // If stored data has the card shape, use it directly; otherwise map from roles list
    if (Array.isArray(parsed) && parsed.length > 0 && 'permissions' in parsed[0] && 'color' in parsed[0]) {
      return parsed as RoleCard[];
    }
    return parsed.map((r: Record<string, unknown>) => ({
      role: (r.name || r.role || '') as string,
      users: (r.usersCount || r.users || 0) as number,
      permissions: (r.permissions || []) as string[],
      color: (r.color || '#737373') as string,
    }));
  }, [rolesSetting]);

  // Onglets permissions
  const rolesCount = rolesCards.length > 0 ? String(rolesCards.length) : '0';
  const tabs = [
    { id: 'matrix', label: 'Matrice Permissions', icon: Shield },
    { id: 'roles', label: 'Rôles', icon: Users, badge: rolesCount },
    { id: 'users', label: 'Utilisateurs', icon: UserCheck, badge: '24' },
    { id: 'policies', label: 'Politiques', icon: Lock },
    { id: 'audit', label: 'Audit', icon: Clock },
  ];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/security')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">Sécurité</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#ef4444] to-[#ef4444] flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">Gestion des Permissions</h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">Contrôle d'accès RBAC</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/dashboard/admin')}
              className="px-4 py-2 bg-[var(--color-text-tertiary)] text-white rounded-lg hover:bg-[var(--color-text-secondary)] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Admin</span>
            </button>
            
            <button className="px-4 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#ef4444] transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span className="text-sm">Nouveau rôle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
        <div className="px-6 border-b border-[var(--color-border)]">
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
                      ? 'border-[#ef4444] text-[#ef4444]' 
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[#404040]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${activeTab === tab.id ? 'bg-[#ef4444] text-white' : 'bg-blue-100 text-blue-600'}
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
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="font-semibold text-[var(--color-primary)] mb-4">🔐 Matrice des Permissions</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="text-left py-3 text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Module</th>
                        <th className="text-center py-3 text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Comptable</th>
                        <th className="text-center py-3 text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Manager</th>
                        <th className="text-center py-3 text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Admin</th>
                        <th className="text-center py-3 text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Consultant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissionMatrix.map((perm, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 text-sm font-medium text-[var(--color-primary)]">{perm.module}</td>
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
                {rolesCards.map((role, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 border border-[var(--color-border)] hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-[var(--color-primary)]">{role.role}</h4>
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
                          <span className="text-xs text-[#404040]">{perm}</span>
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