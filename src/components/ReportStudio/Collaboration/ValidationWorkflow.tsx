/**
 * ValidationWorkflow - Circuit d'approbation avec statuts
 * Brouillon → En révision → En validation → Validé → Publié
 */

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import {
  FileEdit,
  Eye,
  CheckCircle,
  Send,
  Clock,
  User,
  Users,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Plus,
  X,
  History,
  ArrowRight,
  Shield,
  Unlock,
  Lock
} from 'lucide-react';

export type WorkflowStatus = 'draft' | 'review' | 'validation' | 'approved' | 'published' | 'rejected';

export interface WorkflowStep {
  id: string;
  status: WorkflowStatus;
  label: string;
  description: string;
  assignees: Assignee[];
  dueDate?: string;
  completedAt?: string;
  completedBy?: Assignee;
  comments?: string;
  isRequired: boolean;
}

export interface Assignee {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatar?: string;
}

export interface WorkflowHistory {
  id: string;
  action: string;
  status: WorkflowStatus;
  user: Assignee;
  timestamp: string;
  comment?: string;
}

interface ValidationWorkflowProps {
  currentStatus: WorkflowStatus;
  steps: WorkflowStep[];
  history: WorkflowHistory[];
  canEdit: boolean;
  onStatusChange: (newStatus: WorkflowStatus, comment?: string) => void;
  onAssign: (stepId: string, assignees: Assignee[]) => void;
  onRequestReview: (reviewers: Assignee[], message: string) => void;
  className?: string;
}

const statusConfig: Record<WorkflowStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  description: string;
}> = {
  draft: {
    label: 'Brouillon',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: FileEdit,
    description: 'Document en cours de rédaction',
  },
  review: {
    label: 'En révision',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Eye,
    description: 'En attente de révision par les pairs',
  },
  validation: {
    label: 'En validation',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: Clock,
    description: 'En attente de validation hiérarchique',
  },
  approved: {
    label: 'Validé',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
    description: 'Document approuvé',
  },
  published: {
    label: 'Publié',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Send,
    description: 'Document publié et accessible',
  },
  rejected: {
    label: 'Rejeté',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: AlertTriangle,
    description: 'Document rejeté, modifications requises',
  },
};

export const ValidationWorkflow: React.FC<ValidationWorkflowProps> = ({
  currentStatus,
  steps,
  history,
  canEdit,
  onStatusChange,
  onAssign,
  onRequestReview,
  className,
}) => {
  const [showRequestReview, setShowRequestReview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [selectedReviewers, setSelectedReviewers] = useState<Assignee[]>([]);
  const [actionComment, setActionComment] = useState('');
  const [showActionModal, setShowActionModal] = useState<WorkflowStatus | null>(null);

  const currentStepIndex = ['draft', 'review', 'validation', 'approved', 'published'].indexOf(currentStatus);
  const config = statusConfig[currentStatus];

  const availableReviewers: Assignee[] = [
    { id: 'u1', name: 'Aminata Diallo', initials: 'AD', role: 'Analyste Senior' },
    { id: 'u2', name: 'Kouamé Yao', initials: 'KY', role: 'Chef de Projet' },
    { id: 'u3', name: 'Jean-Pierre Mensah', initials: 'JPM', role: 'Directeur' },
    { id: 'u4', name: 'Fatou Koné', initials: 'FK', role: 'Responsable Qualité' },
  ];

  const handleStatusAction = (newStatus: WorkflowStatus) => {
    onStatusChange(newStatus, actionComment);
    setActionComment('');
    setShowActionModal(null);
  };

  const getNextActions = (): { status: WorkflowStatus; label: string; variant: 'primary' | 'success' | 'danger' }[] => {
    switch (currentStatus) {
      case 'draft':
        return [{ status: 'review', label: 'Soumettre à la révision', variant: 'primary' }];
      case 'review':
        return [
          { status: 'validation', label: 'Approuver et envoyer en validation', variant: 'success' },
          { status: 'draft', label: 'Renvoyer au brouillon', variant: 'danger' },
        ];
      case 'validation':
        return [
          { status: 'approved', label: 'Valider le document', variant: 'success' },
          { status: 'rejected', label: 'Rejeter', variant: 'danger' },
        ];
      case 'approved':
        return [{ status: 'published', label: 'Publier', variant: 'primary' }];
      case 'rejected':
        return [{ status: 'draft', label: 'Reprendre la rédaction', variant: 'primary' }];
      default:
        return [];
    }
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Workflow de Validation
            </h3>
            <p className="text-sm text-indigo-200 mt-1">Circuit d'approbation du document</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Historique"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl', config.bgColor)}>
            <config.icon className={cn('w-8 h-8', config.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-lg font-bold', config.color)}>{config.label}</span>
              {currentStatus === 'approved' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Verrouillé
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-6 flex items-center justify-between">
          {['draft', 'review', 'validation', 'approved', 'published'].map((step, index) => {
            const stepConfig = statusConfig[step as WorkflowStatus];
            const isCompleted = index < currentStepIndex;
            const isCurrent = step === currentStatus;
            const isPending = index > currentStepIndex;

            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isCompleted && 'bg-green-500 text-white',
                      isCurrent && `${stepConfig.bgColor} ${stepConfig.color}`,
                      isPending && 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <stepConfig.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs mt-2 font-medium',
                    isCurrent ? stepConfig.color : 'text-gray-500'
                  )}>
                    {stepConfig.label}
                  </span>
                </div>
                {index < 4 && (
                  <div className={cn(
                    'flex-1 h-1 mx-2 rounded',
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Current Step Details */}
      {steps.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Étape actuelle</h4>
          {steps.filter(s => s.status === currentStatus).map((step) => (
            <div key={step.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{step.label}</p>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                </div>
                {step.dueDate && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Échéance : {step.dueDate}
                  </span>
                )}
              </div>

              {/* Assignees */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Assigné à :</p>
                <div className="flex items-center gap-2">
                  {step.assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                        {assignee.initials}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{assignee.name}</p>
                        <p className="text-xs text-gray-500">{assignee.role}</p>
                      </div>
                    </div>
                  ))}
                  {canEdit && (
                    <button
                      onClick={() => setShowRequestReview(true)}
                      className="p-2 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-primary hover:border-primary"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {canEdit && getNextActions().length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Actions disponibles</h4>
          <div className="space-y-2">
            {getNextActions().map((action) => (
              <button
                key={action.status}
                onClick={() => setShowActionModal(action.status)}
                className={cn(
                  'w-full px-4 py-3 rounded-lg font-medium flex items-center justify-between transition-colors',
                  action.variant === 'primary' && 'bg-primary text-white hover:bg-primary-dark',
                  action.variant === 'success' && 'bg-green-500 text-white hover:bg-green-600',
                  action.variant === 'danger' && 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                )}
              >
                {action.label}
                <ArrowRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="border-t border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <History className="w-4 h-4" />
            Historique des actions
          </h4>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {history.map((item) => {
              const itemConfig = statusConfig[item.status];
              return (
                <div key={item.id} className="flex gap-3">
                  <div className="relative">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', itemConfig.bgColor)}>
                      <itemConfig.icon className={cn('w-4 h-4', itemConfig.color)} />
                    </div>
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.action}</span>
                      <span className={cn('px-2 py-0.5 text-xs rounded-full', itemConfig.bgColor, itemConfig.color)}>
                        {itemConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Par {item.user.name} • {item.timestamp}
                    </p>
                    {item.comment && (
                      <p className="text-sm text-gray-500 mt-2 italic">"{item.comment}"</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Confirmer l'action</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Vous êtes sur le point de changer le statut vers <strong>{statusConfig[showActionModal].label}</strong>.
              </p>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Ajouter un commentaire (optionnel)..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                rows={3}
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowActionModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => handleStatusAction(showActionModal)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Review Modal */}
      {showRequestReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Demander une révision</h3>
              <button onClick={() => setShowRequestReview(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Sélectionnez les réviseurs :</p>
              <div className="space-y-2 mb-4">
                {availableReviewers.map((reviewer) => (
                  <label
                    key={reviewer.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedReviewers.includes(reviewer)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedReviewers.includes(reviewer)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReviewers([...selectedReviewers, reviewer]);
                        } else {
                          setSelectedReviewers(selectedReviewers.filter(r => r.id !== reviewer.id));
                        }
                      }}
                      className="sr-only"
                    />
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                      {reviewer.initials}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{reviewer.name}</p>
                      <p className="text-xs text-gray-500">{reviewer.role}</p>
                    </div>
                  </label>
                ))}
              </div>
              <textarea
                value={reviewMessage}
                onChange={(e) => setReviewMessage(e.target.value)}
                placeholder="Message pour les réviseurs..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                rows={3}
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowRequestReview(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onRequestReview(selectedReviewers, reviewMessage);
                  setShowRequestReview(false);
                  setSelectedReviewers([]);
                  setReviewMessage('');
                }}
                disabled={selectedReviewers.length === 0}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationWorkflow;
