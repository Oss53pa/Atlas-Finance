/**
 * Validation Panel — Workflow validation & distribution
 * CDC §13 — Circuit de validation multi-niveaux
 *
 * Statuts: BROUILLON → EN RÉVISION → EN VALIDATION → VALIDÉ → ARCHIVÉ
 */
import React, { useState } from 'react';
import {
  CheckCircle, XCircle, Clock, Send, MessageSquare,
  ArrowRight, Shield, Archive, AlertTriangle, User,
  ChevronDown, FileText,
} from 'lucide-react';
import { useReportBuilderStore } from '../store/useReportBuilderStore';
import type { ReportStatus, ValidationEvent } from '../types';

// ---- Status flow ----
const statusFlow: ReportStatus[] = ['draft', 'in_review', 'in_validation', 'validated', 'archived'];

const statusConfig: Record<ReportStatus, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  draft: { label: 'Brouillon', icon: <FileText className="w-4 h-4" />, color: 'text-neutral-600', bgColor: 'bg-neutral-100' },
  in_review: { label: 'En Révision', icon: <Clock className="w-4 h-4" />, color: 'text-amber-700', bgColor: 'bg-amber-50' },
  in_validation: { label: 'En Validation', icon: <Send className="w-4 h-4" />, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  validated: { label: 'Validé', icon: <CheckCircle className="w-4 h-4" />, color: 'text-primary-700', bgColor: 'bg-primary-50' },
  archived: { label: 'Archivé', icon: <Archive className="w-4 h-4" />, color: 'text-primary-700', bgColor: 'bg-primary-50' },
};

const nextAction: Record<ReportStatus, { label: string; nextStatus: ReportStatus } | null> = {
  draft: { label: 'Soumettre pour révision', nextStatus: 'in_review' },
  in_review: { label: 'Envoyer pour validation', nextStatus: 'in_validation' },
  in_validation: { label: 'Valider définitivement', nextStatus: 'validated' },
  validated: { label: 'Archiver', nextStatus: 'archived' },
  archived: null,
};

// Validation history starts empty — populated from report's validationCircuit

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ValidationPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const { document: doc } = useReportBuilderStore();
  const [comment, setComment] = useState('');
  const [history, setHistory] = useState<ValidationEvent[]>(doc?.validationCircuit?.history || []);

  if (!isOpen || !doc) return null;

  const currentStatus = statusConfig[doc.status];
  const next = nextAction[doc.status];
  const currentIdx = statusFlow.indexOf(doc.status);

  const handleAdvance = () => {
    if (!next) return;
    const store = useReportBuilderStore.getState();
    // Update status
    if (store.document) {
      store.updateBlock; // Trigger through store
      // For now, directly mutate via set
      useReportBuilderStore.setState((state) => {
        if (state.document) {
          state.document.status = next.nextStatus;
          state.document.updatedAt = new Date().toISOString();
        }
      });
    }
    // Add to history
    setHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      level: currentIdx + 1,
      action: 'approve',
      actor: { id: 'dev', name: 'Dev Admin' },
      comment: comment || undefined,
      timestamp: new Date().toISOString(),
    }]);
    setComment('');
  };

  const handleReject = () => {
    useReportBuilderStore.setState((state) => {
      if (state.document) {
        state.document.status = 'draft';
        state.document.updatedAt = new Date().toISOString();
      }
    });
    setHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      level: currentIdx,
      action: 'reject',
      actor: { id: 'dev', name: 'Dev Admin' },
      comment: comment || 'Retourné en brouillon',
      timestamp: new Date().toISOString(),
    }]);
    setComment('');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-white border-l border-neutral-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-900">Validation & Workflow</div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xs">Fermer</button>
      </div>

      {/* Status progress */}
      <div className="p-4 border-b border-neutral-100">
        <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-3">Progression</div>
        <div className="flex items-center gap-1">
          {statusFlow.map((status, i) => {
            const cfg = statusConfig[status];
            const isActive = i === currentIdx;
            const isPast = i < currentIdx;
            return (
              <React.Fragment key={status}>
                {i > 0 && <div className={`flex-1 h-0.5 ${isPast ? 'bg-primary-400' : 'bg-neutral-200'}`} />}
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-[9px] font-bold ${
                    isActive ? `${cfg.bgColor} ${cfg.color} ring-2 ring-offset-1 ring-neutral-400`
                    : isPast ? 'bg-primary-100 text-primary-700'
                    : 'bg-neutral-100 text-neutral-400'
                  }`}
                  title={cfg.label}
                >
                  {isPast ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${currentStatus.bgColor} ${currentStatus.color}`}>
            {currentStatus.icon}
            {currentStatus.label}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-neutral-100 space-y-2">
        <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-2">Actions</div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Commentaire optionnel…"
          rows={2}
          className="w-full text-xs border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-500 resize-none"
        />

        {/* Advance button */}
        {next && (
          <button
            onClick={handleAdvance}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {next.label} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Reject button (only when not draft or archived) */}
        {doc.status !== 'draft' && doc.status !== 'archived' && (
          <button
            onClick={handleReject}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Rejeter — retour brouillon
          </button>
        )}
      </div>

      {/* Validation circuit (CDC §13.2) */}
      <div className="p-4 border-b border-neutral-100">
        <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-2">Circuit de Validation</div>
        <div className="space-y-2">
          {[
            { level: 'N1', label: 'Auteur', actor: 'DAF / Comptable', actions: 'Crée, modifie, soumet' },
            { level: 'N2', label: 'Réviseur', actor: 'Chef Comptable', actions: 'Annote, approuve' },
            { level: 'N3', label: 'Validateur', actor: 'DG / DGA', actions: 'Valide ou rejette' },
            { level: 'N4', label: 'Lecteurs', actor: 'EXCO, Banquiers', actions: 'Consultation' },
          ].map((level, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${i <= currentIdx ? 'bg-neutral-50' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                i < currentIdx ? 'bg-primary-100 text-primary-700'
                : i === currentIdx ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-400'
              }`}>
                {level.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-neutral-700">{level.label}</div>
                <div className="text-[10px] text-neutral-400">{level.actor} — {level.actions}</div>
              </div>
              {i < currentIdx && <CheckCircle className="w-4 h-4 text-primary-500" />}
              {i === currentIdx && <Clock className="w-4 h-4 text-neutral-500" />}
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-2">Historique</div>
        <div className="space-y-2">
          {history.map(event => {
            const date = new Date(event.timestamp);
            return (
              <div key={event.id} className="flex items-start gap-2 text-xs">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  event.action === 'approve' ? 'bg-primary-100 text-primary-600'
                  : event.action === 'reject' ? 'bg-red-100 text-red-600'
                  : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {event.action === 'approve' ? <CheckCircle className="w-3 h-3" /> :
                   event.action === 'reject' ? <XCircle className="w-3 h-3" /> :
                   <MessageSquare className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-neutral-700">
                    <span className="font-medium">{event.actor.name}</span>
                    {' — '}
                    <span className="text-neutral-400">
                      {event.action === 'approve' ? 'Approuvé' : event.action === 'reject' ? 'Rejeté' : 'Commentaire'}
                    </span>
                  </div>
                  {event.comment && <div className="text-neutral-500 mt-0.5">{event.comment}</div>}
                  <div className="text-[9px] text-neutral-400 mt-0.5">
                    {date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ValidationPanel;
