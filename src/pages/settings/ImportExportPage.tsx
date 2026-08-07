import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Upload,
  Download,
  FileUp,
  FileDown,
  FileSpreadsheet,
  FileText,
  Database,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Settings,
  Filter,
  Calendar,
  Calculator,
  Package,
  Users,
  DollarSign,
  Building,
  FileCode,
  ChevronRight,
  X,
  Check
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Switch,
  Label,
  Input,
  Alert,
  AlertDescription,
  Checkbox
} from '../../components/ui';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface ImportJob {
  /** CLÉ de traduction du type d'import, pas un libellé : l'état est initialisé
   *  une seule fois, il serait figé à la langue du premier rendu. */
  id: string;
  type: string;
  fileName: string;
  size: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordsTotal: number;
  recordsProcessed: number;
  startTime: Date;
  endTime?: Date;
  errors?: string[];
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'excel' | 'csv' | 'json' | 'xml' | 'pdf';
  module: string;
  fields: string[];
  lastUsed?: Date;
  schedule?: string;
}

const ImportExportPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('import');
  const [selectedModule, setSelectedModule] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showModuleDetailsModal, setShowModuleDetailsModal] = useState(false);
  const [selectedModuleDetails, setSelectedModuleDetails] = useState<any>(null);

  // Mock data for import jobs
  const [importJobs] = useState<ImportJob[]>([
    {
      id: '1',
      type: 'importExport.jobTypeChartOfAccounts',
      fileName: 'plan_comptable_syscohada.xlsx',
      size: '245 KB',
      status: 'completed',
      progress: 100,
      recordsTotal: 850,
      recordsProcessed: 850,
      startTime: new Date('2024-02-10T10:00:00'),
      endTime: new Date('2024-02-10T10:02:15')
    },
    {
      id: '2',
      type: 'importExport.jobTypeCustomers',
      fileName: 'clients_janvier_2024.csv',
      size: '1.2 MB',
      status: 'processing',
      progress: 65,
      recordsTotal: 3500,
      recordsProcessed: 2275,
      startTime: new Date('2024-02-10T14:30:00')
    },
    {
      id: '3',
      type: 'importExport.jobTypeEntries',
      fileName: 'ecritures_q4_2023.xlsx',
      size: '5.8 MB',
      status: 'failed',
      progress: 45,
      recordsTotal: 15000,
      recordsProcessed: 6750,
      startTime: new Date('2024-02-10T09:00:00'),
      endTime: new Date('2024-02-10T09:15:00'),
      errors: ['Format de date invalide ligne 6751', 'Compte inexistant ligne 6752']
    }
  ]);

  // Les `fields` sont les EN-TÊTES DE COLONNES du fichier généré : ce sont des
  // identifiants de schéma (le FEC les impose à la lettre), pas du texte
  // d'interface — ils restent donc en littéral.
  // Mock export templates
  const exportTemplates: ExportTemplate[] = [
    {
      id: '1',
      name: t('importExport.tplBalance'),
      description: t('importExport.tplBalanceDesc'),
      format: 'excel',
      module: t('importExport.moduleAccounting'),
      fields: ['Compte', 'Libellé', 'Débit', 'Crédit', 'Solde'],
      lastUsed: new Date('2024-02-09'),
      schedule: t('importExport.schedMonthly')
    },
    {
      id: '2',
      name: t('importExport.tplClients'),
      description: t('importExport.tplClientsDesc'),
      format: 'csv',
      module: 'CRM',
      fields: ['Code', 'Nom', 'Email', 'Téléphone', 'Solde'],
      lastUsed: new Date('2024-02-08')
    },
    {
      id: '3',
      name: t('importExport.tplFec'),
      description: t('importExport.tplFecDesc'),
      format: 'xml',
      module: t('importExport.moduleAccounting'),
      fields: ['JournalCode', 'EcritureNum', 'PieceRef', 'CompteNum', 'Debit', 'Credit'],
      schedule: t('importExport.schedAnnual')
    },
    {
      id: '4',
      name: t('importExport.tplStock'),
      description: t('importExport.tplStockDesc'),
      format: 'excel',
      module: 'Stock',
      fields: ['Article', 'Référence', 'Quantité', 'PrixUnitaire', 'Valeur'],
      lastUsed: new Date('2024-02-07')
    }
  ];

  // Modules disponibles
  const modules = [
    { id: 'accounting', name: t('importExport.moduleAccounting'), icon: Calculator, color: 'blue' },
    { id: 'crm', name: 'CRM', icon: Users, color: 'primary' },
    { id: 'stock', name: 'Stock', icon: Package, color: 'green' },
    { id: 'hr', name: 'RH', icon: Users, color: 'orange' },
    { id: 'assets', name: t('importExport.moduleAssets'), icon: Building, color: 'primary' },
    { id: 'treasury', name: t('importExport.moduleTreasury'), icon: DollarSign, color: 'primary' }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleImport = () => {
    if (selectedFiles.length === 0) {
      toast.error(t('importExport.selectFile'));
      return;
    }
    setIsImporting(true);
    setTimeout(() => {
      toast.success(t('importExport.importStarted'));
      setIsImporting(false);
      setSelectedFiles([]);
    }, 2000);
  };

  const handlePauseImport = (jobId: string) => {
    const job = importJobs.find(j => j.id === jobId);
    if (job) {
      if (confirm(`Voulez-vous mettre en pause l'import "${job.fileName}" ?`)) {
        toast.success(t('importExport.importPaused'));
      }
    }
  };

  const handleRetryImport = (jobId: string) => {
    const job = importJobs.find(j => j.id === jobId);
    if (job) {
      if (confirm(`Voulez-vous relancer l'import "${job.fileName}" ?`)) {
        toast.success(t('importExport.importResumed'));
      }
    }
  };

  const handleViewReport = (jobId: string) => {
    const job = importJobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setShowReportModal(true);
    }
  };

  const handleExportNow = () => {
    toast.success(t('importExport.exportStarted'));
  };

  const handleScheduleExport = () => {
    setShowScheduleModal(true);
  };

  const handleOpenSettings = () => {
    setShowSettingsModal(true);
  };

  const handleModuleClick = (moduleId: string) => {
    setSelectedModule(moduleId);
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      setSelectedModuleDetails(module);
      setShowModuleDetailsModal(true);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    toast.success(t('importExport.usingTemplate', { id: templateId }));
  };

  const handleConfigureTemplate = (templateId: string) => {
    toast(t('importExport.configuringTemplate', { id: templateId }));
  };

  const handleDownloadHistory = () => {
    toast.success(t('importExport.downloadingReport'));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[var(--color-success-light)] text-[var(--color-success)]';
      case 'processing':
        return 'bg-[var(--color-info-light)] text-[var(--color-info)]';
      case 'pending':
        return 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)]';
      case 'failed':
        return 'bg-[var(--color-error-light)] text-[var(--color-error)]';
      default:
        return 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)]';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'json':
      case 'xml':
        return <FileCode className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--color-border)] pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <ArrowUpDown className="mr-3 h-7 w-7 text-[var(--color-info)]" />
              Import / Export de Données
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Importez et exportez vos données dans différents formats
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleOpenSettings}
              type="button"
            >
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </Button>
            <Button
              className="bg-[var(--color-info)] hover:bg-[var(--color-info)]"
              onClick={handleScheduleExport}
              type="button"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {t('importExport.schedule')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="templates">{t('importExport.tabTemplates')}</TabsTrigger>
          <TabsTrigger value="history">{t('importExport.tabHistory')}</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Zone de téléchargement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Zone d'Import
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center hover:border-[var(--color-info)] transition-colors">
                  <FileUp className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                    Glissez vos fichiers ici ou
                  </p>
                  <div className="mb-2">
                    <input
                      type="file"
                      multiple
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".csv,.xlsx,.xls,.json,.xml"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      type="button"
                    >
                      Parcourir les fichiers
                    </Button>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {t('importExport.supportedFormats')}
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">{t('importExport.selectedFiles')}</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-[var(--color-surface-hover)] rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuration Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Configuration d'Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('importExport.dataType')}</Label>
                  <Select defaultValue="auto">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('importExport.autoDetect')}</SelectItem>
                      <SelectItem value="accounts">{t('importExport.chartOfAccounts')}</SelectItem>
                      <SelectItem value="entries">{t('importExport.journalEntries')}</SelectItem>
                      <SelectItem value="customers">{t('navigation.clients')}</SelectItem>
                      <SelectItem value="suppliers">{t('navigation.suppliers')}</SelectItem>
                      <SelectItem value="products">{t('importExport.products')}</SelectItem>
                      <SelectItem value="employees">{t('importExport.employees')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('importExport.dateFormat')}</Label>
                  <Select defaultValue="dd/mm/yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">JJ/MM/AAAA</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/JJ/AAAA</SelectItem>
                      <SelectItem value="yyyy-mm-dd">AAAA-MM-JJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('importExport.decimalSeparator')}</Label>
                  <Select defaultValue="comma">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comma">{t('importExport.comma')}</SelectItem>
                      <SelectItem value="dot">{t('importExport.dot')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label>{t('importExport.ignoreDuplicates')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label>{t('importExport.validateBeforeImport')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox />
                    <Label>{t('importExport.dryRun')}</Label>
                  </div>
                </div>

                <Button
                  className="w-full bg-[var(--color-info)] hover:bg-[var(--color-info)]"
                  onClick={handleImport}
                  disabled={selectedFiles.length === 0 || isImporting}
                  type="button"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Lancer l'import
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Jobs d'import en cours */}
          <Card>
            <CardHeader>
              <CardTitle>{t('importExport.currentImports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>{t('importExport.colFile')}</TableHead>
                    <TableHead>{t('importExport.colProgress')}</TableHead>
                    <TableHead>{t('importExport.colStatus')}</TableHead>
                    <TableHead>{t('importExport.colRecords')}</TableHead>
                    <TableHead>{t('importExport.colDuration')}</TableHead>
                    <TableHead>{t('importExport.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{t(job.type)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{job.fileName}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">{job.size}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <Progress value={job.progress} className="h-2" />
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{job.progress}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status === 'completed' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {job.status === 'processing' && <RefreshCw className="mr-1 h-3 w-3 animate-spin" />}
                          {job.status === 'failed' && <AlertCircle className="mr-1 h-3 w-3" />}
                          {job.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.recordsProcessed} / {job.recordsTotal}
                      </TableCell>
                      <TableCell>
                        {job.endTime ? (
                          <span className="text-sm">
                            {Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000)}s
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--color-text-tertiary)]">{t('importExport.inProgress')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {job.status === 'processing' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePauseImport(job.id)}
                              title="Mettre en pause"
                              type="button"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {job.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetryImport(job.id)}
                              title="Réessayer"
                              type="button"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReport(job.id)}
                            title="Voir le rapport"
                            type="button"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Sélection du module */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>{t('importExport.modules')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <button
                        key={module.id}
                        className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors ${
                          selectedModule === module.id ? 'bg-[var(--color-info-light)] border-[var(--color-info)] border' : ''
                        }`}
                        onClick={() => handleModuleClick(module.id)}
                        type="button"
                      >
                        <div className="flex items-center">
                          <Icon className={`h-5 w-5 text-${module.color}-600 mr-3`} />
                          <span className="font-medium">{module.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Export */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t('importExport.exportConfig')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t('importExport.exportFormat')}</Label>
                    <Select defaultValue="excel">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                        <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                        <SelectItem value="xml">XML (.xml)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('importExport.period')}</Label>
                    <Select defaultValue="current-month">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('importExport.allData')}</SelectItem>
                        <SelectItem value="current-month">{t('importExport.currentMonth')}</SelectItem>
                        <SelectItem value="last-month">{t('importExport.lastMonth')}</SelectItem>
                        <SelectItem value="current-year">{t('importExport.currentYear')}</SelectItem>
                        <SelectItem value="custom">{t('importExport.custom')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{t('importExport.fieldsToExport')}</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked />
                        <Label>{t('importExport.allFields')}</Label>
                      </div>
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">{t('importExport.fieldCode')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">{t('accounting.label')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">{t('importExport.fieldAmounts')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">{t('importExport.fieldDates')}</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    className="flex-1 bg-[var(--color-info)] hover:bg-[var(--color-info)]"
                    onClick={handleExportNow}
                    type="button"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t('importExport.exportNow')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleScheduleExport}
                    type="button"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {t('importExport.schedule')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('importExport.exportTemplates')}</CardTitle>
                <Button onClick={() => toast(t('importExport.creatingTemplate'))} type="button">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau modèle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {exportTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium flex items-center">
                          {getFormatIcon(template.format)}
                          <span className="ml-2">{template.name}</span>
                        </h4>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{template.description}</p>
                      </div>
                      <Badge variant="outline">{template.module}</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-[var(--color-text-secondary)]">
                        <FileSpreadsheet className="h-3 w-3 mr-2" />
                        Format: {template.format.toUpperCase()}
                      </div>
                      {template.schedule && (
                        <div className="flex items-center text-[var(--color-text-secondary)]">
                          <Calendar className="h-3 w-3 mr-2" />
                          Planifié: {template.schedule}
                        </div>
                      )}
                      {template.lastUsed && (
                        <div className="flex items-center text-[var(--color-text-secondary)]">
                          <Clock className="h-3 w-3 mr-2" />
                          Dernière utilisation: {template.lastUsed.toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUseTemplate(template.id)}
                        type="button"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Utiliser
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfigureTemplate(template.id)}
                        title="Configurer"
                        type="button"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('importExport.historyTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('importExport.filterAll')}</SelectItem>
                      <SelectItem value="import">Import</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="7days">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t('common.today')}</SelectItem>
                      <SelectItem value="7days">7 derniers jours</SelectItem>
                      <SelectItem value="30days">30 derniers jours</SelectItem>
                      <SelectItem value="all">{t('importExport.filterEverything')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Rechercher..." className="max-w-xs" />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>{t('importExport.colFile')}</TableHead>
                      <TableHead>{t('importExport.colModule')}</TableHead>
                      <TableHead>{t('importExport.colRecords')}</TableHead>
                      <TableHead>{t('importExport.colStatus')}</TableHead>
                      <TableHead>{t('importExport.colUser')}</TableHead>
                      <TableHead>{t('importExport.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>10/02/2024 14:30</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Upload className="mr-1 h-3 w-3" />
                          Import
                        </Badge>
                      </TableCell>
                      <TableCell>clients_janvier.csv</TableCell>
                      <TableCell>CRM</TableCell>
                      <TableCell>3,500</TableCell>
                      <TableCell>
                        <Badge className="bg-[var(--color-success-light)] text-[var(--color-success)]">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Succès
                        </Badge>
                      </TableCell>
                      <TableCell>Admin</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDownloadHistory}
                          title="Télécharger"
                          type="button"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('importExport.mappingConfig')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configurez la correspondance entre les champs de vos fichiers et les champs de l'application.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label>{t('importExport.mappingType')}</Label>
                  <Select defaultValue="customer">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">{t('navigation.clients')}</SelectItem>
                      <SelectItem value="supplier">{t('navigation.suppliers')}</SelectItem>
                      <SelectItem value="product">{t('importExport.mapProducts')}</SelectItem>
                      <SelectItem value="account">{t('importExport.mapAccounts')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{t('importExport.fieldMatching')}</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">{t('importExport.sourceField')}</Label>
                        <Select defaultValue="customer_id">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer_id">customer_id</SelectItem>
                            <SelectItem value="client_code">client_code</SelectItem>
                            <SelectItem value="code">code</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">{t('importExport.targetField')}</Label>
                        <Select defaultValue="code">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code">{t('importExport.clientCode')}</SelectItem>
                            <SelectItem value="reference">{t('importExport.reference')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => toast.success(t('importExport.mappingSaved'))}
                  type="button"
                >
                  {t('importExport.saveMapping')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Modal */}
      {showReportModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{t('importExport.importReport')}</h2>
                <button onClick={() => setShowReportModal(false)} className="text-gray-700 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg border ${
                selectedJob.status === 'completed' ? 'bg-green-50 border-green-200' :
                selectedJob.status === 'failed' ? 'bg-red-50 border-red-200' :
                selectedJob.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(selectedJob.status)}>
                      {selectedJob.status === 'completed' && <CheckCircle className="mr-1 h-4 w-4" />}
                      {selectedJob.status === 'processing' && <RefreshCw className="mr-1 h-4 w-4 animate-spin" />}
                      {selectedJob.status === 'failed' && <AlertCircle className="mr-1 h-4 w-4" />}
                      {selectedJob.status}
                    </Badge>
                    <span className="font-semibold text-gray-900">{t(selectedJob.type)}</span>
                  </div>
                </div>
              </div>

              {/* File Information */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('importExport.fileInfo')}</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('importExport.fileName')}</span>
                    <span className="font-medium text-gray-900">{selectedJob.fileName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('importExport.fileSize')}</span>
                    <span className="font-medium text-gray-900">{selectedJob.size}</span>
                  </div>
                </div>
              </div>

              {/* Timing Information */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('importExport.timeline')}</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('importExport.start')}</span>
                    <span className="font-medium text-gray-900">
                      {selectedJob.startTime.toLocaleString('fr-FR')}
                    </span>
                  </div>
                  {selectedJob.endTime && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Fin</span>
                        <span className="font-medium text-gray-900">
                          {selectedJob.endTime.toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('importExport.duration')}</span>
                        <span className="font-medium text-gray-900">
                          {Math.round((selectedJob.endTime.getTime() - selectedJob.startTime.getTime()) / 1000)}s
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Processing Statistics */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('importExport.processingStats')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">{t('importExport.processed')}</p>
                    <p className="text-lg font-bold text-blue-700">{selectedJob.recordsProcessed}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">{t('importExport.total')}</p>
                    <p className="text-lg font-bold text-green-700">{selectedJob.recordsTotal}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('importExport.progress')}</span>
                    <span className="font-medium text-gray-900">{selectedJob.progress}%</span>
                  </div>
                  <Progress value={selectedJob.progress} className="h-2" />
                </div>
              </div>

              {/* Error Messages */}
              {selectedJob.errors && selectedJob.errors.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">{t('importExport.errorsDetected', { count: String(selectedJob.errors.length) })}</h3>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
                    {selectedJob.errors.map((error, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => toast.success(t('importExport.reportDownloaded'))}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('importExport.downloadFullReport')}
                </Button>
                {selectedJob.status === 'failed' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReportModal(false);
                      handleRetryImport(selectedJob.id);
                    }}
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réessayer l'import
                  </Button>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button onClick={() => setShowReportModal(false)}>{t('importExport.close')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{t('importExport.scheduleExport')}</h2>
                <button onClick={() => setShowScheduleModal(false)} className="text-gray-700 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">{t('importExport.frequency')}</Label>
                <Select defaultValue="monthly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('importExport.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('importExport.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('importExport.schedMonthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('importExport.quarterly')}</SelectItem>
                    <SelectItem value="yearly">{t('importExport.schedAnnual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">{t('importExport.startDate')}</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">{t('importExport.time')}</Label>
                  <Input type="time" defaultValue="00:00" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">{t('importExport.colModule')}</Label>
                <Select defaultValue={selectedModule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm text-gray-700">{t('importExport.emailNotification')}</span>
                </Label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)}>{t('importExport.cancel')}</Button>
              <Button onClick={() => {
                toast.success(t('importExport.exportScheduled'));
                setShowScheduleModal(false);
              }}>
                <Calendar className="mr-2 h-4 w-4" />
                {t('importExport.schedule')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{t('importExport.settingsTitle')}</h2>
                <button onClick={() => setShowSettingsModal(false)} className="text-gray-700 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('importExport.generalSettings')}</h3>
                <div className="space-y-3">
                  <Label className="flex items-center space-x-3">
                    <Checkbox defaultChecked />
                    <span className="text-sm text-gray-700">{t('importExport.autoValidation')}</span>
                  </Label>
                  <Label className="flex items-center space-x-3">
                    <Checkbox defaultChecked />
                    <span className="text-sm text-gray-700">{t('importExport.autoBackup')}</span>
                  </Label>
                  <Label className="flex items-center space-x-3">
                    <Checkbox />
                    <span className="text-sm text-gray-700">{t('importExport.emailNotifications')}</span>
                  </Label>
                  <Label className="flex items-center space-x-3">
                    <Checkbox defaultChecked />
                    <span className="text-sm text-gray-700">{t('importExport.reportAfterImport')}</span>
                  </Label>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('importExport.limitsPerformance')}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2">{t('importExport.maxFileSize')}</Label>
                    <Input type="number" defaultValue="100" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2">{t('importExport.maxRecords')}</Label>
                    <Input type="number" defaultValue="100000" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('importExport.supportedFormatsTitle')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">Excel (.xlsx)</span>
                  </Label>
                  <Label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">CSV (.csv)</span>
                  </Label>
                  <Label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">JSON (.json)</span>
                  </Label>
                  <Label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">XML (.xml)</span>
                  </Label>
                  <Label className="flex items-center space-x-2">
                    <Checkbox />
                    <span className="text-sm">PDF (.pdf)</span>
                  </Label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowSettingsModal(false)}>{t('importExport.cancel')}</Button>
              <Button onClick={() => {
                toast.success(t('importExport.settingsSaved'));
                setShowSettingsModal(false);
              }}>
                <Check className="mr-2 h-4 w-4" />
                {t('importExport.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Module Details Modal */}
      {showModuleDetailsModal && selectedModuleDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {React.createElement(selectedModuleDetails.icon, {
                    className: `h-6 w-6 text-${selectedModuleDetails.color}-600`
                  })}
                  <h2 className="text-lg font-bold text-gray-900">{selectedModuleDetails.name}</h2>
                </div>
                <button onClick={() => setShowModuleDetailsModal(false)} className="text-gray-700 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">{t('importExport.availableExportOptions')}</h3>
                <div className="space-y-2">
                  {exportTemplates
                    .filter(t => t.module === selectedModuleDetails.name)
                    .map(template => (
                      <div key={template.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{template.name}</p>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </div>
                          <Badge className="capitalize">{template.format}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">{t('importExport.exportFormat')}</h3>
                <Select defaultValue="excel">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                    <SelectItem value="xml">XML (.xml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowModuleDetailsModal(false)}>Fermer</Button>
              <Button onClick={() => {
                toast.success(`Export du module ${selectedModuleDetails.name} lancé`);
                setShowModuleDetailsModal(false);
              }}>
                <Download className="mr-2 h-4 w-4" />
                {t('importExport.exportNow')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportPage;