import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import {
  GitBranch, CheckCircle, XCircle, Clock, Play, Pause,
  SkipForward, AlertTriangle, User, Users, Calendar,
  FileText, DollarSign, Package, Settings, ChevronRight,
  Plus, Edit, Trash2, Eye, Download, Upload, RefreshCw,
  Shield, Zap, Activity, BarChart3, Send, MessageSquare,
  Bell, Flag, Timer, Archive, Filter, Search, ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { useFormattedCurrency } from '../../hooks/useMoneyFormat';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'action' | 'condition' | 'notification';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  assignee?: string;
  dueDate?: Date;
  completedAt?: Date;
  conditions?: string[];
  actions?: string[];
  nextSteps?: string[];
}

interface Workflow {
  id: string;
  name: string;
  category: 'finance' | 'purchase' | 'sales' | 'hr' | 'inventory';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  currentStep: number;
  totalSteps: number;
  progress: number;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  steps: WorkflowStep[];
  triggers: string[];
  description: string;
}

interface ApprovalRequest {
  id: string;
  workflowId: string;
  type: string;
  title: string;
  description: string;
  requester: string;
  amount?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: Date;
  dueDate: Date;
  attachments?: string[];
  comments?: { user: string; text: string; timestamp: Date }[];
}

const WorkflowsManager: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const fmtCur = useFormattedCurrency();
  const [activeTab, setActiveTab] = useState<'workflows' | 'approvals' | 'templates'>('workflows');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [filter, setFilter] = useState({ status: 'all', category: 'all' });
  const [searchQuery, setSearchQuery] = useState('');

  // Workflows built from real journal entry statuses
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [templates] = useState([
    { id: 't1', name: 'Validation écriture comptable', category: 'finance' as const, steps: 3, uses: 0 },
    { id: 't2', name: 'Clôture mensuelle', category: 'finance' as const, steps: 5, uses: 0 },
  ]);

  useEffect(() => {
    const loadWorkflowData = async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');

        const draftEntries = entries.filter((e: any) => e.status === 'draft');
        const validatedEntries = entries.filter((e: any) => e.status === 'validated');
        const postedEntries = entries.filter((e: any) => e.status === 'posted');

        // Build workflows from entry status groups
        const builtWorkflows: Workflow[] = [];

        if (draftEntries.length > 0) {
          builtWorkflows.push({
            id: 'wf-draft',
            name: `Validation écritures brouillon (${draftEntries.length})`,
            category: 'finance',
            status: 'active',
            priority: 'high',
            currentStep: 1,
            totalSteps: 3,
            progress: 33,
            createdBy: 'Système',
            createdAt: new Date(draftEntries[0]?.createdAt || Date.now()),
            lastModified: new Date(),
            description: `${draftEntries.length} écriture(s) en brouillon nécessitent validation`,
            triggers: ['Écriture créée'],
            steps: [
              { id: 's1', name: 'Saisie écriture', type: 'action', status: 'completed' },
              { id: 's2', name: 'Validation comptable', type: 'approval', status: 'in_progress', assignee: 'Comptable' },
              { id: 's3', name: 'Comptabilisation', type: 'action', status: 'pending' },
            ]
          });
        }

        if (validatedEntries.length > 0) {
          builtWorkflows.push({
            id: 'wf-validated',
            name: `Comptabilisation écritures (${validatedEntries.length})`,
            category: 'finance',
            status: 'active',
            priority: 'medium',
            currentStep: 2,
            totalSteps: 3,
            progress: 66,
            createdBy: 'Système',
            createdAt: new Date(validatedEntries[0]?.createdAt || Date.now()),
            lastModified: new Date(),
            description: `${validatedEntries.length} écriture(s) validée(s) en attente de comptabilisation`,
            triggers: ['Écriture validée'],
            steps: [
              { id: 's1', name: 'Saisie écriture', type: 'action', status: 'completed' },
              { id: 's2', name: 'Validation comptable', type: 'approval', status: 'completed' },
              { id: 's3', name: 'Comptabilisation', type: 'action', status: 'in_progress', assignee: 'Chef Comptable' },
            ]
          });
        }

        setWorkflows(builtWorkflows);

        // Build approval requests from draft entries
        const builtApprovals: ApprovalRequest[] = draftEntries.slice(0, 10).map((entry: any) => ({
          id: `apr-${entry.id}`,
          workflowId: 'wf-draft',
          type: 'Écriture comptable',
          title: entry.label || `Écriture ${entry.entryNumber || entry.id}`,
          description: `Journal: ${entry.journal || '-'} | Réf: ${entry.reference || '-'}`,
          requester: entry.createdBy || 'Système',
          amount: entry.totalDebit || 0,
          priority: (entry.totalDebit || 0) > 50000 ? 'high' : 'medium' as const,
          status: 'pending',
          createdAt: new Date(entry.createdAt || Date.now()),
          dueDate: new Date(Date.now() + 86400000 * 7),
        }));
        setApprovals(builtApprovals);
      } catch (err) {
        setWorkflows([]);
        setApprovals([]);
      }
    };
    loadWorkflowData();
  }, [adapter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'paused':
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-[#e5e5e5] text-[#525252]';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Flag className="w-4 h-4 text-red-600" />;
      case 'high':
        return <Flag className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <Flag className="w-4 h-4 text-amber-600" />;
      case 'low':
        return <Flag className="w-4 h-4 text-gray-700" />;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'finance': return <DollarSign className="w-4 h-4" />;
      case 'purchase': return <Package className="w-4 h-4" />;
      case 'sales': return <Users className="w-4 h-4" />;
      case 'hr': return <User className="w-4 h-4" />;
      case 'inventory': return <Archive className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const handleApprove = (approvalId: string) => {
    // Logique d'approbation
  };

  const handleReject = (approvalId: string) => {
    // Logique de rejet
  };

  const handleEscalate = (approvalId: string) => {
    // Logique d'escalade
  };

  const filteredWorkflows = workflows.filter(wf => {
    if (filter.status !== 'all' && wf.status !== filter.status) return false;
    if (filter.category !== 'all' && wf.category !== filter.category) return false;
    if (searchQuery && !wf.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    activeWorkflows: workflows.filter(w => w.status === 'active').length,
    pendingApprovals: approvals.filter(a => a.status === 'pending').length,
    completedToday: workflows.filter(w => w.status === 'completed' &&
      new Date(w.lastModified).toDateString() === new Date().toDateString()).length,
    avgCompletionTime: '-'
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-8 h-8 text-[#171717]" />
            Workflows & Approbations
          </h1>
          <p className="text-gray-600 mt-1">Automatisation et gestion des processus métier</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            Importer
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#525252]">
            <Plus className="w-4 h-4" />
            Nouveau Workflow
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Workflows Actifs</span>
            <Activity className="w-5 h-5 text-[#737373]" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.activeWorkflows}</p>
          <p className="text-xs text-gray-700 mt-1">En cours d'exécution</p>
        </div>

        <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-700">En Attente</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-700">{stats.pendingApprovals}</p>
          <p className="text-xs text-amber-600 mt-1">Approbations requises</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Complétés</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-lg font-bold text-green-700">{stats.completedToday}</p>
          <p className="text-xs text-green-600 mt-1">{t('common.today')}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Temps Moyen</span>
            <Timer className="w-5 h-5 text-gray-700" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.avgCompletionTime}</p>
          <p className="text-xs text-gray-700 mt-1">Par workflow</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['workflows', 'approvals', 'templates'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab
                    ? "border-[#737373] text-[#171717]"
                    : "border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab === 'workflows' && 'Workflows Actifs'}
                {tab === 'approvals' && `Approbations (${stats.pendingApprovals})`}
                {tab === 'templates' && 'Modèles'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -tranprimary-y-1/2 w-5 h-5 text-gray-700" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373]"
              />
            </div>
            {activeTab === 'workflows' && (
              <>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373]"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="paused">En pause</option>
                  <option value="completed">Complété</option>
                </select>
                <select
                  value={filter.category}
                  onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373]"
                >
                  <option value="all">Toutes catégories</option>
                  <option value="finance">Finance</option>
                  <option value="purchase">Achats</option>
                  <option value="sales">Ventes</option>
                  <option value="hr">RH</option>
                </select>
              </>
            )}
          </div>

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div className="space-y-4">
              {filteredWorkflows.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <h3 className="text-lg font-semibold">Aucun workflow en cours</h3>
                  <p className="text-sm mt-1">Toutes les écritures sont comptabilisées</p>
                </div>
              )}
              {filteredWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      {getCategoryIcon(workflow.category)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                          {getPriorityIcon(workflow.priority)}
                          <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium", getStatusColor(workflow.status))}>
                            {workflow.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {workflow.status === 'active' && (
                        <button className="p-1 hover:bg-gray-100 rounded" aria-label="Pause">
                          <Pause className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      {workflow.status === 'paused' && (
                        <button className="p-1 hover:bg-gray-100 rounded" aria-label="Lire">
                          <Play className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-700 mb-1">
                      <span>Étape {workflow.currentStep} sur {workflow.totalSteps}</span>
                      <span>{workflow.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#171717] h-2 rounded-full transition-all"
                        style={{ width: `${workflow.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {workflow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                          step.status === 'completed' && "bg-green-100 text-green-700",
                          step.status === 'in_progress' && "bg-[#e5e5e5] text-[#525252]",
                          step.status === 'pending' && "bg-gray-100 text-gray-700",
                          step.status === 'failed' && "bg-red-100 text-red-700"
                        )}>
                          {step.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                           step.status === 'in_progress' ? <Clock className="w-4 h-4" /> :
                           step.status === 'failed' ? <XCircle className="w-4 h-4" /> :
                           index + 1}
                        </div>
                        {index < workflow.steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-gray-300 mx-1" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-700">
                    <span>Créé par: {workflow.createdBy}</span>
                    <span>Modifié: {new Date(workflow.lastModified).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{approval.title}</h3>
                        {getPriorityIcon(approval.priority)}
                        <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium", getStatusColor(approval.status))}>
                          {approval.status === 'pending' ? 'En attente' :
                           approval.status === 'approved' ? 'Approuvé' :
                           approval.status === 'rejected' ? 'Rejeté' : 'Escaladé'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{approval.description}</p>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-700">Type: {approval.type}</span>
                        <span className="text-gray-700">Demandeur: {approval.requester}</span>
                        {approval.amount && (
                          <span className="font-medium text-gray-900">
                            Montant: {fmtCur(approval.amount)}
                          </span>
                        )}
                      </div>

                      {approval.attachments && approval.attachments.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <FileText className="w-4 h-4 text-gray-700" />
                          <span className="text-sm text-gray-700">
                            {approval.attachments.length} pièce(s) jointe(s)
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-700">
                        <span>Créé: {new Date(approval.createdAt).toLocaleString()}</span>
                        <span className="text-red-600">Échéance: {new Date(approval.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {approval.status === 'pending' && (
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleEscalate(approval.id)}
                          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Escalader
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    {getCategoryIcon(template.category)}
                    <span className="text-xs text-gray-700">{template.uses} utilisations</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.steps} étapes</p>
                  <button className="w-full px-3 py-2 bg-[#f5f5f5] text-[#525252] rounded hover:bg-[#e5e5e5]">
                    Utiliser ce modèle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowsManager;