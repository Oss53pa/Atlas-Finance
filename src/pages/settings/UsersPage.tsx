import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('utilisateurs');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('tous');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const [users] = useState<User[]>([
    {
      id: '1',
      nom: 'Dupont',
      prenom: 'Marie',
      email: 'marie.dupont@entreprise.com',
      telephone: '0612345678',
      role: 'Administrateur',
      departement: 'Direction',
      statut: 'actif',
      dateCreation: '2023-01-15',
      derniereConnexion: '2024-01-20 14:30',
      permissions: ['all']
    },
    {
      id: '2',
      nom: 'Martin',
      prenom: 'Jean',
      email: 'jean.martin@entreprise.com',
      telephone: '0623456789',
      role: 'Comptable Senior',
      departement: 'Comptabilité',
      statut: 'actif',
      dateCreation: '2023-03-20',
      derniereConnexion: '2024-01-20 16:45',
      permissions: ['comptabilite.full', 'rapports.lecture', 'clients.lecture']
    },
    {
      id: '3',
      nom: 'Bernard',
      prenom: 'Sophie',
      email: 'sophie.bernard@entreprise.com',
      telephone: '0634567890',
      role: 'Assistant Comptable',
      departement: 'Comptabilité',
      statut: 'actif',
      dateCreation: '2023-06-10',
      derniereConnexion: '2024-01-19 17:20',
      permissions: ['comptabilite.saisie', 'rapports.lecture']
    },
    {
      id: '4',
      nom: 'Leroy',
      prenom: 'Pierre',
      email: 'pierre.leroy@entreprise.com',
      telephone: '0645678901',
      role: 'Contrôleur de Gestion',
      departement: 'Finance',
      statut: 'suspendu',
      dateCreation: '2023-02-28',
      derniereConnexion: '2024-01-10 09:15',
      permissions: ['budgets.full', 'rapports.full', 'tableaux_bord.full']
    },
    {
      id: '5',
      nom: 'Moreau',
      prenom: 'Claire',
      email: 'claire.moreau@entreprise.com',
      telephone: '0656789012',
      role: 'Auditeur',
      departement: 'Audit',
      statut: 'inactif',
      dateCreation: '2023-04-15',
      derniereConnexion: '2023-12-20 11:30',
      permissions: ['audit.full', 'rapports.lecture', 'documents.lecture']
    }
  ]);

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
      couleur: '#3b82f6'
    },
    {
      id: '3',
      nom: 'Assistant Comptable',
      description: 'Saisie et consultation comptable',
      permissions: ['comptabilite.saisie', 'comptabilite.lecture', 'rapports.lecture'],
      utilisateurs: 5,
      couleur: '#10b981'
    },
    {
      id: '4',
      nom: 'Contrôleur de Gestion',
      description: 'Analyse et contrôle budgétaire',
      permissions: ['budgets.full', 'tableaux_bord.full', 'rapports.full'],
      utilisateurs: 2,
      couleur: '#8b5cf6'
    },
    {
      id: '5',
      nom: 'Auditeur',
      description: 'Audit et vérification',
      permissions: ['audit.full', 'documents.lecture', 'rapports.lecture'],
      utilisateurs: 1,
      couleur: '#f59e0b'
    },
    {
      id: '6',
      nom: 'Consultant',
      description: 'Accès en lecture seule',
      permissions: ['*.lecture'],
      utilisateurs: 4,
      couleur: '#6b7280'
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
      case 'actif': return 'bg-green-100 text-green-800';
      case 'inactif': return 'bg-gray-100 text-gray-800';
      case 'suspendu': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Utilisateurs & Droits</h1>
        <p className="text-gray-600 mt-2">Gestion des utilisateurs, rôles et permissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-10 h-10 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          <p className="text-sm text-gray-600 mt-1">Utilisateurs</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <UserCheck className="w-10 h-10 text-green-500" />
            <span className="text-sm font-medium text-green-600">Actifs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
          <p className="text-sm text-gray-600 mt-1">Utilisateurs actifs</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <UserX className="w-10 h-10 text-red-500" />
            <span className="text-sm font-medium text-red-600">Suspendus</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.suspendedUsers}</p>
          <p className="text-sm text-gray-600 mt-1">Comptes suspendus</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-10 h-10 text-purple-500" />
            <span className="text-sm font-medium text-purple-600">Rôles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalRoles}</p>
          <p className="text-sm text-gray-600 mt-1">Rôles définis</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('utilisateurs')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'utilisateurs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Liste des utilisateurs</h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Nouvel utilisateur
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Département
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière connexion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.prenom[0]}{user.nom[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.prenom} {user.nom}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {user.email}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {user.telephone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{user.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{user.departement}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(user.statut)}`}>
                          {getStatutLabel(user.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.derniereConnexion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-900" title="Modifier">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-purple-600 hover:text-purple-900"
                            title="Permissions"
                            onClick={() => setShowPermissionsModal(true)}
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {user.statut === 'actif' ? (
                            <button className="text-orange-600 hover:text-orange-900" title="Suspendre">
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button className="text-green-600 hover:text-green-900" title="Activer">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button className="text-red-600 hover:text-red-900" title="Supprimer">
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Gestion des rôles</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
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
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{role.nom}</h3>
                  <p className="text-sm text-gray-600 mb-4">{role.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">Utilisateurs</span>
                    <span className="text-sm font-medium text-gray-900">{role.utilisateurs}</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Permissions principales:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map((perm, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {perm}
                        </span>
                      ))}
                      {role.permissions.length > 3 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{role.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                      Modifier
                    </button>
                    <button className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Matrice des permissions</h2>
            </div>

            <div className="p-6">
              {permissions.map((module) => (
                <div key={module.module} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-gray-400" />
                    {module.module}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {module.permissions.map((perm) => (
                      <div key={perm.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                          <p className="text-xs text-gray-500">{perm.id}</p>
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
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Journal d'activité</h2>
                <div className="flex gap-3">
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Toutes les actions</option>
                    <option>Connexions</option>
                    <option>Modifications</option>
                    <option>Créations</option>
                    <option>Suppressions</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {[
                  { user: 'Marie Dupont', action: 'Connexion réussie', time: 'Il y a 2 heures', type: 'success' },
                  { user: 'Jean Martin', action: 'Modification utilisateur Sophie Bernard', time: 'Il y a 3 heures', type: 'info' },
                  { user: 'Sophie Bernard', action: 'Export rapport utilisateurs', time: 'Il y a 5 heures', type: 'info' },
                  { user: 'Pierre Leroy', action: 'Tentative connexion échouée', time: 'Il y a 6 heures', type: 'error' },
                  { user: 'Marie Dupont', action: 'Création rôle Assistant RH', time: 'Hier à 16:30', type: 'success' },
                  { user: 'Jean Martin', action: 'Suspension compte Pierre Leroy', time: 'Hier à 14:20', type: 'warning' }
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className={`w-2 h-2 rounded-full ${
                        log.type === 'success' ? 'bg-green-500' :
                        log.type === 'error' ? 'bg-red-500' :
                        log.type === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.user}</p>
                        <p className="text-sm text-gray-600">{log.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
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
    </div>
  );
};

export default UsersPage;