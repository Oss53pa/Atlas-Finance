import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
  KeyIcon,
  LockClosedIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CogIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalculatorIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface SecurityProfile {
  id: string;
  code: string;
  name: string;
  description: string;
  level: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' | 'AUDITOR';
  isSystem: boolean;
  isActive: boolean;
  
  // Permissions par module (matrice CRUD)
  permissions: {
    [module: string]: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
      validate?: boolean;
      close?: boolean;
    };
  };
  
  // Restrictions avancées
  restrictions: {
    amountLimits: {
      maxEntryAmount?: number;
      maxValidationAmount?: number;
      dailyLimit?: number;
    };
    timeRestrictions: {
      allowedHours?: string[];
      allowedDays?: string[];
      sessionTimeout?: number;
    };
    dataAccess: {
      ownCompanyOnly: boolean;
      ownDepartmentOnly: boolean;
      readOnlyAfterClose: boolean;
    };
  };
  
  // Utilisateurs assignés
  assignedUsers: number;
  createdDate: string;
  lastModified: string;
}

interface Module {
  code: string;
  name: string;
  category: string;
  icon: any;
  description: string;
  hasValidation: boolean;
  hasClose: boolean;
  requiresSpecialAuth: boolean;
}

const SecurityProfilesManager: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [viewMode, setViewMode] = useState<'profiles' | 'matrix' | 'users' | 'audit'>('profiles');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Modules du système
  const modules: Module[] = [
    { code: 'PARAMETRES', name: 'Paramètres', category: 'SYSTEM', icon: CogIcon, description: 'Configuration système', hasValidation: false, hasClose: false, requiresSpecialAuth: true },
    { code: 'ECRITURES', name: 'Écritures', category: 'ACCOUNTING', icon: DocumentTextIcon, description: 'Saisie comptable', hasValidation: true, hasClose: true, requiresSpecialAuth: false },
    { code: 'CLOTURES', name: 'Clôtures', category: 'ACCOUNTING', icon: LockClosedIcon, description: 'Clôtures périodiques', hasValidation: true, hasClose: true, requiresSpecialAuth: true },
    { code: 'RAPPORTS', name: 'Rapports', category: 'REPORTING', icon: ChartBarIcon, description: 'États et rapports', hasValidation: false, hasClose: false, requiresSpecialAuth: false },
    { code: 'TIERS', name: 'Tiers', category: 'MASTER_DATA', icon: UsersIcon, description: 'Clients/Fournisseurs', hasValidation: false, hasClose: false, requiresSpecialAuth: false },
    { code: 'TRESORERIE', name: 'Trésorerie', category: 'TREASURY', icon: BuildingOfficeIcon, description: 'Gestion trésorerie', hasValidation: true, hasClose: false, requiresSpecialAuth: false },
    { code: 'ANALYTIQUE', name: 'Analytique', category: 'ACCOUNTING', icon: CalculatorIcon, description: 'Comptabilité analytique', hasValidation: false, hasClose: true, requiresSpecialAuth: false },
    { code: 'SECURITE', name: 'Sécurité', category: 'SYSTEM', icon: ShieldCheckIcon, description: 'Gestion utilisateurs', hasValidation: false, hasClose: false, requiresSpecialAuth: true }
  ];

  const { data: securityProfiles = [] } = useQuery({
    queryKey: ['security-profiles'],
    queryFn: async (): Promise<SecurityProfile[]> => [
      {
        id: '1',
        code: 'ADMIN',
        name: 'ADMINISTRATEUR',
        description: 'Tous droits système et paramétrage',
        level: 'ADMIN',
        isSystem: true,
        isActive: true,
        
        permissions: {
          PARAMETRES: { create: true, read: true, update: true, delete: true },
          ECRITURES: { create: true, read: true, update: true, delete: true, validate: true, close: true },
          CLOTURES: { create: true, read: true, update: true, delete: true, validate: true, close: true },
          RAPPORTS: { create: true, read: true, update: true, delete: true },
          TIERS: { create: true, read: true, update: true, delete: true },
          TRESORERIE: { create: true, read: true, update: true, delete: true, validate: true },
          ANALYTIQUE: { create: true, read: true, update: true, delete: true, close: true },
          SECURITE: { create: true, read: true, update: true, delete: true }
        },
        
        restrictions: {
          amountLimits: {},
          timeRestrictions: {},
          dataAccess: {
            ownCompanyOnly: false,
            ownDepartmentOnly: false,
            readOnlyAfterClose: false
          }
        },
        
        assignedUsers: 2,
        createdDate: '2024-01-01T00:00:00Z',
        lastModified: '2024-08-15T10:30:00Z'
      },
      {
        id: '2',
        code: 'CHEF_COMPTABLE',
        name: 'CHEF COMPTABLE',
        description: 'Validation écritures et clôtures, tous rapports',
        level: 'MANAGER',
        isSystem: true,
        isActive: true,
        
        permissions: {
          PARAMETRES: { create: false, read: true, update: false, delete: false },
          ECRITURES: { create: true, read: true, update: true, delete: true, validate: true, close: false },
          CLOTURES: { create: true, read: true, update: true, delete: false, validate: true, close: true },
          RAPPORTS: { create: true, read: true, update: true, delete: true },
          TIERS: { create: true, read: true, update: true, delete: false },
          TRESORERIE: { create: true, read: true, update: true, delete: false, validate: true },
          ANALYTIQUE: { create: true, read: true, update: true, delete: false, close: true },
          SECURITE: { create: false, read: true, update: false, delete: false }
        },
        
        restrictions: {
          amountLimits: {
            maxValidationAmount: 10000000
          },
          timeRestrictions: {
            sessionTimeout: 480 // 8 heures
          },
          dataAccess: {
            ownCompanyOnly: true,
            ownDepartmentOnly: false,
            readOnlyAfterClose: false
          }
        },
        
        assignedUsers: 3,
        createdDate: '2024-01-01T00:00:00Z',
        lastModified: '2024-07-20T14:15:00Z'
      },
      {
        id: '3',
        code: 'COMPTABLE',
        name: 'COMPTABLE',
        description: 'Saisie écritures, consultation, rapports limités',
        level: 'USER',
        isSystem: true,
        isActive: true,
        
        permissions: {
          PARAMETRES: { create: false, read: false, update: false, delete: false },
          ECRITURES: { create: true, read: true, update: true, delete: false, validate: false, close: false },
          CLOTURES: { create: false, read: true, update: false, delete: false, validate: false, close: false },
          RAPPORTS: { create: false, read: true, update: false, delete: false },
          TIERS: { create: true, read: true, update: true, delete: false },
          TRESORERIE: { create: true, read: true, update: false, delete: false, validate: false },
          ANALYTIQUE: { create: true, read: true, update: true, delete: false, close: false },
          SECURITE: { create: false, read: false, update: false, delete: false }
        },
        
        restrictions: {
          amountLimits: {
            maxEntryAmount: 5000000,
            dailyLimit: 20000000
          },
          timeRestrictions: {
            allowedHours: ['08:00', '18:00'],
            sessionTimeout: 240 // 4 heures
          },
          dataAccess: {
            ownCompanyOnly: true,
            ownDepartmentOnly: true,
            readOnlyAfterClose: true
          }
        },
        
        assignedUsers: 8,
        createdDate: '2024-01-01T00:00:00Z',
        lastModified: '2024-06-10T09:20:00Z'
      },
      {
        id: '4',
        code: 'ASSISTANT',
        name: 'ASSISTANT',
        description: 'Saisie factures, scan documents, consultation restreinte',
        level: 'USER',
        isSystem: true,
        isActive: true,
        
        permissions: {
          PARAMETRES: { create: false, read: false, update: false, delete: false },
          ECRITURES: { create: true, read: true, update: false, delete: false, validate: false, close: false },
          CLOTURES: { create: false, read: false, update: false, delete: false, validate: false, close: false },
          RAPPORTS: { create: false, read: true, update: false, delete: false },
          TIERS: { create: false, read: true, update: false, delete: false },
          TRESORERIE: { create: false, read: true, update: false, delete: false, validate: false },
          ANALYTIQUE: { create: false, read: true, update: false, delete: false, close: false },
          SECURITE: { create: false, read: false, update: false, delete: false }
        },
        
        restrictions: {
          amountLimits: {
            maxEntryAmount: 1000000,
            dailyLimit: 5000000
          },
          timeRestrictions: {
            allowedHours: ['08:00', '17:00'],
            allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
            sessionTimeout: 120 // 2 heures
          },
          dataAccess: {
            ownCompanyOnly: true,
            ownDepartmentOnly: true,
            readOnlyAfterClose: true
          }
        },
        
        assignedUsers: 5,
        createdDate: '2024-01-01T00:00:00Z',
        lastModified: '2024-05-15T16:45:00Z'
      },
      {
        id: '5',
        code: 'AUDITEUR',
        name: 'AUDITEUR',
        description: 'Consultation only, export rapports, pas de modification',
        level: 'AUDITOR',
        isSystem: true,
        isActive: true,
        
        permissions: {
          PARAMETRES: { create: false, read: true, update: false, delete: false },
          ECRITURES: { create: false, read: true, update: false, delete: false, validate: false, close: false },
          CLOTURES: { create: false, read: true, update: false, delete: false, validate: false, close: false },
          RAPPORTS: { create: false, read: true, update: false, delete: false },
          TIERS: { create: false, read: true, update: false, delete: false },
          TRESORERIE: { create: false, read: true, update: false, delete: false, validate: false },
          ANALYTIQUE: { create: false, read: true, update: false, delete: false, close: false },
          SECURITE: { create: false, read: true, update: false, delete: false }
        },
        
        restrictions: {
          amountLimits: {},
          timeRestrictions: {
            sessionTimeout: 720 // 12 heures pour audit
          },
          dataAccess: {
            ownCompanyOnly: false,
            ownDepartmentOnly: false,
            readOnlyAfterClose: false
          }
        },
        
        assignedUsers: 2,
        createdDate: '2024-01-01T00:00:00Z',
        lastModified: '2024-03-22T11:10:00Z'
      }
    ]
  });

  const getProfileColor = (level: string) => {
    switch (level) {
      case 'ADMIN': return 'red';
      case 'MANAGER': return 'blue';
      case 'USER': return 'green';
      case 'VIEWER': return 'gray';
      case 'AUDITOR': return 'purple';
      default: return 'gray';
    }
  };

  const getProfileIcon = (level: string) => {
    switch (level) {
      case 'ADMIN': return ShieldCheckIcon;
      case 'MANAGER': return UserIcon;
      case 'USER': return UsersIcon;
      case 'VIEWER': return EyeIcon;
      case 'AUDITOR': return DocumentTextIcon;
      default: return UserIcon;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getModuleIcon = (moduleCode: string) => {
    const module = modules.find(m => m.code === moduleCode);
    return module ? module.icon : DocumentTextIcon;
  };

  const renderPermissionCell = (hasPermission: boolean, permissionType: string) => {
    if (!hasPermission) {
      return <span className="text-gray-400 text-xs">-</span>;
    }
    
    const colors = {
      'create': 'text-green-600',
      'read': 'text-blue-600',
      'update': 'text-yellow-600',
      'delete': 'text-red-600',
      'validate': 'text-purple-600',
      'close': 'text-indigo-600'
    };
    
    const labels = {
      'create': 'C',
      'read': 'R',
      'update': 'U',
      'delete': 'D',
      'validate': 'V',
      'close': 'L'
    };
    
    return (
      <span className={`${colors[permissionType as keyof typeof colors]} font-bold text-sm`}>
        {labels[permissionType as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ShieldCheckIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Profils de Sécurité Avancés
            </h1>
            <p className="text-gray-600 mt-2">
              Gestion des profils et matrice CRUD complète • {securityProfiles.length} profils configurés
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="profiles">Profils</option>
              <option value="matrix">Matrice CRUD</option>
              <option value="users">Utilisateurs</option>
              <option value="audit">Audit</option>
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Nouveau Profil</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vue Profils */}
      {viewMode === 'profiles' && (
        <div className="space-y-6">
          {/* Profils prédéfinis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profils Prédéfinis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {securityProfiles.map((profile) => {
                const Icon = getProfileIcon(profile.level);
                const color = getProfileColor(profile.level);
                
                return (
                  <div key={profile.id} className={`border-2 rounded-lg p-6 transition-all cursor-pointer ${
                    selectedProfile === profile.id 
                      ? `border-${color}-300 bg-${color}-50` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProfile(profile.id)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 bg-${color}-100 rounded-lg`}>
                          <Icon className={`h-6 w-6 text-${color}-600`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                          <span className="text-xs text-gray-500">{profile.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {profile.isSystem && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Système
                          </span>
                        )}
                        {profile.isActive ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{profile.description}</p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Utilisateurs:</span>
                          <span className="ml-2 font-medium">{profile.assignedUsers}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Niveau:</span>
                          <span className={`ml-2 font-medium text-${color}-600`}>{profile.level}</span>
                        </div>
                      </div>

                      {/* Aperçu des permissions */}
                      <div>
                        <div className="text-xs text-gray-600 mb-2">Permissions principales:</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(profile.permissions).slice(0, 4).map(([module, perms]) => {
                            const hasFullAccess = perms.create && perms.read && perms.update;
                            return (
                              <span key={module} className={`px-2 py-0.5 text-xs rounded-full ${
                                hasFullAccess ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {module}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Restrictions */}
                      {(profile.restrictions.amountLimits.maxEntryAmount || 
                        profile.restrictions.timeRestrictions.sessionTimeout) && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-600 mb-1">Restrictions:</div>
                          {profile.restrictions.amountLimits.maxEntryAmount && (
                            <div className="text-xs text-orange-600">
                              • Montant max: {formatCurrency(profile.restrictions.amountLimits.maxEntryAmount)}
                            </div>
                          )}
                          {profile.restrictions.timeRestrictions.sessionTimeout && (
                            <div className="text-xs text-blue-600">
                              • Session: {profile.restrictions.timeRestrictions.sessionTimeout / 60}h
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vue Matrice CRUD */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Matrice des Droits (CRUD)</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  {securityProfiles.map((profile) => (
                    <th key={profile.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex flex-col items-center">
                        <span>{profile.code}</span>
                        <span className="text-xs text-gray-400">{profile.assignedUsers} users</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modules.map((module) => {
                  const ModuleIcon = module.icon;
                  
                  return (
                    <tr key={module.code} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <ModuleIcon className="h-5 w-5 text-gray-600" />
                          <div>
                            <div className="font-medium text-gray-900">{module.name}</div>
                            <div className="text-xs text-gray-500">{module.description}</div>
                          </div>
                        </div>
                      </td>
                      {securityProfiles.map((profile) => {
                        const modulePerms = profile.permissions[module.code];
                        if (!modulePerms) {
                          return (
                            <td key={profile.id} className="px-3 py-4 text-center">
                              <span className="text-gray-400">-</span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={profile.id} className="px-3 py-4 text-center">
                            <div className="flex flex-col space-y-1">
                              <div className="flex justify-center space-x-1">
                                {renderPermissionCell(modulePerms.create, 'create')}
                                {renderPermissionCell(modulePerms.read, 'read')}
                                {renderPermissionCell(modulePerms.update, 'update')}
                                {renderPermissionCell(modulePerms.delete, 'delete')}
                              </div>
                              {(module.hasValidation || module.hasClose) && (
                                <div className="flex justify-center space-x-1">
                                  {module.hasValidation && renderPermissionCell(modulePerms.validate || false, 'validate')}
                                  {module.hasClose && renderPermissionCell(modulePerms.close || false, 'close')}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Légende des Permissions</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 font-bold">C</span>
                <span className="text-gray-700">Create (Créer)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">R</span>
                <span className="text-gray-700">Read (Lire)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 font-bold">U</span>
                <span className="text-gray-700">Update (Modifier)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-red-600 font-bold">D</span>
                <span className="text-gray-700">Delete (Supprimer)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-purple-600 font-bold">V</span>
                <span className="text-gray-700">Validate (Valider)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-indigo-600 font-bold">L</span>
                <span className="text-gray-700">Close (Clôturer)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Détails du profil sélectionné */}
      {selectedProfile && viewMode === 'profiles' && (() => {
        const profile = securityProfiles.find(p => p.id === selectedProfile);
        if (!profile) return null;

        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Détails du Profil - {profile.name}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Restrictions de Montants</h4>
                <div className="space-y-3">
                  {profile.restrictions.amountLimits.maxEntryAmount && (
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Montant max écriture:</span>
                      <span className="font-medium">{formatCurrency(profile.restrictions.amountLimits.maxEntryAmount)}</span>
                    </div>
                  )}
                  {profile.restrictions.amountLimits.maxValidationAmount && (
                    <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">Montant max validation:</span>
                      <span className="font-medium">{formatCurrency(profile.restrictions.amountLimits.maxValidationAmount)}</span>
                    </div>
                  )}
                  {profile.restrictions.amountLimits.dailyLimit && (
                    <div className="flex justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-gray-700">Limite quotidienne:</span>
                      <span className="font-medium">{formatCurrency(profile.restrictions.amountLimits.dailyLimit)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Restrictions Temporelles</h4>
                <div className="space-y-3">
                  {profile.restrictions.timeRestrictions.sessionTimeout && (
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-gray-700">Timeout session:</span>
                      <span className="font-medium">{profile.restrictions.timeRestrictions.sessionTimeout / 60}h</span>
                    </div>
                  )}
                  {profile.restrictions.timeRestrictions.allowedHours && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Horaires autorisés:</span>
                      <div className="font-medium mt-1">
                        {profile.restrictions.timeRestrictions.allowedHours.join(' - ')}
                      </div>
                    </div>
                  )}
                  {profile.restrictions.timeRestrictions.allowedDays && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">Jours autorisés:</span>
                      <div className="font-medium mt-1">
                        {profile.restrictions.timeRestrictions.allowedDays.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-3">Restrictions d'Accès aux Données</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Société propre uniquement</span>
                    <div className="flex items-center space-x-2">
                      {profile.restrictions.dataAccess.ownCompanyOnly ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 border border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Département propre uniquement</span>
                    <div className="flex items-center space-x-2">
                      {profile.restrictions.dataAccess.ownDepartmentOnly ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 border border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Lecture seule après clôture</span>
                    <div className="flex items-center space-x-2">
                      {profile.restrictions.dataAccess.readOnlyAfterClose ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 border border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SecurityProfilesManager;