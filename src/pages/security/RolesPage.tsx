import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  usersCount: number;
  isSystemRole: boolean;
  createdAt: string;
  lastModified: string;
  createdBy: string;
  category: 'admin' | 'management' | 'operational' | 'readonly';
}

const RolesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles', searchTerm, selectedCategory, selectedModule],
    queryFn: async () => {
      const mockRoles: Role[] = [
        {
          id: '1',
          name: 'Administrateur Système',
          code: 'ADMIN_SYS',
          description: 'Accès complet au système avec tous les privilèges administrateurs',
          permissions: ['all_access', 'user_management', 'system_config', 'audit_logs', 'backup_restore'],
          usersCount: 2,
          isSystemRole: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastModified: '2024-08-15T10:30:00Z',
          createdBy: 'Système',
          category: 'admin'
        },
        {
          id: '2',
          name: 'Directeur Financier',
          code: 'DIR_FIN',
          description: 'Responsable de la gestion financière et comptable de l\'entreprise',
          permissions: ['finance_read', 'finance_write', 'accounting_full', 'budget_full', 'reporting_full', 'treasury_full'],
          usersCount: 1,
          isSystemRole: false,
          createdAt: '2024-01-15T00:00:00Z',
          lastModified: '2024-07-20T14:15:00Z',
          createdBy: 'Marie Dubois',
          category: 'management'
        },
        {
          id: '3',
          name: 'Manager Commercial',
          code: 'MGR_COM',
          description: 'Gestion de l\'équipe commerciale et du portefeuille clients',
          permissions: ['commercial_read', 'commercial_write', 'client_management', 'contracts_management', 'sales_reporting'],
          usersCount: 3,
          isSystemRole: false,
          createdAt: '2024-02-01T00:00:00Z',
          lastModified: '2024-08-10T09:45:00Z',
          createdBy: 'Marie Dubois',
          category: 'management'
        },
        {
          id: '4',
          name: 'Contrôleur de Gestion',
          code: 'CTRL_GEST',
          description: 'Analyse et contrôle des performances financières et opérationnelles',
          permissions: ['analytics_read', 'analytics_write', 'budget_read', 'budget_write', 'cost_centers', 'reporting_read'],
          usersCount: 2,
          isSystemRole: false,
          createdAt: '2024-01-20T00:00:00Z',
          lastModified: '2024-06-15T11:20:00Z',
          createdBy: 'Marie Dubois',
          category: 'operational'
        },
        {
          id: '5',
          name: 'Comptable',
          code: 'COMPTABLE',
          description: 'Saisie et traitement des opérations comptables courantes',
          permissions: ['accounting_read', 'entries_write', 'journals_read', 'balance_read', 'third_party_read'],
          usersCount: 4,
          isSystemRole: false,
          createdAt: '2024-02-15T00:00:00Z',
          lastModified: '2024-08-05T16:30:00Z',
          createdBy: 'Paul Martin',
          category: 'operational'
        },
        {
          id: '6',
          name: 'RH Manager',
          code: 'RH_MGR',
          description: 'Gestion des ressources humaines et administration du personnel',
          permissions: ['hr_read', 'hr_write', 'employee_management', 'payroll_access', 'hr_reporting'],
          usersCount: 1,
          isSystemRole: false,
          createdAt: '2024-03-01T00:00:00Z',
          lastModified: '2024-07-10T13:45:00Z',
          createdBy: 'Marie Dubois',
          category: 'management'
        },
        {
          id: '7',
          name: 'Analyste Financier',
          code: 'ANALYST_FIN',
          description: 'Analyse financière et élaboration de rapports de performance',
          permissions: ['finance_read', 'reporting_read', 'analytics_read', 'treasury_read', 'dashboard_access'],
          usersCount: 3,
          isSystemRole: false,
          createdAt: '2024-02-20T00:00:00Z',
          lastModified: '2024-08-01T08:15:00Z',
          createdBy: 'Paul Martin',
          category: 'operational'
        },
        {
          id: '8',
          name: 'Utilisateur Consultation',
          code: 'USER_READ',
          description: 'Accès en lecture seule aux données de base',
          permissions: ['dashboard_read', 'reports_read', 'basic_data_read'],
          usersCount: 5,
          isSystemRole: false,
          createdAt: '2024-04-01T00:00:00Z',
          lastModified: '2024-05-15T12:00:00Z',
          createdBy: 'Sophie Koné',
          category: 'readonly'
        }
      ];
      
      return mockRoles.filter(role =>
        (searchTerm === '' || 
         role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
         role.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedCategory === 'all' || role.category === selectedCategory)
      );
    }
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const mockPermissions: Permission[] = [
        // Système
        { id: '1', name: 'Accès Complet', module: 'Système', action: 'all', description: 'Accès total au système', category: 'system' },
        { id: '2', name: 'Gestion Utilisateurs', module: 'Système', action: 'users', description: 'Gestion des utilisateurs', category: 'system' },
        { id: '3', name: 'Configuration Système', module: 'Système', action: 'config', description: 'Configuration du système', category: 'system' },
        
        // Finance
        { id: '4', name: 'Lecture Finance', module: 'Finance', action: 'read', description: 'Consultation des données financières', category: 'finance' },
        { id: '5', name: 'Écriture Finance', module: 'Finance', action: 'write', description: 'Modification des données financières', category: 'finance' },
        { id: '6', name: 'Gestion Trésorerie', module: 'Finance', action: 'treasury', description: 'Accès à la trésorerie', category: 'finance' },
        
        // Comptabilité
        { id: '7', name: 'Lecture Comptabilité', module: 'Comptabilité', action: 'read', description: 'Consultation comptable', category: 'accounting' },
        { id: '8', name: 'Saisie Écritures', module: 'Comptabilité', action: 'entries', description: 'Saisie des écritures', category: 'accounting' },
        { id: '9', name: 'Gestion Journaux', module: 'Comptabilité', action: 'journals', description: 'Gestion des journaux', category: 'accounting' },
        
        // Commercial
        { id: '10', name: 'Lecture Commercial', module: 'Commercial', action: 'read', description: 'Consultation commerciale', category: 'commercial' },
        { id: '11', name: 'Écriture Commercial', module: 'Commercial', action: 'write', description: 'Modification commerciale', category: 'commercial' },
        { id: '12', name: 'Gestion Clients', module: 'Commercial', action: 'clients', description: 'Gestion des clients', category: 'commercial' },
        
        // Budget
        { id: '13', name: 'Lecture Budget', module: 'Budget', action: 'read', description: 'Consultation des budgets', category: 'budget' },
        { id: '14', name: 'Écriture Budget', module: 'Budget', action: 'write', description: 'Modification des budgets', category: 'budget' },
        { id: '15', name: 'Validation Budget', module: 'Budget', action: 'validate', description: 'Validation des budgets', category: 'budget' },
        
        // Reporting
        { id: '16', name: 'Lecture Rapports', module: 'Reporting', action: 'read', description: 'Consultation des rapports', category: 'reporting' },
        { id: '17', name: 'Création Rapports', module: 'Reporting', action: 'create', description: 'Création de rapports', category: 'reporting' },
        { id: '18', name: 'Tableaux de Bord', module: 'Reporting', action: 'dashboard', description: 'Accès aux tableaux de bord', category: 'reporting' }
      ];
      
      return mockPermissions;
    }
  });

  const duplicateRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return roleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return roleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'management': return 'bg-purple-100 text-purple-800';
      case 'operational': return 'bg-blue-100 text-blue-800';
      case 'readonly': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'admin': return <ShieldCheckIcon className="h-4 w-4" />;
      case 'management': return <UserGroupIcon className="h-4 w-4" />;
      case 'operational': return <KeyIcon className="h-4 w-4" />;
      case 'readonly': return <EyeIcon className="h-4 w-4" />;
      default: return <KeyIcon className="h-4 w-4" />;
    }
  };

  const getPermissionsByModule = (rolePermissions: string[]) => {
    const permissionsByModule = permissions
      .filter(p => rolePermissions.includes(p.id))
      .reduce((acc, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = [];
        }
        acc[permission.module].push(permission);
        return acc;
      }, {} as Record<string, Permission[]>);

    return permissionsByModule;
  };

  const handleDuplicate = (role: Role) => {
    duplicateRoleMutation.mutate(role.id);
  };

  const handleDelete = (role: Role) => {
    if (role.isSystemRole) {
      alert('Les rôles système ne peuvent pas être supprimés.');
      return;
    }
    
    if (role.usersCount > 0) {
      alert(`Ce rôle ne peut pas être supprimé car il est assigné à ${role.usersCount} utilisateur(s).`);
      return;
    }
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const filteredRoles = roles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(roles.length / itemsPerPage);

  const totalRoles = roles.length;
  const systemRoles = roles.filter(r => r.isSystemRole).length;
  const customRoles = roles.filter(r => !r.isSystemRole).length;
  const totalUsers = roles.reduce((sum, r) => sum + r.usersCount, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Rôles</h1>
          <p className="text-gray-600">Définition des rôles et attribution des permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nouveau Rôle</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rôles</p>
              <p className="text-2xl font-bold text-gray-900">{totalRoles}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <KeyIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rôles Système</p>
              <p className="text-2xl font-bold text-red-600">{systemRoles}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rôles Personnalisés</p>
              <p className="text-2xl font-bold text-green-600">{customRoles}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs Assignés</p>
              <p className="text-2xl font-bold text-purple-600">{totalUsers}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un rôle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filtres</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                <option value="admin">Administration</option>
                <option value="management">Management</option>
                <option value="operational">Opérationnel</option>
                <option value="readonly">Lecture seule</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les modules</option>
                <option value="Système">Système</option>
                <option value="Finance">Finance</option>
                <option value="Comptabilité">Comptabilité</option>
                <option value="Commercial">Commercial</option>
                <option value="Budget">Budget</option>
                <option value="Reporting">Reporting</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedModule('all');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grille des rôles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="mt-4 flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="flex space-x-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredRoles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun rôle trouvé</p>
          </div>
        ) : (
          filteredRoles.map((role) => (
            <div key={role.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* En-tête de la carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-gray-400">
                    {getCategoryIcon(role.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.code}</p>
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(role.category)}`}>
                    {role.category === 'admin' ? 'Admin' :
                     role.category === 'management' ? 'Management' :
                     role.category === 'operational' ? 'Opérationnel' : 'Lecture'}
                  </span>
                  {role.isSystemRole && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                      Système
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{role.description}</p>

              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{role.permissions.length}</div>
                  <div className="text-xs text-gray-500">Permissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{role.usersCount}</div>
                  <div className="text-xs text-gray-500">Utilisateurs</div>
                </div>
              </div>

              {/* Permissions par module */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Modules autorisés:</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(getPermissionsByModule(role.permissions)).slice(0, 3).map((module) => (
                    <span key={module} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {module}
                    </span>
                  ))}
                  {Object.keys(getPermissionsByModule(role.permissions)).length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      +{Object.keys(getPermissionsByModule(role.permissions)).length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Informations de création */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div>Créé par {role.createdBy}</div>
                <div>{new Date(role.lastModified).toLocaleDateString('fr-FR')}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedRole(role);
                    setShowPermissionsModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm transition-colors flex-1 mr-3"
                >
                  Voir Permissions
                </button>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedRole(role);
                      setShowViewModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Voir les détails"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedRole(role);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Modifier"
                    disabled={role.isSystemRole}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(role)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Dupliquer"
                    disabled={duplicateRoleMutation.isPending}
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(role)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Supprimer"
                    disabled={role.isSystemRole || role.usersCount > 0 || deleteRoleMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal des permissions */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Permissions - {selectedRole.name}
              </h3>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {Object.entries(getPermissionsByModule(selectedRole.permissions)).map(([module, modulePermissions]) => (
                <div key={module} className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">{module}</h4>
                  <div className="space-y-2">
                    {modulePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <CheckIcon className="h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                          <div className="text-xs text-gray-500">{permission.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <p className="text-sm text-gray-700">
              Affichage de{' '}
              <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              {' '}à{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, roles.length)}
              </span>
              {' '}sur{' '}
              <span className="font-medium">{roles.length}</span>
              {' '}rôles
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;