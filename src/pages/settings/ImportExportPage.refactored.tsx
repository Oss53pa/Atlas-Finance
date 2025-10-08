import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowUpDown,
  Settings as SettingsIcon,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Play
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
  TableCell
} from '../../components/ui';
import {
  FileUpload,
  ExportButton,
  ImportButton,
  ScheduleModal,
  ActionButtons,
  MappingModal,
  SettingsButton,
  DownloadButton
} from '../../components/common';
import type { ActionButton, ScheduleConfig, MappingConfig } from '../../components/common';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface ImportJob {
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

const ImportExportPageRefactored: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('import');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<'import' | 'export' | 'backup'>('export');

  // Mock data for import jobs
  const [importJobs] = useState<ImportJob[]>([
    {
      id: '1',
      type: 'Plan Comptable',
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
      type: 'Clients',
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
      type: 'Écritures Comptables',
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

  const exportTemplates = [
    {
      id: '1',
      name: 'Balance Générale',
      description: 'Export complet de la balance avec soldes',
      format: 'excel',
      module: 'Comptabilité',
      schedule: 'Mensuel'
    },
    {
      id: '2',
      name: 'Liste Clients',
      description: 'Export des clients avec informations complètes',
      format: 'csv',
      module: 'CRM'
    }
  ];

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

  const getJobActions = (job: ImportJob): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (job.status === 'processing') {
      actions.push({ type: 'pause', tooltip: 'Mettre en pause' });
    }

    if (job.status === 'failed') {
      actions.push({
        type: 'refresh',
        tooltip: 'Réessayer',
        onClick: () => toast.info('Relance de l\'import...')
      });
    }

    actions.push({
      type: 'report',
      tooltip: 'Voir le rapport',
      onClick: () => toast.info('Affichage du rapport...')
    });

    if (job.status === 'completed' || job.status === 'failed') {
      actions.push({
        type: 'download',
        tooltip: 'Télécharger le rapport',
        onClick: () => toast.success('Téléchargement du rapport...')
      });
    }

    return actions;
  };

  const handleScheduleSave = (config: ScheduleConfig) => {
    console.log('Schedule saved:', config);
    toast.success(`Planification "${config.name}" créée avec succès !`);
  };

  const handleMappingSave = (config: MappingConfig) => {
    console.log('Mapping saved:', config);
    toast.success(`Mapping "${config.name}" sauvegardé avec succès !`);
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
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center">
              <ArrowUpDown className="mr-3 h-7 w-7 text-[var(--color-info)]" />
              Import / Export de Données
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Importez et exportez vos données dans différents formats
            </p>
          </div>
          <div className="flex space-x-2">
            <SettingsButton
              onClick={() => toast.info('Paramètres d\'import/export')}
              label="Paramètres"
            />
            <Button
              className="bg-[var(--color-info)] hover:bg-[var(--color-info)]"
              onClick={() => {
                setScheduleType('export');
                setShowScheduleModal(true);
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Planifier
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Zone de téléchargement avec composant réutilisable */}
            <Card>
              <CardHeader>
                <CardTitle>Zone d'Import</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFilesSelect={(files) => console.log('Files selected:', files)}
                  accept=".csv,.xlsx,.xls,.json,.xml"
                  maxSize={50}
                />
                <div className="mt-4">
                  <ImportButton
                    module="Comptabilité"
                    className="w-full"
                    onImport={(files, options) => {
                      console.log('Import started:', files, options);
                      toast.success('Import lancé avec succès !');
                    }}
                    label="Lancer l'import"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ImportButton module="Clients" className="w-full" />
                <ImportButton module="Fournisseurs" className="w-full" />
                <ImportButton module="Articles" className="w-full" />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMappingModal(true)}
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Configurer le mapping
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Jobs d'import en cours avec ActionButtons */}
          <Card>
            <CardHeader>
              <CardTitle>Imports en cours et récents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Enregistrements</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.type}</TableCell>
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
                          <span className="text-sm text-[var(--color-text-tertiary)]">En cours...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ActionButtons actions={getJobActions(job)} />
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
          <Card>
            <CardHeader>
              <CardTitle>Exports rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ExportButton module="Comptabilité" variant="outline" className="w-full" />
                <ExportButton module="Clients" variant="outline" className="w-full" />
                <ExportButton module="Fournisseurs" variant="outline" className="w-full" />
                <ExportButton module="Stock" variant="outline" className="w-full" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Modèles d'Export</CardTitle>
                <Button>
                  <Play className="mr-2 h-4 w-4" />
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
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          {template.name}
                        </h4>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <ExportButton
                        module={template.module}
                        size="sm"
                        className="flex-1"
                        label="Utiliser"
                      />
                      <SettingsButton />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowMappingModal(true)}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Configurer un nouveau mapping
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals réutilisables */}
      <ScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        type={scheduleType}
        module="Comptabilité"
        onSave={handleScheduleSave}
      />

      <MappingModal
        open={showMappingModal}
        onOpenChange={setShowMappingModal}
        dataType="customers"
        onSave={handleMappingSave}
      />
    </div>
  );
};

export default ImportExportPageRefactored;
