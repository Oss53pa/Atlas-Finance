import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Database,
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
  FileText,
  File,
  FileSpreadsheet,
  FileJson,
  FileImage,
  RefreshCw,
  Play,
  Pause,
  Square,
  Calendar,
  History,
  Zap,
  Save,
  Target,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  CheckSquare,
  XCircle,
  Info
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
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ImportExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'import' | 'export';
  data_type: 'accounts' | 'transactions' | 'thirds' | 'analytics' | 'budget' | 'custom';
  format: 'csv' | 'excel' | 'json' | 'xml' | 'txt';
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'inactive' | 'draft';
  last_execution: string;
  next_execution?: string;
  execution_count: number;
  success_rate: number;
  file_path?: string;
  mapping_config: any;
  validation_rules: string[];
  created_date: string;
  created_by: string;
}

interface ExecutionHistory {
  id: string;
  template_id: string;
  template_name: string;
  type: 'import' | 'export';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  start_time: string;
  end_time?: string;
  records_processed: number;
  records_successful: number;
  records_failed: number;
  file_name: string;
  file_size: number;
  error_message?: string;
  log_file?: string;
}

interface DataMapping {
  id: string;
  source_field: string;
  target_field: string;
  field_type: 'string' | 'number' | 'date' | 'boolean';
  is_required: boolean;
  default_value?: string;
  transformation_rule?: string;
  validation_rule?: string;
}

const ImportExportPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('templates');

  // Mock data for templates
  const mockTemplates: ImportExportTemplate[] = [
    {
      id: '1',
      name: 'Import Plan Comptable',
      description: 'Import des comptes depuis Excel',
      type: 'import',
      data_type: 'accounts',
      format: 'excel',
      frequency: 'manual',
      status: 'active',
      last_execution: '2024-01-30',
      execution_count: 15,
      success_rate: 95.2,
      file_path: '/imports/plan_comptable.xlsx',
      mapping_config: {},
      validation_rules: ['Code unique', 'Libellé requis'],
      created_date: '2024-01-01',
      created_by: 'Admin'
    },
    {
      id: '2',
      name: 'Export Balance Générale',
      description: 'Export de la balance au format CSV',
      type: 'export',
      data_type: 'accounts',
      format: 'csv',
      frequency: 'monthly',
      status: 'active',
      last_execution: '2024-01-31',
      next_execution: '2024-02-28',
      execution_count: 8,
      success_rate: 100,
      file_path: '/exports/balance_{date}.csv',
      mapping_config: {},
      validation_rules: [],
      created_date: '2024-01-05',
      created_by: 'Comptable'
    },
    {
      id: '3',
      name: 'Import Écritures Comptables',
      description: 'Import d\'écritures depuis fichier CSV',
      type: 'import',
      data_type: 'transactions',
      format: 'csv',
      frequency: 'daily',
      status: 'active',
      last_execution: '2024-01-30',
      next_execution: '2024-01-31',
      execution_count: 45,
      success_rate: 87.5,
      file_path: '/imports/ecritures_{date}.csv',
      mapping_config: {},
      validation_rules: ['Equilibrage obligatoire', 'Date valide'],
      created_date: '2024-01-10',
      created_by: 'Opérateur'
    },
    {
      id: '4',
      name: 'Export Tiers',
      description: 'Export des clients/fournisseurs',
      type: 'export',
      data_type: 'thirds',
      format: 'json',
      frequency: 'weekly',
      status: 'active',
      last_execution: '2024-01-29',
      next_execution: '2024-02-05',
      execution_count: 12,
      success_rate: 100,
      file_path: '/exports/tiers_backup.json',
      mapping_config: {},
      validation_rules: [],
      created_date: '2024-01-15',
      created_by: 'Admin'
    },
    {
      id: '5',
      name: 'Import Budget Prévisionnel',
      description: 'Import du budget depuis Excel',
      type: 'import',
      data_type: 'budget',
      format: 'excel',
      frequency: 'manual',
      status: 'draft',
      last_execution: '2024-01-20',
      execution_count: 3,
      success_rate: 66.7,
      file_path: '/imports/budget_2024.xlsx',
      mapping_config: {},
      validation_rules: ['Montants positifs', 'Périodes cohérentes'],
      created_date: '2024-01-20',
      created_by: 'Contrôleur'
    }
  ];

  // Mock data for execution history
  const mockExecutions: ExecutionHistory[] = [
    {
      id: '1',
      template_id: '1',
      template_name: 'Import Plan Comptable',
      type: 'import',
      status: 'completed',
      start_time: '2024-01-30T09:00:00',
      end_time: '2024-01-30T09:05:00',
      records_processed: 847,
      records_successful: 845,
      records_failed: 2,
      file_name: 'plan_comptable_2024.xlsx',
      file_size: 2048576
    },
    {
      id: '2',
      template_id: '3',
      template_name: 'Import Écritures Comptables',
      type: 'import',
      status: 'running',
      start_time: '2024-01-30T14:30:00',
      records_processed: 1245,
      records_successful: 1180,
      records_failed: 65,
      file_name: 'ecritures_janvier.csv',
      file_size: 5242880
    },
    {
      id: '3',
      template_id: '2',
      template_name: 'Export Balance Générale',
      type: 'export',
      status: 'completed',
      start_time: '2024-01-29T23:00:00',
      end_time: '2024-01-29T23:02:00',
      records_processed: 1250,
      records_successful: 1250,
      records_failed: 0,
      file_name: 'balance_janvier.csv',
      file_size: 1024000
    },
    {
      id: '4',
      template_id: '5',
      template_name: 'Import Budget Prévisionnel',
      type: 'import',
      status: 'failed',
      start_time: '2024-01-28T10:00:00',
      end_time: '2024-01-28T10:15:00',
      records_processed: 156,
      records_successful: 0,
      records_failed: 156,
      file_name: 'budget_incorrect.xlsx',
      file_size: 3145728,
      error_message: 'Format de colonnes invalide'
    }
  ];

  const { data: templates = mockTemplates, isLoading } = useQuery({
    queryKey: ['import-export-templates', searchTerm, selectedType, selectedFormat, selectedStatus],
    queryFn: () => Promise.resolve(mockTemplates),
  });

  const { data: executions = mockExecutions } = useQuery({
    queryKey: ['execution-history'],
    queryFn: () => Promise.resolve(mockExecutions),
  });

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || template.type === selectedType;
    const matchesFormat = selectedFormat === 'all' || template.format === selectedFormat;
    const matchesStatus = selectedStatus === 'all' || template.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesFormat && matchesStatus;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'import':
        return 'text-blue-600 bg-blue-100';
      case 'export':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'import':
        return <ArrowDown className="h-4 w-4" />;
      case 'export':
        return <ArrowUp className="h-4 w-4" />;
      default:
        return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case 'csv':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'json':
        return <FileJson className="h-4 w-4 text-yellow-600" />;
      case 'xml':
        return <File className="h-4 w-4 text-orange-600" />;
      default:
        return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'draft':
      case 'inactive':
        return 'text-orange-600 bg-orange-100';
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'draft':
      case 'inactive':
        return <Clock className="h-4 w-4" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getDataTypeColor = (dataType: string) => {
    switch (dataType) {
      case 'accounts':
        return 'text-blue-600 bg-blue-100';
      case 'transactions':
        return 'text-green-600 bg-green-100';
      case 'thirds':
        return 'text-purple-600 bg-purple-100';
      case 'analytics':
        return 'text-orange-600 bg-orange-100';
      case 'budget':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleCreateTemplate = () => {
    toast.success('Création d\'un nouveau modèle...');
  };

  const handleEditTemplate = (templateId: string) => {
    toast.info(`Édition du modèle ${templateId}`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    toast.error(`Suppression du modèle ${templateId}`);
  };

  const handleExecuteTemplate = (templateId: string) => {
    toast.success(`Exécution du modèle ${templateId} lancée...`);
  };

  const handleStopExecution = (executionId: string) => {
    toast.warning(`Arrêt de l'exécution ${executionId}`);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const activeTemplates = templates.filter(t => t.status === 'active').length;
  const importTemplates = templates.filter(t => t.type === 'import').length;
  const exportTemplates = templates.filter(t => t.type === 'export').length;
  const totalExecutions = templates.reduce((sum, t) => sum + t.execution_count, 0);

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
              <Database className="mr-3 h-7 w-7 text-blue-600" />
              Import / Export
            </h1>
            <p className="mt-2 text-gray-600">
              Gestion des imports et exports de données avec modèles prédéfinis
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              Historique
            </Button>
            <Button
              onClick={handleCreateTemplate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Modèle
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
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Modèles Actifs</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {activeTemplates}/{templates.length}
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
                  <ArrowDown className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Imports</p>
                  <p className="text-2xl font-bold text-green-700">{importTemplates}</p>
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
                  <ArrowUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Exports</p>
                  <p className="text-2xl font-bold text-purple-700">{exportTemplates}</p>
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
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Exécutions</p>
                  <p className="text-2xl font-bold text-orange-700">{totalExecutions}</p>
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
            <TabsTrigger value="templates">Modèles</TabsTrigger>
            <TabsTrigger value="executions">Exécutions</TabsTrigger>
            <TabsTrigger value="mapping">Correspondances</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un modèle..."
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
                      <SelectItem value="import">Import</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les formats</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
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
                      <SelectItem value="draft">Brouillon</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres Avancés
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Templates Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Modèles d'Import/Export ({filteredTemplates.length})</span>
                  <Badge variant="outline">
                    Automatisation
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des modèles..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom/Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Données</TableHead>
                          <TableHead>Fréquence</TableHead>
                          <TableHead>Performance</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map((template) => (
                          <TableRow key={template.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {getTypeIcon(template.type)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{template.name}</p>
                                  <p className="text-sm text-gray-500">{template.description}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}>
                                {getTypeIcon(template.type)}
                                <span className="ml-1 capitalize">{template.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getFormatIcon(template.format)}
                                <span className="font-medium uppercase">{template.format}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDataTypeColor(template.data_type)}`}>
                                {template.data_type}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <Badge variant="outline" className="mb-1">
                                  {template.frequency}
                                </Badge>
                                {template.next_execution && (
                                  <p className="text-xs text-gray-500">
                                    Prochaine: {formatDate(template.next_execution)}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">{template.execution_count} exécutions</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Progress value={template.success_rate} className="w-12 h-2" />
                                  <span className="text-xs text-gray-500">{template.success_rate}%</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(template.status)}`}>
                                {getStatusIcon(template.status)}
                                <span className="ml-1 capitalize">{template.status}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExecuteTemplate(template.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTemplate(template.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4" />
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
                                  onClick={() => handleDeleteTemplate(template.id)}
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

          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Historique des Exécutions</span>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Actualiser
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exporter Logs
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modèle</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Fichier</TableHead>
                        <TableHead>Début/Fin</TableHead>
                        <TableHead>Résultats</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executions.map((execution) => (
                        <TableRow key={execution.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(execution.type)}
                              <span className="font-medium">{execution.template_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(execution.type)}`}>
                              {execution.type}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{execution.file_name}</p>
                              <p className="text-gray-500">{formatFileSize(execution.file_size)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{formatDate(execution.start_time)}</p>
                              {execution.end_time && (
                                <p className="text-gray-500">{formatDate(execution.end_time)}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium text-blue-600">
                                {execution.records_processed} traités
                              </p>
                              <div className="flex space-x-2 mt-1">
                                <span className="text-green-600">✓ {execution.records_successful}</span>
                                <span className="text-red-600">✗ {execution.records_failed}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                              {getStatusIcon(execution.status)}
                              <span className="ml-1 capitalize">{execution.status}</span>
                            </div>
                            {execution.error_message && (
                              <p className="text-xs text-red-600 mt-1 max-w-32 truncate">
                                {execution.error_message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {execution.log_file && (
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {execution.status === 'running' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStopExecution(execution.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
                              )}
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

          <TabsContent value="mapping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Correspondances de Champs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration des Correspondances</h3>
                  <p className="text-gray-500 mb-6">
                    Définissez les correspondances entre les champs sources et destination pour vos imports/exports
                  </p>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une Correspondance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres d'Import/Export</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Paramètres Généraux</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Validation automatique des données</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="form-checkbox" />
                        <span className="text-sm text-gray-700">Sauvegarde automatique des fichiers traités</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="form-checkbox" />
                        <span className="text-sm text-gray-700">Notifications par email des exécutions</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Limites et Performance</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taille maximale de fichier (MB)
                        </label>
                        <Input type="number" defaultValue="100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre max d'enregistrements
                        </label>
                        <Input type="number" defaultValue="100000" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Répertoires</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Répertoire d'import
                        </label>
                        <Input defaultValue="/data/imports" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Répertoire d'export
                        </label>
                        <Input defaultValue="/data/exports" />
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

export default ImportExportPage;