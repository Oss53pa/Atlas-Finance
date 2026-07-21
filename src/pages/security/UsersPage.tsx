import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  PlusIcon,
  MagnifyingGlassIcon,
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
  const emptyUserForm = { firstName: '', lastName: '', email: '', phone: '', role: '', department: 'Finance', status: 'active' as User['status'], position: '', isEmailVerified: false, is2FAEnabled: false };
  const [userForm, setUserForm] = useState(emptyUserForm);

  const queryClient = useQueryClient();
  const { adapter } = useData();

  // Load users from settings
  const [usersSetting, setUsersSetting] = useState<any>(undefined);
  const [rolesSetting, setRolesSetting] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [us, rs] = await Promise.all([
        adapter.getById('settings', 'users_list'),
        adapter.getById('settings', 'roles_config'),
      ]);
      setUsersSetting(us);
      setRolesSetting(rs);
      setIsLoading(false);
    };
    load();
  }, [adapter]);

  const allUsers: User[] = usersSetting ? JSON.parse(usersSetting.value) : [];

  // Filter users based on search/filter criteria
  const users = useMemo(() => {
    return allUsers.filter(user =>
      (searchTerm === '' ||
       user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.position.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedDepartment === 'all' || user.department === selectedDepartment) &&
      (selectedRole === 'all' || user.role === selectedRole) &&
      (selectedStatus === 'all' || user.status === selectedStatus)
    );
  }, [allUsers, searchTerm, selectedDepartment, selectedRole, selectedStatus]);

  // Load roles from settings
  const roles: Role[] = rolesSetting ? JSON.parse(rolesSetting.value) : [];

  // Helper to persist users list
  const saveUsersList = async (updatedList: User[]) => {
    const existing = await adapter.getById('settings', 'users_list');
    if (existing) {
      await adapter.update('settings', 'users_list', { value: JSON.stringify(updatedList) });
    } else {
      await adapter.create('settings', { id: 'users_list', value: JSON.stringify(updatedList) });
    }
  };

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const updated = allUsers.map(u => u.id === userId ? { ...u, status: newStatus as User['status'], lastModified: new Date().toISOString() } : u);
      await saveUsersList(updated);
      return { userId, newStatus };
    },
    onSuccess: () => {
      setUsersSetting(null); // Force reload
      const reload = async () => { const us = await adapter.getById('settings', 'users_list'); setUsersSetting(us); };
      reload();
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const updated = allUsers.map(u => u.id === userId ? { ...u, passwordLastChanged: new Date().toISOString(), lastModified: new Date().toISOString() } : u);
      await saveUsersList(updated);
      return userId;
    },
    onSuccess: () => {
      const reload = async () => { const us = await adapter.getById('settings', 'users_list'); setUsersSetting(us); };
      reload();
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const updated = allUsers.filter(u => u.id !== userId);
      await saveUsersList(updated);
      return userId;
    },
    onSuccess: () => {
      const reload = async () => { const us = await adapter.getById('settings', 'users_list'); setUsersSetting(us); };
      reload();
    }
  });

  const reloadUsers = async () => { const us = await adapter.getById('settings', 'users_list'); setUsersSetting(us); };
  // Ouvre l'édition avec le formulaire pré-rempli.
  const openEditUser = (u: User) => {
    setSelectedUser(u);
    setUserForm({
      firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone || '',
      role: u.role, department: u.department, status: u.status, position: u.position || '',
      isEmailVerified: !!u.isEmailVerified, is2FAEnabled: !!u.is2FAEnabled,
    });
    setShowEditModal(true);
  };
  // Enregistre l'édition (persistée).
  const handleSaveUser = async () => {
    if (!selectedUser) return;
    if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.email.trim()) { toast.error(t('users.requiredFields')); return; }
    const updated = allUsers.map(u => u.id === selectedUser.id ? { ...u, ...userForm, lastModified: new Date().toISOString() } : u);
    await saveUsersList(updated);
    await reloadUsers();
    toast.success(t('users.userUpdated'));
    setShowEditModal(false); setSelectedUser(null);
  };

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
          <h1 className="text-lg font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-gray-600">{t('users.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <PageHeaderActions
            onToggleFilters={() => setShowFilters(!showFilters)}
            filtersOpen={showFilters}
            activeFilters={[searchTerm !== '', selectedDepartment !== 'all', selectedRole !== 'all', selectedStatus !== 'all'].filter(Boolean).length}
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>{t('users.newUser')}</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('users.totalUsers')}</p>
              <p className="text-lg font-bold text-gray-900">{totalUsers}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('users.activeUsers')}</p>
              <p className="text-lg font-bold text-green-600">{activeUsers}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('users.lockedAccounts')}</p>
              <p className="text-lg font-bold text-red-600">{lockedUsers}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <LockClosedIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('users.unverified')}</p>
              <p className="text-lg font-bold text-orange-600">{unverifiedUsers}</p>
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
                placeholder={t('users.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.department')}</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('users.allDepartments')}</option>
                <option value="Finance">Finance</option>
                <option value="Commercial">Commercial</option>
                <option value="Gestion">Gestion</option>
                <option value="RH">RH</option>
                <option value="Comptabilité">{t('accounting.title')}</option>
                <option value="IT">IT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.role')}</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('users.allRoles')}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.status')}</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('users.allStatuses')}</option>
                <option value="active">{t('users.statusActive')}</option>
                <option value="inactive">{t('users.statusInactive')}</option>
                <option value="locked">{t('users.statusLocked')}</option>
                <option value="suspended">{t('users.statusSuspended')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.actions')}</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('all');
                  setSelectedRole('all');
                  setSelectedStatus('all');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('users.reset')}
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
                  {t('users.thUser')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('users.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('users.department')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('users.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('users.thSecurity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('users.thLastLogin')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('users.actions')}
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
                    {t('users.noUsers')}
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
                      <div className="text-xs text-gray-700">{t('users.permissionsCount', { count: String(user.permissions.length) })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                          {user.status === 'active' ? t('users.statusActive') :
                           user.status === 'inactive' ? t('users.statusInactive') :
                           user.status === 'locked' ? t('users.statusLocked') : t('users.statusSuspended')}
                        </span>
                      </div>
                      {user.failedLogins > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {t('users.failedAttempts', { count: String(user.failedLogins) })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {user.isEmailVerified ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" title={t('users.emailVerified')} />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500" title={t('users.emailNotVerified')} />
                        )}
                        {user.is2FAEnabled ? (
                          <KeyIcon className="h-4 w-4 text-green-500" title={t('users.twoFaEnabled')} />
                        ) : (
                          <KeyIcon className="h-4 w-4 text-gray-700" title={t('users.twoFaDisabled')} />
                        )}
                        {isPasswordExpired(user.passwordLastChanged) && (
                          <ClockIcon className="h-4 w-4 text-orange-500" title={t('users.passwordExpired')} />
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
                          className="p-2 text-gray-700 hover:text-primary-600 transition-colors"
                          title={t('users.viewDetails')}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => openEditUser(user)}
                          className="p-2 text-gray-700 hover:text-primary-600 transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>

                        {user.status === 'locked' ? (
                          <button
                            onClick={() => handleUnlockUser(user)}
                            className="p-2 text-gray-700 hover:text-green-600 transition-colors"
                            title={t('users.unlock')}
                            disabled={toggleUserStatusMutation.isPending}
                          >
                            <LockOpenIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="p-2 text-gray-700 hover:text-yellow-600 transition-colors"
                            title={user.status === 'active' ? t('users.deactivate') : t('users.activate')}
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
                          title={t('users.resetPassword')}
                          disabled={resetPasswordMutation.isPending}
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPermissionsModal(true);
                          }}
                          className="p-2 text-gray-700 hover:text-primary-600 transition-colors"
                          title={t('users.managePermissions')}
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
                  {t('users.showing')}{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}{t('users.rangeTo')}{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, users.length)}
                  </span>
                  {' '}{t('users.rangeOf')}{' '}
                  <span className="font-medium">{users.length}</span>
                  {' '}{t('users.usersUnit')}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('users.previous')}
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('users.next')}
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
              <h2 className="text-lg font-semibold text-gray-900">{t('users.newUser')}</h2>
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
                    {t('users.firstName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Marie"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.lastName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={t('users.lastName')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="marie.dubois@atlasfna.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.phone')}</label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+225 01 23 45 67"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.role')} <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="">{t('users.selectPlaceholder')}</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.department')} <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="">{t('users.selectPlaceholder')}</option>
                    <option value="Finance">Finance</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Gestion">Gestion</option>
                    <option value="RH">RH</option>
                    <option value="Comptabilité">{t('accounting.title')}</option>
                    <option value="IT">IT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.status')}</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="active">{t('users.statusActive')}</option>
                    <option value="inactive">{t('users.statusInactive')}</option>
                    <option value="suspended">{t('users.statusSuspended')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.position')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('users.positionPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.password')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.confirmation')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" />
                  <span className="ml-2 text-sm text-gray-700">{t('users.sendActivationEmail')}</span>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" />
                  <span className="ml-2 text-sm text-gray-700">{t('users.enable2fa')}</span>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded text-primary-600 focus:ring-primary-500" />
                  <span className="ml-2 text-sm text-gray-700">{t('users.forcePasswordChange')}</span>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {t('users.createInfo')}
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t('users.cancel')}
              </button>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors">
                {t('users.createUser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{t('users.userDetails')}</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserIcon className="h-10 w-10 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-gray-700">{selectedUser.email}</p>
                    <p className="text-sm text-gray-600">{selectedUser.position}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedUser.status)}
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status === 'active' ? t('users.statusActive') :
                     selectedUser.status === 'inactive' ? t('users.statusInactive') :
                     selectedUser.status === 'locked' ? t('users.statusLocked') : t('users.statusSuspended')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{t('users.professionalInfo')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.role')}:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.department')}:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.position')}:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.phone')}:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.phone || t('users.notProvided')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.permissions')}:</span>
                      <span className="text-gray-900 font-medium">{selectedUser.permissions.length}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{t('users.securityLogin')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.lastLogin')}:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(selectedUser.lastLogin).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.emailVerified')}:</span>
                      <span className="text-gray-900 font-medium">
                        {selectedUser.isEmailVerified ? `${t('users.yes')} ✓` : `${t('users.no')} ✗`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.twoFaEnabled')}:</span>
                      <span className="text-gray-900 font-medium">
                        {selectedUser.is2FAEnabled ? `${t('users.yes')} ✓` : `${t('users.no')} ✗`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.failedAttemptsLabel')}:</span>
                      <span className={`font-medium ${selectedUser.failedLogins > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {selectedUser.failedLogins}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('users.passwordChanged')}:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(selectedUser.passwordLastChanged).toLocaleDateString('fr-FR')}
                        {isPasswordExpired(selectedUser.passwordLastChanged) && (
                          <span className="text-orange-600 ml-2">{t('users.expired')}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('users.permissions')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.permissions.map((permission, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{t('users.createdOn', { date: new Date(selectedUser.createdAt).toLocaleDateString('fr-FR') })}</span>
                  <span>{t('users.modifiedOn', { date: new Date(selectedUser.lastModified).toLocaleDateString('fr-FR') })}</span>
                </div>
              </div>

              {selectedUser.status === 'locked' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium">
                    {t('users.lockedNotice', { count: String(selectedUser.failedLogins) })}
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
                    <span>{t('users.unlock')}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleResetPasswordClick(selectedUser);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <KeyIcon className="h-4 w-4" />
                  <span>{t('users.resetPassword')}</span>
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    if (selectedUser) openEditUser(selectedUser);
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
                  {t('users.close')}
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
              <h2 className="text-lg font-semibold text-gray-900">{t('users.editUser')}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
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
                    {t('users.firstName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.firstName} onChange={(e) => setUserForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.lastName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.lastName} onChange={(e) => setUserForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.phone')}</label>
                  <input
                    type="tel"
                    value={userForm.phone} onChange={(e) => setUserForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.role')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.role} onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.department')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.department} onChange={(e) => setUserForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.status')}</label>
                  <select
                    value={userForm.status} onChange={(e) => setUserForm(f => ({ ...f, status: e.target.value as User['status'] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="active">{t('users.statusActive')}</option>
                    <option value="inactive">{t('users.statusInactive')}</option>
                    <option value="suspended">{t('users.statusSuspended')}</option>
                    <option value="locked">{t('users.statusLocked')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.position')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.position} onChange={(e) => setUserForm(f => ({ ...f, position: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={userForm.isEmailVerified}
                    onChange={(e) => setUserForm(f => ({ ...f, isEmailVerified: e.target.checked }))}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('users.emailVerified')}</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={userForm.is2FAEnabled}
                    onChange={(e) => setUserForm(f => ({ ...f, is2FAEnabled: e.target.checked }))}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('users.twoFactorAuth')}</span>
                </label>
              </div>

              {selectedUser.failedLogins > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    {t('users.failedAttemptsWarning', { count: String(selectedUser.failedLogins) })}
                    {selectedUser.status === 'locked' && ` ${t('users.accountCurrentlyLocked')}`}
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
                {t('users.cancel')}
              </button>
              <button onClick={handleSaveUser} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors">
                {t('users.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{t('users.managePermissions')}</h2>
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
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
                <h4 className="font-medium text-gray-900 mb-3">{t('users.currentPermissions')}</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedUser.permissions.map((permission, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm flex items-center space-x-2">
                      <span>{permission}</span>
                      <button className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('users.availableModules')}</h4>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-primary-600 focus:ring-primary-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('accounting.title')}</div>
                        <p className="text-sm text-gray-600">{t('users.modAccountingDesc')}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('users.read')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('users.validation')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-primary-600 focus:ring-primary-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('navigation.treasury')}</div>
                        <p className="text-sm text-gray-600">{t('users.modTreasuryDesc')}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('users.read')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-primary-600 focus:ring-primary-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('users.modBudget')}</div>
                        <p className="text-sm text-gray-600">{t('users.modBudgetDesc')}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('users.read')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-primary-600 focus:ring-primary-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('users.modSales')}</div>
                        <p className="text-sm text-gray-600">{t('users.modSalesDesc')}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('users.read')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3">
                      <input type="checkbox" className="mt-1 rounded text-primary-600 focus:ring-primary-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{t('users.modAdmin')}</div>
                        <p className="text-sm text-gray-600">{t('users.modAdminDesc')}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('users.read')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('accounting.entry')}</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 mr-1" />
                            <span className="text-gray-600">{t('users.admin')}</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  {t('users.permissionsNote')}
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
                {t('users.cancel')}
              </button>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors">
                {t('users.savePermissions')}
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
        title={t('users.resetPassword')}
        message={t('users.resetPasswordConfirm', { name: `${resetPasswordConfirm.user?.firstName ?? ''} ${resetPasswordConfirm.user?.lastName ?? ''}`.trim() })}
        variant="warning"
        confirmText={t('users.reset')}
        cancelText={t('users.cancel')}
        confirmLoading={resetPasswordMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, user: null })}
        onConfirm={handleConfirmDelete}
        title={t('users.deleteUser')}
        message={t('users.deleteUserConfirm', { name: `${deleteConfirm.user?.firstName ?? ''} ${deleteConfirm.user?.lastName ?? ''}`.trim() })}
        variant="danger"
        confirmText={t('users.delete')}
        cancelText={t('users.cancel')}
        confirmLoading={deleteUserMutation.isPending}
      />
    </div>
  );
};

export default UsersPage;