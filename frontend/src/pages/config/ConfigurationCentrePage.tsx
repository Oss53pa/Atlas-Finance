import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Database,
  Globe,
  FileText,
  CreditCard,
  Gauge,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Plus,
  Edit,
  BarChart3,
  Zap,
  Lock,
  RefreshCw,
  Eye,
  Brain,
  Cpu,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  LoadingSpinner,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ConfigurationModule {
  id: string;
  name: string;
  category: 'company' | 'accounting' | 'security' | 'integration' | 'system';
  description: string;
  icon: React.ComponentType<any>;
  status: 'configured' | 'partial' | 'not_configured';
  priority: 'high' | 'medium' | 'low';
  lastUpdated?: string;
  path: string;
  completionPercentage: number;
  dependencies?: string[];
}

interface SystemStatus {
  id: string;
  component: string;
  status: 'operational' | 'warning' | 'error';
  message: string;
  lastChecked: string;
}

const ConfigurationCentrePage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mock data for configuration modules
  const mockModules: ConfigurationModule[] = [
    {
      id: '1',
      name: 'Informations Société',
      category: 'company',
      description: 'Configuration des données de base de l\'entreprise',
      icon: Building2,
      status: 'configured',
      priority: 'high',
      lastUpdated: '2024-01-15',
      path: '/config/company-info',
      completionPercentage: 100
    },
    {
      id: '2',
      name: 'Plan Comptable SYSCOHADA',
      category: 'accounting',
      description: 'Configuration du plan comptable selon les normes SYSCOHADA',
      icon: FileText,
      status: 'configured',
      priority: 'high',
      lastUpdated: '2024-01-10',
      path: '/config/syscohada-plan',
      completionPercentage: 95,
      dependencies: ['1']
    },
    {
      id: '3',
      name: 'TVA et Taxes',
      category: 'accounting',
      description: 'Configuration des taux de TVA et autres taxes',
      icon: CreditCard,
      status: 'partial',
      priority: 'high',
      lastUpdated: '2024-01-08',
      path: '/config/vat-taxes',
      completionPercentage: 60
    },
    {
      id: '4',
      name: 'Axes Analytiques',
      category: 'accounting',
      description: 'Configuration des axes d\'analyse comptable',
      icon: BarChart3,
      status: 'not_configured',
      priority: 'medium',
      path: '/config/analytical-axes',
      completionPercentage: 0
    },
    {
      id: '5',
      name: 'Gestion Multi-Sociétés',
      category: 'company',
      description: 'Configuration pour la gestion de plusieurs entités',
      icon: Globe,
      status: 'partial',
      priority: 'medium',
      lastUpdated: '2024-01-05',
      path: '/config/multi-company',
      completionPercentage: 40
    },
    {
      id: '6',
      name: 'Profils de Sécurité',
      category: 'security',
      description: 'Configuration des profils utilisateurs et permissions',
      icon: Shield,
      status: 'configured',
      priority: 'high',
      lastUpdated: '2024-01-12',
      path: '/config/security-profiles',
      completionPercentage: 85
    },
    {
      id: '7',
      name: 'Codification Tiers',
      category: 'company',
      description: 'Configuration du système de codification des tiers',
      icon: Users,
      status: 'partial',
      priority: 'medium',
      lastUpdated: '2024-01-06',
      path: '/config/third-party-coding',
      completionPercentage: 70
    },
    {
      id: '8',
      name: 'Import/Export',
      category: 'integration',
      description: 'Configuration des modules d\'importation et exportation',
      icon: Database,
      status: 'not_configured',
      priority: 'low',
      path: '/config/import-export',
      completionPercentage: 0
    }
  ];

  // Mock data for system status
  const mockSystemStatus: SystemStatus[] = [
    {
      id: '1',
      component: 'Base de Données',
      status: 'operational',
      message: 'Fonctionnement normal',
      lastChecked: '2024-01-31T10:30:00'
    },
    {
      id: '2',
      component: 'Services Web',
      status: 'operational',
      message: 'Tous les services actifs',
      lastChecked: '2024-01-31T10:29:00'
    },
    {
      id: '3',
      component: 'Sauvegardes',
      status: 'warning',
      message: 'Dernière sauvegarde il y a 2 jours',
      lastChecked: '2024-01-29T02:00:00'
    },
    {
      id: '4',
      component: 'Sécurité',
      status: 'operational',
      message: 'Système sécurisé',
      lastChecked: '2024-01-31T10:25:00'
    }
  ];

  const { data: modules = mockModules, isLoading } = useQuery({
    queryKey: ['configuration-modules'],
    queryFn: () => Promise.resolve(mockModules),
  });

  const { data: systemStatus = mockSystemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => Promise.resolve(mockSystemStatus),
  });

  // Filter modules based on search and filters
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || module.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'text-green-600 bg-green-100';
      case 'partial':
        return 'text-orange-600 bg-orange-100';
      case 'not_configured':
        return 'text-red-600 bg-red-100';
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-orange-600 bg-orange-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
      case 'operational':
        return <CheckCircle className="h-4 w-4" />;
      case 'partial':
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'not_configured':
      case 'error':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-orange-600 bg-orange-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'company':
        return Building2;
      case 'accounting':
        return FileText;
      case 'security':
        return Shield;
      case 'integration':
        return Database;
      case 'system':
        return Settings;
      default:
        return Settings;
    }
  };

  const handleModuleClick = (modulePath: string) => {
    toast.success(`Navigation vers ${modulePath}`);
  };

  const handleSystemCheck = () => {
    toast.success('Vérification système en cours...');
  };

  // Calculate overall completion
  const overallCompletion = Math.round(
    modules.reduce((sum, module) => sum + module.completionPercentage, 0) / modules.length
  );

  const configuredCount = modules.filter(m => m.status === 'configured').length;
  const partialCount = modules.filter(m => m.status === 'partial').length;
  const notConfiguredCount = modules.filter(m => m.status === 'not_configured').length;

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
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <Settings className="mr-3 h-7 w-7 text-blue-600" />
              Centre de Configuration
            </h1>
            <p className="mt-2 text-gray-600">
              Gérez tous les paramètres et configurations de votre système Atlas Finance
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleSystemCheck}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Vérifier Système
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Assistant Configuration
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Overview Cards */}
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
                  <Gauge className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Configuration Globale</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-bold text-blue-700">{overallCompletion}%</p>
                    <Progress value={overallCompletion} className="w-16 h-2" />
                  </div>
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
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Modules Configurés</p>
                  <p className="text-lg font-bold text-green-700">
                    {configuredCount}/{modules.length}
                  </p>
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
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Partiellement Configurés</p>
                  <p className="text-lg font-bold text-orange-700">{partialCount}</p>
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
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Non Configurés</p>
                  <p className="text-lg font-bold text-red-700">{notConfiguredCount}</p>
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
        <Tabs defaultValue="modules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="modules">Modules de Configuration</TabsTrigger>
            <TabsTrigger value="system">État du Système</TabsTrigger>
            <TabsTrigger value="ai-algorithms">Algorithme IA</TabsTrigger>
            <TabsTrigger value="quick-setup">Configuration Rapide</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                    <Input
                      placeholder="Rechercher un module..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">Toutes les catégories</option>
                      <option value="company">Entreprise</option>
                      <option value="accounting">{t('accounting.title')}</option>
                      <option value="security">Sécurité</option>
                      <option value="integration">Intégration</option>
                      <option value="system">Système</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="configured">Configuré</option>
                      <option value="partial">Partiel</option>
                      <option value="not_configured">Non configuré</option>
                    </select>
                  </div>

                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres Avancés
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Modules Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full flex justify-center py-8">
                  <LoadingSpinner size="lg" text="Chargement des modules..." />
                </div>
              ) : (
                filteredModules.map((module) => {
                  const IconComponent = module.icon;
                  return (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      className="cursor-pointer"
                      onClick={() => handleModuleClick(module.path)}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <IconComponent className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{module.name}</CardTitle>
                                <Badge variant="outline" className="mt-1">
                                  {module.category}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(module.status)}`}>
                                {getStatusIcon(module.status)}
                                <span className="ml-1 capitalize">{module.status.replace('_', ' ')}</span>
                              </div>
                              <Badge variant="outline" className={getPriorityColor(module.priority)}>
                                {module.priority}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 text-sm mb-4">{module.description}</p>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-gray-700">Progression</span>
                                <span className="text-xs font-medium text-gray-700">
                                  {module.completionPercentage}%
                                </span>
                              </div>
                              <Progress value={module.completionPercentage} className="h-2" />
                            </div>

                            {module.lastUpdated && (
                              <p className="text-xs text-gray-700">
                                Dernière mise à jour: {formatDate(module.lastUpdated)}
                              </p>
                            )}

                            {module.dependencies && module.dependencies.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-1">Dépendances:</p>
                                <div className="flex flex-wrap gap-1">
                                  {module.dependencies.map((dep, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      Module #{dep}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info(`Aperçu de ${module.name}`);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Aperçu
                            </Button>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Edit className="mr-2 h-4 w-4" />
                              Configurer
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>État du Système</span>
                  <Button
                    size="sm"
                    onClick={handleSystemCheck}
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualiser
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemStatus.map((status) => (
                    <div key={status.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
                          {getStatusIcon(status.status)}
                          <span className="ml-2 capitalize">{status.status}</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{status.component}</h4>
                          <p className="text-sm text-gray-600">{status.message}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-700">
                          Vérifié: {formatDate(status.lastChecked)}
                        </p>
                        <Button size="sm" variant="ghost">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-algorithms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Brain className="mr-2 h-6 w-6 text-purple-600" />
                    <span>Configuration des Algorithmes IA</span>
                  </div>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Modèle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Statistiques globales IA */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-700">Modèles Actifs</p>
                          <p className="text-lg font-bold text-purple-900">4/6</p>
                        </div>
                        <Cpu className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Précision Moyenne</p>
                          <p className="text-lg font-bold text-green-900">92.4%</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Prédictions/Jour</p>
                          <p className="text-lg font-bold text-blue-900">1,247</p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Liste des modèles IA */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Modèles IA Disponibles</h3>

                    {/* Modèle 1: Prédiction Trésorerie */}
                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Prédiction de Trésorerie</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Analyse prédictive des flux de trésorerie basée sur l'historique et les tendances
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Précision:</span>
                                <Badge className="bg-green-100 text-green-800">94.2%</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Statut:</span>
                                <Badge className="bg-green-100 text-green-800">Actif</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Dernière formation:</span>
                                <span className="text-xs text-gray-600">Il y a 2 jours</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Modèle 2: Détection Anomalies */}
                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Détection d'Anomalies</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Identification automatique des transactions et écritures inhabituelles
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Précision:</span>
                                <Badge className="bg-green-100 text-green-800">89.7%</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Statut:</span>
                                <Badge className="bg-green-100 text-green-800">Actif</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Alertes aujourd'hui:</span>
                                <Badge className="bg-orange-100 text-orange-800">3</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Modèle 3: Recommandations Comptables */}
                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Brain className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Recommandations Comptables</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Suggestions intelligentes de comptes et d'écritures basées sur le contexte
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Précision:</span>
                                <Badge className="bg-green-100 text-green-800">96.1%</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Statut:</span>
                                <Badge className="bg-green-100 text-green-800">Actif</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Suggestions utilisées:</span>
                                <span className="text-xs text-gray-600">87%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Modèle 4: Analyse Risques */}
                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Shield className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Analyse de Risques Clients</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Évaluation du risque de défaut de paiement des clients
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Précision:</span>
                                <Badge className="bg-green-100 text-green-800">91.3%</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Statut:</span>
                                <Badge className="bg-green-100 text-green-800">Actif</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Clients à risque:</span>
                                <Badge className="bg-red-100 text-red-800">12</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Modèle 5: Optimisation Budget (Désactivé) */}
                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-200 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">Optimisation Budgétaire</h4>
                            <p className="text-sm text-gray-700 mt-1">
                              Suggestions d'optimisation des dépenses et allocations budgétaires
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Statut:</span>
                                <Badge className="bg-gray-200 text-gray-600">Inactif</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">En formation</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Modèle 6: Prévision Ventes (Désactivé) */}
                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-200 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700">Prévision des Ventes</h4>
                            <p className="text-sm text-gray-700 mt-1">
                              Prédiction des ventes futures basée sur l'historique et la saisonnalité
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Statut:</span>
                                <Badge className="bg-gray-200 text-gray-600">Inactif</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Données insuffisantes</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions globales */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      <p>Les modèles IA apprennent continuellement de vos données pour améliorer leur précision.</p>
                      <p className="mt-1">Dernière mise à jour automatique: il y a 3 heures</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Réentraîner Tous
                      </Button>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Eye className="mr-2 h-4 w-4" />
                        Rapport de Performance
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick-setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5" />
                  Configuration Rapide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Assistant de Configuration</h3>
                  <p className="text-gray-700 mb-6">
                    Configurez rapidement votre système avec notre assistant pas-à-pas
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Zap className="mr-2 h-4 w-4" />
                    Démarrer l'Assistant
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ConfigurationCentrePage;