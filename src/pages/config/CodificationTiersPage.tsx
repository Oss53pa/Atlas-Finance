import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
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
  Hash,
  Tag,
  Building2,
  UserCheck,
  Globe,
  Calculator,
  BarChart3,
  Target,
  Zap,
  Save,
  RefreshCw,
  Code,
  List
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

interface CodingRule {
  id: string;
  name: string;
  description: string;
  type: 'client' | 'fournisseur' | 'employe' | 'autre';
  pattern: string;
  format: string;
  auto_generate: boolean;
  prefix: string;
  suffix: string;
  length: number;
  counter_start: number;
  counter_current: number;
  status: 'active' | 'inactive';
  priority: number;
  conditions: string[];
  created_date: string;
  usage_count: number;
}

interface CodingCategory {
  id: string;
  code: string;
  libelle: string;
  type: 'client' | 'fournisseur' | 'employe' | 'autre';
  parent_id?: string;
  level: number;
  coding_rule_id?: string;
  description: string;
  status: 'active' | 'inactive';
  created_date: string;
  account_prefix?: string;
  usage_count: number;
}

interface ThirdPartyExample {
  id: string;
  name: string;
  type: 'client' | 'fournisseur' | 'employe' | 'autre';
  generated_code: string;
  category: string;
  account_number: string;
  status: 'active' | 'inactive';
  created_date: string;
}

const CodificationTiersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [activeTab, setActiveTab] = useState('rules');

  // Mock data for coding rules
  const mockCodingRules: CodingRule[] = [
    {
      id: '1',
      name: 'Codification Clients Standard',
      description: 'Règle de codification automatique pour les clients',
      type: 'client',
      pattern: 'CLI{YYYY}{MM}{NNN}',
      format: 'CLI + Année + Mois + Compteur 3 chiffres',
      auto_generate: true,
      prefix: 'CLI',
      suffix: '',
      length: 10,
      counter_start: 1,
      counter_current: 125,
      status: 'active',
      priority: 1,
      conditions: ['Client Régulier', 'Chiffre d\'affaires > 0'],
      created_date: '2024-01-01',
      usage_count: 124
    },
    {
      id: '2',
      name: 'Codification Fournisseurs',
      description: 'Règle de codification pour les fournisseurs par secteur',
      type: 'fournisseur',
      pattern: 'FRS{SECT}{NNNN}',
      format: 'FRS + Code Secteur + Compteur 4 chiffres',
      auto_generate: true,
      prefix: 'FRS',
      suffix: '',
      length: 9,
      counter_start: 1,
      counter_current: 89,
      status: 'active',
      priority: 1,
      conditions: ['Fournisseur Agréé'],
      created_date: '2024-01-01',
      usage_count: 88
    },
    {
      id: '3',
      name: 'Codification Employés',
      description: 'Numérotation des employés par département',
      type: 'employe',
      pattern: 'EMP{DEPT}{NNN}',
      format: 'EMP + Code Département + Compteur 3 chiffres',
      auto_generate: true,
      prefix: 'EMP',
      suffix: '',
      length: 8,
      counter_start: 1,
      counter_current: 45,
      status: 'active',
      priority: 1,
      conditions: ['Employé Permanent'],
      created_date: '2024-01-01',
      usage_count: 44
    },
    {
      id: '4',
      name: 'Clients VIP',
      description: 'Codification spéciale pour les clients VIP',
      type: 'client',
      pattern: 'VIP{NNN}',
      format: 'VIP + Compteur 3 chiffres',
      auto_generate: false,
      prefix: 'VIP',
      suffix: '',
      length: 6,
      counter_start: 1,
      counter_current: 15,
      status: 'active',
      priority: 0,
      conditions: ['Chiffre d\'affaires > 100M', 'Client depuis > 2 ans'],
      created_date: '2024-01-15',
      usage_count: 14
    }
  ];

  // Mock data for coding categories
  const mockCodingCategories: CodingCategory[] = [
    {
      id: '1',
      code: 'CLI_REG',
      libelle: 'Clients Réguliers',
      type: 'client',
      level: 1,
      coding_rule_id: '1',
      description: 'Clients avec transactions régulières',
      status: 'active',
      created_date: '2024-01-01',
      account_prefix: '411',
      usage_count: 95
    },
    {
      id: '2',
      code: 'CLI_VIP',
      libelle: 'Clients VIP',
      type: 'client',
      level: 1,
      coding_rule_id: '4',
      description: 'Clients à forte valeur',
      status: 'active',
      created_date: '2024-01-01',
      account_prefix: '4111',
      usage_count: 14
    },
    {
      id: '3',
      code: 'FRS_SECT_A',
      libelle: 'Fournisseurs Secteur A',
      type: 'fournisseur',
      level: 1,
      coding_rule_id: '2',
      description: 'Fournisseurs secteur primaire',
      status: 'active',
      created_date: '2024-01-01',
      account_prefix: '401',
      usage_count: 34
    },
    {
      id: '4',
      code: 'EMP_ADM',
      libelle: 'Employés Administration',
      type: 'employe',
      level: 1,
      coding_rule_id: '3',
      description: 'Personnel administratif',
      status: 'active',
      created_date: '2024-01-01',
      account_prefix: '421',
      usage_count: 18
    }
  ];

  // Mock data for third party examples
  const mockExamples: ThirdPartyExample[] = [
    {
      id: '1',
      name: 'SOGECOM SARL',
      type: 'client',
      generated_code: 'CLI2024001',
      category: 'CLI_REG',
      account_number: '4110001',
      status: 'active',
      created_date: '2024-01-15'
    },
    {
      id: '2',
      name: 'ETABLISSEMENT KONE',
      type: 'client',
      generated_code: 'VIP001',
      category: 'CLI_VIP',
      account_number: '4111001',
      status: 'active',
      created_date: '2024-01-20'
    },
    {
      id: '3',
      name: 'AFRILAND DISTRIBUTION',
      type: 'fournisseur',
      generated_code: 'FRSA001',
      category: 'FRS_SECT_A',
      account_number: '4010001',
      status: 'active',
      created_date: '2024-01-18'
    }
  ];

  const { data: codingRules = mockCodingRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['coding-rules', searchTerm, selectedType, selectedStatus],
    queryFn: () => Promise.resolve(mockCodingRules),
  });

  const { data: categories = mockCodingCategories } = useQuery({
    queryKey: ['coding-categories'],
    queryFn: () => Promise.resolve(mockCodingCategories),
  });

  const { data: examples = mockExamples } = useQuery({
    queryKey: ['third-party-examples'],
    queryFn: () => Promise.resolve(mockExamples),
  });

  // Filter coding rules
  const filteredRules = codingRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || rule.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || rule.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'inactive':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'text-blue-600 bg-blue-100';
      case 'fournisseur':
        return 'text-purple-600 bg-purple-100';
      case 'employe':
        return 'text-green-600 bg-green-100';
      case 'autre':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <UserCheck className="h-4 w-4" />;
      case 'fournisseur':
        return <Building2 className="h-4 w-4" />;
      case 'employe':
        return <Users className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const handleCreateRule = () => {
    toast.success('Création d\'une nouvelle règle de codification...');
  };

  const handleEditRule = (ruleId: string) => {
    toast.info(`Édition de la règle ${ruleId}`);
  };

  const handleDeleteRule = (ruleId: string) => {
    toast.error(`Suppression de la règle ${ruleId}`);
  };

  const handleTestRule = (ruleId: string) => {
    toast.success(`Test de la règle ${ruleId} en cours...`);
  };

  const handleGenerateCode = () => {
    toast.success('Génération d\'un code de test...');
  };

  const activeRules = codingRules.filter(r => r.status === 'active').length;
  const totalUsage = codingRules.reduce((sum, rule) => sum + rule.usage_count, 0);
  const autoRules = codingRules.filter(r => r.auto_generate).length;

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
              <Hash className="mr-3 h-7 w-7 text-blue-600" />
              Codification des Tiers
            </h1>
            <p className="mt-2 text-gray-600">
              Configuration des règles de codification automatique pour les tiers
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleGenerateCode}
              variant="outline"
            >
              <Code className="mr-2 h-4 w-4" />
              Tester Génération
            </Button>
            <Button
              onClick={handleCreateRule}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Règle
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
                  <Hash className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Règles Actives</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {activeRules}/{codingRules.length}
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
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Génération Auto</p>
                  <p className="text-2xl font-bold text-green-700">{autoRules}</p>
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
                  <Calculator className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Codes Générés</p>
                  <p className="text-2xl font-bold text-purple-700">{totalUsage}</p>
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
                  <List className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Catégories</p>
                  <p className="text-2xl font-bold text-orange-700">{categories.length}</p>
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
            <TabsTrigger value="rules">Règles de Codification</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="examples">Exemples Générés</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher une règle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="client">Clients</SelectItem>
                      <SelectItem value="fournisseur">Fournisseurs</SelectItem>
                      <SelectItem value="employe">Employés</SelectItem>
                      <SelectItem value="autre">Autres</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
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

            {/* Rules Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Règles de Codification ({filteredRules.length})</span>
                  <Badge variant="outline">
                    Génération Automatique
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des règles..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom/Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Compteur</TableHead>
                          <TableHead>Configuration</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Utilisation</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRules.map((rule) => (
                          <TableRow key={rule.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {getTypeIcon(rule.type)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{rule.name}</p>
                                  <p className="text-sm text-gray-500">{rule.description}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(rule.type)}`}>
                                {getTypeIcon(rule.type)}
                                <span className="ml-1 capitalize">{rule.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Badge variant="outline" className="font-mono mb-1">
                                  {rule.pattern}
                                </Badge>
                                <p className="text-xs text-gray-500">{rule.format}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">Actuel: {rule.counter_current}</p>
                                <p className="text-gray-500">Longueur: {rule.length}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={rule.auto_generate ? 'default' : 'outline'} className="text-xs">
                                    {rule.auto_generate ? 'Auto' : 'Manuel'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    P{rule.priority}
                                  </Badge>
                                </div>
                                {rule.prefix && (
                                  <div className="text-xs text-gray-500">
                                    Préfixe: {rule.prefix}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rule.status)}`}>
                                {getStatusIcon(rule.status)}
                                <span className="ml-1 capitalize">{rule.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium text-gray-700">{rule.usage_count} codes</p>
                                <Progress value={(rule.usage_count / totalUsage) * 100} className="w-16 h-2 mt-1" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTestRule(rule.id)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Zap className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRule(rule.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
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

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Catégories de Tiers</span>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Catégorie
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            {getTypeIcon(category.type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{category.libelle}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="font-mono">
                                {category.code}
                              </Badge>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(category.type)}`}>
                                {category.type}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(category.status)}`}>
                            {getStatusIcon(category.status)}
                            <span className="ml-1 capitalize">{category.status}</span>
                          </div>
                          <Badge variant="outline">
                            {category.usage_count} utilisations
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Description</label>
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Préfixe Compte</label>
                          <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                            {category.account_prefix}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Règle Associée</label>
                          <p className="text-sm text-gray-600 mt-1">
                            {category.coding_rule_id ? `Règle #${category.coding_rule_id}` : 'Aucune'}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exemples de Codes Générés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom du Tiers</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Code Généré</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Compte Associé</TableHead>
                        <TableHead>Date Création</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examples.map((example) => (
                        <TableRow key={example.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(example.type)}
                              <span className="font-medium">{example.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(example.type)}`}>
                              {example.type}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-blue-600">
                              {example.generated_code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {example.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {example.account_number}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {formatDate(example.created_date)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(example.status)}`}>
                              {getStatusIcon(example.status)}
                              <span className="ml-1">{example.status}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de Codification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Génération Automatique</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Génération automatique activée</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Vérification d'unicité des codes</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="form-checkbox" />
                        <span className="text-sm text-gray-700">Permettre la modification manuelle des codes générés</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Format des Codes</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Séparateur par défaut
                        </label>
                        <Select defaultValue="">
                          <SelectTrigger>
                            <SelectValue placeholder="Aucun" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Aucun</SelectItem>
                            <SelectItem value="-">Tiret (-)</SelectItem>
                            <SelectItem value="_">Underscore (_)</SelectItem>
                            <SelectItem value=".">Point (.)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Casse par défaut
                        </label>
                        <Select defaultValue="upper">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upper">MAJUSCULES</SelectItem>
                            <SelectItem value="lower">minuscules</SelectItem>
                            <SelectItem value="mixed">Mixte</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Compteurs</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Reset automatique des compteurs en début d'année</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="form-checkbox" />
                        <span className="text-sm text-gray-700">Compteur global partagé entre toutes les règles</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline">
                      Annuler
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Save className="mr-2 h-4 w-4" />
                      Sauvegarder
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

export default CodificationTiersPage;