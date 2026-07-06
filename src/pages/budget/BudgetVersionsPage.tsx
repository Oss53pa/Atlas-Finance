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
  listBudgetVersions, setVersionStatut, setVersionActive, getBudgetLinesWithPeriods,
  type BudgetVersionFull, type BudgetLineEdit,
} from '../../features/budget/services/budgetService';
import { formatCurrency } from '../../utils/formatters';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import BudgetImportModal from './BudgetImportModal';
import BudgetSaisieModal from './BudgetSaisieModal';
import { ArrowLeft, Lock, CheckCircle, Star, RefreshCw, GitBranch, ChevronRight, ChevronDown, ExternalLink, Upload, PencilLine, Maximize2 } from 'lucide-react';

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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, BudgetLineEdit[]>>({});
  const [linesLoading, setLinesLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSaisie, setShowSaisie] = useState(false);
  const [statutFilter, setStatutFilter] = useState<'all' | 'brouillon' | 'valide' | 'verrouille'>('all');
  const visibleVersions = versions.filter(v => statutFilter === 'all' || v.statut === statutFilter);

  const toggleDetail = async (versionId: string) => {
    if (expanded === versionId) { setExpanded(null); return; }
    setExpanded(versionId);
    if (!lines[versionId]) {
      setLinesLoading(true);
      try { const l = await getBudgetLinesWithPeriods(adapter, versionId); setLines(p => ({ ...p, [versionId]: l })); }
      catch (e: any) { toast.error(e?.message || 'Erreur'); }
      finally { setLinesLoading(false); }
    }
  };

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
        <button onClick={() => setShowSaisie(true)} className="px-3 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2"><PencilLine className="w-4 h-4" />Saisir</button>
        <button onClick={() => setShowImport(true)} className="px-3 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2"><Upload className="w-4 h-4" />Importer</button>
        <button onClick={load} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Rafraîchir"><RefreshCw className="w-4 h-4" /></button>
        <PageHeaderActions
          onToggleFilters={() => setFiltersOpen(o => !o)}
          filtersOpen={filtersOpen}
          activeFilters={statutFilter !== 'all' ? 1 : 0}
          printTitle="Versions budgétaires"
        />
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-3 print-hide">
          <span className="text-sm text-gray-600">Statut :</span>
          {(['all', 'brouillon', 'valide', 'verrouille'] as const).map(st => (
            <button key={st} onClick={() => setStatutFilter(st)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${statutFilter === st ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] text-gray-600 hover:bg-gray-50'}`}>
              {st === 'all' ? 'Tous' : st === 'brouillon' ? 'Brouillon' : st === 'valide' ? 'Validé' : 'Verrouillé'}
            </button>
          ))}
        </div>
      )}

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
            {!loading && versions.length > 0 && visibleVersions.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucune version pour ce statut.</td></tr>}
            {visibleVersions.map(v => (
              <React.Fragment key={v.id}>
              <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleDetail(v.id)}>
                <td className="px-4 py-2.5 font-medium text-gray-800">
                  {expanded === v.id ? <ChevronDown className="w-4 h-4 text-gray-400 inline mr-1" /> : <ChevronRight className="w-4 h-4 text-gray-400 inline mr-1" />}
                  {v.libelle}
                </td>
                <td className="px-4 py-2.5 text-gray-600 capitalize">{v.type}</td>
                <td className="px-4 py-2.5 text-center text-gray-500">{v.nb_lignes ?? 0}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_BADGE[v.statut]}`}>{v.statut}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {v.is_active ? <Star className="w-4 h-4 text-amber-500 fill-amber-500 inline" /> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/budget/versions/${v.id}`)} title="Détail complet (phasage mensuel)" className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1"><Maximize2 className="w-3 h-3" />Détail</button>
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
              {expanded === v.id && (
                <tr className="bg-gray-50/60">
                  <td colSpan={6} className="px-4 py-3">
                    {linesLoading && !lines[v.id] ? (
                      <p className="text-xs text-gray-400">Chargement du détail…</p>
                    ) : (lines[v.id]?.length ?? 0) === 0 ? (
                      <p className="text-xs text-gray-400">Aucune ligne budgétaire dans cette version. Utilisez « Saisir » ou « Importer » ci-dessus, ou <button onClick={() => navigate(`/budget/versions/${v.id}`)} className="text-[var(--color-primary)] hover:underline">ouvrez le détail complet</button>.</p>
                    ) : (
                      <table className="w-full text-xs bg-white rounded-lg border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left text-gray-500">Compte</th>
                            <th className="px-3 py-1.5 text-left text-gray-500">Type</th>
                            <th className="px-3 py-1.5 text-right text-gray-500">Total annuel</th>
                            <th className="px-3 py-1.5 text-center text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lines[v.id].map(l => (
                            <tr key={l.id}>
                              <td className="px-3 py-1.5 font-mono text-gray-700">{l.account_code}</td>
                              <td className="px-3 py-1.5 text-gray-600">{l.budget_type}</td>
                              <td className="px-3 py-1.5 text-right text-gray-900">{formatCurrency(Object.values(l.periods).reduce((s, x) => s + (x || 0), 0))}</td>
                              <td className="px-3 py-1.5 text-center">
                                <button onClick={() => navigate(`/accounting/general-ledger?compte=${l.account_code}`)} title="Voir les écritures" className="text-gray-300 hover:text-[var(--color-primary)]"><ExternalLink className="w-3.5 h-3.5 inline" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {(lines[v.id]?.length ?? 0) > 0 && (
                      <button onClick={() => navigate(`/budget/versions/${v.id}`)} className="mt-2 text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"><Maximize2 className="w-3 h-3" />Ouvrir le détail complet (phasage mensuel)</button>
                    )}
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <BudgetImportModal open={showImport} onClose={() => setShowImport(false)} onImported={load} />
      <BudgetSaisieModal open={showSaisie} onClose={() => setShowSaisie(false)} onSaved={load} />
    </div>
  );
};

export default BudgetVersionsPage;
