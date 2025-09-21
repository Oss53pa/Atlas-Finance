import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
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
  Target,
  TrendingUp,
  Building2,
  MapPin,
  Calendar,
  Users,
  Package,
  DollarSign,
  Activity,
  Layers,
  GitBranch,
  Save,
  RefreshCw,
  Zap,
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
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface AnalyticalAxis {
  id: string;
  code: string;
  libelle: string;
  description: string;
  type: 'centre_cout' | 'centre_profit' | 'centre_investissement' | 'activite' | 'projet' | 'geographique' | 'produit' | 'custom';
  niveau: number;
  parent_id?: string;
  is_active: boolean;
  is_mandatory: boolean;
  obligatoire_saisie: boolean;
  account_mask: string;
  created_date: string;
  last_activity: string;
  transactions_count: number;
  total_amount: number;
  children_count: number;
}

interface AnalyticalDimension {
  id: string;
  name: string;
  description: string;
  code: string;
  axes_count: number;
  is_active: boolean;
  priority: number;
  auto_allocation: boolean;
  allocation_rules: string[];
  created_date: string;
}

interface AllocationRule {
  id: string;
  name: string;
  description: string;
  source_axis: string;
  target_axes: string[];
  allocation_method: 'equal' | 'percentage' | 'amount' | 'formula';
  allocation_data: any;
  conditions: string[];
  is_active: boolean;
  auto_apply: boolean;
  created_date: string;
}

const AxesAnalytiquesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Mock data for analytical axes
  const mockAxes: AnalyticalAxis[] = [
    {
      id: '1',
      code: 'CC001',
      libelle: 'Direction Générale',
      description: 'Centre de coût direction générale',
      type: 'centre_cout',
      niveau: 1,
      is_active: true,
      is_mandatory: true,
      obligatoire_saisie: true,
      account_mask: '6*',
      created_date: '2024-01-01',
      last_activity: '2024-01-30',
      transactions_count: 256,
      total_amount: 125000000,
      children_count: 3
    },
    {
      id: '2',
      code: 'CC002',
      libelle: 'Direction Commerciale',
      description: 'Centre de coût commercial et marketing',
      type: 'centre_cout',
      niveau: 1,
      is_active: true,
      is_mandatory: true,
      obligatoire_saisie: true,
      account_mask: '6*',
      created_date: '2024-01-01',
      last_activity: '2024-01-29',
      transactions_count: 189,
      total_amount: 89000000,
      children_count: 5
    },
    {
      id: '3',
      code: 'CP001',
      libelle: 'Produit A',
      description: 'Centre de profit produit A',
      type: 'centre_profit',
      niveau: 1,
      is_active: true,
      is_mandatory: false,
      obligatoire_saisie: false,
      account_mask: '7*',
      created_date: '2024-01-01',
      last_activity: '2024-01-30',
      transactions_count: 345,
      total_amount: 450000000,
      children_count: 0
    },
    {
      id: '4',
      code: 'PRJ001',
      libelle: 'Projet Digital 2024',
      description: 'Projet de transformation digitale',
      type: 'projet',
      niveau: 1,
      is_active: true,
      is_mandatory: false,
      obligatoire_saisie: true,
      account_mask: '*',
      created_date: '2024-01-15',
      last_activity: '2024-01-28',
      transactions_count: 78,
      total_amount: 25000000,
      children_count: 4
    },
    {
      id: '5',
      code: 'GEO001',
      libelle: 'Région Abidjan',
      description: 'Zone géographique Abidjan',
      type: 'geographique',
      niveau: 1,
      is_active: true,
      is_mandatory: false,
      obligatoire_saisie: false,
      account_mask: '*',
      created_date: '2024-01-01',
      last_activity: '2024-01-30',
      transactions_count: 567,
      total_amount: 780000000,
      children_count: 8
    },
    {
      id: '6',
      code: 'CC002.1',
      libelle: 'Équipe Ventes',
      description: 'Sous-centre équipe ventes',
      type: 'centre_cout',
      niveau: 2,
      parent_id: '2',
      is_active: true,
      is_mandatory: false,
      obligatoire_saisie: false,
      account_mask: '6*',
      created_date: '2024-01-10',
      last_activity: '2024-01-29',
      transactions_count: 134,
      total_amount: 45000000,
      children_count: 0
    }
  ];

  // Mock data for analytical dimensions
  const mockDimensions: AnalyticalDimension[] = [
    {
      id: '1',
      name: 'Centres de Coût',
      description: 'Analyse par centres de coût organisationnels',
      code: 'CC',
      axes_count: 15,
      is_active: true,
      priority: 1,
      auto_allocation: true,
      allocation_rules: ['Répartition par effectif', 'Répartition par surface'],
      created_date: '2024-01-01'
    },
    {
      id: '2',
      name: 'Centres de Profit',
      description: 'Analyse par centres de profit/produits',
      code: 'CP',
      axes_count: 8,
      is_active: true,
      priority: 2,
      auto_allocation: false,
      allocation_rules: [],
      created_date: '2024-01-01'
    },
    {
      id: '3',
      name: 'Projets',
      description: 'Suivi analytique par projet',
      code: 'PRJ',
      axes_count: 12,
      is_active: true,
      priority: 3,
      auto_allocation: false,
      allocation_rules: [],
      created_date: '2024-01-01'
    },
    {
      id: '4',
      name: 'Géographique',
      description: 'Répartition géographique',
      code: 'GEO',
      axes_count: 25,
      is_active: true,
      priority: 4,
      auto_allocation: true,
      allocation_rules: ['Répartition par CA régional'],
      created_date: '2024-01-01'
    }
  ];

  // Mock data for allocation rules
  const mockAllocationRules: AllocationRule[] = [
    {
      id: '1',
      name: 'Répartition Frais Généraux',
      description: 'Répartition automatique des frais généraux par effectif',
      source_axis: 'CC001',
      target_axes: ['CC002', 'CC003', 'CC004'],
      allocation_method: 'percentage',
      allocation_data: { percentages: [40, 35, 25] },
      conditions: ['Compte 6*', 'Montant > 10000'],
      is_active: true,
      auto_apply: true,
      created_date: '2024-01-01'
    },
    {
      id: '2',
      name: 'Répartition CA par Région',
      description: 'Ventilation du chiffre d\'affaires par région',
      source_axis: 'CP001',
      target_axes: ['GEO001', 'GEO002', 'GEO003'],
      allocation_method: 'formula',
      allocation_data: { formula: 'CA_REEL / CA_BUDGET' },
      conditions: ['Compte 7*'],
      is_active: true,
      auto_apply: false,
      created_date: '2024-01-05'
    }
  ];

  const { data: axes = mockAxes, isLoading } = useQuery({
    queryKey: ['analytical-axes', searchTerm, selectedType, selectedStatus, selectedLevel],
    queryFn: () => Promise.resolve(mockAxes),
  });

  const { data: dimensions = mockDimensions } = useQuery({
    queryKey: ['analytical-dimensions'],
    queryFn: () => Promise.resolve(mockDimensions),
  });

  const { data: allocationRules = mockAllocationRules } = useQuery({
    queryKey: ['allocation-rules'],
    queryFn: () => Promise.resolve(mockAllocationRules),
  });

  // Filter axes
  const filteredAxes = axes.filter(axis => {
    if (!showInactive && !axis.is_active) return false;
    
    const matchesSearch = axis.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         axis.libelle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || axis.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && axis.is_active) ||
                         (selectedStatus === 'inactive' && !axis.is_active);
    const matchesLevel = selectedLevel === 'all' || axis.niveau.toString() === selectedLevel;
    
    return matchesSearch && matchesType && matchesStatus && matchesLevel;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'centre_cout':
        return 'text-red-600 bg-red-100';
      case 'centre_profit':
        return 'text-green-600 bg-green-100';
      case 'centre_investissement':
        return 'text-blue-600 bg-blue-100';
      case 'activite':
        return 'text-purple-600 bg-purple-100';
      case 'projet':
        return 'text-orange-600 bg-orange-100';
      case 'geographique':
        return 'text-teal-600 bg-teal-100';
      case 'produit':
        return 'text-pink-600 bg-pink-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'centre_cout':
        return <DollarSign className="h-4 w-4" />;
      case 'centre_profit':
        return <TrendingUp className="h-4 w-4" />;
      case 'centre_investissement':
        return <Building2 className="h-4 w-4" />;
      case 'activite':
        return <Activity className="h-4 w-4" />;
      case 'projet':
        return <Target className="h-4 w-4" />;
      case 'geographique':
        return <MapPin className="h-4 w-4" />;
      case 'produit':
        return <Package className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
  };

  const handleCreateAxis = () => {
    toast.success('Création d\'un nouvel axe analytique...');
  };

  const handleEditAxis = (axisId: string) => {
    toast.info(`Édition de l'axe ${axisId}`);
  };

  const handleDeleteAxis = (axisId: string) => {
    toast.error(`Suppression de l'axe ${axisId}`);
  };

  const handleCreateDimension = () => {
    toast.success('Création d\'une nouvelle dimension...');
  };

  const handleRunAllocation = () => {
    toast.success('Lancement de la répartition analytique...');
  };

  const activeAxes = axes.filter(a => a.is_active).length;
  const totalTransactions = axes.reduce((sum, axis) => sum + axis.transactions_count, 0);
  const totalAmount = axes.reduce((sum, axis) => sum + axis.total_amount, 0);
  const mandatoryAxes = axes.filter(a => a.is_mandatory).length;

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
              <BarChart3 className="mr-3 h-7 w-7 text-blue-600" />
              Axes Analytiques
            </h1>
            <p className="mt-2 text-gray-600">
              Configuration et gestion de la comptabilité analytique multi-axes
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleRunAllocation}
              variant="outline"
            >
              <Zap className="mr-2 h-4 w-4" />
              Répartir
            </Button>
            <Button
              onClick={handleCreateAxis}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Axe
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
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Axes Actifs</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {activeAxes}/{axes.length}
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
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Axes Obligatoires</p>
                  <p className="text-2xl font-bold text-green-700">{mandatoryAxes}</p>
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
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-purple-700">{totalTransactions.toLocaleString()}</p>
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
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Montant Total</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrency(totalAmount)}
                  </p>
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
        <Tabs defaultValue="axes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="axes">Axes Analytiques</TabsTrigger>
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
            <TabsTrigger value="allocation">Règles de Répartition</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="axes" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un axe..."
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
                      <SelectItem value="centre_cout">Centre de Coût</SelectItem>
                      <SelectItem value="centre_profit">Centre de Profit</SelectItem>
                      <SelectItem value="projet">Projet</SelectItem>
                      <SelectItem value="geographique">Géographique</SelectItem>
                      <SelectItem value="activite">Activité</SelectItem>
                      <SelectItem value="produit">Produit</SelectItem>
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

                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      <SelectItem value="1">Niveau 1</SelectItem>
                      <SelectItem value="2">Niveau 2</SelectItem>
                      <SelectItem value="3">Niveau 3</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-inactive"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="show-inactive" className="text-sm text-gray-700">
                      Inclure inactifs
                    </label>
                  </div>

                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres Avancés
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Axes Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Axes Analytiques ({filteredAxes.length})</span>
                  <Badge variant="outline">
                    Multi-dimensionnel
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des axes analytiques..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code/Libellé</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Niveau</TableHead>
                          <TableHead>Configuration</TableHead>
                          <TableHead>Masque Comptes</TableHead>
                          <TableHead>Activité</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAxes.map((axis) => (
                          <TableRow key={axis.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {getTypeIcon(axis.type)}
                                </div>
                                <div>
                                  <div style={{ paddingLeft: `${(axis.niveau - 1) * 20}px` }}>
                                    <Badge variant="outline" className="font-mono mb-1">
                                      {axis.code}
                                    </Badge>
                                  </div>
                                  <p className="font-medium text-gray-900">{axis.libelle}</p>
                                  {axis.parent_id && (
                                    <div className="flex items-center mt-1">
                                      <GitBranch className="h-3 w-3 text-gray-400 mr-1" />
                                      <span className="text-xs text-gray-500">Sous-axe</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(axis.type)}`}>
                                {getTypeIcon(axis.type)}
                                <span className="ml-1">
                                  {axis.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                  Niveau {axis.niveau}
                                </Badge>
                                {axis.children_count > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {axis.children_count} enfants
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {axis.is_mandatory && (
                                  <Badge variant="default" className="text-xs bg-red-100 text-red-800">
                                    Obligatoire
                                  </Badge>
                                )}
                                {axis.obligatoire_saisie && (
                                  <Badge variant="outline" className="text-xs">
                                    Saisie Requise
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {axis.account_mask}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium text-gray-700">
                                  {axis.transactions_count} écritures
                                </p>
                                <p className="text-xs text-gray-500">
                                  Dernière: {formatDate(axis.last_activity)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-bold ${
                                axis.total_amount >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formatCurrency(Math.abs(axis.total_amount))}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(axis.is_active)}`}>
                                {getStatusIcon(axis.is_active)}
                                <span className="ml-1">{axis.is_active ? 'Actif' : 'Inactif'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditAxis(axis.id)}
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
                                  onClick={() => handleDeleteAxis(axis.id)}
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

          <TabsContent value="dimensions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Dimensions Analytiques</span>
                  <Button 
                    onClick={handleCreateDimension}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Dimension
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {dimensions.map((dimension) => (
                    <motion.div
                      key={dimension.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Layers className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{dimension.name}</h3>
                            <p className="text-sm text-gray-600">{dimension.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={dimension.is_active ? 'default' : 'outline'}>
                            {dimension.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            Priorité {dimension.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Code Dimension</label>
                          <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                            {dimension.code}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Nombre d'Axes</label>
                          <p className="text-sm font-semibold text-blue-600 mt-1">
                            {dimension.axes_count} axes
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Répartition Auto</label>
                          <p className="text-sm mt-1">
                            {dimension.auto_allocation ? (
                              <Badge className="bg-green-100 text-green-800">Activée</Badge>
                            ) : (
                              <Badge variant="outline">Désactivée</Badge>
                            )}
                          </p>
                        </div>
                      </div>

                      {dimension.allocation_rules.length > 0 && (
                        <div className="mt-4">
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Règles de Répartition:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {dimension.allocation_rules.map((rule, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {rule}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          Voir Axes
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="mr-2 h-4 w-4" />
                          Paramètres
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Règles de Répartition</span>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Règle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allocationRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={rule.is_active ? 'default' : 'outline'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {rule.auto_apply && (
                            <Badge className="bg-green-100 text-green-800">
                              Automatique
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Axe Source</label>
                          <Badge variant="outline" className="mt-1">
                            {rule.source_axis}
                          </Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Axes Cibles</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rule.target_axes.map((target, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {target}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Méthode</label>
                          <Badge variant="outline" className="mt-1 capitalize">
                            {rule.allocation_method}
                          </Badge>
                        </div>
                      </div>

                      {rule.conditions.length > 0 && (
                        <div className="mt-4">
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Conditions:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {rule.conditions.map((condition, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                        <Button size="sm" variant="outline">
                          <Zap className="mr-2 h-4 w-4" />
                          Tester
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

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rapports Analytiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Rapports Analytiques</h3>
                  <p className="text-gray-500 mb-6">
                    Tableaux de bord et rapports de contrôle de gestion
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button variant="outline">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Balance Analytique
                    </Button>
                    <Button variant="outline">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Analyse des Écarts
                    </Button>
                    <Button variant="outline">
                      <Target className="mr-2 h-4 w-4" />
                      Reporting Centres
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

export default AxesAnalytiquesPage;