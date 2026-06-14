/**
 * BudgetVersionsPage — /budget/versions (CDC V3 §2/§7).
 * Workflow : brouillon → validation (DG) → verrouillage (périodes immuables).
 * + activation de la version de référence (1 active par exercice).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import {
  listBudgetVersions, setVersionStatut, setVersionActive, type BudgetVersionFull,
} from '../../features/budget/services/budgetService';
import { ArrowLeft, Lock, CheckCircle, Star, RefreshCw, GitBranch } from 'lucide-react';

const STATUT_BADGE: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-700',
  valide: 'bg-blue-100 text-blue-700',
  verrouille: 'bg-amber-100 text-amber-800',
};

const BudgetVersionsPage: React.FC = () => {
  const { adapter } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<BudgetVersionFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // DG / admin peuvent valider et verrouiller (CDC §7).
  const canValidate = user?.role === 'admin' || user?.role === 'manager';

  const load = async () => {
    setLoading(true);
    try { setVersions(await listBudgetVersions(adapter)); }
    catch (e: any) { toast.error(e?.message || 'Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); await load(); }
    catch (e: any) { toast.error(e?.message || 'Action impossible'); }
    finally { setBusy(null); }
  };

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><GitBranch className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Versions budgétaires</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Brouillon → validation (DG) → verrouillage</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Rafraîchir"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {!canValidate && (
        <div className="bg-amber-50 text-amber-800 rounded-lg px-4 py-2 text-xs">
          Seuls les rôles DG / Administrateur peuvent valider ou verrouiller une version.
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Libellé</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Type</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Lignes</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Statut</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Active</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chargement…</td></tr>}
            {!loading && versions.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucune version. Importez un budget pour en créer une.</td></tr>}
            {versions.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{v.libelle}</td>
                <td className="px-4 py-2.5 text-gray-600 capitalize">{v.type}</td>
                <td className="px-4 py-2.5 text-center text-gray-500">{v.nb_lignes ?? 0}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_BADGE[v.statut]}`}>{v.statut}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {v.is_active ? <Star className="w-4 h-4 text-amber-500 fill-amber-500 inline" /> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    {!v.is_active && (
                      <button onClick={() => { setBusy(v.id); act(() => setVersionActive(adapter, v.id, v.fiscal_year_id), 'Version activée'); }}
                        disabled={busy === v.id} className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50">Activer</button>
                    )}
                    {canValidate && v.statut === 'brouillon' && (
                      <button onClick={() => { setBusy(v.id); act(() => setVersionStatut(adapter, v.id, 'valide'), 'Version validée'); }}
                        disabled={busy === v.id} className="px-2.5 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Valider</button>
                    )}
                    {canValidate && v.statut === 'valide' && (
                      <>
                        <button onClick={() => { setBusy(v.id); act(() => setVersionStatut(adapter, v.id, 'brouillon'), 'Repassée en brouillon'); }}
                          disabled={busy === v.id} className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50">Dévalider</button>
                        <button onClick={() => { if (window.confirm('Verrouiller cette version ? Les montants deviendront IMMUABLES.')) { setBusy(v.id); act(() => setVersionStatut(adapter, v.id, 'verrouille'), 'Version verrouillée'); } }}
                          disabled={busy === v.id} className="px-2.5 py-1 text-xs rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1"><Lock className="w-3 h-3" />Verrouiller</button>
                      </>
                    )}
                    {v.statut === 'verrouille' && <span className="text-xs text-amber-700 flex items-center gap-1"><Lock className="w-3 h-3" />Immuable</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetVersionsPage;
