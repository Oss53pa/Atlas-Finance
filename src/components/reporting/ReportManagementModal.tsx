/**
 * ReportManagementModal - Modal de catalogage des rapports
 * Permet d'organiser, versionner et valider les rapports générés
 * Inclut des disclaimers et revue humaine pour les rapports critiques
 */

import React, { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';
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

export interface ReportFormData {
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

const MOCK_FOLDERS: ReportFolder[] = [
  { id: 'f1', name: 'Rapports Mensuels 2025', reportCount: 8 },
  { id: 'f2', name: 'Analyses Trimestrielles', reportCount: 12 },
  { id: 'f3', name: 'Rapports Direction', reportCount: 5 },
  { id: 'f4', name: 'Audits Internes', reportCount: 3 },
];

const MOCK_EXISTING_REPORTS: ExistingReport[] = [
  { id: 'rpt1', reportNumber: 'RPT-2025-00089', name: 'Bilan Financier Q4 2024', version: 'v2.0', period: 'Oct - Déc 2024', createdAt: '2025-01-10', isCritical: true },
  { id: 'rpt2', reportNumber: 'RPT-2025-00076', name: 'Performance Commerciale', version: 'v1.2', period: 'Année 2024', createdAt: '2025-01-05', isCritical: false },
  { id: 'rpt3', reportNumber: 'RPT-2024-00342', name: 'Rapport Conformité OHADA', version: 'v3.1', period: '2024', createdAt: '2024-12-15', isCritical: true },
];

const MOCK_REVIEWERS: Reviewer[] = [
  { id: 'rev1', name: 'Aminata Koné', role: 'Directrice Financière', email: 'a.kone@entreprise.com' },
  { id: 'rev2', name: 'Kouamé Yao', role: 'Responsable Audit', email: 'k.yao@entreprise.com' },
  { id: 'rev3', name: 'Jean-Pierre Mensah', role: 'Directeur Général', email: 'jp.mensah@entreprise.com' },
  { id: 'rev4', name: 'Fatou Diallo', role: 'Responsable Conformité', email: 'f.diallo@entreprise.com' },
];

const generateReportNumber = (): string => {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `RPT-${year}-${sequence}`;
};

const incrementVersion = (currentVersion: string): string => {
  const match = currentVersion.match(/v(\d+)\.(\d+)/);
  if (!match) return 'v1.0';
  return `v${parseInt(match[1])}.${parseInt(match[2]) + 1}`;
};

const ReportManagementModal: React.FC<ReportManagementModalProps> = ({
  isOpen, onClose, onSubmit, reportName = '', existingReport,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState(reportName);
  const [category, setCategory] = useState('');
  const [emissionDate, setEmissionDate] = useState(today);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [folderId, setFolderId] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isNewVersion, setIsNewVersion] = useState(!!existingReport);
  const [selectedExistingReport, setSelectedExistingReport] = useState<string>(existingReport?.id || '');
  const [showExistingReports, setShowExistingReports] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [requiresReview, setRequiresReview] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showStakeholderDropdown, setShowStakeholderDropdown] = useState<string | null>(null);

  const totalReportCount = useMemo(() => MOCK_FOLDERS.reduce((acc, f) => acc + f.reportCount, 0), []);
  const selectedCategory = REPORT_CATEGORIES.find(c => c.value === category);
  const isCategoryCritical = selectedCategory?.critical || false;

  React.useEffect(() => {
    if (isCategoryCritical) { setIsCritical(true); setRequiresReview(true); }
  }, [category, isCategoryCritical]);

  const reportNumber = useMemo(() => {
    if (isNewVersion && selectedExistingReport) {
      return MOCK_EXISTING_REPORTS.find(r => r.id === selectedExistingReport)?.reportNumber || generateReportNumber();
    }
    return generateReportNumber();
  }, [isNewVersion, selectedExistingReport]);

  const version = useMemo(() => {
    if (isNewVersion && selectedExistingReport) {
      const existing = MOCK_EXISTING_REPORTS.find(r => r.id === selectedExistingReport);
      return existing ? incrementVersion(existing.version) : 'v1.0';
    }
    return 'v1.0';
  }, [isNewVersion, selectedExistingReport]);

  const addWorkflowStep = () => {
    setWorkflowSteps([...workflowSteps, {
      id: `step-${Date.now()}`, order: workflowSteps.length + 1,
      type: workflowSteps.length === 0 ? 'review' : workflowSteps.length === 1 ? 'validation' : 'approval',
      stakeholderId: '', stakeholderEmail: '', stakeholderName: '', stakeholderRole: '',
    }]);
  };

  const removeWorkflowStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter(s => s.id !== stepId).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const updateWorkflowStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflowSteps(workflowSteps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const assignStakeholder = (stepId: string, reviewer: Reviewer) => {
    updateWorkflowStep(stepId, { stakeholderId: reviewer.id, stakeholderEmail: reviewer.email, stakeholderName: reviewer.name, stakeholderRole: reviewer.role });
    setShowStakeholderDropdown(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCritical && !disclaimerAccepted) { alert('Veuillez accepter le disclaimer.'); return; }
    if (requiresReview && workflowSteps.length === 0) { alert('Configurez au moins une étape de workflow.'); return; }
    onSubmit({
      name, category, emissionDate, periodStart, periodEnd,
      folderId: isCreatingFolder ? 'new' : folderId,
      newFolderName: isCreatingFolder ? newFolderName : undefined,
      description, reportNumber, version, isNewVersion,
      replacesReportId: isNewVersion ? selectedExistingReport : undefined,
      isCritical, requiresReview,
      reviewerId: workflowSteps.length > 0 ? workflowSteps[0].stakeholderId : undefined,
      disclaimerAccepted, workflowSteps,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isNewVersion ? 'Nouvelle version du rapport' : 'Enregistrer le rapport'}
              </h2>
              <p className="text-sm text-gray-500">Cataloguez et organisez votre rapport</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Identifiants */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1"><div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Hash className="w-3.5 h-3.5" />N° d'identification</div><p className="font-mono font-semibold text-gray-900">{reportNumber}</p></div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1"><div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><GitBranch className="w-3.5 h-3.5" />Version</div><p className="font-mono font-semibold text-gray-900">{version}</p></div>
          </div>

          {/* Mode */}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setIsNewVersion(false); setSelectedExistingReport(''); }}
              className={cn('flex-1 p-3 rounded-xl border-2 text-left', !isNewVersion ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300')}>
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-600" /><span className="font-medium text-gray-900 text-sm">Nouveau rapport</span></div>
            </button>
            <button type="button" onClick={() => setIsNewVersion(true)}
              className={cn('flex-1 p-3 rounded-xl border-2 text-left', isNewVersion ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300')}>
              <div className="flex items-center gap-2"><RefreshCcw className="w-4 h-4 text-gray-600" /><span className="font-medium text-gray-900 text-sm">Nouvelle version</span></div>
            </button>
          </div>

          {/* Rapport existant */}
          {isNewVersion && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rapport à réviser</label>
              <button type="button" onClick={() => setShowExistingReports(!showExistingReports)}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300">
                {selectedExistingReport ? (
                  <div className="text-left"><p className="font-medium text-gray-900">{MOCK_EXISTING_REPORTS.find(r => r.id === selectedExistingReport)?.name}</p></div>
                ) : (<span className="text-gray-400">Sélectionner un rapport...</span>)}
                <ChevronDown className={cn('w-4 h-4 text-gray-400', showExistingReports && 'rotate-180')} />
              </button>
              {showExistingReports && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {MOCK_EXISTING_REPORTS.map((rpt) => (
                    <button key={rpt.id} type="button" onClick={() => { setSelectedExistingReport(rpt.id); setShowExistingReports(false); setName(rpt.name); if (rpt.isCritical) { setIsCritical(true); setRequiresReview(true); } }}
                      className={cn('w-full flex items-center justify-between p-3 text-left hover:bg-gray-50', selectedExistingReport === rpt.id && 'bg-gray-50')}>
                      <div className="flex items-center gap-3">
                        {rpt.isCritical && <Shield className="w-4 h-4 text-amber-500" />}
                        <div><p className="font-medium text-gray-900">{rpt.name}</p><p className="text-xs text-gray-500">{rpt.reportNumber} • {rpt.version}</p></div>
                      </div>
                      {selectedExistingReport === rpt.id && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du rapport <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Analyse financière T4 2024"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type / Catégorie <span className="text-red-500">*</span></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required>
              <option value="">Sélectionner une catégorie...</option>
              {REPORT_CATEGORIES.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label} {cat.critical && '(!)'}</option>))}
            </select>
            {isCategoryCritical && <p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Catégorie critique — revue requise</p>}
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date d'émission</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={emissionDate} onChange={(e) => setEmissionDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période couverte</label>
            <div className="flex gap-3 items-center">
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400">à</span>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-gray-400">(optionnel)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Résumé ou notes..."
              rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Validation & conformité */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2"><Shield className="w-4 h-4 text-gray-600" />Validation et conformité</h4>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className={cn('w-5 h-5', isCritical ? 'text-amber-500' : 'text-gray-400')} />
                <div><p className="font-medium text-gray-900">Rapport critique</p><p className="text-xs text-gray-500">Financiers, stratégiques ou réglementaires</p></div>
              </div>
              <button type="button" onClick={() => { setIsCritical(!isCritical); if (!isCritical) setRequiresReview(true); }} disabled={isCategoryCritical}
                className={cn('relative w-12 h-6 rounded-full transition-colors', isCritical ? 'bg-amber-500' : 'bg-gray-300', isCategoryCritical && 'opacity-70 cursor-not-allowed')}>
                <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', isCritical ? 'translate-x-7' : 'translate-x-1')} />
              </button>
            </div>

            {isCritical && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-amber-600" />
                    <div><p className="font-medium text-amber-900">Workflow de validation</p><p className="text-xs text-amber-600">Étapes de revue et d'approbation</p></div>
                  </div>
                  <button type="button" onClick={() => setRequiresReview(!requiresReview)}
                    className={cn('relative w-12 h-6 rounded-full transition-colors', requiresReview ? 'bg-amber-500' : 'bg-gray-300')}>
                    <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', requiresReview ? 'translate-x-7' : 'translate-x-1')} />
                  </button>
                </div>

                {requiresReview && (
                  <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900 flex items-center gap-2"><Users className="w-4 h-4" />Étapes du workflow</h5>
                      <button type="button" onClick={addWorkflowStep} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        <Plus className="w-4 h-4" />Ajouter
                      </button>
                    </div>
                    {workflowSteps.length === 0 ? (
                      <div className="text-center py-6 text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Aucune étape configurée</p></div>
                    ) : (
                      <div className="space-y-3">
                        {workflowSteps.map((step) => (
                          <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                              step.type === 'review' ? 'bg-blue-100 text-blue-600' : step.type === 'validation' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600')}>
                              {step.order}
                            </div>
                            <div className="flex-1 space-y-2">
                              <select value={step.type} onChange={(e) => updateWorkflowStep(step.id, { type: e.target.value as WorkflowStep['type'] })}
                                className={cn('px-3 py-1.5 text-sm font-medium rounded-lg border-0',
                                  step.type === 'review' ? 'bg-blue-100 text-blue-700' : step.type === 'validation' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>
                                <option value="review">Revue</option><option value="validation">Validation</option><option value="approval">Approbation</option>
                              </select>
                              <div className="relative">
                                <button type="button" onClick={() => setShowStakeholderDropdown(showStakeholderDropdown === step.id ? null : step.id)}
                                  className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300">
                                  {step.stakeholderId ? (
                                    <div className="flex items-center gap-2 text-left">
                                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"><UserCheck className="w-3.5 h-3.5 text-gray-600" /></div>
                                      <div><p className="text-sm font-medium text-gray-900">{step.stakeholderName}</p><p className="text-xs text-gray-500">{step.stakeholderRole}</p></div>
                                    </div>
                                  ) : (<span className="text-sm text-gray-400">Sélectionner...</span>)}
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>
                                {showStakeholderDropdown === step.id && (
                                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {MOCK_REVIEWERS.map((reviewer) => (
                                      <button key={reviewer.id} type="button" onClick={() => assignStakeholder(step.id, reviewer)}
                                        className={cn('w-full flex items-center gap-2 p-2 text-left hover:bg-gray-50', step.stakeholderId === reviewer.id && 'bg-gray-50')}>
                                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"><UserCheck className="w-3.5 h-3.5 text-gray-600" /></div>
                                        <div className="flex-1"><p className="text-sm font-medium text-gray-900">{reviewer.name}</p><p className="text-xs text-gray-500">{reviewer.role}</p></div>
                                        {step.stakeholderId === reviewer.id && <CheckCircle className="w-4 h-4 text-green-500" />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {step.stakeholderEmail && <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="w-3.5 h-3.5" />{step.stakeholderEmail}</div>}
                            </div>
                            <button type="button" onClick={() => removeWorkflowStep(step.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {workflowSteps.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 flex items-center gap-2"><Info className="w-3.5 h-3.5" />{workflowSteps.length} étape{workflowSteps.length > 1 ? 's' : ''} — Notifications email à chaque étape</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            {isCritical && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-800">Avertissement — Rapport Critique</p>
                    <ul className="mt-2 space-y-1 text-red-700">
                      <li>• Données sensibles et/ou stratégiques</li>
                      <li>• Vérification requise avant diffusion</li>
                      <li>• Revue humaine fortement recommandée</li>
                    </ul>
                  </div>
                </div>
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200 cursor-pointer">
                  <input type="checkbox" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-red-300 rounded" />
                  <span className="text-sm text-red-800">J'ai lu et compris les avertissements. Les données seront vérifiées avant publication.</span>
                </label>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Information</p>
              <p className="text-blue-600">Nous recommandons une vérification humaine pour tous les rapports destinés à la prise de décision.</p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium">Annuler</button>
          <div className="flex gap-3">
            {!isNewVersion && (
              <button type="button" onClick={() => setIsNewVersion(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-white">
                <RefreshCcw className="w-4 h-4" />Nouvelle version
              </button>
            )}
            <button type="submit" onClick={handleSubmit} disabled={isCritical && !disclaimerAccepted}
              className={cn('flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium',
                isCritical && !disclaimerAccepted ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800')}>
              {requiresReview ? (<><Eye className="w-4 h-4" />Soumettre pour revue</>) : (<><CheckCircle className="w-4 h-4" />{isNewVersion ? 'Créer nouvelle version' : 'Enregistrer'}</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportManagementModal;
