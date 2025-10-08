import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Key,
  Shield,
  Users,
  User,
  Eye,
  Edit,
  Plus,
  Minus,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Settings,
  Download,
  Upload,
  Copy,
  RotateCcw,
  UserCheck,
  ShieldCheck,
  FileText,
  Database,
  BarChart3,
  DollarSign
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
  Checkbox
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface Permission {
  id: string;
  nom: string;
  code: string;
  module: string;
  description: string;
  type: 'lecture' | 'ecriture' | 'suppression' | 'administration';
  niveau: 'basic' | 'advanced' | 'admin';
  actif: boolean;
  date_creation: string;
  created_by: string;
}

interface Role {
  id: string;
  nom: string;
  description: string;
  niveau: 'utilisateur' | 'superviseur' | 'admin' | 'super_admin';
  permissions: string[];
  nb_utilisateurs: number;
  actif: boolean;
  date_creation: string;
  created_by: string;
  editable: boolean;
}

interface User {
  id: string;
  nom: string;
  email: string;
  roles: string[];
  permissions_directes: string[];
  statut: 'actif' | 'suspendu' | 'inactif';
  derniere_connexion: string;
  date_creation: string;
  service: string;
}

interface PermissionMatrix {
  user_id: string;
  permissions: {
    [module: string]: {
      [permission: string]: {
        granted: boolean;
        source: 'role' | 'direct';
        role_name?: string;
      };
    };
  };
}

const PermissionsPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState<string>('permissions');
  const [selectedModule, setSelectedModule] = useState<string>('tous');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Mock permissions data
  const mockPermissions: Permission[] = [
    {
      id: '1',
      nom: 'Consulter Balance',
      code: 'accounting.balance.read',
      module: 'Comptabilité',
      description: 'Permet de consulter la balance comptable',
      type: 'lecture',
      niveau: 'basic',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    },
    {
      id: '2',
      nom: 'Modifier Écritures',
      code: 'accounting.entries.write',
      module: 'Comptabilité',
      description: 'Permet de créer et modifier les écritures comptables',
      type: 'ecriture',
      niveau: 'advanced',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    },
    {
      id: '3',
      nom: 'Supprimer Écritures',
      code: 'accounting.entries.delete',
      module: 'Comptabilité',
      description: 'Permet de supprimer les écritures comptables',
      type: 'suppression',
      niveau: 'admin',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    },
    {
      id: '4',
      nom: 'Gérer Utilisateurs',
      code: 'security.users.admin',
      module: 'Sécurité',
      description: 'Administration complète des utilisateurs',
      type: 'administration',
      niveau: 'admin',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    },
    {
      id: '5',
      nom: 'Consulter Trésorerie',
      code: 'treasury.dashboard.read',
      module: 'Trésorerie',
      description: 'Accès en lecture au tableau de bord trésorerie',
      type: 'lecture',
      niveau: 'basic',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    },
    {
      id: '6',
      nom: 'Gérer Connexions Bancaires',
      code: 'treasury.banking.admin',
      module: 'Trésorerie',
      description: 'Administration des connexions bancaires',
      type: 'administration',
      niveau: 'admin',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    },
    {
      id: '7',
      nom: 'Consulter Immobilisations',
      code: 'assets.read',
      module: 'Immobilisations',
      description: 'Consultation des immobilisations',
      type: 'lecture',
      niveau: 'basic',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    },
    {
      id: '8',
      nom: 'Gérer Inventaire',
      code: 'assets.inventory.admin',
      module: 'Immobilisations',
      description: 'Gestion complète de l\'inventaire physique',
      type: 'administration',
      niveau: 'advanced',
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système'
    }
  ];

  // Mock roles data
  const mockRoles: Role[] = [
    {
      id: '1',
      nom: 'Comptable',
      description: 'Accès complet aux modules comptables avec restrictions sur les suppressions',
      niveau: 'utilisateur',
      permissions: ['1', '2', '5', '7'],
      nb_utilisateurs: 8,
      actif: true,
      date_creation: '2024-01-10',
      created_by: 'Admin Système',
      editable: true
    },
    {
      id: '2',
      nom: 'Chef Comptable',
      description: 'Supervision comptable avec droits étendus',
      niveau: 'superviseur',
      permissions: ['1', '2', '3', '5', '7', '8'],
      nb_utilisateurs: 2,
      actif: true,
      date_creation: '2024-01-10',
      created_by: 'Admin Système',
      editable: true
    },
    {
      id: '3',
      nom: 'Trésorier',
      description: 'Gestion de la trésorerie et connexions bancaires',
      niveau: 'utilisateur',
      permissions: ['5', '6'],
      nb_utilisateurs: 3,
      actif: true,
      date_creation: '2024-01-10',
      created_by: 'Admin Système',
      editable: true
    },
    {
      id: '4',
      nom: 'Administrateur Système',
      description: 'Accès complet à tous les modules et fonctions administratives',
      niveau: 'super_admin',
      permissions: ['1', '2', '3', '4', '5', '6', '7', '8'],
      nb_utilisateurs: 1,
      actif: true,
      date_creation: '2024-01-01',
      created_by: 'Système',
      editable: false
    },
    {
      id: '5',
      nom: 'Consultant',
      description: 'Accès en lecture seule pour les consultants externes',
      niveau: 'utilisateur',
      permissions: ['1', '5', '7'],
      nb_utilisateurs: 5,
      actif: true,
      date_creation: '2024-01-15',
      created_by: 'Admin Système',
      editable: true
    }
  ];

  // Mock users data
  const mockUsers: User[] = [
    {
      id: '1',
      nom: 'Marie KOUASSI',
      email: 'marie.kouassi@wisebook.ci',
      roles: ['2'],
      permissions_directes: [],
      statut: 'actif',
      derniere_connexion: '2024-02-01T08:30:00Z',
      date_creation: '2024-01-10',
      service: 'Comptabilité'
    },
    {
      id: '2',
      nom: 'Jean-Baptiste KONE',
      email: 'jb.kone@wisebook.ci',
      roles: ['1'],
      permissions_directes: ['8'],
      statut: 'actif',
      derniere_connexion: '2024-01-31T17:45:00Z',
      date_creation: '2024-01-12',
      service: 'Comptabilité'
    },
    {
      id: '3',
      nom: 'Fatou TRAORE',
      email: 'fatou.traore@wisebook.ci',
      roles: ['3'],
      permissions_directes: [],
      statut: 'actif',
      derniere_connexion: '2024-02-01T10:15:00Z',
      date_creation: '2024-01-20',
      service: 'Trésorerie'
    },
    {
      id: '4',
      nom: 'Admin Système',
      email: 'admin@wisebook.ci',
      roles: ['4'],
      permissions_directes: [],
      statut: 'actif',
      derniere_connexion: '2024-02-01T07:00:00Z',
      date_creation: '2024-01-01',
      service: 'IT'
    },
    {
      id: '5',
      nom: 'Ibrahim SANOGO',
      email: 'ibrahim.sanogo@consultant.ci',
      roles: ['5'],
      permissions_directes: [],
      statut: 'suspendu',
      derniere_connexion: '2024-01-28T14:20:00Z',
      date_creation: '2024-01-25',
      service: 'Externe'
    }
  ];

  const { data: permissions = mockPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions', selectedModule],
    queryFn: () => Promise.resolve(mockPermissions.filter(p => 
      selectedModule === 'tous' || p.module === selectedModule
    )),
  });

  const { data: roles = mockRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => Promise.resolve(mockRoles),
  });

  const { data: users = mockUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => Promise.resolve(mockUsers),
  });

  const getPermissionTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'text-blue-600 bg-blue-100';
      case 'ecriture':
        return 'text-green-600 bg-green-100';
      case 'suppression':
        return 'text-red-600 bg-red-100';
      case 'administration':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPermissionTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <Eye className="h-4 w-4" />;
      case 'ecriture':
        return <Edit className="h-4 w-4" />;
      case 'suppression':
        return <XCircle className="h-4 w-4" />;
      case 'administration':
        return <Shield className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  const getRoleNiveauColor = (niveau: string) => {
    switch (niveau) {
      case 'utilisateur':
        return 'text-green-600 bg-green-100';
      case 'superviseur':
        return 'text-blue-600 bg-blue-100';
      case 'admin':
        return 'text-purple-600 bg-purple-100';
      case 'super_admin':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUserStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif':
        return 'text-green-600 bg-green-100';
      case 'suspendu':
        return 'text-orange-600 bg-orange-100';
      case 'inactif':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUserStatusIcon = (statut: string) => {
    switch (statut) {
      case 'actif':
        return <CheckCircle className="h-4 w-4" />;
      case 'suspendu':
        return <AlertTriangle className="h-4 w-4" />;
      case 'inactif':
        return <XCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const handleTogglePermission = (permissionId: string, roleId: string) => {
    toast.success('Permission mise à jour avec succès!');
  };

  const handleCopyRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      toast.success(`Rôle "${role.nom}" copié avec succès!`);
    }
  };

  const handleResetUserPermissions = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      toast.success(`Permissions de "${user.nom}" réinitialisées!`);
    }
  };

  const getModules = () => {
    return [...new Set(permissions.map(p => p.module))];
  };

  const getUserPermissions = (user: User) => {
    const userPermissions = new Set<string>();
    
    // Add role permissions
    user.roles.forEach(roleId => {
      const role = roles.find(r => r.id === roleId);
      if (role) {
        role.permissions.forEach(permId => userPermissions.add(permId));
      }
    });
    
    // Add direct permissions
    user.permissions_directes.forEach(permId => userPermissions.add(permId));
    
    return Array.from(userPermissions);
  };

  const totalPermissions = permissions.length;
  const activeRoles = roles.filter(r => r.actif).length;
  const activeUsers = users.filter(u => u.statut === 'actif').length;
  const adminUsers = users.filter(u => u.roles.some(roleId => {
    const role = roles.find(r => r.id === roleId);
    return role?.niveau === 'admin' || role?.niveau === 'super_admin';
  })).length;

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
              <Key className="mr-3 h-7 w-7 text-blue-600" />
              Gestion des Permissions
            </h1>
            <p className="mt-2 text-gray-600">
              Administration des droits d'accès, rôles et permissions des utilisateurs
            </p>
          </div>
          <div className="flex space-x-3">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Rôle
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter Matrice
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
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Permissions</p>
                  <p className="text-2xl font-bold text-blue-700">{totalPermissions}</p>
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
                <div className="p-2 bg-purple-100 rounded-full">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Rôles Actifs</p>
                  <p className="text-2xl font-bold text-purple-700">{activeRoles}</p>
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
                <div className="p-2 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilisateurs Actifs</p>
                  <p className="text-2xl font-bold text-green-700">{activeUsers}</p>
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
                <div className="p-2 bg-red-100 rounded-full">
                  <UserCheck className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Administrateurs</p>
                  <p className="text-2xl font-bold text-red-700">{adminUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module
                </label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les modules</SelectItem>
                    {getModules().map(module => (
                      <SelectItem key={module} value={module}>{module}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche Permission
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                  <Input 
                    placeholder="Nom ou code permission..." 
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche Utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                  <Input 
                    placeholder="Nom ou email..." 
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres Avancés
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Tabs defaultValue="permissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="roles">Rôles</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="matrix">Matrice des Droits</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Catalogue des Permissions</span>
                  <Badge variant="outline">
                    {permissions.length} permission(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des permissions..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permission</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Niveau</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Créé par</TableHead>
                          <TableHead>{t('common.date')}</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissions.map((permission) => (
                          <TableRow key={permission.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{permission.nom}</p>
                                <p className="text-sm text-gray-700 font-mono">{permission.code}</p>
                                <p className="text-xs text-gray-700">{permission.description}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{permission.module}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionTypeColor(permission.type)}`}>
                                {getPermissionTypeIcon(permission.type)}
                                <span className="ml-1 capitalize">{permission.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={permission.niveau === 'admin' ? 'destructive' : 'outline'}>
                                {permission.niveau}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {permission.actif ? (
                                <div className="inline-flex items-center text-green-600">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Actif
                                </div>
                              ) : (
                                <div className="inline-flex items-center text-red-600">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Inactif
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">{permission.created_by}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {formatDate(permission.date_creation)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center space-x-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
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

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Gestion des Rôles</span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Rôle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {roles.map((role) => (
                    <div key={role.id} className="border rounded-lg p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-full">
                            <Shield className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{role.nom}</h3>
                            <p className="text-sm text-gray-600">{role.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={getRoleNiveauColor(role.niveau)}>
                            {role.niveau.replace('_', ' ')}
                          </Badge>
                          {role.actif ? (
                            <Badge className="bg-green-100 text-green-800">Actif</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Inactif</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-600">Permissions</p>
                          <p className="font-semibold text-blue-700">{role.permissions.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Utilisateurs</p>
                          <p className="font-semibold text-purple-700">{role.nb_utilisateurs}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Créé par</p>
                          <p className="font-medium">{role.created_by}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Date création</p>
                          <p className="font-medium">{formatDate(role.date_creation)}</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Modules autorisés:</p>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(role.permissions.map(permId => {
                            const perm = permissions.find(p => p.id === permId);
                            return perm?.module;
                          }).filter(Boolean))].map((module, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {module}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-4 border-t">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCopyRole(role.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Dupliquer
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRole(role.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {role.editable && (
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rôles</TableHead>
                        <TableHead>Permissions Directes</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Dernière Connexion</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const userPermissionsCount = getUserPermissions(user).length;
                        return (
                          <TableRow key={user.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gray-100 rounded-full">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{user.nom}</p>
                                  <p className="text-sm text-gray-700">{user.email}</p>
                                  <p className="text-xs text-gray-700">{user.service}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map(roleId => {
                                  const role = roles.find(r => r.id === roleId);
                                  return role ? (
                                    <Badge key={roleId} className={getRoleNiveauColor(role.niveau)}>
                                      {role.nom}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {user.permissions_directes.length} directe(s)
                              </Badge>
                              <p className="text-xs text-gray-700 mt-1">
                                {userPermissionsCount} total
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUserStatusColor(user.statut)}`}>
                                {getUserStatusIcon(user.statut)}
                                <span className="ml-1 capitalize">{user.statut}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {formatDate(user.derniere_connexion)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedUser(user.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleResetUserPermissions(user.id)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Matrice des Droits</span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Exporter Excel
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Importer
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Utilisateur
                      </label>
                      <Select value={selectedUser || ''} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.nom} - {user.service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rôle
                      </label>
                      <Select value={selectedRole || ''} onValueChange={setSelectedRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.nom} - {role.niveau}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {(selectedUser || selectedRole) ? (
                  <div className="space-y-6">
                    {getModules().map(module => {
                      const modulePermissions = permissions.filter(p => p.module === module);
                      const entity = selectedUser ? users.find(u => u.id === selectedUser) : roles.find(r => r.id === selectedRole);
                      
                      return (
                        <div key={module} className="border rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Shield className="mr-2 h-5 w-5 text-blue-600" />
                            {module}
                          </h3>
                          <div className="grid gap-2">
                            {modulePermissions.map(permission => {
                              const hasPermission = selectedUser 
                                ? getUserPermissions(users.find(u => u.id === selectedUser)!).includes(permission.id)
                                : roles.find(r => r.id === selectedRole)?.permissions.includes(permission.id);
                              
                              return (
                                <div key={permission.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                  <div className="flex items-center space-x-3">
                                    <div className={`p-1 rounded ${getPermissionTypeColor(permission.type)}`}>
                                      {getPermissionTypeIcon(permission.type)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{permission.nom}</p>
                                      <p className="text-sm text-gray-700">{permission.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <Badge className={getPermissionTypeColor(permission.type)}>
                                      {permission.type}
                                    </Badge>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={hasPermission || false}
                                        onCheckedChange={() => selectedRole && handleTogglePermission(permission.id, selectedRole)}
                                        disabled={selectedUser && !selectedRole}
                                      />
                                      {hasPermission ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-400" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Key className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Matrice des Permissions</h3>
                    <p className="text-gray-700 mb-6">
                      Sélectionnez un utilisateur ou un rôle pour voir la matrice des permissions détaillée.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default PermissionsPage;