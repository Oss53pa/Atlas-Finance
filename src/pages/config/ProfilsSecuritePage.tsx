import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Copy,
  Settings,
  Users,
  Lock,
  Unlock,
  Key,
  UserCheck,
  UserX,
  Crown,
  Award,
  CheckSquare,
  XSquare,
  Minus,
  Save,
  RefreshCw,
  Building2,
  FileText,
  CreditCard,
  BarChart3,
  Target,
  Calendar,
  Database
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface SecurityProfile {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  level: 'admin' | 'manager' | 'operator' | 'viewer';
  is_active: boolean;
  is_default: boolean;
  users_count: number;
  permissions: Permission[];
  restrictions: Restriction[];
  created_date: string;
  created_by: string;
  last_modified: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  access_level: 'none' | 'read' | 'write' | 'admin';
  conditions?: string[];
}

interface Restriction {
  id: string;
  type: 'time' | 'ip' | 'amount' | 'period' | 'data';
  description: string;
  value: any;
  is_active: boolean;
}

interface Module {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: React.ComponentType<any>;
  actions: Action[];
  category: string;
}

interface Action {
  id: string;
  name: string;
  code: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

const ProfilsSecuritePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [activeTab, setActiveTab] = useState('profiles');

  // Mock data for modules
  const mockModules: Module[] = [
    {
      id: '1',
      name: 'Comptabilité',
      code: 'accounting',
      description: 'Module de gestion comptable',
      icon: FileText,
      category: 'core',
      actions: [
        { id: '1', name: 'Consulter', code: 'view', description: 'Voir les données comptables', risk_level: 'low' },
        { id: '2', name: 'Saisir', code: 'create', description: 'Créer des écritures', risk_level: 'medium' },
        { id: '3', name: 'Modifier', code: 'edit', description: 'Modifier les écritures', risk_level: 'high' },
        { id: '4', name: 'Supprimer', code: 'delete', description: 'Supprimer les écritures', risk_level: 'critical' },
        { id: '5', name: 'Valider', code: 'validate', description: 'Valider les écritures', risk_level: 'high' }
      ]
    },
    {
      id: '2',
      name: 'Tiers',
      code: 'thirds',
      description: 'Gestion des clients et fournisseurs',
      icon: Users,
      category: 'business',
      actions: [
        { id: '6', name: 'Consulter', code: 'view', description: 'Voir les tiers', risk_level: 'low' },
        { id: '7', name: 'Créer', code: 'create', description: 'Créer des tiers', risk_level: 'medium' },
        { id: '8', name: 'Modifier', code: 'edit', description: 'Modifier les tiers', risk_level: 'medium' },
        { id: '9', name: 'Supprimer', code: 'delete', description: 'Supprimer les tiers', risk_level: 'high' }
      ]
    },
    {
      id: '3',
      name: 'Trésorerie',
      code: 'treasury',
      description: 'Gestion de la trésorerie',
      icon: CreditCard,
      category: 'financial',
      actions: [
        { id: '10', name: 'Consulter', code: 'view', description: 'Voir la trésorerie', risk_level: 'low' },
        { id: '11', name: 'Rapprochement', code: 'reconcile', description: 'Faire les rapprochements', risk_level: 'high' },
        { id: '12', name: 'Virements', code: 'transfer', description: 'Effectuer des virements', risk_level: 'critical' }
      ]
    },
    {
      id: '4',
      name: 'Configuration',
      code: 'config',
      description: 'Configuration système',
      icon: Settings,
      category: 'admin',
      actions: [
        { id: '13', name: 'Consulter', code: 'view', description: 'Voir la configuration', risk_level: 'low' },
        { id: '14', name: 'Modifier', code: 'edit', description: 'Modifier la configuration', risk_level: 'critical' }
      ]
    }
  ];

  // Mock data for security profiles
  const mockProfiles: SecurityProfile[] = [
    {
      id: '1',
      code: 'ADMIN',
      name: 'Administrateur Système',
      description: 'Accès complet à toutes les fonctionnalités',
      type: 'system',
      level: 'admin',
      is_active: true,
      is_default: false,
      users_count: 2,
      permissions: [
        { id: '1', module: 'accounting', action: 'view', access_level: 'admin' },
        { id: '2', module: 'thirds', action: 'view', access_level: 'admin' },
        { id: '3', module: 'treasury', action: 'view', access_level: 'admin' },
        { id: '4', module: 'config', action: 'edit', access_level: 'admin' }
      ],
      restrictions: [],
      created_date: '2024-01-01',
      created_by: 'System',
      last_modified: '2024-01-15'
    },
    {
      id: '2',
      code: 'COMPTABLE',
      name: 'Comptable',
      description: 'Accès aux fonctions comptables et de trésorerie',
      type: 'system',
      level: 'manager',
      is_active: true,
      is_default: true,
      users_count: 5,
      permissions: [
        { id: '5', module: 'accounting', action: 'view', access_level: 'write' },
        { id: '6', module: 'accounting', action: 'create', access_level: 'write' },
        { id: '7', module: 'thirds', action: 'view', access_level: 'read' },
        { id: '8', module: 'treasury', action: 'view', access_level: 'read' }
      ],
      restrictions: [
        {
          id: '1',
          type: 'amount',
          description: 'Limite de saisie 1M FCFA',
          value: { max_amount: 1000000 },
          is_active: true
        }
      ],
      created_date: '2024-01-01',
      created_by: 'Admin',
      last_modified: '2024-01-20'
    },
    {
      id: '3',
      code: 'OPERATEUR',
      name: 'Opérateur de Saisie',
      description: 'Saisie des écritures comptables uniquement',
      type: 'custom',
      level: 'operator',
      is_active: true,
      is_default: false,
      users_count: 8,
      permissions: [
        { id: '9', module: 'accounting', action: 'view', access_level: 'read' },
        { id: '10', module: 'accounting', action: 'create', access_level: 'write' },
        { id: '11', module: 'thirds', action: 'view', access_level: 'read' }
      ],
      restrictions: [
        {
          id: '2',
          type: 'time',
          description: 'Accès de 8h à 18h uniquement',
          value: { start_time: '08:00', end_time: '18:00' },
          is_active: true
        },
        {
          id: '3',
          type: 'amount',
          description: 'Limite de saisie 500K FCFA',
          value: { max_amount: 500000 },
          is_active: true
        }
      ],
      created_date: '2024-01-05',
      created_by: 'Admin',
      last_modified: '2024-01-25'
    },
    {
      id: '4',
      code: 'CONSULTATION',
      name: 'Consultation Seule',
      description: 'Accès en lecture seule',
      type: 'system',
      level: 'viewer',
      is_active: true,
      is_default: false,
      users_count: 12,
      permissions: [
        { id: '12', module: 'accounting', action: 'view', access_level: 'read' },
        { id: '13', module: 'thirds', action: 'view', access_level: 'read' },
        { id: '14', module: 'treasury', action: 'view', access_level: 'read' }
      ],
      restrictions: [
        {
          id: '4',
          type: 'data',
          description: 'Données des 3 derniers mois uniquement',
          value: { months_back: 3 },
          is_active: true
        }
      ],
      created_date: '2024-01-10',
      created_by: 'Admin',
      last_modified: '2024-01-22'
    },
    {
      id: '5',
      code: 'CONTROLEUR',
      name: 'Contrôleur de Gestion',
      description: 'Accès aux rapports et analyses',
      type: 'custom',
      level: 'manager',
      is_active: false,
      is_default: false,
      users_count: 0,
      permissions: [
        { id: '15', module: 'accounting', action: 'view', access_level: 'read' },
        { id: '16', module: 'treasury', action: 'view', access_level: 'read' }
      ],
      restrictions: [],
      created_date: '2024-01-12',
      created_by: 'Admin',
      last_modified: '2024-01-18'
    }
  ];

  const { data: profiles = mockProfiles, isLoading } = useQuery({
    queryKey: ['security-profiles', searchTerm, selectedType, selectedLevel, selectedStatus],
    queryFn: () => Promise.resolve(mockProfiles),
  });

  const { data: modules = mockModules } = useQuery({
    queryKey: ['security-modules'],
    queryFn: () => Promise.resolve(mockModules),
  });

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || profile.type === selectedType;
    const matchesLevel = selectedLevel === 'all' || profile.level === selectedLevel;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && profile.is_active) ||
                         (selectedStatus === 'inactive' && !profile.is_active);
    
    return matchesSearch && matchesType && matchesLevel && matchesStatus;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'text-blue-600 bg-blue-100';
      case 'custom':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'admin':
        return 'text-red-600 bg-red-100';
      case 'manager':
        return 'text-orange-600 bg-orange-100';
      case 'operator':
        return 'text-blue-600 bg-blue-100';
      case 'viewer':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'manager':
        return <Award className="h-4 w-4" />;
      case 'operator':
        return <UserCheck className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'admin':
        return <Crown className="h-3 w-3 text-red-500" />;
      case 'write':
        return <Edit className="h-3 w-3 text-orange-500" />;
      case 'read':
        return <Eye className="h-3 w-3 text-blue-500" />;
      case 'none':
        return <XSquare className="h-3 w-3 text-gray-700" />;
      default:
        return <Minus className="h-3 w-3 text-gray-700" />;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleCreateProfile = () => {
    toast.success('Création d\'un nouveau profil de sécurité...');
  };

  const handleEditProfile = (profileId: string) => {
    toast.info(`Édition du profil ${profileId}`);
  };

  const handleDeleteProfile = (profileId: string) => {
    toast.error(`Suppression du profil ${profileId}`);
  };

  const handleCloneProfile = (profileId: string) => {
    toast.success(`Clonage du profil ${profileId}`);
  };

  const handleToggleProfile = (profileId: string) => {
    toast.info(`Activation/Désactivation du profil ${profileId}`);
  };

  const activeProfiles = profiles.filter(p => p.is_active).length;
  const totalUsers = profiles.reduce((sum, profile) => sum + profile.users_count, 0);
  const systemProfiles = profiles.filter(p => p.type === 'system').length;
  const customProfiles = profiles.filter(p => p.type === 'custom').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="mr-3 h-7 w-7 text-blue-600" />
              Profils de Sécurité
            </h1>
            <p className="mt-2 text-gray-600">
              Gestion des profils utilisateurs et des permissions système
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button
              onClick={handleCreateProfile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Profil
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Profils Actifs</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {activeProfiles}/{profiles.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilisateurs Gérés</p>
                  <p className="text-2xl font-bold text-green-700">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Profils Système</p>
                  <p className="text-2xl font-bold text-purple-700">{systemProfiles}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Key className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Profils Personnalisés</p>
                  <p className="text-2xl font-bold text-orange-700">{customProfiles}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="profiles">Profils de Sécurité</TabsTrigger>
            <TabsTrigger value="permissions">Matrice des Permissions</TabsTrigger>
            <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                    <Input
                      placeholder="Rechercher un profil..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="system">Système</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="operator">Opérateur</SelectItem>
                      <SelectItem value="viewer">Consultation</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres Avancés
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profiles Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Profils de Sécurité ({filteredProfiles.length})</span>
                  <Badge variant="outline">
                    RBAC (Role-Based Access Control)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des profils..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code/Nom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Niveau</TableHead>
                          <TableHead>Utilisateurs</TableHead>
                          <TableHead>Permissions</TableHead>
                          <TableHead>Restrictions</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Dernière MAJ</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfiles.map((profile) => (
                          <TableRow key={profile.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {getLevelIcon(profile.level)}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="font-mono">
                                      {profile.code}
                                    </Badge>
                                    {profile.is_default && (
                                      <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800">
                                        Défaut
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="font-semibold text-gray-900 mt-1">{profile.name}</p>
                                  <p className="text-sm text-gray-700">{profile.description}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(profile.type)}`}>
                                <span className="capitalize">{profile.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(profile.level)}`}>
                                {getLevelIcon(profile.level)}
                                <span className="ml-1 capitalize">{profile.level}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <span className="text-lg font-bold text-blue-600">{profile.users_count}</span>
                                <p className="text-xs text-gray-700">utilisateurs</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <span className="text-lg font-bold text-green-600">{profile.permissions.length}</span>
                                <p className="text-xs text-gray-700">permissions</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <span className="text-lg font-bold text-orange-600">{profile.restrictions.length}</span>
                                <p className="text-xs text-gray-700">restrictions</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.is_active)}`}>
                                {getStatusIcon(profile.is_active)}
                                <span className="ml-1">{profile.is_active ? 'Actif' : 'Inactif'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">{formatDate(profile.last_modified)}</p>
                                <p className="text-gray-700">par {profile.created_by}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleProfile(profile.id)}
                                  className={profile.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                                >
                                  {profile.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditProfile(profile.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCloneProfile(profile.id)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {profile.type === 'custom' && profile.users_count === 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Matrice des Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Module/Action</TableHead>
                        {filteredProfiles.map((profile) => (
                          <TableHead key={profile.id} className="text-center min-w-32">
                            <div className="text-xs">
                              <p className="font-semibold">{profile.code}</p>
                              <div className={`inline-flex items-center px-1 py-0.5 rounded text-xs ${getLevelColor(profile.level)}`}>
                                {getLevelIcon(profile.level)}
                              </div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modules.map((module) => (
                        <React.Fragment key={module.id}>
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={filteredProfiles.length + 1} className="font-semibold text-gray-900">
                              <div className="flex items-center space-x-2">
                                <module.icon className="h-4 w-4" />
                                <span>{module.name}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                          {module.actions.map((action) => (
                            <TableRow key={`${module.id}-${action.id}`}>
                              <TableCell className="pl-8">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">{action.name}</span>
                                  <Badge variant="outline" className={`text-xs ${getRiskLevelColor(action.risk_level)}`}>
                                    {action.risk_level}
                                  </Badge>
                                </div>
                              </TableCell>
                              {filteredProfiles.map((profile) => {
                                const permission = profile.permissions.find(
                                  p => p.module === module.code && p.action === action.code
                                );
                                const accessLevel = permission?.access_level || 'none';
                                
                                return (
                                  <TableCell key={`${profile.id}-${action.id}`} className="text-center">
                                    <div className="flex justify-center">
                                      {getAccessLevelIcon(accessLevel)}
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Légende des Niveaux d'Accès:</h4>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Crown className="h-3 w-3 text-red-500" />
                      <span>Admin - Accès administrateur complet</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Edit className="h-3 w-3 text-orange-500" />
                      <span>Write - Lecture et écriture</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="h-3 w-3 text-blue-500" />
                      <span>Read - Lecture seule</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XSquare className="h-3 w-3 text-gray-700" />
                      <span>None - Aucun accès</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Restrictions par Profil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredProfiles.map((profile) => (
                    profile.restrictions.length > 0 && (
                      <div key={profile.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              {getLevelIcon(profile.level)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {profile.code}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-sm text-gray-700">
                            {profile.restrictions.filter(r => r.is_active).length} restriction(s) active(s)
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {profile.restrictions.map((restriction) => (
                            <div key={restriction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="text-xs">
                                  {restriction.type}
                                </Badge>
                                <span className="text-sm text-gray-700">{restriction.description}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {restriction.is_active ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Actif</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Inactif</Badge>
                                )}
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit des Accès</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Journal d'Audit</h3>
                  <p className="text-gray-700 mb-6">
                    Suivi des accès et modifications des profils de sécurité
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      Voir les Connexions
                    </Button>
                    <Button variant="outline">
                      <History className="mr-2 h-4 w-4" />
                      Historique des Modifications
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exporter Logs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ProfilsSecuritePage;