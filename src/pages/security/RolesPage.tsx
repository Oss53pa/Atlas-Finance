import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
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
  const { t } = useLanguage();
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

  // Load roles from Dexie settings
  const rolesSetting = useLiveQuery(() => db.settings.get('roles_config'));
  const allRoles: Role[] = rolesSetting ? JSON.parse(rolesSetting.value) : [];
  const isLoading = rolesSetting === undefined;

  // Filter roles based on search/filter criteria
  const roles = useMemo(() => {
    return allRoles.filter(role =>
      (searchTerm === '' ||
       role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
       role.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedCategory === 'all' || role.category === selectedCategory)
    );
  }, [allRoles, searchTerm, selectedCategory]);

  // Load permissions from Dexie settings
  const permissionsSetting = useLiveQuery(() => db.settings.get('permissions_config'));
  const permissions: Permission[] = permissionsSetting ? JSON.parse(permissionsSetting.value) : [];

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

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; role: Role | null }>({
    isOpen: false,
    role: null
  });

  const handleDeleteClick = (role: Role) => {
    if (role.isSystemRole) {
      alert('Les rôles système ne peuvent pas être supprimés.');
      return;
    }

    if (role.usersCount > 0) {
      alert(`Ce rôle ne peut pas être supprimé car il est assigné à ${role.usersCount} utilisateur(s).`);
      return;
    }

    setDeleteConfirm({ isOpen: true, role });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.role) {
      deleteRoleMutation.mutate(deleteConfirm.role.id);
      setDeleteConfirm({ isOpen: false, role: null });
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
          <h1 className="text-lg font-bold text-gray-900">Gestion des Rôles</h1>
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
              <p className="text-lg font-bold text-gray-900">{totalRoles}</p>
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
              <p className="text-lg font-bold text-red-600">{systemRoles}</p>
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
              <p className="text-lg font-bold text-green-600">{customRoles}</p>
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
              <p className="text-lg font-bold text-purple-600">{totalUsers}</p>
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
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
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
                <option value="Comptabilité">{t('accounting.title')}</option>
                <option value="Commercial">Commercial</option>
                <option value="Budget">{t('navigation.budget')}</option>
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
            <KeyIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-700">Aucun rôle trouvé</p>
          </div>
        ) : (
          filteredRoles.map((role) => (
            <div key={role.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* En-tête de la carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-gray-700">
                    {getCategoryIcon(role.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{role.name}</h3>
                    <p className="text-sm text-gray-700">{role.code}</p>
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
                  <div className="text-lg font-bold text-indigo-600">{role.permissions.length}</div>
                  <div className="text-xs text-gray-700">Permissions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{role.usersCount}</div>
                  <div className="text-xs text-gray-700">Utilisateurs</div>
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
              <div className="flex items-center justify-between text-sm text-gray-700 mb-4">
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
                    className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                    title="Voir les détails"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedRole(role);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                    title={t('common.edit')}
                    disabled={role.isSystemRole}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(role)}
                    className="p-2 text-gray-700 hover:text-green-600 transition-colors"
                    title="Dupliquer"
                    disabled={duplicateRoleMutation.isPending}
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteClick(role)}
                    className="p-2 text-gray-700 hover:text-red-600 transition-colors"
                    title={t('common.delete')}
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Nouveau Rôle</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rôle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Directeur Financier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="DIR_FIN"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Description détaillée du rôle et de ses responsabilités..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="operational">Opérationnel</option>
                  <option value="management">Management</option>
                  <option value="admin">Administration</option>
                  <option value="readonly">Lecture seule</option>
                </select>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Permissions par Module</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Système</div>
                        <div className="mt-2 ml-6 space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Gestion Utilisateurs</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Configuration Système</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Accès Complet</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Finance</div>
                        <div className="mt-2 ml-6 space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Lecture Finance</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Écriture Finance</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Gestion Trésorerie</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('accounting.title')}</div>
                        <div className="mt-2 ml-6 space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Lecture Comptabilité</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Saisie Écritures</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Gestion Journaux</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Commercial</div>
                        <div className="mt-2 ml-6 space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Lecture Commercial</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Écriture Commercial</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Gestion Clients</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Sélectionnez les modules et permissions appropriés pour ce rôle. Les utilisateurs assignés à ce rôle hériteront de ces permissions.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Créer le rôle
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Détails du Rôle</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRole(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-16 w-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                    {getCategoryIcon(selectedRole.category)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedRole.name}</h3>
                    <p className="text-gray-700 mt-1">{selectedRole.code}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(selectedRole.category)}`}>
                    {selectedRole.category === 'admin' ? 'Admin' :
                     selectedRole.category === 'management' ? 'Management' :
                     selectedRole.category === 'operational' ? 'Opérationnel' : 'Lecture'}
                  </span>
                  {selectedRole.isSystemRole && (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
                      Système
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedRole.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <div className="text-lg font-bold text-indigo-600">{selectedRole.permissions.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Permissions</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{selectedRole.usersCount}</div>
                  <div className="text-sm text-gray-600 mt-1">Utilisateurs</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {Object.keys(getPermissionsByModule(selectedRole.permissions)).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Modules</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Permissions par Module</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(getPermissionsByModule(selectedRole.permissions)).map(([module, modulePermissions]) => (
                    <div key={module} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">{module}</h5>
                      <div className="space-y-2">
                        {modulePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                            <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                              <div className="text-xs text-gray-700">{permission.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Créé par:</span> {selectedRole.createdBy}
                  </div>
                  <div>
                    <span className="font-medium">Créé le:</span> {new Date(selectedRole.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Dernière modification:</span> {new Date(selectedRole.lastModified).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              {selectedRole.isSystemRole && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800 font-medium">
                    Ce rôle est un rôle système et ne peut pas être modifié ou supprimé.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between sticky bottom-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDuplicate(selectedRole)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>Dupliquer</span>
                </button>
              </div>
              <div className="flex space-x-3">
                {!selectedRole.isSystemRole && (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>{t('common.edit')}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedRole(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Modifier le Rôle</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRole(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rôle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedRole.name}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={selectedRole.isSystemRole}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedRole.code}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={selectedRole.isSystemRole}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  defaultValue={selectedRole.description}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  defaultValue={selectedRole.category}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={selectedRole.isSystemRole}
                >
                  <option value="operational">Opérationnel</option>
                  <option value="management">Management</option>
                  <option value="admin">Administration</option>
                  <option value="readonly">Lecture seule</option>
                </select>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Permissions par Module</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" defaultChecked className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Système</div>
                        <div className="mt-2 ml-6 space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Gestion Utilisateurs</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Configuration Système</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" defaultChecked className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Finance</div>
                        <div className="mt-2 ml-6 space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Lecture Finance</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Écriture Finance</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('accounting.title')}</div>
                        <div className="mt-2 ml-6 space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Lecture Comptabilité</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-2" />
                            <span className="text-sm text-gray-700">Saisie Écritures</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {selectedRole.usersCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Attention: Ce rôle est assigné à {selectedRole.usersCount} utilisateur(s). Les modifications affecteront leurs permissions.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRole(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="text-gray-700 hover:text-gray-600"
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
                          <div className="text-xs text-gray-700">{permission.description}</div>
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

      {/* Modal de confirmation de suppression */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, role: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer le rôle "${deleteConfirm.role?.name}" ? Cette action est irréversible.`}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteRoleMutation.isPending}
      />
    </div>
  );
};

export default RolesPage;