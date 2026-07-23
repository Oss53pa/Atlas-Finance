/**
 * BudgetHubPage — /budget (refonte OPEX/CAPEX, Lot 1).
 *
 * Point d'entrée unifié du module Contrôle de Gestion budgétaire. Donne l'état
 * en un coup d'œil : exercice & version en vigueur (+ verrouillage hashé),
 * campagne budgétaire en cours, fondation analytique (org = sections_analytiques),
 * puis navigation vers les sous-modules OPEX / CAPEX / analyse.
 *
 * Remplace l'ancien module /budgeting (retiré, redirigé ici).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getDefaultAnnee, getActiveBudgetVersion, listBudgetVersions, verifyVersionChain, getActiveFiscalYear,
  type BudgetVersion, type BudgetVersionFull,
} from '../../features/budget/services/budgetService';
import { listCampagnes, createCampagne, type BudgetCampagne, type CampagneStatut } from '../../features/budget/services/campagneService';
import { listOrgTree, type SectionOrgNode } from '../../features/budget/services/sectionGovernanceService';
import { seedStandardAnalyticalStructure } from '../../features/budget/services/analyticsService';
import { STANDARD_ANALYTICAL_STRUCTURE } from '../../features/budget/data/standardAnalyticalStructure';
import {
  Lock, Unlock, ShieldCheck, ShieldAlert, GitBranch, Sparkles, Layers, Activity, BarChart3,
  Package, Target, Split, PieChart, ArrowRight, Loader2, Calendar, FileCheck, TrendingUp, Calculator, Bell,
} from 'lucide-react';

const CAMPAGNE_STEPS: CampagneStatut[] = ['preparation', 'ouverte', 'consolidation', 'arbitrage', 'votee', 'cloturee'];
const CAMPAGNE_LABEL_KEY: Record<CampagneStatut, string> = {
  preparation: 'budgetHub.statutPreparation', ouverte: 'budgetHub.statutOuverte', consolidation: 'budgetHub.statutConsolidation',
  arbitrage: 'budgetHub.statutArbitrage', votee: 'budgetHub.statutVotee', cloturee: 'budgetHub.statutCloturee',
};

const NAV_TILES = [
  { path: '/budget/campagne', labelKey: 'budgetHub.navCampagneLabel', descKey: 'budgetHub.navCampagneDesc', icon: Calendar },
  { path: '/budget/cockpit', labelKey: 'budgetHub.navCockpitLabel', descKey: 'budgetHub.navCockpitDesc', icon: Activity },
  { path: '/budget/exploitation', labelKey: 'budgetHub.navExploitationLabel', descKey: 'budgetHub.navExploitationDesc', icon: BarChart3 },
  { path: '/budget/revenus', labelKey: 'budgetHub.navRevenusLabel', descKey: 'budgetHub.navRevenusDesc', icon: TrendingUp },
  { path: '/budget/engagements', labelKey: 'budgetHub.navEngagementsLabel', descKey: 'budgetHub.navEngagementsDesc', icon: FileCheck },
  { path: '/capex', labelKey: 'budgetHub.navCapexLabel', descKey: 'budgetHub.navCapexDesc', icon: Package },
  { path: '/budget/pnl', labelKey: 'budgetHub.navPnlLabel', descKey: 'budgetHub.navPnlDesc', icon: Calculator },
  { path: '/budget/ecarts', labelKey: 'budgetHub.navEcartsLabel', descKey: 'budgetHub.navEcartsDesc', icon: Target },
  { path: '/budget/alertes', labelKey: 'budgetHub.navAlertesLabel', descKey: 'budgetHub.navAlertesDesc', icon: Bell },
  { path: '/budget/versions', labelKey: 'budgetHub.navVersionsLabel', descKey: 'budgetHub.navVersionsDesc', icon: Lock },
  { path: '/analytique', labelKey: 'budgetHub.navAnalytiqueLabel', descKey: 'budgetHub.navAnalytiqueDesc', icon: PieChart },
  { path: '/budget/ventilation', labelKey: 'budgetHub.navVentilationLabel', descKey: 'budgetHub.navVentilationDesc', icon: Split },
];

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-[var(--color-border)] shadow-sm shadow-sm ${className}`}>
    {children}
  </div>
);

const BudgetHubPage: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [annee, setAnnee] = useState('');
  const [active, setActive] = useState<BudgetVersion | null>(null);
  const [versions, setVersions] = useState<BudgetVersionFull[]>([]);
  const [campagnes, setCampagnes] = useState<BudgetCampagne[]>([]);
  const [org, setOrg] = useState<SectionOrgNode[]>([]);
  const [chain, setChain] = useState<{ valid: boolean; checked: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const [act, vers, camps, tree] = await Promise.all([
          getActiveBudgetVersion(adapter),
          listBudgetVersions(adapter),
          listCampagnes(adapter),
          listOrgTree(adapter),
        ]);
        let ch: { valid: boolean; checked: number } | null = null;
        if (act?.fiscal_year_id) {
          const r = await verifyVersionChain(adapter, act.fiscal_year_id);
          ch = { valid: r.valid, checked: r.checked };
        }
        if (cancelled) return;
        setAnnee(a); setActive(act); setVersions(vers); setCampagnes(camps); setOrg(tree); setChain(ch);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('budgetHub.errLoading'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const activeFull = useMemo(
    () => versions.find((v) => v.id === active?.id) ?? null,
    [versions, active],
  );
  const costCenters = useMemo(() => org.filter((n) => n.type_axe === 'centre_cout'), [org]);
  const currentCampagne = useMemo(
    () => campagnes.find((c) => c.statut !== 'cloturee') ?? campagnes[0] ?? null,
    [campagnes],
  );

  const initOrg = useCallback(async () => {
    setSeeding(true); setNotice(null); setError(null);
    try {
      const res = await seedStandardAnalyticalStructure(adapter, STANDARD_ANALYTICAL_STRUCTURE);
      setNotice(t('budgetHub.structureInitialized', { axes: String(res.axesCreated), sections: String(res.sectionsCreated) }));
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || t('budgetHub.errInitStructure'));
    } finally {
      setSeeding(false);
    }
  }, [adapter]);

  const createCampaign = useCallback(async () => {
    setNotice(null); setError(null);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy?.id) { setError(t('budgetHub.errNoFiscalYear')); return; }
      await createCampagne(adapter, { fiscalYearId: fy.id, libelle: t('budgetHub.campaignLibelle', { code: String(fy.code ?? annee) }) });
      setNotice(t('budgetHub.campaignCreated'));
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || t('budgetHub.errCreateCampaign'));
    }
  }, [adapter, annee]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{t('budgetHub.title')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">
            {t('budgetHub.subtitle', { year: String(annee || '—') })}
          </p>
        </div>
        <button
          onClick={() => navigate('/budget/versions')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition"
        >
          <GitBranch className="w-4 h-4" /> {t('budgetHub.navVersionsLabel')}
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> {t('budgetHub.loading')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Version en vigueur */}
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
                <Calendar className="w-4 h-4" /> {t('budgetHub.versionInForce')}
              </div>
              {activeFull ? (
                <>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">{activeFull.libelle}</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] capitalize">{activeFull.type}</span>
                    {activeFull.statut === 'verrouille' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]">
                        <Lock className="w-3 h-3" /> {t('budgetHub.locked')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Unlock className="w-3 h-3" /> {activeFull.statut}
                      </span>
                    )}
                    <span className="text-[var(--color-text-tertiary)]">v{activeFull.numero ?? 1} · {activeFull.nb_lignes ?? 0} {t('budgetHub.linesWord')}</span>
                  </div>
                  {activeFull.hash_sha256 && (
                    <div className="mt-3 text-[11px] font-mono text-[var(--color-text-tertiary)] truncate" title={activeFull.hash_sha256}>
                      sha256 {activeFull.hash_sha256.slice(0, 16)}…
                    </div>
                  )}
                  {chain && (
                    <div className={`mt-2 inline-flex items-center gap-1 text-xs ${chain.valid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {chain.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      {chain.valid
                        ? t('budgetHub.integrityVerified', { count: String(chain.checked) })
                        : t('budgetHub.integrityBroken', { count: String(chain.checked) })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-[var(--color-text-secondary)]">{t('budgetHub.noActiveVersion')}</div>
              )}
            </Card>

            {/* Fondation analytique / organisation */}
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
                <Layers className="w-4 h-4" /> {t('budgetHub.analyticalOrg')}
              </div>
              {costCenters.length > 0 ? (
                <>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {t('budgetHub.costCentersCount', { count: String(costCenters.length) })}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1 mb-2">{t('budgetHub.enterOpexPrompt')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {costCenters.slice(0, 8).map((c) => (
                      <button key={c.id} onClick={() => navigate(`/budget/saisie/${c.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)] text-xs font-medium hover:bg-[var(--color-primary-light)] transition">
                        {c.code}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/analytique')}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline"
                  >
                    {t('budgetHub.manageOrg')} <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    {t('budgetHub.noCostCenter')}
                  </div>
                  <button
                    onClick={initOrg}
                    disabled={seeding}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-secondary)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {t('budgetHub.initStandardStructure')}
                  </button>
                </>
              )}
            </Card>
          </div>

          {/* Campagne budgétaire */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                <Target className="w-4 h-4" /> {t('budgetHub.budgetCampaign')}
              </div>
              {!currentCampagne && (
                <button onClick={createCampaign} className="text-sm text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">
                  {t('budgetHub.newCampaign')}
                </button>
              )}
            </div>
            {currentCampagne ? (
              <>
                <div className="text-base font-semibold text-[var(--color-text-primary)] mb-4">{currentCampagne.libelle}</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {CAMPAGNE_STEPS.map((step, i) => {
                    const activeIdx = CAMPAGNE_STEPS.indexOf(currentCampagne.statut);
                    const done = i < activeIdx, cur = i === activeIdx;
                    return (
                      <React.Fragment key={step}>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          cur ? 'bg-[var(--color-primary)] text-white'
                          : done ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]'
                        }`}>{t(CAMPAGNE_LABEL_KEY[step])}</span>
                        {i < CAMPAGNE_STEPS.length - 1 && <span className="text-neutral-300">·</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--color-text-secondary)]">{t('budgetHub.noCampaign')}</div>
            )}
          </Card>

          {/* Navigation sous-modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAV_TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.path}
                  onClick={() => navigate(tile.path)}
                  className="group text-left bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 hover:border-[var(--color-primary)] hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] dark:text-[var(--color-primary)]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-[var(--color-primary)] transition" />
                  </div>
                  <div className="font-medium text-[var(--color-text-primary)]">{t(tile.labelKey)}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t(tile.descKey)}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetHubPage;
