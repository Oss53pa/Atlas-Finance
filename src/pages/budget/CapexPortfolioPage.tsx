/**
 * CapexPortfolioPage — /capex (refonte OPEX/CAPEX, Lot 5, §22.2).
 * Portefeuille des Business Cases CAPEX : pipeline par statut, accès au BCStepper.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { getAccountLabel } from '../../utils/accountLabels';
import { listCapexRequests, type CapexRequest } from '../../features/budget/services/budgetService';
import { getCapexExecution, type CapexExecution } from '../../features/budget/services/cockpitService';
import NewBusinessCaseModal from './NewBusinessCaseModal';
import { Layers, Loader2, Plus, ArrowRight, Package, Boxes, TrendingDown, Wallet } from 'lucide-react';

const MOIS_COURT_KEYS = [
  'capexPortfolio.monthShortJan', 'capexPortfolio.monthShortFeb', 'capexPortfolio.monthShortMar',
  'capexPortfolio.monthShortApr', 'capexPortfolio.monthShortMay', 'capexPortfolio.monthShortJun',
  'capexPortfolio.monthShortJul', 'capexPortfolio.monthShortAug', 'capexPortfolio.monthShortSep',
  'capexPortfolio.monthShortOct', 'capexPortfolio.monthShortNov', 'capexPortfolio.monthShortDec',
];
const MOIS_KEYS = [
  'capexPortfolio.monthJan', 'capexPortfolio.monthFeb', 'capexPortfolio.monthMar',
  'capexPortfolio.monthApr', 'capexPortfolio.monthMay', 'capexPortfolio.monthJun',
  'capexPortfolio.monthJul', 'capexPortfolio.monthAug', 'capexPortfolio.monthSep',
  'capexPortfolio.monthOct', 'capexPortfolio.monthNov', 'capexPortfolio.monthDec',
];
const fmt = (n: number) => formatCurrency(Math.round(n));
const pctShare = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0);

const CapexBars: React.FC<{ values: number[] }> = ({ values }) => {
  const { t } = useLanguage();
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  return (
    <div className="flex items-stretch gap-2 h-32 pt-2">
      {values.map((v, i) => {
        const h = Math.max(2, (Math.max(0, v) / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full">
            <div className="flex-1 w-full flex items-end">
              <div className="w-full rounded-t-md bg-[var(--color-primary)]" style={{ height: `${h}%`, opacity: v > 0 ? 0.85 : 0.12 }} title={`${t(MOIS_KEYS[i])} : ${fmt(v)}`} />
            </div>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">{t(MOIS_COURT_KEYS[i])}</span>
          </div>
        );
      })}
    </div>
  );
};

const CapexKpi: React.FC<{ label: string; value: string; icon: React.ReactNode; accent?: string }> = ({ label, value, icon, accent = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-[var(--color-warning-light)] flex items-center justify-center text-[var(--color-secondary)] shrink-0">{icon}</div>
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</div>
      <div className={`font-mono text-base font-semibold truncate ${accent}`}>{value}</div>
    </div>
  </div>
);

const CapexExecutionSection: React.FC<{ adapter: any }> = ({ adapter }) => {
  const { t } = useLanguage();
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [exec, setExec] = useState<CapexExecution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try { const e = await getCapexExecution(adapter, annee); if (!cancelled) setExec(e); }
      catch { if (!cancelled) setExec(null); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, annee]);

  const maxNat = exec?.byNature[0]?.total || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Boxes className="w-4 h-4 text-[var(--color-primary)]" /> {t('capexPortfolio.executionTitle')}</h2>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
          {[0, 1, 2, 3].map((d) => { const y = new Date().getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <span className="text-xs text-[var(--color-text-tertiary)]">{t('capexPortfolio.executionHint')}</span>
      </div>

      {loading && !exec ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> {t('capexPortfolio.loading')}</div>
      ) : exec ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <CapexKpi label={t('capexPortfolio.kpiCapexActual', { year: annee })} value={fmt(exec.flowGross)} icon={<Wallet className="w-5 h-5" />} accent="text-[var(--color-primary)]" />
            <CapexKpi label={t('capexPortfolio.kpiGrossAssets')} value={fmt(exec.parcBrut)} icon={<Package className="w-5 h-5" />} />
            <CapexKpi label={t('capexPortfolio.kpiAccumulatedDepreciation')} value={fmt(exec.parcAmort)} icon={<TrendingDown className="w-5 h-5" />} />
            <CapexKpi label={t('capexPortfolio.kpiNetBookValue')} value={fmt(exec.parcVnc)} icon={<Boxes className="w-5 h-5" />} accent="text-emerald-600" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-gray-700">{t('capexPortfolio.acquisitionsByMonth', { year: annee })}</h3>
                <span className="text-xs text-[var(--color-text-tertiary)]">{t('capexPortfolio.excludingOpening', { amount: fmt(exec.flowGross) })}</span>
              </div>
              <CapexBars values={exec.byMonth} />
            </div>

            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
              <div className="px-4 py-3 border-b border-[var(--color-border)]"><h3 className="text-sm font-medium text-gray-700">{t('capexPortfolio.acquisitionsByNature')}</h3></div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('capexPortfolio.thCategoryNature')}</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('capexPortfolio.thAmount')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-32">{t('capexPortfolio.thShare')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {exec.byNature.map((n) => (
                    <tr key={n.rubrique} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5"><span className="font-mono font-bold text-[var(--color-primary)]">{n.rubrique}</span> <span className="text-gray-700">{n.label}</span></td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(n.total)}</td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-[var(--color-secondary)]" style={{ width: `${Math.max(2, Math.min(100, (n.total / maxNat) * 100))}%` }} /></div><span className="text-xs text-gray-400 w-9 text-right">{pctShare(n.total, exec.flowGross)}%</span></div></td>
                    </tr>
                  ))}
                  {exec.byNature.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">{t('capexPortfolio.noAcquisitions', { year: annee })}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)]">{t('capexPortfolio.executionFootnote')}</p>
        </>
      ) : null}
    </div>
  );
};

const STATUT_STYLE: Record<string, string> = {
  brouillon: 'bg-neutral-100 text-[var(--color-text-secondary)] dark:bg-neutral-700',
  demande: 'bg-neutral-100 text-[var(--color-text-secondary)] dark:bg-neutral-700',
  soumis: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  en_priorisation: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  approuve: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  approuve_avec_conditions: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  car_emis: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]',
  ajourne: 'bg-neutral-100 text-[var(--color-text-tertiary)]',
  rejete: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  fonds_disponibles: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]',
  clos: 'bg-neutral-100 text-[var(--color-text-tertiary)]',
};

const CapexPortfolioPage: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CapexRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await listCapexRequests(adapter); setRows(r); }
    catch (e: any) { setError(e?.message || t('capexPortfolio.errorGeneric')); }
    finally { setLoading(false); }
  }, [adapter, t]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const totals = useMemo(() => ({
    count: rows.length,
    montant: rows.reduce((s, r) => s + (r.montant || 0), 0),
    approuves: rows.filter((r) => ['approuve', 'approuve_avec_conditions', 'car_emis', 'fonds_disponibles'].includes(r.statut as string)).length,
  }), [rows]);

  const open = useCallback((id: string) => navigate(`/capex/bc/${id}`), [navigate]);

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Layers className="w-6 h-6 text-[var(--color-primary)]" /> {t('capexPortfolio.title')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">{t('capexPortfolio.subtitle', { count: String(totals.count), approved: String(totals.approuves), amount: formatCurrency(totals.montant) })}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> {t('capexPortfolio.newBusinessCase')}</button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Exécution réelle de l'investissement (GL classe 2) */}
      <CapexExecutionSection adapter={adapter} />

      {/* Pipeline des Business Cases — détail dans son onglet dédié ; ici, aperçu court. */}
      <div className="flex items-center gap-2 pt-2 flex-wrap">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Layers className="w-4 h-4 text-[var(--color-primary)]" /> {t('capexPortfolio.businessCases')}</h2>
        <span className="text-xs text-[var(--color-text-tertiary)]">{t('capexPortfolio.pipelineHint')}</span>
        <button onClick={() => navigate('/capex/business-cases')} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">
          {t('capexPortfolio.viewAllBusinessCases')} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> {t('capexPortfolio.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">{t('capexPortfolio.emptyBusinessCases')}</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left">{t('capexPortfolio.thLabel')}</th>
                <th className="px-4 py-3 text-left">{t('capexPortfolio.thAccount')}</th>
                <th className="px-4 py-3 text-left">{t('capexPortfolio.thCategory')}</th>
                <th className="px-4 py-3 text-right">{t('capexPortfolio.thAmount')}</th>
                <th className="px-4 py-3 text-right">{t('capexPortfolio.thNpv')}</th>
                <th className="px-4 py-3">{t('capexPortfolio.thStatus')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => open(r.id)} className="border-b border-[var(--color-border-light)] hover:bg-neutral-50 dark:hover:bg-neutral-700/30 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{r.libelle}</td>
                  <td className="px-4 py-3"><span className="font-mono">{r.account_code}</span><span className="block text-xs text-[var(--color-text-tertiary)] truncate max-w-[140px]">{getAccountLabel(r.account_code)}</span></td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] text-xs">{r.categorie ? r.categorie.replace(/_/g, ' ') : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.montant)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{r.van != null ? <span className={r.van >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(r.van)}</span> : '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_STYLE[r.statut as string] || 'bg-neutral-100 text-[var(--color-text-secondary)]'}`}>{String(r.statut).replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3 text-right"><ArrowRight className="w-4 h-4 text-neutral-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewBusinessCaseModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => { setShowCreate(false); loadRows(); navigate(`/capex/bc/${id}`); }}
      />
    </div>
  );
};

export default CapexPortfolioPage;
