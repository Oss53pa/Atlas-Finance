import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  mapping_config: Record<string, unknown>;
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
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('templates');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showBrowseFilesModal, setShowBrowseFilesModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showExecutionDetailsModal, setShowExecutionDetailsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ImportExportTemplate | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionHistory | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
    setShowCreateModal(true);
  };

  const handleEditTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setShowEditModal(true);
    }
  };

  const handleViewTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setShowViewModal(true);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      toast.success('Modèle supprimé avec succès');
    }
  };

  const handleExecuteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setShowExecuteModal(true);
    }
  };

  const handleScheduleTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setShowScheduleModal(true);
    }
  };

  const handleBrowseFiles = () => {
    setShowBrowseFilesModal(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`Fichier "${file.name}" sélectionné`);
    }
  };

  const handleStopExecution = (executionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir arrêter cette exécution ?')) {
      toast.warning('Exécution arrêtée');
    }
  };

  const handleDuplicateTemplate = (templateId: string) => {
    toast.success('Modèle dupliqué avec succès');
  };

  const handleExportMaintenance = () => {
    toast.success('Export de maintenance lancé...');
  };

  const handleViewExecution = (executionId: string) => {
    const execution = executions.find(e => e.id === executionId);
    if (execution) {
      setSelectedExecution(execution);
      setShowExecutionDetailsModal(true);
    }
  };

  const handleDownloadLog = (executionId: string) => {
    toast.success('Téléchargement du fichier de log...');
  };

  const handleDownloadFile = (executionId: string) => {
    const execution = executions.find(e => e.id === executionId);
    if (execution) {
      toast.success(`Téléchargement de ${execution.file_name}...`);
    }
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
    <>
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
              <Database className="mr-3 h-7 w-7 text-blue-600" />
              Import / Export
            </h1>
            <p className="mt-2 text-gray-600">
              Gestion des imports et exports de données avec modèles prédéfinis
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleBrowseFiles}>
              <Upload className="mr-2 h-4 w-4" />
              Parcourir les fichiers
            </Button>
            <Button variant="outline" onClick={handleExportMaintenance}>
              <Download className="mr-2 h-4 w-4" />
              Export Maintenance
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('executions')}>
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
                  <p className="text-lg font-bold text-blue-700">
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
                  <p className="text-lg font-bold text-green-700">{importTemplates}</p>
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
                  <p className="text-lg font-bold text-purple-700">{exportTemplates}</p>
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
                  <p className="text-lg font-bold text-orange-700">{totalExecutions}</p>
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
            <TabsTrigger value="settings">{t('navigation.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
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
                      <SelectItem value="draft">{t('accounting.draft')}</SelectItem>
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
                                  <p className="text-sm text-gray-700">{template.description}</p>
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
                                  <p className="text-xs text-gray-700">
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
                                  <span className="text-xs text-gray-700">{template.success_rate}%</span>
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
                                  title="Lancer l'import"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleScheduleTemplate(template.id)}
                                  className="text-blue-600 hover:text-blue-700"
                                  title="Planifier"
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTemplate(template.id)}
                                  title="Modifier"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewTemplate(template.id)}
                                  title="Voir les détails"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateTemplate(template.id)}
                                  title="Dupliquer"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Supprimer"
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
                              <p className="text-gray-700">{formatFileSize(execution.file_size)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{formatDate(execution.start_time)}</p>
                              {execution.end_time && (
                                <p className="text-gray-700">{formatDate(execution.end_time)}</p>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewExecution(execution.id)}
                                title="Voir les détails"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadFile(execution.id)}
                                title="Télécharger le fichier"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {execution.log_file && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadLog(execution.id)}
                                  title="Télécharger le log"
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              {execution.status === 'running' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStopExecution(execution.id)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Arrêter l'exécution"
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
                  <Target className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration des Correspondances</h3>
                  <p className="text-gray-700 mb-6">
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

    {/* Create Template Modal */}
    {showCreateModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nouveau Modèle d'Import/Export</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du modèle</label>
              <Input placeholder="Ex: Import Plan Comptable" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Input placeholder="Description du modèle" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de données</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accounts">Comptes</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                    <SelectItem value="thirds">Tiers</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="analytics">Analytique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="daily">Quotidien</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              toast.success('Modèle créé avec succès');
              setShowCreateModal(false);
            }}>
              <Save className="mr-2 h-4 w-4" />
              Créer le modèle
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Execute Template Modal */}
    {showExecuteModal && selectedTemplate && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-xl w-full m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Lancer l'import/export</h2>
              <button onClick={() => setShowExecuteModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
              <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
            </div>
            {selectedTemplate.type === 'import' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fichier à importer</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadedFile && (
                  <p className="mt-2 text-sm text-green-600">✓ {uploadedFile.name}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="form-checkbox" />
                <span className="text-sm text-gray-700">Validation automatique</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="form-checkbox" />
                <span className="text-sm text-gray-700">Créer un rapport détaillé</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox" />
                <span className="text-sm text-gray-700">Envoyer une notification par email</span>
              </label>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowExecuteModal(false)}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
              toast.success('Exécution lancée avec succès');
              setShowExecuteModal(false);
            }}>
              <Play className="mr-2 h-4 w-4" />
              Lancer maintenant
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Schedule Template Modal */}
    {showScheduleModal && selectedTemplate && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-xl w-full m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Planifier l'exécution</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence</label>
              <Select defaultValue={selectedTemplate.frequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <Input type="date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                <Input type="time" defaultValue="00:00" />
              </div>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox" />
                <span className="text-sm text-gray-700">Activer les notifications</span>
              </label>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Annuler</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              toast.success('Planification enregistrée');
              setShowScheduleModal(false);
            }}>
              <Calendar className="mr-2 h-4 w-4" />
              Planifier
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Browse Files Modal */}
    {showBrowseFilesModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Parcourir les fichiers</h2>
              <button onClick={() => setShowBrowseFilesModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Glissez-déposez vos fichiers ici ou</p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('file-upload')?.click();
                }}>
                  Sélectionner des fichiers
                </Button>
              </label>
            </div>
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3">Fichiers récents</h3>
              <div className="space-y-2">
                {['plan_comptable_2024.xlsx', 'ecritures_janvier.csv', 'budget_2024.xlsx'].map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">{file}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end">
            <Button onClick={() => setShowBrowseFilesModal(false)}>Fermer</Button>
          </div>
        </div>
      </div>
    )}

    {/* View Template Modal */}
    {showViewModal && selectedTemplate && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Détails du modèle</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Informations générales</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-600">Nom</dt>
                  <dd className="font-medium text-gray-900">{selectedTemplate.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Type</dt>
                  <dd className="font-medium text-gray-900 capitalize">{selectedTemplate.type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Format</dt>
                  <dd className="font-medium text-gray-900 uppercase">{selectedTemplate.format}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Fréquence</dt>
                  <dd className="font-medium text-gray-900">{selectedTemplate.frequency}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Statut</dt>
                  <dd className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTemplate.status)}`}>
                    {selectedTemplate.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Dernière exécution</dt>
                  <dd className="font-medium text-gray-900">{formatDate(selectedTemplate.last_execution)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Exécutions totales</p>
                  <p className="text-lg font-bold text-blue-700">{selectedTemplate.execution_count}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Taux de succès</p>
                  <p className="text-lg font-bold text-green-700">{selectedTemplate.success_rate}%</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Règles de validation</h3>
              <ul className="space-y-1">
                {selectedTemplate.validation_rules.map((rule, idx) => (
                  <li key={idx} className="flex items-center space-x-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              setShowViewModal(false);
              setShowEditModal(true);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Edit Template Modal */}
    {showEditModal && selectedTemplate && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Modifier le modèle</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du modèle</label>
              <Input defaultValue={selectedTemplate.name} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Input defaultValue={selectedTemplate.description} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <Select defaultValue={selectedTemplate.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence</label>
                <Select defaultValue={selectedTemplate.frequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="daily">Quotidien</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Annuler</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              toast.success('Modèle mis à jour avec succès');
              setShowEditModal(false);
            }}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Execution Details Modal */}
    {showExecutionDetailsModal && selectedExecution && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Détails de l'exécution</h2>
              <button onClick={() => setShowExecutionDetailsModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Status Banner */}
            <div className={`p-4 rounded-lg ${
              selectedExecution.status === 'completed' ? 'bg-green-50 border border-green-200' :
              selectedExecution.status === 'failed' ? 'bg-red-50 border border-red-200' :
              selectedExecution.status === 'running' ? 'bg-blue-50 border border-blue-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedExecution.status)}`}>
                    {getStatusIcon(selectedExecution.status)}
                    <span className="ml-2 capitalize">{selectedExecution.status}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{selectedExecution.template_name}</span>
                </div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedExecution.type)}`}>
                  {getTypeIcon(selectedExecution.type)}
                  <span className="ml-1 capitalize">{selectedExecution.type}</span>
                </div>
              </div>
            </div>

            {/* File Information */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Informations du fichier</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nom du fichier</span>
                  <span className="font-medium text-gray-900">{selectedExecution.file_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Taille</span>
                  <span className="font-medium text-gray-900">{formatFileSize(selectedExecution.file_size)}</span>
                </div>
              </div>
            </div>

            {/* Timing Information */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Chronologie</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Début</span>
                  <span className="font-medium text-gray-900">{formatDate(selectedExecution.start_time)}</span>
                </div>
                {selectedExecution.end_time && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fin</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedExecution.end_time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Durée</span>
                      <span className="font-medium text-gray-900">
                        {Math.round((new Date(selectedExecution.end_time).getTime() - new Date(selectedExecution.start_time).getTime()) / 60000)} min
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Processing Statistics */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Statistiques de traitement</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">Traités</p>
                  <p className="text-lg font-bold text-blue-700">{selectedExecution.records_processed}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">Réussis</p>
                  <p className="text-lg font-bold text-green-700">{selectedExecution.records_successful}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">Échoués</p>
                  <p className="text-lg font-bold text-red-700">{selectedExecution.records_failed}</p>
                </div>
              </div>
              {selectedExecution.records_processed > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Taux de réussite</span>
                    <span className="font-medium text-gray-900">
                      {((selectedExecution.records_successful / selectedExecution.records_processed) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={(selectedExecution.records_successful / selectedExecution.records_processed) * 100}
                    className="h-2"
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {selectedExecution.error_message && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Message d'erreur</h3>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">{selectedExecution.error_message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => handleDownloadFile(selectedExecution.id)}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger le fichier
              </Button>
              {selectedExecution.log_file && (
                <Button
                  variant="outline"
                  onClick={() => handleDownloadLog(selectedExecution.id)}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Télécharger le log
                </Button>
              )}
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end">
            <Button onClick={() => setShowExecutionDetailsModal(false)}>Fermer</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ImportExportPage;