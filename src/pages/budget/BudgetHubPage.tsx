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
const CAMPAGNE_LABEL: Record<CampagneStatut, string> = {
  preparation: 'Préparation', ouverte: 'Ouverte', consolidation: 'Consolidation',
  arbitrage: 'Arbitrage', votee: 'Votée', cloturee: 'Clôturée',
};

const NAV_TILES = [
  { path: '/budget/campagne', label: 'Campagne', desc: 'Cycle & complétude de saisie', icon: Calendar },
  { path: '/budget/cockpit', label: 'Cockpit budgétaire', desc: 'Budgété vs réalisé, top écarts', icon: Activity },
  { path: '/budget/exploitation', label: 'Budget vs Réalisé', desc: 'Pivot OPEX par maille', icon: BarChart3 },
  { path: '/budget/revenus', label: 'Budget des revenus', desc: 'Classe 7, volumes × prix', icon: TrendingUp },
  { path: '/budget/engagements', label: 'Engagements', desc: 'Registre + lettrage', icon: FileCheck },
  { path: '/capex', label: 'Investissement (CAPEX)', desc: 'BC, priorisation, CAR, projets', icon: Package },
  { path: '/budget/pnl', label: 'Résultat budgétaire', desc: 'P&L de gestion SYSCOHADA', icon: Calculator },
  { path: '/budget/ecarts', label: 'Analyse des écarts', desc: 'Waterfall, heatmap', icon: Target },
  { path: '/budget/alertes', label: 'Alertes budgétaires', desc: 'Dépassements & seuils', icon: Bell },
  { path: '/budget/versions', label: 'Versions & validation', desc: 'Verrouillage immuable', icon: Lock },
  { path: '/analytique', label: 'Comptabilité analytique', desc: 'Axes & sections (org)', icon: PieChart },
  { path: '/budget/ventilation', label: 'Moteur de ventilation', desc: 'Attribution du réel aux sections', icon: Split },
];

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-[var(--color-border)] shadow-sm shadow-sm ${className}`}>
    {children}
  </div>
);

const BudgetHubPage: React.FC = () => {
  const { adapter } = useData();
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
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
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
      setNotice(`Structure analytique initialisée : ${res.axesCreated} axe(s), ${res.sectionsCreated} section(s) créés.`);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || "Échec de l'initialisation de la structure analytique.");
    } finally {
      setSeeding(false);
    }
  }, [adapter]);

  const createCampaign = useCallback(async () => {
    setNotice(null); setError(null);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy?.id) { setError('Aucun exercice actif : créez un exercice avant la campagne.'); return; }
      await createCampagne(adapter, { fiscalYearId: fy.id, libelle: `Campagne budgétaire ${fy.code ?? annee}` });
      setNotice('Campagne créée (statut : Préparation).');
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || 'Échec de création de la campagne.');
    }
  }, [adapter, annee]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Hub budgétaire</h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">
            Contrôle de gestion — OPEX &amp; CAPEX · exercice {annee || '—'}
          </p>
        </div>
        <button
          onClick={() => navigate('/budget/versions')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition"
        >
          <GitBranch className="w-4 h-4" /> Versions &amp; validation
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
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Version en vigueur */}
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
                <Calendar className="w-4 h-4" /> Version en vigueur
              </div>
              {activeFull ? (
                <>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">{activeFull.libelle}</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] capitalize">{activeFull.type}</span>
                    {activeFull.statut === 'verrouille' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]">
                        <Lock className="w-3 h-3" /> Verrouillée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Unlock className="w-3 h-3" /> {activeFull.statut}
                      </span>
                    )}
                    <span className="text-[var(--color-text-tertiary)]">v{activeFull.numero ?? 1} · {activeFull.nb_lignes ?? 0} lignes</span>
                  </div>
                  {activeFull.hash_sha256 && (
                    <div className="mt-3 text-[11px] font-mono text-[var(--color-text-tertiary)] truncate" title={activeFull.hash_sha256}>
                      sha256 {activeFull.hash_sha256.slice(0, 16)}…
                    </div>
                  )}
                  {chain && (
                    <div className={`mt-2 inline-flex items-center gap-1 text-xs ${chain.valid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {chain.valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      Chaîne d'intégrité {chain.valid ? 'vérifiée' : 'ROMPUE'} ({chain.checked} version{chain.checked > 1 ? 's' : ''})
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-[var(--color-text-secondary)]">Aucune version en vigueur pour cet exercice.</div>
              )}
            </Card>

            {/* Fondation analytique / organisation */}
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
                <Layers className="w-4 h-4" /> Organisation analytique
              </div>
              {costCenters.length > 0 ? (
                <>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {costCenters.length} centre{costCenters.length > 1 ? 's' : ''} de coût
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1 mb-2">Saisir le budget OPEX d'un centre :</div>
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
                    Gérer l'organisation <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    Aucun centre de coût. Le budget a besoin d'une structure analytique pour s'imputer.
                  </div>
                  <button
                    onClick={initOrg}
                    disabled={seeding}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-secondary)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Initialiser la structure standard
                  </button>
                </>
              )}
            </Card>
          </div>

          {/* Campagne budgétaire */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                <Target className="w-4 h-4" /> Campagne budgétaire
              </div>
              {!currentCampagne && (
                <button onClick={createCampaign} className="text-sm text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">
                  + Nouvelle campagne
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
                        }`}>{CAMPAGNE_LABEL[step]}</span>
                        {i < CAMPAGNE_STEPS.length - 1 && <span className="text-neutral-300">·</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--color-text-secondary)]">Aucune campagne. Lancez une campagne pour cadrer l'élaboration budgétaire.</div>
            )}
          </Card>

          {/* Navigation sous-modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAV_TILES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.path}
                  onClick={() => navigate(t.path)}
                  className="group text-left bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 hover:border-[var(--color-primary)] hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] dark:text-[var(--color-primary)]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-[var(--color-primary)] transition" />
                  </div>
                  <div className="font-medium text-[var(--color-text-primary)]">{t.label}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t.desc}</div>
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
