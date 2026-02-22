import React, { useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Users, UserPlus, Shield, Lock, Key, Settings, Mail, Phone, Calendar,
  Edit, Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle,
  Download, Upload, Filter, Search, MoreVertical, UserCheck, UserX,
  Clock, Activity, ChevronRight, Building2, Briefcase, Hash
} from 'lucide-react';

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: string;
  departement: string;
  statut: 'actif' | 'inactif' | 'suspendu';
  dateCreation: string;
  derniereConnexion: string;
  permissions: string[];
}

interface Role {
  id: string;
  nom: string;
  description: string;
  permissions: string[];
  utilisateurs: number;
  couleur: string;
}

const UsersPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('utilisateurs');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('tous');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // TODO: wire to user management backend/Dexie table
  const [users] = useState<User[]>([]);

  const [roles] = useState<Role[]>([
    {
      id: '1',
      nom: 'Administrateur',
      description: 'Accès complet au système',
      permissions: ['all'],
      utilisateurs: 2,
      couleur: '#ef4444'
    },
    {
      id: '2',
      nom: 'Comptable Senior',
      description: 'Gestion complète de la comptabilité',
      permissions: ['comptabilite.full', 'clients.full', 'fournisseurs.full', 'rapports.full'],
      utilisateurs: 3,
      couleur: '#737373'
    },
    {
      id: '3',
      nom: 'Assistant Comptable',
      description: 'Saisie et consultation comptable',
      permissions: ['comptabilite.saisie', 'comptabilite.lecture', 'rapports.lecture'],
      utilisateurs: 5,
      couleur: '#171717'
    },
    {
      id: '4',
      nom: 'Contrôleur de Gestion',
      description: 'Analyse et contrôle budgétaire',
      permissions: ['budgets.full', 'tableaux_bord.full', 'rapports.full'],
      utilisateurs: 2,
      couleur: '#737373'
    },
    {
      id: '5',
      nom: 'Auditeur',
      description: 'Audit et vérification',
      permissions: ['audit.full', 'documents.lecture', 'rapports.lecture'],
      utilisateurs: 1,
      couleur: '#525252'
    },
    {
      id: '6',
      nom: 'Consultant',
      description: 'Accès en lecture seule',
      permissions: ['*.lecture'],
      utilisateurs: 4,
      couleur: '#737373'
    }
  ]);

  const permissions = [
    {
      module: 'Comptabilité',
      permissions: [
        { id: 'comptabilite.full', label: 'Accès complet' },
        { id: 'comptabilite.saisie', label: 'Saisie écritures' },
        { id: 'comptabilite.validation', label: 'Validation écritures' },
        { id: 'comptabilite.lecture', label: 'Consultation' }
      ]
    },
    {
      module: 'Clients',
      permissions: [
        { id: 'clients.full', label: 'Accès complet' },
        { id: 'clients.creation', label: 'Création clients' },
        { id: 'clients.modification', label: 'Modification clients' },
        { id: 'clients.lecture', label: 'Consultation' }
      ]
    },
    {
      module: 'Fournisseurs',
      permissions: [
        { id: 'fournisseurs.full', label: 'Accès complet' },
        { id: 'fournisseurs.creation', label: 'Création fournisseurs' },
        { id: 'fournisseurs.modification', label: 'Modification fournisseurs' },
        { id: 'fournisseurs.lecture', label: 'Consultation' }
      ]
    },
    {
      module: 'Budgets',
      permissions: [
        { id: 'budgets.full', label: 'Accès complet' },
        { id: 'budgets.creation', label: 'Création budgets' },
        { id: 'budgets.validation', label: 'Validation budgets' },
        { id: 'budgets.lecture', label: 'Consultation' }
      ]
    },
    {
      module: 'Rapports',
      permissions: [
        { id: 'rapports.full', label: 'Accès complet' },
        { id: 'rapports.creation', label: 'Création rapports' },
        { id: 'rapports.export', label: 'Export rapports' },
        { id: 'rapports.lecture', label: 'Consultation' }
      ]
    },
    {
      module: 'Administration',
      permissions: [
        { id: 'admin.full', label: 'Accès complet' },
        { id: 'admin.utilisateurs', label: 'Gestion utilisateurs' },
        { id: 'admin.parametres', label: 'Paramètres système' },
        { id: 'admin.backup', label: 'Sauvegardes' }
      ]
    }
  ];

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-[var(--color-success-light)] text-[var(--color-success)]';
      case 'inactif': return 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)]';
      case 'suspendu': return 'bg-[var(--color-error-light)] text-[var(--color-error)]';
      default: return 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)]';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'suspendu': return 'Suspendu';
      default: return statut;
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirmModal(true);
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = user.statut === 'actif' ? 'suspendu' : 'actif';
    toast.success(`Utilisateur ${user.prenom} ${user.nom} ${newStatus === 'actif' ? 'activé' : 'suspendu'} avec succès`);
  };

  const handleViewPermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchSearch = user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = selectedRole === 'tous' || user.role === selectedRole;
    return matchSearch && matchRole;
  });

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.statut === 'actif').length,
    suspendedUsers: users.filter(u => u.statut === 'suspendu').length,
    totalRoles: roles.length
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Utilisateurs & Droits</h1>
        <p className="text-[var(--color-text-secondary)] mt-2">Gestion des utilisateurs, rôles et permissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-10 h-10 text-[var(--color-info)]" />
            <span className="text-sm font-medium text-[var(--color-info)]">Total</span>
          </div>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.totalUsers}</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Utilisateurs</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <UserCheck className="w-10 h-10 text-[var(--color-success)]" />
            <span className="text-sm font-medium text-[var(--color-success)]">Actifs</span>
          </div>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.activeUsers}</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Utilisateurs actifs</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <UserX className="w-10 h-10 text-[var(--color-error)]" />
            <span className="text-sm font-medium text-[var(--color-error)]">Suspendus</span>
          </div>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.suspendedUsers}</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Comptes suspendus</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-10 h-10 text-[var(--color-accent)]" />
            <span className="text-sm font-medium text-[var(--color-accent)]">Rôles</span>
          </div>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.totalRoles}</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Rôles définis</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow mb-6">
        <div className="border-b border-[var(--color-border)]">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('utilisateurs')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'utilisateurs'
                  ? 'border-[var(--color-info)] text-[var(--color-info)]'
                  : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Utilisateurs</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'roles'
                  ? 'border-[var(--color-info)] text-[var(--color-info)]'
                  : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Rôles</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'permissions'
                  ? 'border-[var(--color-info)] text-[var(--color-info)]'
                  : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4" />
                <span>Permissions</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('activite')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'activite'
                  ? 'border-[var(--color-info)] text-[var(--color-info)]'
                  : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Activité</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'utilisateurs' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] rounded-lg shadow">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Liste des utilisateurs</h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tous">Tous les rôles</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.nom}>{role.nom}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-info)] text-white rounded-lg hover:bg-[var(--color-info)]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Nouvel utilisateur
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-surface-hover)]">
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      Département
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      Dernière connexion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--color-surface-hover)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-[var(--color-surface-hover)] rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                              {user.prenom[0]}{user.nom[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-[var(--color-text-primary)]">
                              {user.prenom} {user.nom}
                            </div>
                            <div className="text-xs text-[var(--color-text-tertiary)]">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center text-sm text-[var(--color-text-primary)]">
                            <Mail className="w-3 h-3 mr-1 text-[var(--color-text-tertiary)]" />
                            {user.email}
                          </div>
                          <div className="flex items-center text-xs text-[var(--color-text-tertiary)] mt-1">
                            <Phone className="w-3 h-3 mr-1 text-[var(--color-text-tertiary)]" />
                            {user.telephone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 text-[var(--color-text-tertiary)] mr-2" />
                          <span className="text-sm text-[var(--color-text-primary)]">{user.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-[var(--color-text-tertiary)] mr-2" />
                          <span className="text-sm text-[var(--color-text-primary)]">{user.departement}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(user.statut)}`}>
                          {getStatutLabel(user.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--color-text-primary)]">{user.derniereConnexion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            className="text-[var(--color-info)] hover:text-[var(--color-info)]"
                            title={t('common.edit')}
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            title="Permissions"
                            onClick={() => handleViewPermissions(user)}
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {user.statut === 'actif' ? (
                            <button
                              className="text-[var(--color-warning)] hover:text-[var(--color-warning)]"
                              title="Suspendre"
                              onClick={() => handleToggleStatus(user)}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              className="text-[var(--color-success)] hover:text-[var(--color-success)]"
                              title="Activer"
                              onClick={() => handleToggleStatus(user)}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="text-[var(--color-error)] hover:text-[var(--color-error)]"
                            title={t('common.delete')}
                            onClick={() => handleDeleteUser(user)}
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
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Gestion des rôles</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]">
                <Shield className="w-4 h-4" />
                Nouveau rôle
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <div key={role.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: role.couleur }}
                    ></div>
                    <button className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{role.nom}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">{role.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[var(--color-text-tertiary)]">Utilisateurs</span>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{role.utilisateurs}</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Permissions principales:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map((perm, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-[var(--color-surface)] text-[var(--color-text-secondary)] rounded">
                          {perm}
                        </span>
                      ))}
                      {role.permissions.length > 3 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-[var(--color-surface)] text-[var(--color-text-secondary)] rounded">
                          +{role.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface-hover)]">
                      Modifier
                    </button>
                    <button className="flex-1 px-3 py-2 bg-[var(--color-accent)] text-[var(--color-accent)] rounded-lg text-sm hover:bg-[var(--color-accent)]">
                      Permissions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] rounded-lg shadow">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Matrice des permissions</h2>
            </div>

            <div className="p-6">
              {permissions.map((module) => (
                <div key={module.module} className="mb-8">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-[var(--color-text-tertiary)]" />
                    {module.module}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {module.permissions.map((perm) => (
                      <div key={perm.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-[var(--color-surface-hover)]">
                        <input type="checkbox" className="rounded text-[var(--color-info)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{perm.label}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">{perm.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activite' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] rounded-lg shadow">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Journal d'activité</h2>
                <div className="flex gap-3">
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Toutes les actions</option>
                    <option>Connexions</option>
                    <option>Modifications</option>
                    <option>Créations</option>
                    <option>Suppressions</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)]">
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {[
                  { user: '', action: 'Connexion réussie', time: 'Il y a 2 heures', type: 'success' },
                  { user: 'Jean Martin', action: 'Modification utilisateur Sophie Bernard', time: 'Il y a 3 heures', type: 'info' },
                  { user: 'Sophie Bernard', action: 'Export rapport utilisateurs', time: 'Il y a 5 heures', type: 'info' },
                  { user: 'Pierre Leroy', action: 'Tentative connexion échouée', time: 'Il y a 6 heures', type: 'error' },
                  { user: '', action: 'Création rôle Assistant RH', time: 'Hier à 16:30', type: 'success' },
                  { user: 'Jean Martin', action: 'Suspension compte Pierre Leroy', time: 'Hier à 14:20', type: 'warning' }
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-[var(--color-surface-hover)]">
                    <div className="flex items-center space-x-4">
                      <div className={`w-2 h-2 rounded-full ${
                        log.type === 'success' ? 'bg-[var(--color-success)]' :
                        log.type === 'error' ? 'bg-[var(--color-error)]' :
                        log.type === 'warning' ? 'bg-[var(--color-warning)]' :
                        'bg-[var(--color-info)]'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{log.user}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{log.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-[var(--color-text-tertiary)]">
                      <Clock className="w-3 h-3 mr-1" />
                      {log.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Ajouter un Utilisateur</h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jean"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dupont"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="jean.dupont@atlasfinance.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+225 01 23 45 67"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Sélectionner...</option>
                    <option value="admin">Administrateur</option>
                    <option value="comptable">Comptable</option>
                    <option value="commercial">Commercial</option>
                    <option value="manager">Manager</option>
                    <option value="consultant">Consultant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Département <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Sélectionner...</option>
                    <option value="finance">Finance</option>
                    <option value="comptabilite">{t('accounting.title')}</option>
                    <option value="commercial">Commercial</option>
                    <option value="rh">Ressources Humaines</option>
                    <option value="direction">Direction</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poste
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Responsable comptable"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Envoyer un email d'invitation</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Activer le compte immédiatement</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Forcer le changement de mot de passe à la première connexion</span>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  L'utilisateur recevra un email avec ses identifiants de connexion et les instructions pour accéder au système.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter l'utilisateur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Gérer les Permissions</h2>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">—</h3>
                    <p className="text-sm text-gray-600">Comptable - Finance</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Permissions par module</h3>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" id="module-accounting" />
                        <label htmlFor="module-accounting" className="font-medium text-gray-900">{t('accounting.title')}</label>
                      </div>
                      <span className="text-sm text-gray-700">4 / 6 permissions</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Consultation des écritures</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Saisie des écritures</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Validation des écritures</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Gestion des journaux</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Export des données</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Clôture des périodes</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" id="module-reports" />
                        <label htmlFor="module-reports" className="font-medium text-gray-900">Reporting</label>
                      </div>
                      <span className="text-sm text-gray-700">3 / 4 permissions</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Consultation des rapports</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Création de rapports</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Export des rapports</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Partage des rapports</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" id="module-settings" />
                        <label htmlFor="module-settings" className="font-medium text-gray-900">{t('navigation.settings')}</label>
                      </div>
                      <span className="text-sm text-gray-700">0 / 5 permissions</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Gestion des utilisateurs</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Gestion des rôles</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Configuration système</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Gestion des workflows</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Logs et audit</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" id="module-treasury" />
                        <label htmlFor="module-treasury" className="font-medium text-gray-900">{t('navigation.treasury')}</label>
                      </div>
                      <span className="text-sm text-gray-700">2 / 3 permissions</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Consultation des flux</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Rapprochements bancaires</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Prévisions de trésorerie</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important</p>
                    <p>Les modifications de permissions prendront effet lors de la prochaine connexion de l'utilisateur.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-700">Total des permissions actives:</span>
                <span className="text-lg font-bold text-blue-600">9 / 18</span>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enregistrer les permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Modifier l'utilisateur</h2>
                <button onClick={() => setShowEditUserModal(false)} className="text-gray-700 hover:text-gray-600">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    defaultValue={selectedUser.prenom}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    defaultValue={selectedUser.nom}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  defaultValue={selectedUser.telephone}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                  <select
                    defaultValue={selectedUser.role}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>Administrateur</option>
                    <option>Comptable Senior</option>
                    <option>Assistant Comptable</option>
                    <option>Contrôleur de Gestion</option>
                    <option>Auditeur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
                  <select
                    defaultValue={selectedUser.departement}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>Direction</option>
                    <option>Comptabilité</option>
                    <option>Finance</option>
                    <option>Audit</option>
                    <option>RH</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  defaultValue={selectedUser.statut}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('Utilisateur modifié avec succès');
                  setShowEditUserModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Supprimer l'utilisateur</h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-gray-700">
                  Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser.prenom} {selectedUser.nom}</strong> ?
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Toutes les données associées à cet utilisateur seront également supprimées.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    toast.success(`Utilisateur ${selectedUser.prenom} ${selectedUser.nom} supprimé avec succès`);
                    setShowDeleteConfirmModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;