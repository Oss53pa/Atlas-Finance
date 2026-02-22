import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { motion } from 'framer-motion';
import {
  Building2,
  Plus,
  Edit,
  Eye,
  Trash2,
  Settings,
  Users,
  Globe,
  Shield,
  Database,
  ToggleLeft,
  ToggleRight,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  Upload,
  Link,
  Unlink,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Save,
  BarChart3
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
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../components/ui';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface Company {
  id: string;
  code: string;
  name: string;
  legal_form: string;
  rccm: string;
  nif: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  currency: string;
  fiscal_year_start: string;
  status: 'active' | 'inactive' | 'suspended';
  is_parent: boolean;
  parent_id?: string;
  created_date: string;
  last_activity: string;
  users_count: number;
  transactions_count: number;
  consolidation_level: number;
}

interface ConsolidationGroup {
  id: string;
  name: string;
  parent_company: string;
  subsidiaries: string[];
  consolidation_type: 'full' | 'proportional' | 'equity';
  consolidation_percentage: number;
  last_consolidation: string;
  status: 'active' | 'inactive';
}

const MultiSocietesPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Load companies from Dexie settings
  const companiesSetting = useLiveQuery(() => db.settings.get('companies_list'));
  const companies: Company[] = companiesSetting ? JSON.parse(companiesSetting.value) : [];
  const isLoading = companiesSetting === undefined;

  // Load consolidation groups from Dexie settings
  const consolidationGroupsSetting = useLiveQuery(() => db.settings.get('consolidation_groups'));
  const consolidationGroups: ConsolidationGroup[] = consolidationGroupsSetting ? JSON.parse(consolidationGroupsSetting.value) : [];

  // Filter companies
  const filteredCompanies = companies.filter(company => {
    if (!showInactive && company.status === 'inactive') return false;
    
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || company.status === selectedStatus;
    const matchesCountry = selectedCountry === 'all' || company.country === selectedCountry;
    
    return matchesSearch && matchesStatus && matchesCountry;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'suspended':
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
      case 'suspended':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  const getCountryName = (countryCode: string) => {
    const countries: { [key: string]: string } = {
      CI: 'Côte d\'Ivoire',
      SN: 'Sénégal',
      BF: 'Burkina Faso',
      ML: 'Mali',
      NE: 'Niger',
      TG: 'Togo',
      BJ: 'Bénin',
      GN: 'Guinée'
    };
    return countries[countryCode] || countryCode;
  };

  const handleCreateCompany = () => {
    toast.success('Nouvelle société en cours de création...');
  };

  const handleEditCompany = (companyId: string) => {
    toast.info(`Édition de la société ${companyId}`);
  };

  const handleDeleteCompany = (companyId: string) => {
    toast.error(`Suppression de la société ${companyId}`);
  };

  const handleSwitchCompany = (companyId: string) => {
    toast.success(`Basculement vers la société ${companyId}`);
  };

  const handleConsolidation = () => {
    toast.success('Lancement de la consolidation...');
  };

  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const totalUsers = companies.reduce((sum, company) => sum + company.users_count, 0);
  const totalTransactions = companies.reduce((sum, company) => sum + company.transactions_count, 0);

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
              <Building2 className="mr-3 h-7 w-7 text-blue-600" />
              Gestion Multi-Sociétés
            </h1>
            <p className="mt-2 text-gray-600">
              Gérez plusieurs entités légales avec consolidation comptable
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleConsolidation}
              variant="outline"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Consolider
            </Button>
            <Button
              onClick={handleCreateCompany}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Société
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
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Sociétés Actives</p>
                  <p className="text-lg font-bold text-blue-700">
                    {activeCompanies}/{companies.length}
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
                  <p className="text-sm font-medium text-gray-600">Utilisateurs Total</p>
                  <p className="text-lg font-bold text-green-700">{totalUsers}</p>
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
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-lg font-bold text-purple-700">{totalTransactions.toLocaleString()}</p>
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
                  <Globe className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pays</p>
                  <p className="text-lg font-bold text-orange-700">
                    {[...new Set(companies.map(c => c.country))].length}
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
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies">Liste des Sociétés</TabsTrigger>
            <TabsTrigger value="consolidation">Consolidation</TabsTrigger>
            <TabsTrigger value="hierarchy">Hiérarchie</TabsTrigger>
            <TabsTrigger value="settings">{t('navigation.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                    <Input
                      placeholder="Rechercher une société..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspendue</SelectItem>
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-inactive"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="show-inactive" className="text-sm text-gray-700">
                      Inclure inactives
                    </label>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Companies Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sociétés ({filteredCompanies.length})</span>
                  <Badge variant="outline">
                    {activeCompanies} actives
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des sociétés..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code/Société</TableHead>
                          <TableHead>Informations Légales</TableHead>
                          <TableHead>Localisation</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Hiérarchie</TableHead>
                          <TableHead>Activité</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.map((company) => (
                          <TableRow key={company.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{company.name}</p>
                                  <p className="text-sm text-gray-700">
                                    <Badge variant="outline" className="mr-1">
                                      {company.code}
                                    </Badge>
                                    {company.legal_form}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">RCCM: {company.rccm}</p>
                                <p className="text-gray-700">NIF: {company.nif}</p>
                                <p className="text-gray-700">{company.currency}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="text-xl">{getCountryFlag(company.country)}</span>
                                <div className="text-sm">
                                  <p className="font-medium">{company.city}</p>
                                  <p className="text-gray-700">{getCountryName(company.country)}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                                {getStatusIcon(company.status)}
                                <span className="ml-1 capitalize">{company.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {company.is_parent ? (
                                  <Badge variant="default" className="bg-purple-100 text-purple-700">
                                    Société Mère
                                  </Badge>
                                ) : (
                                  <div>
                                    <Badge variant="outline">
                                      Filiale
                                    </Badge>
                                    <p className="text-xs text-gray-700 mt-1">
                                      Niveau {company.consolidation_level}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center space-x-4 mb-1">
                                  <div className="flex items-center space-x-1">
                                    <Users className="h-3 w-3 text-gray-700" />
                                    <span className="text-gray-600">{company.users_count}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Database className="h-3 w-3 text-gray-700" />
                                    <span className="text-gray-600">{company.transactions_count}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-700">
                                  Dernière activité: {formatDate(company.last_activity)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSwitchCompany(company.id)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <ToggleRight className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCompany(company.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!company.is_parent && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCompany(company.id)}
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

          <TabsContent value="consolidation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Groupes de Consolidation</span>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Groupe
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consolidationGroups.map((group) => (
                    <div key={group.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                          <p className="text-sm text-gray-600">
                            Société mère: {group.parent_company}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={group.status === 'active' ? 'default' : 'outline'}>
                            {group.status}
                          </Badge>
                          <Badge variant="outline">
                            {group.consolidation_type}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Filiales consolidées:</h4>
                          <div className="space-y-2">
                            {group.subsidiaries.map((sub, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{sub}</span>
                                <Badge variant="outline" className="text-xs">
                                  {group.consolidation_percentage}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Progression Consolidation
                            </label>
                            <Progress value={85} className="mb-2" />
                            <p className="text-xs text-gray-700">
                              Dernière consolidation: {formatDate(group.last_consolidation)}
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Consolider
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings className="mr-2 h-4 w-4" />
                              Configurer
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hiérarchie des Sociétés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Arbre Hiérarchique</h3>
                  <p className="text-gray-700 mb-6">
                    Visualisation graphique de la structure du groupe sera disponible prochainement.
                  </p>
                  <Button variant="outline">
                    <Eye className="mr-2 h-4 w-4" />
                    Voir l'Organigramme
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres Multi-Sociétés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Paramètres de Consolidation</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Consolidation automatique mensuelle</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="form-checkbox" />
                        <span className="text-sm text-gray-700">Élimination automatique des écritures interco</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Conversion de devises automatique</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Sécurité et Accès</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Isolation des données par société</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="form-checkbox" />
                        <span className="text-sm text-gray-700">Accès cross-société pour les administrateurs</span>
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

export default MultiSocietesPage;