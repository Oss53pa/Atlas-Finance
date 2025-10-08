import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  KeyIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'locked' | 'suspended';
  role: string;
  department: string;
  position: string;
  lastLogin: string;
  createdAt: string;
  lastModified: string;
  permissions: string[];
  failedLogins: number;
  passwordLastChanged: string;
  isEmailVerified: boolean;
  is2FAEnabled: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

const UsersPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', searchTerm, selectedDepartment, selectedRole, selectedStatus],
    queryFn: async () => {
      const mockUsers: User[] = [
        {
          id: '1',
          firstName: 'Marie',
          lastName: 'Dubois',
          email: 'marie.dubois@wisebook.com',
          phone: '+225 01 23 45 67',
          status: 'active',
          role: 'Administrateur',
          department: 'Finance',
          position: 'Directrice Financière',
          lastLogin: '2024-08-25T09:15:00Z',
          createdAt: '2024-01-15T00:00:00Z',
          lastModified: '2024-08-20T14:30:00Z',
          permissions: ['all_access', 'user_management', 'system_config'],
          failedLogins: 0,
          passwordLastChanged: '2024-07-15T00:00:00Z',
          isEmailVerified: true,
          is2FAEnabled: true
        },
        {
          id: '2',
          firstName: 'Jean',
          lastName: 'Kouassi',
          email: 'jean.kouassi@wisebook.com',
          phone: '+225 02 34 56 78',
          status: 'active',
          role: 'Manager Commercial',
          department: 'Commercial',
          position: 'Directeur Commercial',
          lastLogin: '2024-08-25T08:30:00Z',
          createdAt: '2024-02-01T00:00:00Z',
          lastModified: '2024-08-22T16:45:00Z',
          permissions: ['commercial_read', 'commercial_write', 'client_management'],
          failedLogins: 1,
          passwordLastChanged: '2024-06-20T00:00:00Z',
          isEmailVerified: true,
          is2FAEnabled: false
        },
        {
          id: '3',
          firstName: 'Paul',
          lastName: 'Martin',
          email: 'paul.martin@wisebook.com',
          phone: '+225 03 45 67 89',
          status: 'active',
          role: 'Contrôleur de Gestion',
          department: 'Gestion',
          position: 'Contrôleur de Gestion Senior',
          lastLogin: '2024-08-24T16:45:00Z',
          createdAt: '2024-01-20T00:00:00Z',
          lastModified: '2024-08-15T11:20:00Z',
          permissions: ['budget_read', 'budget_write', 'analytics_access'],
          failedLogins: 0,
          passwordLastChanged: '2024-05-10T00:00:00Z',
          isEmailVerified: true,
          is2FAEnabled: true
        },
        {
          id: '4',
          firstName: 'Sophie',
          lastName: 'Koné',
          email: 'sophie.kone@wisebook.com',
          phone: '+225 04 56 78 90',
          status: 'locked',
          role: 'RH Manager',
          department: 'RH',
          position: 'Responsable Ressources Humaines',
          lastLogin: '2024-08-23T14:20:00Z',
          createdAt: '2024-03-01T00:00:00Z',
          lastModified: '2024-08-23T14:25:00Z',
          permissions: ['hr_read', 'hr_write', 'employee_management'],
          failedLogins: 5,
          passwordLastChanged: '2024-04-15T00:00:00Z',
          isEmailVerified: true,
          is2FAEnabled: false
        },
        {
          id: '5',
          firstName: 'Ahmed',
          lastName: 'Diallo',
          email: 'ahmed.diallo@wisebook.com',
          phone: '+225 05 67 89 01',
          status: 'inactive',
          role: 'Comptable',
          department: 'Comptabilité',
          position: 'Comptable Junior',
          lastLogin: '2024-08-20T10:15:00Z',
          createdAt: '2024-04-01T00:00:00Z',
          lastModified: '2024-08-21T09:00:00Z',
          permissions: ['accounting_read', 'entries_write'],
          failedLogins: 0,
          passwordLastChanged: '2024-08-01T00:00:00Z',
          isEmailVerified: false,
          is2FAEnabled: false
        },
        {
          id: '6',
          firstName: 'Fatima',
          lastName: 'Traoré',
          email: 'fatima.traore@wisebook.com',
          phone: '+225 06 78 90 12',
          status: 'active',
          role: 'Analyste Financier',
          department: 'Finance',
          position: 'Analyste Financier Senior',
          lastLogin: '2024-08-24T17:30:00Z',
          createdAt: '2024-02-15T00:00:00Z',
          lastModified: '2024-08-20T08:15:00Z',
          permissions: ['finance_read', 'reporting_access', 'treasury_read'],
          failedLogins: 0,
          passwordLastChanged: '2024-07-01T00:00:00Z',
          isEmailVerified: true,
          is2FAEnabled: true
        }
      ];
      
      return mockUsers.filter(user =>
        (searchTerm === '' || 
         user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.position.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedDepartment === 'all' || user.department === selectedDepartment) &&
        (selectedRole === 'all' || user.role === selectedRole) &&
        (selectedStatus === 'all' || user.status === selectedStatus)
      );
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const mockRoles: Role[] = [
        { id: '1', name: 'Administrateur', description: 'Accès complet au système', permissions: ['all_access'] },
        { id: '2', name: 'Manager Commercial', description: 'Gestion commerciale et clients', permissions: ['commercial_read', 'commercial_write'] },
        { id: '3', name: 'Contrôleur de Gestion', description: 'Contrôle budgétaire et analytique', permissions: ['budget_read', 'analytics_access'] },
        { id: '4', name: 'RH Manager', description: 'Gestion des ressources humaines', permissions: ['hr_read', 'hr_write'] },
        { id: '5', name: 'Comptable', description: 'Saisie et consultation comptable', permissions: ['accounting_read', 'entries_write'] },
        { id: '6', name: 'Analyste Financier', description: 'Analyse financière et reporting', permissions: ['finance_read', 'reporting_access'] }
      ];
      
      return mockRoles;
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { userId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'locked': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'inactive': return <XCircleIcon className="h-4 w-4 text-gray-600" />;
      case 'locked': return <LockClosedIcon className="h-4 w-4 text-red-600" />;
      case 'suspended': return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      default: return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    toggleUserStatusMutation.mutate({
      userId: user.id,
      newStatus
    });
  };

  const handleUnlockUser = (user: User) => {
    toggleUserStatusMutation.mutate({
      userId: user.id,
      newStatus: 'active'
    });
  };

  const [resetPasswordConfirm, setResetPasswordConfirm] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  });

  const handleResetPasswordClick = (user: User) => {
    setResetPasswordConfirm({ isOpen: true, user });
  };

  const handleConfirmResetPassword = () => {
    if (resetPasswordConfirm.user) {
      resetPasswordMutation.mutate(resetPasswordConfirm.user.id);
      setResetPasswordConfirm({ isOpen: false, user: null });
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  });

  const handleDeleteClick = (user: User) => {
    setDeleteConfirm({ isOpen: true, user });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.user) {
      deleteUserMutation.mutate(deleteConfirm.user.id);
      setDeleteConfirm({ isOpen: false, user: null });
    }
  };

  const isPasswordExpired = (passwordDate: string) => {
    const passwordAge = (new Date().getTime() - new Date(passwordDate).getTime()) / (1000 * 60 * 60 * 24);
    return passwordAge > 90; // 90 jours
  };

  const filteredUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(users.length / itemsPerPage);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const lockedUsers = users.filter(u => u.status === 'locked').length;
  const unverifiedUsers = users.filter(u => !u.isEmailVerified).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600">Administration des comptes utilisateurs et permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs Actifs</p>
              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Comptes Verrouillés</p>
              <p className="text-2xl font-bold text-red-600">{lockedUsers}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <LockClosedIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Non Vérifiés</p>
              <p className="text-2xl font-bold text-orange-600">{unverifiedUsers}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <XCircleIcon className="h-6 w-6 text-orange-600" />
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
                placeholder="Rechercher un utilisateur..."
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les départements</option>
                <option value="Finance">Finance</option>
                <option value="Commercial">Commercial</option>
                <option value="Gestion">Gestion</option>
                <option value="RH">RH</option>
                <option value="Comptabilité">{t('accounting.title')}</option>
                <option value="IT">IT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les rôles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="locked">Verrouillé</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('all');
                  setSelectedRole('all');
                  setSelectedStatus('all');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Département
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Sécurité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Dernière Connexion
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full mr-4"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-700">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-700">{user.email}</div>
                          <div className="text-xs text-gray-700">{user.position}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.role}</div>
                      <div className="text-xs text-gray-700">{user.permissions.length} permissions</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                          {user.status === 'active' ? 'Actif' :
                           user.status === 'inactive' ? 'Inactif' :
                           user.status === 'locked' ? 'Verrouillé' : 'Suspendu'}
                        </span>
                      </div>
                      {user.failedLogins > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {user.failedLogins} tentatives échouées
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {user.isEmailVerified ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" title="Email vérifié" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500" title="Email non vérifié" />
                        )}
                        {user.is2FAEnabled ? (
                          <KeyIcon className="h-4 w-4 text-green-500" title="2FA activé" />
                        ) : (
                          <KeyIcon className="h-4 w-4 text-gray-700" title="2FA désactivé" />
                        )}
                        {isPasswordExpired(user.passwordLastChanged) && (
                          <ClockIcon className="h-4 w-4 text-orange-500" title="Mot de passe expiré" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(user.lastLogin).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                          title="Voir les détails"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>

                        {user.status === 'locked' ? (
                          <button
                            onClick={() => handleUnlockUser(user)}
                            className="p-2 text-gray-700 hover:text-green-600 transition-colors"
                            title="Débloquer"
                            disabled={toggleUserStatusMutation.isPending}
                          >
                            <LockOpenIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="p-2 text-gray-700 hover:text-yellow-600 transition-colors"
                            title={user.status === 'active' ? 'Désactiver' : 'Activer'}
                            disabled={toggleUserStatusMutation.isPending}
                          >
                            {user.status === 'active' ? 
                              <LockClosedIcon className="h-4 w-4" /> : 
                              <LockOpenIcon className="h-4 w-4" />
                            }
                          </button>
                        )}

                        <button
                          onClick={() => handleResetPasswordClick(user)}
                          className="p-2 text-gray-700 hover:text-blue-600 transition-colors"
                          title="Réinitialiser le mot de passe"
                          disabled={resetPasswordMutation.isPending}
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPermissionsModal(true);
                          }}
                          className="p-2 text-gray-700 hover:text-purple-600 transition-colors"
                          title="Gérer les permissions"
                        >
                          <UserIcon className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="p-2 text-gray-700 hover:text-red-600 transition-colors"
                          title={t('common.delete')}
                          disabled={deleteUserMutation.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, users.length)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{users.length}</span>
                  {' '}utilisateurs
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
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Nouvel Utilisateur</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Marie"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Dubois"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="marie.dubois@wisebook.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+225 01 23 45 67"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Sélectionner...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Département <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Sélectionner...</option>
                    <option value="Finance">Finance</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Gestion">Gestion</option>
                    <option value="RH">RH</option>
                    <option value="Comptabilité">{t('accounting.title')}</option>
                    <option value="IT">IT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poste <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Directrice Financière"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="ml-2 text-sm text-gray-700">Envoyer un email d'activation</span>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="ml-2 text-sm text-gray-700">Activer l'authentification à deux facteurs (2FA)</span>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="ml-2 text-sm text-gray-700">Forcer le changement de mot de passe à la première connexion</span>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  L'utilisateur recevra un email avec ses identifiants de connexion et un lien d'activation de compte.
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
                Créer l'utilisateur
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Détails de l'Utilisateur</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserIcon className="h-10 w-10 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-gray-700">{selectedUser.email}</p>
                    <p className="text-sm text-gray-600">{selectedUser.position}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedUser.status)}
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status === 'active' ? 'Actif' :
                     selectedUser.status === 'inactive' ? 'Inactif' :
                     selectedUser.status === 'locked' ? 'Verrouillé' : 'Suspendu'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informations Professionnelles</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rôle:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Département:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Poste:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Téléphone:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.phone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Permissions:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.permissions.length}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Sécurité & Connexion</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière connexion:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(selectedUser.lastLogin).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email vérifié:</span>
                      <span className="text-gray-900 font-medium">
                        {selectedUser.isEmailVerified ? 'Oui ✓' : 'Non ✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">2FA activé:</span>
                      <span className="text-gray-900 font-medium">
                        {selectedUser.is2FAEnabled ? 'Oui ✓' : 'Non ✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tentatives échouées:</span>
                      <span className={`font-medium ${selectedUser.failedLogins > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {selectedUser.failedLogins}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mot de passe changé:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(selectedUser.passwordLastChanged).toLocaleDateString('fr-FR')}
                        {isPasswordExpired(selectedUser.passwordLastChanged) && (
                          <span className="text-orange-600 ml-2">(Expiré)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.permissions.map((permission, idx) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Créé le {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</span>
                  <span>Modifié le {new Date(selectedUser.lastModified).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {selectedUser.status === 'locked' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium">
                    Ce compte est verrouillé suite à {selectedUser.failedLogins} tentatives de connexion échouées.
                    Utilisez le bouton "Débloquer" pour réactiver le compte.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between sticky bottom-0">
              <div className="flex space-x-3">
                {selectedUser.status === 'locked' && (
                  <button
                    onClick={() => {
                      handleUnlockUser(selectedUser);
                      setShowViewModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <LockOpenIcon className="h-4 w-4" />
                    <span>Débloquer</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleResetPasswordClick(selectedUser);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <KeyIcon className="h-4 w-4" />
                  <span>Réinitialiser le mot de passe</span>
                </button>
              </div>
              <div className="flex space-x-3">
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
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedUser(null);
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

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Modifier l'Utilisateur</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedUser.firstName}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedUser.lastName}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    defaultValue={selectedUser.email}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    defaultValue={selectedUser.phone}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle <span className="text-red-500">*</span>
                  </label>
                  <select
                    defaultValue={selectedUser.role}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Département <span className="text-red-500">*</span>
                  </label>
                  <select
                    defaultValue={selectedUser.department}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Finance">Finance</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Gestion">Gestion</option>
                    <option value="RH">RH</option>
                    <option value="Comptabilité">{t('accounting.title')}</option>
                    <option value="IT">IT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    defaultValue={selectedUser.status}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="suspended">Suspendu</option>
                    <option value="locked">Verrouillé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poste <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue={selectedUser.position}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={selectedUser.isEmailVerified}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Email vérifié</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={selectedUser.is2FAEnabled}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Authentification à deux facteurs (2FA)</span>
                </label>
              </div>

              {selectedUser.failedLogins > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Cet utilisateur a {selectedUser.failedLogins} tentatives de connexion échouées.
                    {selectedUser.status === 'locked' && ' Le compte est actuellement verrouillé.'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
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

      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Gérer les Permissions</h2>
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedUser.role} - {selectedUser.department}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Permissions Actuelles</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedUser.permissions.map((permission, idx) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center space-x-2">
                      <span>{permission}</span>
                      <button className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Modules Disponibles</h4>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('accounting.title')}</div>
                        <p className="text-sm text-gray-600">Accès complet aux écritures, journaux et grand livre</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">Lecture</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">Validation</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('navigation.treasury')}</div>
                        <p className="text-sm text-gray-600">Gestion des flux de trésorerie et rapprochements bancaires</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">Lecture</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Budget & Analytique</div>
                        <p className="text-sm text-gray-600">Suivi budgétaire et analyse par centres de coûts</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">Lecture</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Gestion Commerciale</div>
                        <p className="text-sm text-gray-600">Gestion clients, devis, factures et recouvrement</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">Lecture</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Administration</div>
                        <p className="text-sm text-gray-600">Gestion utilisateurs, rôles et configuration système</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">Lecture</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 mr-1" />
                            <span className="text-gray-600">Admin</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Les modifications de permissions prendront effet lors de la prochaine connexion de l'utilisateur.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Enregistrer les permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={resetPasswordConfirm.isOpen}
        onClose={() => setResetPasswordConfirm({ isOpen: false, user: null })}
        onConfirm={handleConfirmResetPassword}
        title="Réinitialiser le mot de passe"
        message={`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${resetPasswordConfirm.user?.firstName} ${resetPasswordConfirm.user?.lastName} ? Un nouveau mot de passe temporaire sera généré et envoyé par email.`}
        variant="warning"
        confirmText="Réinitialiser"
        cancelText="Annuler"
        confirmLoading={resetPasswordMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, user: null })}
        onConfirm={handleConfirmDelete}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer l'utilisateur ${deleteConfirm.user?.firstName} ${deleteConfirm.user?.lastName} ? Cette action est irréversible et toutes les données associées seront supprimées.`}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteUserMutation.isPending}
      />
    </div>
  );
};

export default UsersPage;