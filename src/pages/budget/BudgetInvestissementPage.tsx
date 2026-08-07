/**
 * BudgetInvestissementPage — /budget/investissement (CDC V3 §6).
 * CAPEX par compte : budgété / réalisé / écart / reste à engager. Vue live
 * v_actual_investment (classe 2) — zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { formatCurrency } from '../../utils/formatters';
import { KPICard, ColorfulBarChart } from '../../components/ui/DesignSystem';
import {
  getDefaultAnnee, getInvestmentSummary, listCapexRequests, setCapexStatut, deleteCapexRequest,
  dotationAnnuelle, type InvestmentSummary, type CapexRequest,
} from '../../features/budget/services/budgetService';
import {
  listApprovalMatrix, ensureDefaultMatrix, requiredApprover, recordApproval, type ApprovalBracket,
} from '../../features/budget/services/capexCarService';
import CapexRequestModal from './CapexRequestModal';
import CapexPirModal from './CapexPirModal';
import CarModal from './CarModal';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Package, Wallet, TrendingUp, Hourglass, Plus, Trash2, Check, Ban, Banknote, Lock, Eye, Pencil, Search, ClipboardCheck } from 'lucide-react';

const CAR_BADGE: Record<string, string> = {
  demande: 'bg-gray-100 text-gray-700',
  approuve: 'bg-blue-100 text-blue-700',
  fonds_disponibles: 'bg-green-100 text-green-700',
  clos: 'bg-amber-100 text-amber-800',
  rejete: 'bg-red-100 text-red-700',
};
const CAR_LABEL_KEY: Record<string, string> = {
  demande: 'budgetCapex.carBusinessCase', approuve: 'budgetCapex.carApproved',
  fonds_disponibles: 'budgetCapex.carIssued', clos: 'budgetCapex.carClosed', rejete: 'budgetCapex.carRejected',
};

const BudgetInvestissementPage: React.FC = () => {
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const MOIS = React.useMemo(() => t('budgetCapex.monthsShort').split(','), [t]);
  const navigate = useNavigate();
  const [annee, setAnnee] = useState('');
  // Ouvre sur la liste des business cases (CAPEX) : c'est la surface de travail du workflow.
  const [tab, setTab] = useState<'synthese' | 'demandes' | 'detail'>('demandes');
  const [sum, setSum] = useState<InvestmentSummary | null>(null);
  const [requests, setRequests] = useState<CapexRequest[]>([]);
  const [matrix, setMatrix] = useState<ApprovalBracket[]>([]);
  const [showCar, setShowCar] = useState(false);
  const [editingCar, setEditingCar] = useState<CapexRequest | null>(null);
  const [pirCar, setPirCar] = useState<CapexRequest | null>(null);
  const [carForReq, setCarForReq] = useState<CapexRequest | null>(null);
  const [carLauncherOpen, setCarLauncherOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const [s, reqs, mtx] = await Promise.all([
          getInvestmentSummary(adapter, a), listCapexRequests(adapter),
          ensureDefaultMatrix(adapter).catch(() => listApprovalMatrix(adapter)),
        ]);
        if (cancelled) return;
        setAnnee(a); setSum(s); setRequests(reqs); setMatrix(mtx);
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const carAction = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); setRefreshKey(k => k + 1); }
    catch (e: any) { toast.error(e?.message || t('budgetCapex.genericError')); }
  };

  // Validation/rejet avec trace d'approbation immuable (audit + niveau requis).
  const decideCar = async (r: CapexRequest, statut: 'approuve' | 'rejete') => {
    // SÉPARATION DES TÂCHES (SoD) : l'approbateur ne peut pas être le demandeur.
    const createdBy = (r as any).created_by || (r as any).createdBy;
    if (createdBy && user?.id && createdBy === user.id) {
      toast.error(t('budgetCapex.sodError'));
      return;
    }
    const br = requiredApprover(matrix, r.montant);
    await carAction(async () => {
      await setCapexStatut(adapter, r.id, statut);
      await recordApproval(adapter, {
        requestId: r.id, niveau: br?.niveau ?? 1, role: br?.role_requis ?? '—',
        statut: statut === 'approuve' ? 'approved' : 'rejected',
        decidedBy: user?.id || null,
      });
    }, statut === 'approuve' ? t('budgetCapex.requestApproved') : t('budgetCapex.requestRejected'));
  };

  const chart = useMemo(() => (sum?.mensuel || []).map((m, i) => ({ label: MOIS[i], value: Math.round(m.realise / 1000), color: '' })), [sum]);
  const carStats = useMemo(() => {
    const sumBy = (st: string[]) => requests.filter(r => st.includes(r.statut)).reduce((s, r) => s + r.montant, 0);
    return {
      demande: sumBy(['demande']),
      valide: sumBy(['approuve']),
      fonds: sumBy(['fonds_disponibles', 'clos']),
    };
  }, [requests]);

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">{t('budgetCapex.loading')}</div>;
  if (error) return <div className="p-8"><div className="bg-[var(--color-error-light,#FEECEC)] text-[var(--color-error)] rounded-lg p-4 text-sm">{error}</div></div>;

  const s = sum!;
  const q = query.trim().toLowerCase();
  const matches = (code?: string, label?: string) => !q || (code || '').toLowerCase().includes(q) || (label || '').toLowerCase().includes(q);
  const filteredRequests = requests.filter(r => matches(r.account_code, r.libelle));
  const filteredParCompte = s.parCompte.filter(c => matches(c.account_code, c.label));
  // Business cases prêts pour une CAR : validés (enveloppe budgétée) ou déjà partiellement appropriés.
  const eligibleForCar = requests.filter(r => r.statut === 'approuve' || r.statut === 'fonds_disponibles');
  const resteTotal = Math.max(0, s.totalBudget - s.totalRealise);
  const taux = s.totalBudget !== 0 ? Math.round((s.totalRealise / s.totalBudget) * 100) : null;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Package className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('budgetCapex.title')}</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">{t('budgetCapex.subtitle', { year: annee })}</p>
        </div>
        <button onClick={() => setShowCar(true)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"><Plus className="w-4 h-4" />{t('budgetCapex.newBusinessCase')}</button>
        <button
          onClick={() => {
            if (eligibleForCar.length === 0) { toast.error(t('budgetCapex.noValidatedBc')); return; }
            if (eligibleForCar.length === 1) { setCarForReq(eligibleForCar[0]); return; }
            setCarLauncherOpen(true);
          }}
          title={t('budgetCapex.issueCarTitle')}
          className="px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 flex items-center gap-2"
        ><Banknote className="w-4 h-4" />{t('budgetCapex.car')}</button>
        <PageHeaderActions
          onToggleFilters={() => setFiltersOpen(o => !o)}
          filtersOpen={filtersOpen}
          activeFilters={query.trim() ? 1 : 0}
          printTitle={t('budgetCapex.printTitle', { year: annee })}
        />
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-4 print-hide">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('budgetCapex.searchPlaceholder')} className="pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg w-72" />
          </div>
          <span className="text-xs text-gray-400">{t('budgetCapex.filterHint')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('budgetCapex.kpiActual')} value={formatCurrency(s.totalRealise)} icon={TrendingUp} color="primary" valueFontSize="1.125rem" />
        <KPICard title={t('budgetCapex.kpiBudget')} value={formatCurrency(s.totalBudget)} icon={Wallet} color="neutral" valueFontSize="1.125rem" />
        <KPICard title={t('budgetCapex.kpiCommitmentRate')} value={taux != null ? `${taux}%` : '—'} icon={TrendingUp} color="success" />
        <KPICard title={t('budgetCapex.kpiRemaining')} value={formatCurrency(resteTotal)} icon={Hourglass} color="warning" valueFontSize="1.125rem" />
      </div>

      {/* Onglets : Synthèse / Demandes CAPEX (CAR) / Détail par compte */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-[var(--color-border)] shadow-sm w-fit">
        {([['synthese', t('budgetCapex.tabSummary')], ['demandes', t('budgetCapex.tabRequests', { count: String(requests.length) })], ['detail', t('budgetCapex.tabDetail', { count: String(s.parCompte.length) })]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === k ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{lbl}</button>
        ))}
      </div>

      <CapexRequestModal open={showCar} onClose={() => setShowCar(false)} onCreated={() => setRefreshKey(k => k + 1)} />
      <CapexRequestModal open={!!editingCar} editing={editingCar} onClose={() => setEditingCar(null)} onCreated={() => setRefreshKey(k => k + 1)} />
      <CapexPirModal open={!!pirCar} request={pirCar} onClose={() => setPirCar(null)} onSaved={() => setRefreshKey(k => k + 1)} />
      <CarModal open={!!carForReq} request={carForReq} onClose={() => setCarForReq(null)} onSaved={() => setRefreshKey(k => k + 1)} />

      {/* Sélecteur CAR : choisir le business case validé dont on approprie les fonds. */}
      <Dialog open={carLauncherOpen} onOpenChange={(o) => { if (!o) setCarLauncherOpen(false); }} containerClassName="max-w-lg">
        <DialogContent>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/10 flex items-center justify-center"><Banknote className="w-5 h-5 text-green-700" /></div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{t('budgetCapex.car')}</h3>
                <p className="text-xs text-gray-500">{t('budgetCapex.carSelectHint')}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {eligibleForCar.length === 0 && <div className="text-sm text-gray-400 py-6 text-center">{t('budgetCapex.noValidatedBcShort')}</div>}
            {eligibleForCar.map(r => (
              <button
                key={r.id}
                onClick={() => { setCarForReq(r); setCarLauncherOpen(false); }}
                className="w-full flex items-center justify-between bg-gray-50 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-lg px-3 py-2.5 text-left"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{r.libelle}</div>
                  <div className="text-xs text-gray-500"><span className="font-mono">{fmtAccount(r.account_code)}</span></div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(r.montant)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAR_BADGE[r.statut]}`}>{t(CAR_LABEL_KEY[r.statut])}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-5">
            <button onClick={() => setCarLauncherOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{t('budgetCapex.close')}</button>
          </div>
        </DialogContent>
      </Dialog>

      {tab === 'demandes' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--color-primary)]">{t('budgetCapex.bcTitle')}</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('budgetCapex.bcWorkflow')}</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="text-right"><div className="text-gray-400">{t('budgetCapex.statRequested')}</div><div className="font-semibold text-gray-700">{formatCurrency(carStats.demande)}</div></div>
              <div className="text-right"><div className="text-gray-400">{t('budgetCapex.statApproved')}</div><div className="font-semibold text-blue-700">{formatCurrency(carStats.valide)}</div></div>
              <div className="text-right"><div className="text-gray-400">{t('budgetCapex.statFunds')}</div><div className="font-semibold text-green-700">{formatCurrency(carStats.fonds)}</div></div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('budgetCapex.colProject')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('budgetCapex.colAccount')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('budgetCapex.colAmount')}</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('budgetCapex.colPlannedDate')}</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('budgetCapex.colDuration')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('budgetCapex.colAnnualCharge')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600" title={t('budgetCapex.colNpvIrrTitle')}>{t('budgetCapex.colNpvIrr')}</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('budgetCapex.colStatus')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('budgetCapex.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">{requests.length === 0 ? t('budgetCapex.noBc') : t('budgetCapex.noBcMatch')}</td></tr>}
                {filteredRequests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800">{r.libelle}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{fmtAccount(r.account_code)}</span></td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(r.montant)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{r.date_prevue || '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{r.duree_amortissement ? t('budgetCapex.yearsSuffix', { count: String(r.duree_amortissement) }) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 text-xs">{formatCurrency(dotationAnnuelle(r))}</td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      {r.van != null ? <><span className={r.van >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{formatCurrency(r.van)}</span>{r.tri != null && <span className="text-gray-400"> · {(r.tri * 100).toFixed(0)}%</span>}</> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAR_BADGE[r.statut]}`}>{t(CAR_LABEL_KEY[r.statut])}</span></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingCar(r)} title={(r.statut === 'fonds_disponibles' || r.statut === 'clos') ? t('budgetCapex.viewDetailTitle') : t('budgetCapex.viewEditTitle')} className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1 text-gray-600">
                          {(r.statut === 'fonds_disponibles' || r.statut === 'clos') ? <><Eye className="w-3 h-3" />{t('budgetCapex.view')}</> : <><Pencil className="w-3 h-3" />{t('budgetCapex.detail')}</>}
                        </button>
                        {r.statut === 'demande' && <>
                          <button onClick={() => decideCar(r, 'approuve')} title={t('budgetCapex.approveTitle')} className="px-2 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"><Check className="w-3 h-3" />{t('budgetCapex.approve')}</button>
                          <button onClick={() => decideCar(r, 'rejete')} title={t('budgetCapex.rejectTitle')} className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1"><Ban className="w-3 h-3" />{t('budgetCapex.reject')}</button>
                        </>}
                        {r.statut === 'approuve' && <>
                          <button onClick={() => setCarForReq(r)} title={t('budgetCapex.issueCarShortTitle')} className="px-2 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"><Banknote className="w-3 h-3" />{t('budgetCapex.issueCar')}</button>
                          <button onClick={() => decideCar(r, 'rejete')} title={t('budgetCapex.rejectTitle')} className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1"><Ban className="w-3 h-3" />{t('budgetCapex.reject')}</button>
                        </>}
                        {r.statut === 'fonds_disponibles' && <>
                          <button onClick={() => setCarForReq(r)} title={t('budgetCapex.manageCarTitle')} className="px-2 py-1 text-xs rounded-lg border border-green-600 text-green-700 hover:bg-green-50 flex items-center gap-1"><Banknote className="w-3 h-3" />{t('budgetCapex.carShort')}</button>
                          <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'clos'), t('budgetCapex.requestClosed'))} title={t('budgetCapex.closeTitle')} className="px-2 py-1 text-xs rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1"><Lock className="w-3 h-3" />{t('budgetCapex.closeAction')}</button>
                        </>}
                        {r.statut === 'clos' && <button onClick={() => setPirCar(r)} title={t('budgetCapex.pirTitle')} className="px-2 py-1 text-xs rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 flex items-center gap-1"><ClipboardCheck className="w-3 h-3" />{t('budgetCapex.pir')}</button>}
                        {r.statut === 'rejete' && <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'demande'), t('budgetCapex.reactivated'))} className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50">{t('budgetCapex.reactivate')}</button>}
                        <button onClick={() => { if (window.confirm(t('budgetCapex.confirmDelete'))) carAction(() => deleteCapexRequest(adapter, r.id), t('budgetCapex.deleted')); }} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'synthese' && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-1">{t('budgetCapex.monthlyCapex')}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('budgetCapex.thousandsXof')}</p>
          {chart.some(d => d.value !== 0) ? <ColorfulBarChart data={chart} height={220} /> : <div className="text-sm text-[var(--color-text-tertiary)] py-10 text-center">{t('budgetCapex.noAcquisition')}</div>}
        </div>
      )}

      {tab === 'detail' && (
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">{t('budgetCapex.detailByAccount')}</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('budgetCapex.colAccount')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600" title={t('budgetCapex.colAlreadyTitle')}>{t('budgetCapex.colAlready')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600" title={t('budgetCapex.colNewTitle')}>{t('budgetCapex.colNew')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('budgetCapex.colBudgeted')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('budgetCapex.colGap')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('budgetCapex.kpiRemaining')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredParCompte.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">{s.parCompte.length === 0 ? t('budgetCapex.noFixedAsset') : t('budgetCapex.noAccountMatch')}</td></tr>}
            {filteredParCompte.map(c => (
              <tr key={c.account_code} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/accounting/general-ledger?compte=${c.account_code}`)}>
                <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{c.account_code}</span> <span className="text-gray-800">{c.label}</span></td>
                <td className="px-4 py-2.5 text-right text-gray-400">{c.existant ? formatCurrency(c.existant) : '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{c.nouveau ? formatCurrency(c.nouveau) : '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{c.budget ? formatCurrency(c.budget) : '—'}</td>
                <td className={`px-4 py-2.5 text-right ${c.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{c.budget ? formatCurrency(c.ecart) : '—'}</td>
                <td className="px-4 py-2.5 text-right text-amber-700">{c.budget ? formatCurrency(c.resteAEngager) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default BudgetInvestissementPage;
