/**
 * PendingApprovalsPage — mouvements de stock de forte valeur en attente de
 * validation (SoD, engine MVA). Auto-guérit les instances approuvées non
 * encore postées (crash navigateur, approbation par un autre poste…).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Loader2, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import {
  listStockInstances, listStockPendingTasks, actOnStockTask, reconcilePendingApplies,
  type StockWfInstance, type StockPendingTask,
} from '../../services/stock/stockApprovalService';
import StockModuleGate from './StockModuleGate';

const STATUS_LABEL: Record<StockWfInstance['status'], { label: string; cls: string }> = {
  in_review: { label: 'En cours de validation', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approuvé', cls: 'bg-green-100 text-green-700' },
  applied: { label: 'Appliqué', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', cls: 'bg-red-100 text-red-700' },
  invalidated_object_changed: { label: 'Invalidé', cls: 'bg-gray-100 text-gray-500' },
};
const MOTIVES = [
  { value: 'piece_manquante', label: 'Pièce manquante' },
  { value: 'montant_conteste', label: 'Montant contesté' },
  { value: 'imputation_erronee', label: 'Imputation erronée' },
  { value: 'opportunite', label: 'Opportunité' },
  { value: 'autre', label: 'Autre' },
];

function roleSatisfies(role: string | undefined, need: string): boolean {
  const rank: Record<string, number> = { comptable: 1, accountant: 1, user: 1, manager: 2, daf: 2, controleur: 2, dg: 3, directeur: 3, admin: 4 };
  return (rank[(role ?? '').toLowerCase()] ?? 0) >= (rank[(need ?? '').toLowerCase()] ?? 1);
}

function PendingInner() {
  const { adapter } = useData();
  const { user } = useAuth();
  const [instances, setInstances] = useState<StockWfInstance[]>([]);
  const [tasks, setTasks] = useState<StockPendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<StockPendingTask | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const healed = await reconcilePendingApplies(adapter);
      if (healed > 0) toast.success(`${healed} mouvement(s) approuvé(s) rattrapé(s) et comptabilisé(s)`);
      const [insts, pend] = await Promise.all([listStockInstances(adapter), listStockPendingTasks(adapter)]);
      setInstances(insts);
      setTasks(pend);
    } finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const approve = async (task: StockPendingTask) => {
    setActing(task.taskId);
    try {
      const res = await actOnStockTask(adapter, { taskId: task.taskId, action: 'approve', actorName: user?.email });
      toast.success(res.status === 'applied' ? 'Approuvé et comptabilisé' : `Approuvé — étape suivante requise`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setActing(null); }
  };

  const reject = async (task: StockPendingTask, motiveCode: string) => {
    setActing(task.taskId);
    try {
      await actOnStockTask(adapter, { taskId: task.taskId, action: 'reject', motiveCode, actorName: user?.email });
      toast.success('Mouvement rejeté');
      setRejectModal(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setActing(null); }
  };

  const taskByInstance = new Map(tasks.map(t => [t.instanceId, t]));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#235A6E]" /> Mouvements en attente de validation
        </h1>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        Les mouvements de forte valeur (seuil configurable) sont soumis à une validation Comptable — voire
        Comptable → DAF au‑delà d'un second seuil — avant d'être réellement comptabilisés. Séparation des
        tâches : l'auteur ne peut pas valider son propre mouvement.
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : instances.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">
          Aucun mouvement en attente. Les mouvements sous le seuil sont comptabilisés directement.
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map(inst => {
            const status = STATUS_LABEL[inst.status] ?? STATUS_LABEL.in_review;
            const task = taskByInstance.get(inst.id);
            const canAct = task ? roleSatisfies(user?.role, task.requiredRole) && inst.submitted_by !== user?.id : false;
            const preview = inst.object_preview;
            return (
              <div key={inst.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{preview?.movementTypeCode} — {preview?.lineCount} ligne(s)</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatCurrency(preview?.amount_xof || 0)} · {preview?.date} · étape {inst.current_stage}
                    {task && <> · rôle requis : <span className="font-medium">{task.requiredRole}</span></>}
                  </p>
                </div>
                {task && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!canAct && (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> En attente d'un validateur habilité</span>
                    )}
                    {canAct && (
                      <>
                        <button onClick={() => setRejectModal(task)} disabled={acting === task.taskId}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" /> Rejeter
                        </button>
                        <button onClick={() => approve(task)} disabled={acting === task.taskId}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
                          {acting === task.taskId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approuver
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Motif du rejet</h3>
            <div className="space-y-1">
              {MOTIVES.map(m => (
                <button key={m.value} onClick={() => reject(rejectModal, m.value)}
                  className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                  {m.label}
                </button>
              ))}
            </div>
            <button onClick={() => setRejectModal(null)} className="mt-4 w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PendingApprovalsPage() {
  return <StockModuleGate><PendingInner /></StockModuleGate>;
}
