import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CreditCard,
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
  Calculator,
  Percent,
  Globe,
  Calendar,
  FileText,
  Building2,
  TrendingUp,
  Target,
  Users,
  Save,
  RefreshCw
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
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface TaxRate {
  id: string;
  code: string;
  libelle: string;
  type: 'TVA' | 'TCA' | 'TAF' | 'TSS' | 'IRPP' | 'IS' | 'Custom';
  taux: number;
  country: string;
  applicable_depuis: string;
  applicable_jusqu: string;
  status: 'active' | 'inactive' | 'archived';
  is_default: boolean;
  compte_collecte?: string;
  compte_deductible?: string;
  conditions_application: string[];
  exclusions: string[];
  created_date: string;
  usage_count: number;
}

interface TaxRule {
  id: string;
  name: string;
  description: string;
  tax_type: string;
  conditions: string[];
  formula: string;
  auto_apply: boolean;
  priority: number;
  status: 'active' | 'inactive';
  created_date: string;
}

interface TaxExemption {
  id: string;
  code: string;
  libelle: string;
  type_exemption: 'totale' | 'partielle';
  taux_reduction?: number;
  conditions: string[];
  date_debut: string;
  date_fin?: string;
  status: 'active' | 'expired';
}

const TVATaxesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [showArchivedTaxes, setShowArchivedTaxes] = useState(false);

  // Mock data for tax rates
  const mockTaxRates: TaxRate[] = [
    {
      id: '1',
      code: 'TVA18',
      libelle: 'TVA Standard 18%',
      type: 'TVA',
      taux: 0.18,
      country: 'CI',
      applicable_depuis: '2024-01-01',
      applicable_jusqu: '2024-12-31',
      status: 'active',
      is_default: true,
      compte_collecte: '4434',
      compte_deductible: '4455',
      conditions_application: ['Régime Normal', 'Activité Commerciale'],
      exclusions: ['Exportations', 'Opérations Exonérées'],
      created_date: '2024-01-01',
      usage_count: 1250
    },
    {
      id: '2',
      code: 'TVA09',
      libelle: 'TVA Réduite 9%',
      type: 'TVA',
      taux: 0.09,
      country: 'CI',
      applicable_depuis: '2024-01-01',
      applicable_jusqu: '2024-12-31',
      status: 'active',
      is_default: false,
      compte_collecte: '4434',
      compte_deductible: '4455',
      conditions_application: ['Produits de Première Nécessité'],
      exclusions: [],
      created_date: '2024-01-01',
      usage_count: 340
    },
    {
      id: '3',
      code: 'TCA02',
      libelle: 'Taxe sur Chiffre d\'Affaires 2%',
      type: 'TCA',
      taux: 0.02,
      country: 'CI',
      applicable_depuis: '2024-01-01',
      applicable_jusqu: '2024-12-31',
      status: 'active',
      is_default: false,
      compte_collecte: '443',
      conditions_application: ['Toutes Activités'],
      exclusions: ['CA < 50 millions'],
      created_date: '2024-01-01',
      usage_count: 890
    },
    {
      id: '4',
      code: 'TAF15',
      libelle: 'Taxe d\'Apprentissage 1.5%',
      type: 'TAF',
      taux: 0.015,
      country: 'CI',
      applicable_depuis: '2024-01-01',
      applicable_jusqu: '2024-12-31',
      status: 'active',
      is_default: false,
      compte_collecte: '444',
      conditions_application: ['Entreprises > 5 Employés'],
      exclusions: ['Secteur Primaire'],
      created_date: '2024-01-01',
      usage_count: 156
    },
    {
      id: '5',
      code: 'IS30',
      libelle: 'Impôt sur Sociétés 30%',
      type: 'IS',
      taux: 0.30,
      country: 'CI',
      applicable_depuis: '2024-01-01',
      applicable_jusqu: '2024-12-31',
      status: 'active',
      is_default: true,
      compte_collecte: '441',
      conditions_application: ['CA > 1 Milliard'],
      exclusions: [],
      created_date: '2024-01-01',
      usage_count: 45
    },
    {
      id: '6',
      code: 'IS25',
      libelle: 'Impôt sur Sociétés PME 25%',
      type: 'IS',
      taux: 0.25,
      country: 'CI',
      applicable_depuis: '2024-01-01',
      applicable_jusqu: '2024-12-31',
      status: 'active',
      is_default: false,
      compte_collecte: '441',
      conditions_application: ['CA ≤ 1 Milliard'],
      exclusions: [],
      created_date: '2024-01-01',
      usage_count: 78
    },
    {
      id: '7',
      code: 'TVA00',
      libelle: 'TVA 0% (Exportation)',
      type: 'TVA',
      taux: 0.00,
      country: 'CI',
      applicable_depuis: '2024-01-01',
      applicable_jusqu: '2024-12-31',
      status: 'active',
      is_default: false,
      compte_collecte: '4434',
      compte_deductible: '4455',
      conditions_application: ['Exportations'],
      exclusions: [],
      created_date: '2024-01-01',
      usage_count: 234
    }
  ];

  // Mock data for tax rules
  const mockTaxRules: TaxRule[] = [
    {
      id: '1',
      name: 'Règle TVA Standard',
      description: 'Application automatique de la TVA 18% selon le secteur',
      tax_type: 'TVA',
      conditions: ['Régime Normal', 'Secteur Commercial'],
      formula: 'BASE_HT * 0.18',
      auto_apply: true,
      priority: 1,
      status: 'active',
      created_date: '2024-01-01'
    },
    {
      id: '2',
      name: 'Règle IS Progressive',
      description: 'Application de l\'IS selon le chiffre d\'affaires',
      tax_type: 'IS',
      conditions: ['Société Commerciale'],
      formula: 'IF(CA > 1000000000, 0.30, 0.25)',
      auto_apply: true,
      priority: 2,
      status: 'active',
      created_date: '2024-01-01'
    }
  ];

  // Mock data for tax exemptions
  const mockExemptions: TaxExemption[] = [
    {
      id: '1',
      code: 'EXO001',
      libelle: 'Exonération Produits Pharmaceutiques',
      type_exemption: 'totale',
      conditions: ['Médicaments Essentiels', 'Importation'],
      date_debut: '2024-01-01',
      status: 'active'
    },
    {
      id: '2',
      code: 'RED001',
      libelle: 'Réduction PME Nouvelles',
      type_exemption: 'partielle',
      taux_reduction: 0.50,
      conditions: ['Création < 2 ans', 'Effectif < 20'],
      date_debut: '2024-01-01',
      date_fin: '2024-12-31',
      status: 'active'
    }
  ];

  const { data: taxRates = mockTaxRates, isLoading } = useQuery({
    queryKey: ['tax-rates', searchTerm, selectedType, selectedCountry, selectedStatus],
    queryFn: () => Promise.resolve(mockTaxRates),
  });

  const { data: taxRules = mockTaxRules } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: () => Promise.resolve(mockTaxRules),
  });

  const { data: exemptions = mockExemptions } = useQuery({
    queryKey: ['tax-exemptions'],
    queryFn: () => Promise.resolve(mockExemptions),
  });

  // Filter tax rates
  const filteredTaxRates = taxRates.filter(rate => {
    if (!showArchivedTaxes && rate.status === 'archived') return false;
    
    const matchesSearch = rate.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rate.libelle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || rate.type === selectedType;
    const matchesCountry = selectedCountry === 'all' || rate.country === selectedCountry;
    const matchesStatus = selectedStatus === 'all' || rate.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesCountry && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-orange-600 bg-orange-100';
      case 'archived':
        return 'text-gray-600 bg-gray-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
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
      case 'archived':
      case 'expired':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TVA':
        return 'text-blue-600 bg-blue-100';
      case 'TCA':
        return 'text-purple-600 bg-purple-100';
      case 'TAF':
        return 'text-orange-600 bg-orange-100';
      case 'IS':
        return 'text-green-600 bg-green-100';
      case 'IRPP':
        return 'text-red-600 bg-red-100';
      case 'TSS':
        return 'text-teal-600 bg-teal-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCountryFlag = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      CI: '🇨🇮',
      SN: '🇸🇳',
      BF: '🇧🇫',
      ML: '🇲🇱',
      NE: '🇳🇪',
      TG: '🇹🇬',
      BJ: '🇧🇯',
      GN: '🇬🇳'
    };
    return flags[countryCode] || '🏴';
  };

  const handleCreateTaxRate = () => {
    toast.success('Création d\'un nouveau taux de taxe...');
  };

  const handleEditTaxRate = (rateId: string) => {
    toast.info(`Édition du taux de taxe ${rateId}`);
  };

  const handleDeleteTaxRate = (rateId: string) => {
    toast.error(`Suppression du taux de taxe ${rateId}`);
  };

  const handleImportTaxes = () => {
    toast.success('Import des taux de taxe en cours...');
  };

  const handleExportTaxes = () => {
    toast.success('Export des taux de taxe lancé...');
  };

  const activeTaxes = taxRates.filter(t => t.status === 'active').length;
  const totalUsage = taxRates.reduce((sum, rate) => sum + rate.usage_count, 0);
  const tvaRates = taxRates.filter(t => t.type === 'TVA').length;

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
              <CreditCard className="mr-3 h-7 w-7 text-blue-600" />
              Configuration TVA et Taxes
            </h1>
            <p className="mt-2 text-gray-600">
              Gestion des taux de TVA et autres taxes selon la réglementation UEMOA
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleImportTaxes}
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button
              onClick={handleExportTaxes}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button
              onClick={handleCreateTaxRate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Taux
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
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux Actifs</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {activeTaxes}/{taxRates.length}
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
                  <Percent className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux TVA</p>
                  <p className="text-2xl font-bold text-green-700">{tvaRates}</p>
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
                  <p className="text-sm font-medium text-gray-600">Utilisations</p>
                  <p className="text-2xl font-bold text-purple-700">{totalUsage.toLocaleString()}</p>
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
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Exonérations</p>
                  <p className="text-2xl font-bold text-orange-700">{exemptions.length}</p>
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
        <Tabs defaultValue="rates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rates">Taux de Taxes</TabsTrigger>
            <TabsTrigger value="rules">Règles d'Application</TabsTrigger>
            <TabsTrigger value="exemptions">Exonérations</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="rates" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un taux..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de taxe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="TVA">TVA</SelectItem>
                      <SelectItem value="TCA">TCA</SelectItem>
                      <SelectItem value="TAF">TAF</SelectItem>
                      <SelectItem value="IS">Impôt sur Sociétés</SelectItem>
                      <SelectItem value="IRPP">IRPP</SelectItem>
                      <SelectItem value="TSS">TSS</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pays" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les pays</SelectItem>
                      <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                      <SelectItem value="SN">Sénégal</SelectItem>
                      <SelectItem value="BF">Burkina Faso</SelectItem>
                      <SelectItem value="ML">Mali</SelectItem>
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
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-archived"
                      checked={showArchivedTaxes}
                      onChange={(e) => setShowArchivedTaxes(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="show-archived" className="text-sm text-gray-700">
                      Inclure archivés
                    </label>
                  </div>

                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres Avancés
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tax Rates Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Taux de Taxes ({filteredTaxRates.length})</span>
                  <Badge variant="outline">
                    Réglementation UEMOA
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des taux de taxes..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code/Libellé</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Taux</TableHead>
                          <TableHead>Pays</TableHead>
                          <TableHead>Période</TableHead>
                          <TableHead>Comptes</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Utilisation</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTaxRates.map((rate) => (
                          <TableRow key={rate.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <CreditCard className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="font-mono">
                                      {rate.code}
                                    </Badge>
                                    {rate.is_default && (
                                      <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800">
                                        Défaut
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="font-medium text-gray-900 mt-1">{rate.libelle}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(rate.type)}`}>
                                {rate.type}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-right">
                                <span className="text-xl font-bold text-blue-600">
                                  {formatPercentage(rate.taux)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{getCountryFlag(rate.country)}</span>
                                <span className="text-sm font-medium">{rate.country}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">Du {formatDate(rate.applicable_depuis)}</p>
                                <p className="text-gray-500">Au {formatDate(rate.applicable_jusqu)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {rate.compte_collecte && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    C: {rate.compte_collecte}
                                  </Badge>
                                )}
                                {rate.compte_deductible && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    D: {rate.compte_deductible}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rate.status)}`}>
                                {getStatusIcon(rate.status)}
                                <span className="ml-1 capitalize">{rate.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium text-gray-700">{rate.usage_count} fois</p>
                                <Progress value={(rate.usage_count / totalUsage) * 100} className="w-16 h-2 mt-1" />
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
                                  onClick={() => handleEditTaxRate(rate.id)}
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
                                  onClick={() => handleDeleteTaxRate(rate.id)}
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

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Règles d'Application</span>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Règle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taxRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={rule.status === 'active' ? 'default' : 'outline'}>
                            {rule.status}
                          </Badge>
                          <Badge variant="outline">
                            Priorité {rule.priority}
                          </Badge>
                          {rule.auto_apply && (
                            <Badge className="bg-green-100 text-green-800">
                              Auto
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Conditions:</h4>
                          <div className="space-y-1">
                            {rule.conditions.map((condition, idx) => (
                              <Badge key={idx} variant="outline" className="mr-1 mb-1">
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Formule de calcul:</h4>
                          <code className="text-sm bg-gray-100 p-2 rounded block">
                            {rule.formula}
                          </code>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
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

          <TabsContent value="exemptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Exonérations et Réductions</span>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Exonération
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code/Libellé</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Réduction</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Conditions</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exemptions.map((exemption) => (
                        <TableRow key={exemption.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <Badge variant="outline" className="font-mono mb-1">
                                {exemption.code}
                              </Badge>
                              <p className="font-medium text-gray-900">{exemption.libelle}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={exemption.type_exemption === 'totale' ? 'default' : 'outline'}>
                              {exemption.type_exemption}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {exemption.type_exemption === 'totale' ? (
                              <span className="font-bold text-green-600">100%</span>
                            ) : (
                              <span className="font-bold text-orange-600">
                                {formatPercentage(exemption.taux_reduction || 0)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>Du {formatDate(exemption.date_debut)}</p>
                              {exemption.date_fin && (
                                <p>Au {formatDate(exemption.date_fin)}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-x-1">
                              {exemption.conditions.slice(0, 2).map((condition, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {condition}
                                </Badge>
                              ))}
                              {exemption.conditions.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{exemption.conditions.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exemption.status)}`}>
                              {getStatusIcon(exemption.status)}
                              <span className="ml-1 capitalize">{exemption.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres Généraux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Calcul Automatique</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Application automatique des règles de TVA</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Calcul automatique des retenues à la source</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="form-checkbox" />
                        <span className="text-sm text-gray-700">Validation manuelle des calculs d'impôts</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Arrondi</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Méthode d'arrondi
                        </label>
                        <Select defaultValue="nearest">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nearest">Au plus proche</SelectItem>
                            <SelectItem value="up">Arrondi supérieur</SelectItem>
                            <SelectItem value="down">Arrondi inférieur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Précision
                        </label>
                        <Select defaultValue="1">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 FCFA</SelectItem>
                            <SelectItem value="5">5 FCFA</SelectItem>
                            <SelectItem value="10">10 FCFA</SelectItem>
                            <SelectItem value="100">100 FCFA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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

export default TVATaxesPage;