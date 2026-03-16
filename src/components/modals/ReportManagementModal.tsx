/**
 * ReportManagementModal - Modal de catalogage des rapports
 * Permet d'organiser, versionner et valider les rapports générés
 * Inclut des disclaimers et revue humaine pour les rapports critiques
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import {
  X,
  FileText,
  Calendar,
  FolderPlus,
  Hash,
  GitBranch,
  CheckCircle,
  RefreshCcw,
  AlertCircle,
  ChevronDown,
  Shield,
  AlertTriangle,
  UserCheck,
  Info,
  Eye,
  Folder,
  BarChart3,
  Plus,
  Trash2,
  Mail,
  ArrowDown,
  GripVertical,
  Users,
} from 'lucide-react';

// Types
interface ReportFolder {
  id: string;
  name: string;
  reportCount: number;
}

interface ExistingReport {
  id: string;
  reportNumber: string;
  name: string;
  version: string;
  period: string;
  createdAt: string;
  isCritical: boolean;
}

interface Reviewer {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

interface WorkflowStep {
  id: string;
  order: number;
  type: 'review' | 'validation' | 'approval';
  stakeholderId: string;
  stakeholderEmail: string;
  stakeholderName: string;
  stakeholderRole: string;
}

interface ReportManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
  reportName?: string;
  existingReport?: ExistingReport;
}

interface ReportFormData {
  name: string;
  category: string;
  emissionDate: string;
  periodStart: string;
  periodEnd: string;
  folderId: string;
  newFolderName?: string;
  description: string;
  reportNumber: string;
  version: string;
  isNewVersion: boolean;
  replacesReportId?: string;
  isCritical: boolean;
  requiresReview: boolean;
  reviewerId?: string;
  disclaimerAccepted: boolean;
  workflowSteps: WorkflowStep[];
}

// Catégories de rapports
const REPORT_CATEGORIES = [
  { value: 'financier', label: 'Financier', critical: true },
  { value: 'operationnel', label: 'Opérationnel', critical: false },
  { value: 'strategique', label: 'Stratégique', critical: true },
  { value: 'commercial', label: 'Commercial', critical: false },
  { value: 'rh', label: 'Ressources Humaines', critical: false },
  { value: 'conformite', label: 'Conformité / Réglementaire', critical: true },
  { value: 'performance', label: 'Performance', critical: false },
  { value: 'previsionnel', label: 'Prévisionnel', critical: true },
  { value: 'audit', label: 'Audit', critical: true },
  { value: 'autre', label: 'Autre', critical: false },
];

// Données par défaut — remplacées par les données DataAdapter quand disponibles
const DEFAULT_FOLDERS: ReportFolder[] = [
  { id: 'f1', name: 'Rapports Mensuels 2025', reportCount: 8 },
  { id: 'f2', name: 'Analyses Trimestrielles', reportCount: 12 },
  { id: 'f3', name: 'Rapports Direction', reportCount: 5 },
  { id: 'f4', name: 'Audits Internes', reportCount: 3 },
];

// Mock existing reports
const DEFAULT_REPORTS: ExistingReport[] = [
  { id: 'rpt1', reportNumber: 'RPT-2025-00089', name: 'Bilan Financier Q4 2024', version: 'v2.0', period: 'Oct - Déc 2024', createdAt: '2025-01-10', isCritical: true },
  { id: 'rpt2', reportNumber: 'RPT-2025-00076', name: 'Performance Commerciale', version: 'v1.2', period: 'Année 2024', createdAt: '2025-01-05', isCritical: false },
  { id: 'rpt3', reportNumber: 'RPT-2024-00342', name: 'Rapport Conformité OHADA', version: 'v3.1', period: '2024', createdAt: '2024-12-15', isCritical: true },
];

// Mock reviewers
const DEFAULT_REVIEWERS: Reviewer[] = [
  { id: 'rev1', name: 'Aminata Koné', role: 'Directrice Financière', email: 'a.kone@entreprise.com' },
  { id: 'rev2', name: 'Kouamé Yao', role: 'Responsable Audit', email: 'k.yao@entreprise.com' },
  { id: 'rev3', name: 'Jean-Pierre Mensah', role: 'Directeur Général', email: 'jp.mensah@entreprise.com' },
  { id: 'rev4', name: 'Fatou Diallo', role: 'Responsable Conformité', email: 'f.diallo@entreprise.com' },
  { id: 'rev5', name: 'Ibrahim Touré', role: 'Directeur Financier', email: 'i.toure@entreprise.com' },
  { id: 'rev6', name: 'Marie Kouassi', role: 'Contrôleuse de Gestion', email: 'm.kouassi@entreprise.com' },
];

// Types d'étapes de workflow
const WORKFLOW_STEP_TYPES = [
  { value: 'review', label: 'Revue', icon: 'Eye', color: 'text-blue-600 bg-blue-100' },
  { value: 'validation', label: 'Validation', icon: 'CheckCircle', color: 'text-amber-600 bg-amber-100' },
  { value: 'approval', label: 'Approbation', icon: 'Shield', color: 'text-green-600 bg-green-100' },
];

// Générer un numéro de rapport
const generateReportNumber = (): string => {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `RPT-${year}-${sequence}`;
};

// Incrémenter la version
const incrementVersion = (currentVersion: string, isMajor: boolean = false): string => {
  const match = currentVersion.match(/v(\d+)\.(\d+)/);
  if (!match) return 'v1.0';

  const major = parseInt(match[1]);
  const minor = parseInt(match[2]);

  if (isMajor) {
    return `v${major + 1}.0`;
  }
  return `v${major}.${minor + 1}`;
};

const ReportManagementModal: React.FC<ReportManagementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reportName = '',
  existingReport,
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Form state
  const [name, setName] = useState(reportName);
  const [category, setCategory] = useState('');
  const [emissionDate, setEmissionDate] = useState(today);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [folderId, setFolderId] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [description, setDescription] = useState('');

  // Versioning state
  const [isNewVersion, setIsNewVersion] = useState(!!existingReport);
  const [selectedExistingReport, setSelectedExistingReport] = useState<string>(existingReport?.id || '');
  const [showExistingReports, setShowExistingReports] = useState(false);

  // Critical report & review state
  const [isCritical, setIsCritical] = useState(false);
  const [requiresReview, setRequiresReview] = useState(false);
  const [reviewerId, setReviewerId] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showReviewerDropdown, setShowReviewerDropdown] = useState(false);

  // Folder dropdown state
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);

  // Workflow state
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showStakeholderDropdown, setShowStakeholderDropdown] = useState<string | null>(null);

  // Total report count
  const totalReportCount = useMemo(() => {
    return DEFAULT_FOLDERS.reduce((acc, folder) => acc + folder.reportCount, 0);
  }, []);

  // Workflow helper functions
  const addWorkflowStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      order: workflowSteps.length + 1,
      type: workflowSteps.length === 0 ? 'review' : workflowSteps.length === 1 ? 'validation' : 'approval',
      stakeholderId: '',
      stakeholderEmail: '',
      stakeholderName: '',
      stakeholderRole: '',
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const removeWorkflowStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter(s => s.id !== stepId).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const updateWorkflowStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflowSteps(workflowSteps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const assignStakeholder = (stepId: string, reviewer: Reviewer) => {
    updateWorkflowStep(stepId, {
      stakeholderId: reviewer.id,
      stakeholderEmail: reviewer.email,
      stakeholderName: reviewer.name,
      stakeholderRole: reviewer.role,
    });
    setShowStakeholderDropdown(null);
  };

  // Auto-detect critical based on category
  const selectedCategory = REPORT_CATEGORIES.find(c => c.value === category);
  const isCategoryCritical = selectedCategory?.critical || false;

  // Update critical status when category changes
  React.useEffect(() => {
    if (isCategoryCritical) {
      setIsCritical(true);
      setRequiresReview(true);
    }
  }, [category, isCategoryCritical]);

  // Generated values
  const reportNumber = useMemo(() => {
    if (isNewVersion && selectedExistingReport) {
      const existing = DEFAULT_REPORTS.find(r => r.id === selectedExistingReport);
      return existing?.reportNumber || generateReportNumber();
    }
    return generateReportNumber();
  }, [isNewVersion, selectedExistingReport]);

  const version = useMemo(() => {
    if (isNewVersion && selectedExistingReport) {
      const existing = DEFAULT_REPORTS.find(r => r.id === selectedExistingReport);
      return existing ? incrementVersion(existing.version) : 'v1.0';
    }
    return 'v1.0';
  }, [isNewVersion, selectedExistingReport]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCritical && !disclaimerAccepted) {
      alert('Veuillez accepter le disclaimer pour les rapports critiques.');
      return;
    }

    if (requiresReview && workflowSteps.length === 0) {
      alert('Veuillez configurer au moins une étape de workflow.');
      return;
    }

    if (requiresReview && workflowSteps.some(s => !s.stakeholderId)) {
      alert('Veuillez assigner une partie prenante à chaque étape du workflow.');
      return;
    }

    onSubmit({
      name,
      category,
      emissionDate,
      periodStart,
      periodEnd,
      folderId: isCreatingFolder ? 'new' : folderId,
      newFolderName: isCreatingFolder ? newFolderName : undefined,
      description,
      reportNumber,
      version,
      isNewVersion,
      replacesReportId: isNewVersion ? selectedExistingReport : undefined,
      isCritical,
      requiresReview,
      reviewerId: workflowSteps.length > 0 ? workflowSteps[0].stakeholderId : undefined,
      disclaimerAccepted,
      workflowSteps,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100 bg-primary-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary-900">
                {isNewVersion ? 'Nouvelle version du rapport' : 'Enregistrer le rapport'}
              </h2>
              <p className="text-sm text-primary-500">
                Cataloguez et organisez votre rapport
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-primary-100 text-primary-400 hover:text-primary-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Identifiants auto-générés */}
          <div className="flex gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-primary-500 mb-1">
                <Hash className="w-3.5 h-3.5" />
                N° d'identification
              </div>
              <p className="font-mono font-semibold text-primary-900">{reportNumber}</p>
            </div>
            <div className="w-px bg-primary-200" />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-primary-500 mb-1">
                <GitBranch className="w-3.5 h-3.5" />
                Version
              </div>
              <p className="font-mono font-semibold text-primary-900">{version}</p>
            </div>
          </div>

          {/* Mode nouvelle version */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsNewVersion(false);
                setSelectedExistingReport('');
              }}
              className={cn(
                'flex-1 p-3 rounded-xl border-2 text-left transition-all',
                !isNewVersion
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-primary-200 hover:border-primary-300'
              )}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-primary-900 text-sm">Nouveau rapport</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsNewVersion(true)}
              className={cn(
                'flex-1 p-3 rounded-xl border-2 text-left transition-all',
                isNewVersion
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-primary-200 hover:border-primary-300'
              )}
            >
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-primary-900 text-sm">Nouvelle version</span>
              </div>
            </button>
          </div>

          {/* Sélection rapport existant */}
          {isNewVersion && (
            <div className="relative">
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Rapport à réviser
              </label>
              <button
                type="button"
                onClick={() => setShowExistingReports(!showExistingReports)}
                className="w-full flex items-center justify-between px-4 py-3 border border-primary-200 rounded-xl bg-white hover:border-primary-300 transition-colors"
              >
                {selectedExistingReport ? (
                  <div className="text-left">
                    <p className="font-medium text-primary-900">
                      {DEFAULT_REPORTS.find(r => r.id === selectedExistingReport)?.name}
                    </p>
                    <p className="text-xs text-primary-500">
                      {DEFAULT_REPORTS.find(r => r.id === selectedExistingReport)?.reportNumber} • {DEFAULT_REPORTS.find(r => r.id === selectedExistingReport)?.version}
                    </p>
                  </div>
                ) : (
                  <span className="text-primary-400">Sélectionner un rapport existant...</span>
                )}
                <ChevronDown className={cn('w-4 h-4 text-primary-400 transition-transform', showExistingReports && 'rotate-180')} />
              </button>

              {showExistingReports && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-primary-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {DEFAULT_REPORTS.map((rpt) => (
                    <button
                      key={rpt.id}
                      type="button"
                      onClick={() => {
                        setSelectedExistingReport(rpt.id);
                        setShowExistingReports(false);
                        setName(rpt.name);
                        if (rpt.isCritical) {
                          setIsCritical(true);
                          setRequiresReview(true);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-3 text-left hover:bg-primary-50 transition-colors',
                        selectedExistingReport === rpt.id && 'bg-primary-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {rpt.isCritical && (
                          <Shield className="w-4 h-4 text-amber-500" />
                        )}
                        <div>
                          <p className="font-medium text-primary-900">{rpt.name}</p>
                          <p className="text-xs text-primary-500">{rpt.reportNumber} • {rpt.version} • {rpt.period}</p>
                        </div>
                      </div>
                      {selectedExistingReport === rpt.id && (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nom du rapport */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Nom du rapport <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Analyse financière T4 2024"
              className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Type/Catégorie */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Type / Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              required
            >
              <option value="">Sélectionner une catégorie...</option>
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} {cat.critical && '(!)'}
                </option>
              ))}
            </select>
            {isCategoryCritical && (
              <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Cette catégorie est considérée comme critique et nécessite une revue
              </p>
            )}
          </div>

          {/* Date d'émission */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Date d'émission
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-primary-400" />
              <input
                type="date"
                value={emissionDate}
                onChange={(e) => setEmissionDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Période couverte */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Période couverte
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <span className="text-primary-400">à</span>
              <div className="flex-1">
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Dossier rapport */}
          <div className="relative">
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Dossier du rapport
            </label>
            {!isCreatingFolder ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-primary-200 rounded-xl bg-white hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {folderId === '' || folderId === 'all' ? (
                      <>
                        <BarChart3 className="w-5 h-5 text-primary-600" />
                        <div className="text-left">
                          <p className="font-medium text-primary-900">All Reports</p>
                          <p className="text-xs text-primary-500">{totalReportCount} rapports</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Folder className="w-5 h-5 text-amber-500" />
                        <div className="text-left">
                          <p className="font-medium text-primary-900">
                            {DEFAULT_FOLDERS.find(f => f.id === folderId)?.name}
                          </p>
                          <p className="text-xs text-primary-500">
                            {DEFAULT_FOLDERS.find(f => f.id === folderId)?.reportCount} rapports
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-primary-400 transition-transform', showFolderDropdown && 'rotate-180')} />
                </button>

                {showFolderDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-primary-200 rounded-xl shadow-lg overflow-hidden">
                    {/* All Reports */}
                    <button
                      type="button"
                      onClick={() => {
                        setFolderId('all');
                        setShowFolderDropdown(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 text-left hover:bg-primary-50 transition-colors',
                        (folderId === '' || folderId === 'all') && 'bg-primary-50'
                      )}
                    >
                      <BarChart3 className="w-5 h-5 text-primary-600" />
                      <div className="flex-1">
                        <p className="font-medium text-primary-900">All Reports</p>
                      </div>
                      <span className="text-xs font-medium text-primary-500 bg-primary-100 px-2 py-0.5 rounded-full">
                        {totalReportCount}
                      </span>
                      {(folderId === '' || folderId === 'all') && (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                    </button>

                    {/* Separator */}
                    <div className="border-t border-primary-100" />

                    {/* Folders */}
                    {DEFAULT_FOLDERS.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setFolderId(folder.id);
                          setShowFolderDropdown(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 text-left hover:bg-primary-50 transition-colors',
                          folderId === folder.id && 'bg-primary-50'
                        )}
                      >
                        <Folder className="w-5 h-5 text-amber-500" />
                        <div className="flex-1">
                          <p className="font-medium text-primary-900">{folder.name}</p>
                        </div>
                        <span className="text-xs font-medium text-primary-500 bg-primary-100 px-2 py-0.5 rounded-full">
                          {folder.reportCount}
                        </span>
                        {folderId === folder.id && (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                      </button>
                    ))}

                    {/* Separator */}
                    <div className="border-t border-primary-100" />

                    {/* New folder */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowFolderDropdown(false);
                        setIsCreatingFolder(true);
                      }}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/10 transition-colors text-accent"
                    >
                      <FolderPlus className="w-5 h-5" />
                      <p className="font-medium">New folder</p>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <FolderPlus className="absolute left-4 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-primary-400" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nom du nouveau dossier..."
                    className="w-full pl-11 pr-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-4 py-3 border border-primary-200 rounded-xl hover:bg-primary-50 text-primary-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Description <span className="text-primary-400">(optionnel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Résumé ou notes sur ce rapport..."
              rows={3}
              className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Section Rapport Critique & Revue */}
          <div className="border-t border-primary-100 pt-5 space-y-4">
            <h4 className="font-medium text-primary-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" />
              Validation et conformité
            </h4>

            {/* Rapport critique toggle */}
            <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className={cn('w-5 h-5', isCritical ? 'text-amber-500' : 'text-primary-400')} />
                <div>
                  <p className="font-medium text-primary-900">Rapport critique</p>
                  <p className="text-xs text-primary-500">Rapports financiers, stratégiques ou réglementaires</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCritical(!isCritical);
                  if (!isCritical) setRequiresReview(true);
                }}
                disabled={isCategoryCritical}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  isCritical ? 'bg-amber-500' : 'bg-primary-300',
                  isCategoryCritical && 'opacity-70 cursor-not-allowed'
                )}
              >
                <span className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  isCritical ? 'tranprimary-x-7' : 'tranprimary-x-1'
                )} />
              </button>
            </div>

            {/* Revue humaine */}
            {isCritical && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">Workflow de validation</p>
                      <p className="text-xs text-amber-600">Configurez les étapes de revue et d'approbation</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequiresReview(!requiresReview)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors',
                      requiresReview ? 'bg-amber-500' : 'bg-primary-300'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      requiresReview ? 'tranprimary-x-7' : 'tranprimary-x-1'
                    )} />
                  </button>
                </div>

                {/* Configuration du workflow */}
                {requiresReview && (
                  <div className="space-y-4 p-4 bg-white border border-primary-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-primary-900 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Étapes du workflow
                      </h5>
                      <button
                        type="button"
                        onClick={addWorkflowStep}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter
                      </button>
                    </div>

                    {workflowSteps.length === 0 ? (
                      <div className="text-center py-6 text-primary-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aucune étape configurée</p>
                        <p className="text-xs">Cliquez sur "Ajouter" pour créer une étape</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {workflowSteps.map((step, index) => (
                          <div key={step.id} className="relative">
                            {/* Connector line */}
                            {index < workflowSteps.length - 1 && (
                              <div className="absolute left-6 top-full w-0.5 h-3 bg-primary-200 z-0" />
                            )}

                            <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
                              {/* Step number */}
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                                step.type === 'review' ? 'bg-blue-100 text-blue-600' :
                                step.type === 'validation' ? 'bg-amber-100 text-amber-600' :
                                'bg-green-100 text-green-600'
                              )}>
                                {step.order}
                              </div>

                              <div className="flex-1 space-y-2">
                                {/* Step type selector */}
                                <div className="flex items-center gap-2">
                                  <select
                                    value={step.type}
                                    onChange={(e) => updateWorkflowStep(step.id, { type: e.target.value as WorkflowStep['type'] })}
                                    className={cn(
                                      'px-3 py-1.5 text-sm font-medium rounded-lg border-0 focus:ring-2',
                                      step.type === 'review' ? 'bg-blue-100 text-blue-700 focus:ring-blue-300' :
                                      step.type === 'validation' ? 'bg-amber-100 text-amber-700 focus:ring-amber-300' :
                                      'bg-green-100 text-green-700 focus:ring-green-300'
                                    )}
                                  >
                                    <option value="review">Revue</option>
                                    <option value="validation">Validation</option>
                                    <option value="approval">Approbation</option>
                                  </select>
                                  <span className="text-xs text-primary-400">
                                    {step.type === 'review' ? '(1ère lecture)' :
                                     step.type === 'validation' ? '(vérification)' :
                                     '(approbation finale)'}
                                  </span>
                                </div>

                                {/* Stakeholder selector */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setShowStakeholderDropdown(showStakeholderDropdown === step.id ? null : step.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-white border border-primary-200 rounded-lg hover:border-primary-300 transition-colors"
                                  >
                                    {step.stakeholderId ? (
                                      <div className="flex items-center gap-2 text-left">
                                        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                                          <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-primary-900">{step.stakeholderName}</p>
                                          <p className="text-xs text-primary-500">{step.stakeholderRole}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-primary-400">Sélectionner une partie prenante...</span>
                                    )}
                                    <ChevronDown className={cn(
                                      'w-4 h-4 text-primary-400 transition-transform',
                                      showStakeholderDropdown === step.id && 'rotate-180'
                                    )} />
                                  </button>

                                  {showStakeholderDropdown === step.id && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-primary-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                      {DEFAULT_REVIEWERS.map((reviewer) => (
                                        <button
                                          key={reviewer.id}
                                          type="button"
                                          onClick={() => assignStakeholder(step.id, reviewer)}
                                          className={cn(
                                            'w-full flex items-center gap-2 p-2 text-left hover:bg-primary-50 transition-colors',
                                            step.stakeholderId === reviewer.id && 'bg-primary-50'
                                          )}
                                        >
                                          <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                                            <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-primary-900">{reviewer.name}</p>
                                            <p className="text-xs text-primary-500">{reviewer.role}</p>
                                          </div>
                                          {step.stakeholderId === reviewer.id && (
                                            <CheckCircle className="w-4 h-4 text-success" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Email display */}
                                {step.stakeholderEmail && (
                                  <div className="flex items-center gap-2 text-xs text-primary-500">
                                    <Mail className="w-3.5 h-3.5" />
                                    {step.stakeholderEmail}
                                  </div>
                                )}
                              </div>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => removeWorkflowStep(step.id)}
                                className="p-1.5 text-primary-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Workflow summary */}
                    {workflowSteps.length > 0 && (
                      <div className="pt-3 border-t border-primary-100">
                        <p className="text-xs text-primary-500 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" />
                          {workflowSteps.length} étape{workflowSteps.length > 1 ? 's' : ''} configurée{workflowSteps.length > 1 ? 's' : ''} •
                          Notifications envoyées par email à chaque étape
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer pour rapports critiques */}
            {isCritical && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-800">Avertissement - Rapport Critique</p>
                    <ul className="mt-2 space-y-1 text-red-700">
                      <li>• Ce rapport contient des données sensibles et/ou stratégiques</li>
                      <li>• Les informations doivent être vérifiées avant toute diffusion</li>
                      <li>• Une revue humaine est fortement recommandée</li>
                      <li>• <span className="font-display text-base">Proph3t</span> peut générer des erreurs - vérifiez les calculs importants</li>
                    </ul>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-red-800">
                    J'ai lu et compris les avertissements. Je confirme que les données seront vérifiées avant publication.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Info disclaimer général */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Information</p>
              <p className="text-blue-600">
                Ce rapport est généré à partir de vos données. Bien que l'IA analyse et structure les informations,
                nous recommandons une vérification humaine pour tous les rapports destinés à la prise de décision.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-primary-100 bg-primary-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-primary-600 hover:text-primary-900 font-medium transition-colors"
          >
            Annuler
          </button>
          <div className="flex gap-3">
            {!isNewVersion && (
              <button
                type="button"
                onClick={() => setIsNewVersion(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-primary-300 text-primary-700 rounded-xl font-medium hover:bg-white transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Nouvelle version
              </button>
            )}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isCritical && !disclaimerAccepted}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors',
                isCritical && !disclaimerAccepted
                  ? 'bg-primary-300 text-primary-500 cursor-not-allowed'
                  : 'bg-primary-900 text-white hover:bg-primary-800'
              )}
            >
              {requiresReview ? (
                <>
                  <Eye className="w-4 h-4" />
                  Soumettre pour revue
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isNewVersion ? 'Créer nouvelle version' : 'Enregistrer'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportManagementModal;
