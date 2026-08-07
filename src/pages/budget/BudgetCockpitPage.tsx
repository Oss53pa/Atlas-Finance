/**
 * BudgetCockpitPage — /budget/cockpit (CDC V3 §6).
 *
 * Première surface qui s'affiche : résultat budgété vs réalisé, taux de
 * réalisation, solde trésorerie, top écarts. Tout vient des VUES LIVE
 * (v_actual_exploitation / v_actual_treasury / v_budget_vs_actual) — zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { KPICard, ColorfulBarChart } from '../../components/ui/DesignSystem';
import {
  getDefaultAnnee, getActiveBudgetVersion, getExploitationSummary, getTreasuryActual, getAtterrissage,
  type ExploitationSummary, type TreasuryActualRow, type BudgetVersion,
} from '../../features/budget/services/budgetService';
import {
  TrendingUp, TrendingDown, Wallet, Target, PiggyBank, AlertTriangle, Gauge, Upload, GitBranch,
} from 'lucide-react';
import BudgetImportModal from './BudgetImportModal';
import BudgetSaisieModal from './BudgetSaisieModal';
import PageHeaderActions from '../../components/ui/PageHeaderActions';


const BudgetCockpitPage: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const MOIS = React.useMemo(() => t('budgetCockpit.monthsShort').split(','), [t]);
  const navigate = useNavigate();
  const [annee, setAnnee] = useState<string>('');
  const [version, setVersion] = useState<BudgetVersion | null>(null);
  const [summary, setSummary] = useState<ExploitationSummary | null>(null);
  const [treasury, setTreasury] = useState<TreasuryActualRow[]>([]);
  const [atterr, setAtterr] = useState<{ resultatAtterrissage: number; resultatBudget: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showSaisie, setShowSaisie] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ecartsScope, setEcartsScope] = useState<'all' | '6' | '7'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        if (cancelled) return;
        const moisCourant = new Date().getMonth() + 1;
        const [v, s, t, at] = await Promise.all([
          getActiveBudgetVersion(adapter),
          getExploitationSummary(adapter, a),
          getTreasuryActual(adapter, a),
          getAtterrissage(adapter, a, moisCourant),
        ]);
        if (cancelled) return;
        setAnnee(a); setVersion(v); setSummary(s); setTreasury(t);
        setAtterr({ resultatAtterrissage: at.resultatAtterrissage, resultatBudget: at.resultatBudget });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const tresorerieNette = useMemo(() => treasury.reduce((s, t) => s + t.flux_net, 0), [treasury]);

  const topEcarts = useMemo(() => {
    if (!summary) return [];
    return summary.parNature
      .filter(n => n.budget !== 0)
      .filter(n => ecartsScope === 'all' || n.classe === ecartsScope)
      .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
      .slice(0, 8);
  }, [summary, ecartsScope]);

  const resultatChart = useMemo(() => {
    if (!summary) return [];
    return summary.mensuel.map((m, i) => ({
      label: MOIS[i], value: Math.round(m.resultat / 1000), color: '',
    }));
  }, [summary]);

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-text-tertiary)]">{t('budgetCockpit.loading')}</div>;
  }
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-[var(--color-error-light,#FEECEC)] text-[var(--color-error)] rounded-lg p-4 text-sm">
          {t('budgetCockpit.loadError', { error })}
          <div className="text-xs mt-1 text-[var(--color-text-tertiary)]">{t('budgetCockpit.loadErrorHint')}</div>
        </div>
      </div>
    );
  }

  const s = summary!;
  const hasBudget = version != null && (s.caBudget !== 0 || s.chargesBudget !== 0);

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      {/* En-tête + actions (en haut) */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Gauge className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('budgetCockpit.title')}</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {t('budgetCockpit.subtitlePrefix', { year: annee })}{version
              ? <>{t('budgetCockpit.versionLabel', { name: version.libelle })} <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 align-middle">{version.statut}</span></>
              : t('budgetCockpit.noActiveBudget')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSaisie(true)} className="px-3 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2"><Target className="w-4 h-4" />{t('budgetCockpit.enter')}</button>
          <button onClick={() => setShowImport(true)} className="px-3 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2"><Upload className="w-4 h-4" />{t('budgetCockpit.import')}</button>
          <button onClick={() => navigate('/budget/versions')} className="px-3 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2"><GitBranch className="w-4 h-4" />{t('budgetCockpit.versions')}</button>
          <button onClick={() => navigate('/budget/exploitation')} className="px-3 py-2 text-sm font-medium bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-2">{t('budgetCockpit.budgetVsActual')}</button>
          <PageHeaderActions
            onToggleFilters={() => setFiltersOpen(o => !o)}
            filtersOpen={filtersOpen}
            activeFilters={ecartsScope !== 'all' ? 1 : 0}
            printTitle={t('budgetCockpit.printTitle', { year: annee })}
          />
        </div>
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-3 print-hide">
          <span className="text-sm text-gray-600">{t('budgetCockpit.topGaps')}</span>
          {([['all', t('budgetCockpit.scopeAll')], ['6', t('budgetCockpit.scopeExpenses')], ['7', t('budgetCockpit.scopeIncome')]] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setEcartsScope(k)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${ecartsScope === k ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] text-gray-600 hover:bg-gray-50'}`}>{lbl}</button>
          ))}
        </div>
      )}

      {/* KPIs réalisé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('budgetCockpit.kpiRevenue')} value={formatCurrency(s.caRealise)} icon={TrendingUp} color="primary" valueFontSize="1.125rem" />
        <KPICard title={t('budgetCockpit.kpiExpenses')} value={formatCurrency(s.chargesRealise)} icon={TrendingDown} color="warning" valueFontSize="1.125rem" />
        <KPICard
          title={t('budgetCockpit.kpiResult')} value={formatCurrency(s.resultatRealise)} icon={Target}
          color={s.resultatRealise >= 0 ? 'success' : 'error'} valueFontSize="1.125rem"
          subtitle={hasBudget ? t('budgetCockpit.budgetSubtitle', { amount: formatCurrency(s.resultatBudget) }) : undefined}
        />
        <KPICard
          title={t('budgetCockpit.kpiCash')} value={formatCurrency(tresorerieNette)} icon={PiggyBank}
          color={tresorerieNette >= 0 ? 'success' : 'error'} valueFontSize="1.125rem"
        />
      </div>

      {/* Bandeau budget si version active */}
      {hasBudget && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title={t('budgetCockpit.kpiBudgetedResult')} value={formatCurrency(s.resultatBudget)} icon={Wallet} color="neutral" valueFontSize="1.125rem" />
          <KPICard
            title={t('budgetCockpit.kpiAchievementRate')}
            value={s.tauxRealisationResultat != null ? `${s.tauxRealisationResultat}%` : '—'}
            icon={Gauge} color="primary"
          />
          <KPICard
            title={t('budgetCockpit.kpiResultGap')}
            value={formatCurrency(s.resultatRealise - s.resultatBudget)}
            icon={AlertTriangle}
            color={s.resultatRealise - s.resultatBudget >= 0 ? 'success' : 'error'} valueFontSize="1.125rem"
          />
        </div>
      )}

      {/* Atterrissage (LFT budgétaire) : réalisé YTD + budget des mois restants */}
      {hasBudget && atterr && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--color-primary)] flex items-center gap-2"><Gauge className="w-4 h-4" />{t('budgetCockpit.landingTitle')}</h2>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t('budgetCockpit.landingSubtitle')}</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('budgetCockpit.kpiBudgetedResult')}</p>
              <p className="text-lg font-bold text-gray-700">{formatCurrency(atterr.resultatBudget)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('budgetCockpit.landing')}</p>
              <p className={`text-lg font-bold ${atterr.resultatAtterrissage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(atterr.resultatAtterrissage)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('budgetCockpit.deltaVsBudget')}</p>
              <p className={`text-lg font-bold ${atterr.resultatAtterrissage - atterr.resultatBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {atterr.resultatAtterrissage - atterr.resultatBudget >= 0 ? '+' : ''}{formatCurrency(atterr.resultatAtterrissage - atterr.resultatBudget)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Résultat mensuel */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-1">{t('budgetCockpit.monthlyResult')}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('budgetCockpit.monthlyResultSub')}</p>
          {resultatChart.some(d => d.value !== 0)
            ? <ColorfulBarChart data={resultatChart} height={220} />
            : <div className="text-sm text-[var(--color-text-tertiary)] py-10 text-center">{t('budgetCockpit.noMovement')}</div>}
        </div>

        {/* Top écarts */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-1">{t('budgetCockpit.topGapsTitle')}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('budgetCockpit.topGapsSub')}</p>
          {topEcarts.length === 0 ? (
            <div className="text-sm text-[var(--color-text-tertiary)] py-10 text-center">
              {hasBudget ? t('budgetCockpit.noSignificantGap') : t('budgetCockpit.noBudgetEntered')}
            </div>
          ) : (
            <div className="space-y-2">
              {topEcarts.map(n => (
                <div key={n.code} className="flex items-center justify-between text-sm border-b border-[var(--color-border)] pb-2 last:border-0">
                  <span className="text-[var(--color-text-secondary)]"><span className="font-mono">{n.code}</span> · {n.label}</span>
                  {/* Favorable/défavorable selon la nature : charge (cl.6) sur-réalisée = rouge. */}
                  <span className={`font-semibold ${(n.classe === '6' ? n.ecart <= 0 : n.ecart >= 0) ? 'text-green-600' : 'text-red-600'}`}>
                    {n.ecart >= 0 ? '+' : ''}{formatCurrency(n.ecart)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      <BudgetImportModal open={showImport} onClose={() => setShowImport(false)} onImported={() => setRefreshKey(k => k + 1)} />
      <BudgetSaisieModal open={showSaisie} onClose={() => setShowSaisie(false)} onSaved={() => setRefreshKey(k => k + 1)} />
    </div>
  );
};

export default BudgetCockpitPage;
