import React, { useState, useMemo } from 'react';
import {
  Users, Shield, Key, Lock, Unlock, UserCheck, UserX,
  Activity, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff,
  PlusCircle, Edit, Trash2, Save, X, RefreshCw, Download,
  Mail, Phone, Calendar, Clock, Globe, MapPin, Building,
  Settings, Database, Wifi, WifiOff, Smartphone, Monitor,
  ShieldCheck, ShieldAlert, UserPlus, LogIn, LogOut,
  AlertCircle, Info, FileText, Filter, Search, MoreVertical,
  ChevronRight, Hash, AtSign, Link2, Fingerprint, Zap
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
);

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  status: 'Actif' | 'Inactif' | 'Suspendu' | 'Verrouillé';
  lastLogin?: string;
  createdAt: string;
  phone?: string;
  location?: string;
  avatar?: string;
  permissions: string[];
  twoFactorEnabled: boolean;
  loginAttempts: number;
  sessions: Session[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  usersCount: number;
  createdAt: string;
  updatedAt: string;
  isSystem: boolean;
  color: string;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
  actions: string[];
}

interface Session {
  id: string;
  userId: string;
  ip: string;
  device: string;
  browser: string;
  location: string;
  startTime: string;
  lastActivity: string;
  status: 'Active' | 'Expired' | 'Terminated';
}

interface SecurityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ip: string;
  status: 'Success' | 'Failed' | 'Warning';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface SecurityPolicy {
  id: string;
  name: string;
  type: string;
  value: any;
  description: string;
  enabled: boolean;
}

const CompleteAuthModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showPassword, setShowPassword] = useState(false);

  // Sample data
  const [users] = useState<User[]>([
    {
      id: 'USR001',
      username: 'admin',
      email: 'admin@wisebook.com',
      fullName: 'Administrateur Système',
      role: 'Super Admin',
      department: 'IT',
      status: 'Actif',
      lastLogin: '2024-11-20 09:15:00',
      createdAt: '2024-01-01',
      phone: '+225 07 00 00 00',
      location: 'Abidjan, CI',
      permissions: ['all'],
      twoFactorEnabled: true,
      loginAttempts: 0,
      sessions: [
        {
          id: 'SES001',
          userId: 'USR001',
          ip: '192.168.1.100',
          device: 'Desktop',
          browser: 'Chrome 119',
          location: 'Abidjan, CI',
          startTime: '2024-11-20 09:15:00',
          lastActivity: '2024-11-20 10:30:00',
          status: 'Active'
        }
      ]
    },
    {
      id: 'USR002',
      username: 'comptable1',
      email: 'comptable@wisebook.com',
      fullName: 'Marie Kouassi',
      role: 'Comptable',
      department: 'Finance',
      status: 'Actif',
      lastLogin: '2024-11-20 08:30:00',
      createdAt: '2024-02-15',
      phone: '+225 07 11 11 11',
      location: 'Abidjan, CI',
      permissions: ['accounting.view', 'accounting.create', 'accounting.edit'],
      twoFactorEnabled: false,
      loginAttempts: 0,
      sessions: []
    },
    {
      id: 'USR003',
      username: 'manager1',
      email: 'manager@wisebook.com',
      fullName: 'Jean Konan',
      role: 'Manager',
      department: 'Commercial',
      status: 'Actif',
      lastLogin: '2024-11-19 17:45:00',
      createdAt: '2024-03-10',
      permissions: ['dashboard.view', 'reports.view', 'reports.export'],
      twoFactorEnabled: false,
      loginAttempts: 0,
      sessions: []
    },
    {
      id: 'USR004',
      username: 'user_locked',
      email: 'locked@wisebook.com',
      fullName: 'Paul Yao',
      role: 'Utilisateur',
      department: 'Operations',
      status: 'Verrouillé',
      lastLogin: '2024-11-15 10:00:00',
      createdAt: '2024-06-01',
      permissions: ['dashboard.view'],
      twoFactorEnabled: false,
      loginAttempts: 5,
      sessions: []
    }
  ]);

  const [roles] = useState<Role[]>([
    {
      id: 'ROLE001',
      name: 'Super Admin',
      description: 'Accès complet au système',
      permissions: [],
      usersCount: 1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      isSystem: true,
      color: 'red'
    },
    {
      id: 'ROLE002',
      name: 'Comptable',
      description: 'Gestion de la comptabilité et finances',
      permissions: [],
      usersCount: 3,
      createdAt: '2024-01-01',
      updatedAt: '2024-06-15',
      isSystem: false,
      color: 'blue'
    },
    {
      id: 'ROLE003',
      name: 'Manager',
      description: 'Supervision et rapports',
      permissions: [],
      usersCount: 2,
      createdAt: '2024-01-01',
      updatedAt: '2024-05-20',
      isSystem: false,
      color: 'green'
    },
    {
      id: 'ROLE004',
      name: 'Utilisateur',
      description: 'Accès basique en lecture',
      permissions: [],
      usersCount: 8,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      isSystem: true,
      color: 'gray'
    }
  ]);

  const [permissions] = useState<Permission[]>([
    {
      id: 'PERM001',
      code: 'accounting.all',
      name: 'Comptabilité - Accès complet',
      module: 'Comptabilité',
      description: 'Tous les droits sur le module comptabilité',
      actions: ['view', 'create', 'edit', 'delete', 'export']
    },
    {
      id: 'PERM002',
      code: 'treasury.all',
      name: 'Trésorerie - Accès complet',
      module: 'Trésorerie',
      description: 'Tous les droits sur le module trésorerie',
      actions: ['view', 'create', 'edit', 'delete', 'export']
    },
    {
      id: 'PERM003',
      code: 'reports.view',
      name: 'Rapports - Consultation',
      module: 'Rapports',
      description: 'Consultation des rapports',
      actions: ['view']
    },
    {
      id: 'PERM004',
      code: 'users.manage',
      name: 'Utilisateurs - Gestion',
      module: 'Utilisateurs',
      description: 'Gestion des utilisateurs et permissions',
      actions: ['view', 'create', 'edit', 'delete']
    }
  ]);

  const [securityLogs] = useState<SecurityLog[]>([
    {
      id: 'LOG001',
      timestamp: '2024-11-20 10:30:00',
      userId: 'USR001',
      userName: 'admin',
      action: 'Login réussi',
      module: 'Authentification',
      details: 'Connexion avec 2FA',
      ip: '192.168.1.100',
      status: 'Success',
      severity: 'Low'
    },
    {
      id: 'LOG002',
      timestamp: '2024-11-20 10:25:00',
      userId: 'USR004',
      userName: 'user_locked',
      action: 'Tentative de connexion échouée',
      module: 'Authentification',
      details: 'Compte verrouillé après 5 tentatives',
      ip: '192.168.1.150',
      status: 'Failed',
      severity: 'High'
    },
    {
      id: 'LOG003',
      timestamp: '2024-11-20 09:45:00',
      userId: 'USR002',
      userName: 'comptable1',
      action: 'Modification de permissions',
      module: 'Sécurité',
      details: 'Ajout du droit export sur comptabilité',
      ip: '192.168.1.110',
      status: 'Success',
      severity: 'Medium'
    }
  ]);

  const [policies] = useState<SecurityPolicy[]>([
    {
      id: 'POL001',
      name: 'Longueur minimale du mot de passe',
      type: 'password',
      value: 8,
      description: 'Nombre minimum de caractères requis',
      enabled: true
    },
    {
      id: 'POL002',
      name: 'Authentification à deux facteurs',
      type: '2fa',
      value: 'optional',
      description: 'Optionnel, Obligatoire ou Désactivé',
      enabled: true
    },
    {
      id: 'POL003',
      name: 'Verrouillage après tentatives échouées',
      type: 'lockout',
      value: 5,
      description: 'Nombre de tentatives avant verrouillage',
      enabled: true
    },
    {
      id: 'POL004',
      name: 'Expiration de session',
      type: 'session',
      value: 60,
      description: 'Durée en minutes avant expiration',
      enabled: true
    },
    {
      id: 'POL005',
      name: 'Historique des mots de passe',
      type: 'password',
      value: 3,
      description: 'Ne pas réutiliser les X derniers mots de passe',
      enabled: true
    }
  ]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, filterStatus, filterRole]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activeUsers = users.filter(u => u.status === 'Actif').length;
    const lockedUsers = users.filter(u => u.status === 'Verrouillé').length;
    const activeSessions = users.reduce((sum, u) => sum + u.sessions.filter(s => s.status === 'Active').length, 0);
    const twoFactorUsers = users.filter(u => u.twoFactorEnabled).length;
    const failedLogins = securityLogs.filter(l => l.status === 'Failed').length;
    const criticalAlerts = securityLogs.filter(l => l.severity === 'Critical' || l.severity === 'High').length;

    return {
      totalUsers: users.length,
      activeUsers,
      lockedUsers,
      activeSessions,
      twoFactorUsers,
      twoFactorPercent: (twoFactorUsers / users.length) * 100,
      failedLogins,
      criticalAlerts
    };
  }, [users, securityLogs]);

  // Chart data
  const loginActivityData = {
    labels: ['00h', '04h', '08h', '12h', '16h', '20h'],
    datasets: [
      {
        label: 'Connexions réussies',
        data: [5, 8, 42, 35, 28, 15],
        borderColor: 'var(--color-success)',
        backgroundColor: 'rgba(var(--color-success-rgb), 0.1)',
        tension: 0.4
      },
      {
        label: 'Échecs de connexion',
        data: [1, 2, 3, 2, 1, 1],
        borderColor: 'var(--color-danger)',
        backgroundColor: 'rgba(var(--color-danger-rgb), 0.1)',
        tension: 0.4
      }
    ]
  };

  const usersByRoleData = {
    labels: roles.map(r => r.name),
    datasets: [{
      data: roles.map(r => r.usersCount),
      backgroundColor: [
        'var(--color-primary)',
        'var(--color-success)',
        'var(--color-warning)',
        'var(--color-info)'
      ]
    }]
  };

  const securityScoreData = {
    labels: ['Mots de passe', '2FA', 'Sessions', 'Permissions', 'Audit'],
    datasets: [{
      label: 'Score de sécurité',
      data: [85, 60, 90, 95, 88],
      backgroundColor: 'rgba(var(--color-primary-rgb), 0.2)',
      borderColor: 'var(--color-primary)',
      pointBackgroundColor: 'var(--color-primary)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'var(--color-primary)'
    }]
  };

  const handleSaveUser = () => {
    // Logic to save user
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      // Logic to delete user
    }
  };

  const handleLockUser = (user: User) => {
    if (confirm(`Êtes-vous sûr de vouloir ${user.status === 'Verrouillé' ? 'déverrouiller' : 'verrouiller'} cet utilisateur ?`)) {
      // Logic to lock/unlock user
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  const handleTerminateSession = (session: Session) => {
    if (confirm('Êtes-vous sûr de vouloir terminer cette session ?')) {
      // Logic to terminate session
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Actif': return 'bg-green-100 text-green-800';
      case 'Inactif': return 'bg-gray-100 text-gray-800';
      case 'Suspendu': return 'bg-orange-100 text-orange-800';
      case 'Verrouillé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-orange-600';
      case 'Critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case 'Success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              Module Authentification & Sécurité
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Gestion des utilisateurs, rôles, permissions et sécurité du système
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Logs
            </button>
            <button 
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Nouvel Utilisateur
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[var(--color-border)]">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: Shield },
            { id: 'users', label: 'Utilisateurs', icon: Users },
            { id: 'roles', label: 'Rôles', icon: ShieldCheck },
            { id: 'permissions', label: 'Permissions', icon: Key },
            { id: 'sessions', label: 'Sessions', icon: Activity },
            { id: 'security', label: 'Sécurité', icon: Lock },
            { id: 'logs', label: 'Journaux', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs text-green-600">{stats.activeUsers} actifs</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.totalUsers}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Utilisateurs totaux
              </div>
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wifi className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">En ligne</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.activeSessions}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Sessions actives
              </div>
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs text-green-600">{stats.twoFactorPercent.toFixed(0)}%</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.twoFactorUsers}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Avec 2FA activé
              </div>
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-xs text-red-600">{stats.lockedUsers} verrouillés</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.criticalAlerts}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Alertes critiques
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Activité de Connexion (24h)
              </h3>
              <Line data={loginActivityData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Répartition par Rôle
              </h3>
              <Doughnut data={usersByRoleData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </div>
          </div>

          {/* Security Score */}
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Score de Sécurité Global
            </h3>
            <div className="h-64">
              <Radar data={securityScoreData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="all">Tous les statuts</option>
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
              <option value="Suspendu">Suspendu</option>
              <option value="Verrouillé">Verrouillé</option>
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="all">Tous les rôles</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Utilisateur</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Rôle</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Département</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Statut</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Dernière connexion</th>
                    <th className="text-center p-4 font-medium text-[var(--color-text-secondary)]">2FA</th>
                    <th className="text-center p-4 font-medium text-[var(--color-text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--color-primary)] bg-opacity-10 rounded-full flex items-center justify-center">
                            <span className="text-[var(--color-primary)] font-semibold">
                              {user.fullName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-[var(--color-text-primary)]">
                              {user.fullName}
                            </div>
                            <div className="text-sm text-[var(--color-text-secondary)]">
                              @{user.username} · {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] rounded text-sm">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {user.department}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--color-text-secondary)] text-sm">
                        {user.lastLogin || 'Jamais'}
                      </td>
                      <td className="p-4 text-center">
                        {user.twoFactorEnabled ? (
                          <ShieldCheck className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <ShieldAlert className="w-5 h-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setShowUserModal(true);
                            }}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Réinitialiser mot de passe"
                          >
                            <Key className="w-4 h-4 text-orange-600" />
                          </button>
                          <button
                            onClick={() => handleLockUser(user)}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title={user.status === 'Verrouillé' ? 'Déverrouiller' : 'Verrouiller'}
                          >
                            {user.status === 'Verrouillé' ? 
                              <Unlock className="w-4 h-4 text-green-600" /> :
                              <Lock className="w-4 h-4 text-red-600" />
                            }
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Details */}
          {selectedUser && (
            <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
              <div className="p-6 border-b border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Détails de l'utilisateur: {selectedUser.fullName}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Informations</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <AtSign className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span className="text-[var(--color-text-primary)]">{selectedUser.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span className="text-[var(--color-text-primary)]">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span className="text-[var(--color-text-primary)]">{selectedUser.phone || 'Non renseigné'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span className="text-[var(--color-text-primary)]">{selectedUser.location || 'Non renseigné'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Sécurité</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">2FA:</span>
                        <span className={selectedUser.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}>
                          {selectedUser.twoFactorEnabled ? 'Activé' : 'Désactivé'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">Tentatives échouées:</span>
                        <span className="text-[var(--color-text-primary)]">{selectedUser.loginAttempts}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">Créé le:</span>
                        <span className="text-[var(--color-text-primary)]">{selectedUser.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Sessions actives</h4>
                    <div className="space-y-2">
                      {selectedUser.sessions.map(session => (
                        <div key={session.id} className="p-2 bg-[var(--color-background)] rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--color-text-primary)]">{session.device}</span>
                            <button
                              onClick={() => handleTerminateSession(session)}
                              className="text-red-600 hover:underline"
                            >
                              Terminer
                            </button>
                          </div>
                          <div className="text-[var(--color-text-secondary)] text-xs mt-1">
                            {session.ip} · {session.browser}
                          </div>
                        </div>
                      ))}
                      {selectedUser.sessions.length === 0 && (
                        <p className="text-sm text-[var(--color-text-secondary)]">Aucune session active</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Politiques de Sécurité
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {policies.map(policy => (
                  <div key={policy.id} className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${policy.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {policy.type === 'password' && <Key className={`w-5 h-5 ${policy.enabled ? 'text-green-600' : 'text-gray-400'}`} />}
                        {policy.type === '2fa' && <Fingerprint className={`w-5 h-5 ${policy.enabled ? 'text-green-600' : 'text-gray-400'}`} />}
                        {policy.type === 'lockout' && <Lock className={`w-5 h-5 ${policy.enabled ? 'text-green-600' : 'text-gray-400'}`} />}
                        {policy.type === 'session' && <Clock className={`w-5 h-5 ${policy.enabled ? 'text-green-600' : 'text-gray-400'}`} />}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {policy.name}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          {policy.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-[var(--color-text-primary)]">
                          {typeof policy.value === 'number' ? policy.value : policy.value}
                        </div>
                      </div>
                      <button
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          policy.enabled ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            policy.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Date/Heure</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Utilisateur</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Action</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Module</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">IP</th>
                    <th className="text-center p-4 font-medium text-[var(--color-text-secondary)]">Statut</th>
                    <th className="text-center p-4 font-medium text-[var(--color-text-secondary)]">Sévérité</th>
                  </tr>
                </thead>
                <tbody>
                  {securityLogs.map(log => (
                    <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="p-4 text-[var(--color-text-primary)] text-sm">
                        {log.timestamp}
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {log.userName}
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="text-[var(--color-text-primary)]">{log.action}</div>
                          <div className="text-sm text-[var(--color-text-secondary)]">{log.details}</div>
                        </div>
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {log.module}
                      </td>
                      <td className="p-4 text-[var(--color-text-secondary)] text-sm">
                        {log.ip}
                      </td>
                      <td className="p-4 text-center">
                        {getLogStatusIcon(log.status)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-medium ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    defaultValue={editingUser?.fullName}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    defaultValue={editingUser?.username}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                    placeholder="jdupont"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={editingUser?.email}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                    placeholder="jean.dupont@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    defaultValue={editingUser?.phone}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                    placeholder="+225 07 00 00 00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Rôle
                  </label>
                  <select
                    defaultValue={editingUser?.role}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Département
                  </label>
                  <select
                    defaultValue={editingUser?.department}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  >
                    <option value="Administration">Administration</option>
                    <option value="Finance">Finance</option>
                    <option value="Commercial">Commercial</option>
                    <option value="IT">IT</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Mot de passe temporaire
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full px-3 py-2 pr-10 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      ) : (
                        <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked={editingUser?.twoFactorEnabled}
                    className="rounded border-[var(--color-border)]"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    Activer l'authentification à deux facteurs
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingUser ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Réinitialiser le mot de passe
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[var(--color-text-secondary)]">
                Réinitialiser le mot de passe pour: <strong>{selectedUser.fullName}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    ) : (
                      <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forceChange"
                  className="rounded border-[var(--color-border)]"
                  defaultChecked
                />
                <label htmlFor="forceChange" className="text-sm text-[var(--color-text-primary)]">
                  Forcer le changement au prochain login
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // Logic to reset password
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteAuthModule;