/**
 * CloturesPeriodiquesPage — Module clôture comptable unifié.
 * Mode Mensuelle (6 onglets, réversible) + Mode Annuelle (7 onglets, irréversible).
 * Source de vérité: Dexie via DataAdapter.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getClosureSessions } from '../../services/closureService';
import { closureOrchestrator } from '../../services/cloture/closureOrchestrator';
import type { ClotureStep, ClotureContext } from '../../services/cloture/closureOrchestrator';
import {
  useControlesCoherence,
  MONTHLY_CONTROL_IDS,
  ALL_CONTROL_IDS,
  ANNUAL_BLOCKING_IDS,
} from './hooks/useControlesCoherence';
import type { ControleResult } from './hooks/useControlesCoherence';
import { buildRemediations } from '../../services/cloture/remediationService';
import { useFiscalPeriods } from './hooks/useFiscalPeriods';
import type { Periodicite } from './hooks/useFiscalPeriods';
import type { DBFiscalYear, DBClosureSession, DBFiscalPeriod } from '../../lib/db';
import { formatCurrency } from '../../utils/formatters';
import { logAudit } from '../../lib/db';
import toast from 'react-hot-toast';
import {
  Lock,
  Unlock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  FileText,
  Shield,
  Loader2,
  XCircle,
  ChevronRight,
  Info,
  BarChart3,
  Settings,
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  History,
  Wand2,
} from 'lucide-react';

// Sections
import Immobilisations from './sections/Immobilisations';
import RapprochementBancaire from './sections/RapprochementBancaire';
import EtatsSYSCOHADA from './sections/EtatsSYSCOHADA';
import ValidationFinale from './sections/ValidationFinale';

// New components
import RegularisationsTab from './components/RegularisationsTab';
import AffectationTab from './components/AffectationTab';
import ControlesPanel, { StatutIcon } from './components/ControlesPanel';
import PreflightVerrouillage from './components/PreflightVerrouillage';
import VerificationPrerequis from './components/VerificationPrerequis';

// ============================================================================
// TYPES
// ============================================================================

type ClotureMode = 'mensuelle' | 'annuelle';

type MonthlyTabId = 'dashboard' | 'cycle' | 'verification' | 'regularisations' | 'controles' | 'verrouillage' | 'etats' | 'sessions';
type AnnualTabId = 'dashboard' | 'cycle' | 'travaux' | 'inventaire' | 'controles' | 'etats' | 'validation' | 'affectation' | 'sessions';

type TabId = MonthlyTabId | AnnualTabId;

interface FYStats {
  totalEntries: number;
  drafts: number;
  produits: number;
  charges: number;
  resultat: number;
}

// ============================================================================
// HELPERS
// ============================================================================

type Translate = (key: string, params?: Record<string, string>) => string;

const buildPeriodiciteLabel = (
  t: Translate,
): Record<Periodicite, { noun: string; adj: string; count: number }> => ({
  mensuelle:     { noun: t('periodicClosure.periodicityMonthlyNoun'),    adj: t('periodicClosure.periodicityMonthlyAdj'),    count: 12 },
  trimestrielle: { noun: t('periodicClosure.periodicityQuarterlyNoun'),  adj: t('periodicClosure.periodicityQuarterlyAdj'),  count: 4 },
  semestrielle:  { noun: t('periodicClosure.periodicityHalfYearlyNoun'), adj: t('periodicClosure.periodicityHalfYearlyAdj'), count: 2 },
});

const STEP_ICON: Record<string, React.ReactNode> = {
  pending:  <ChevronRight className="w-4 h-4 text-gray-400" />,
  running:  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  done:     <CheckCircle className="w-4 h-4 text-green-600" />,
  error:    <XCircle className="w-4 h-4 text-red-600" />,
  skipped:  <Info className="w-4 h-4 text-gray-400" />,
};

const buildMonthlyTabs = (t: Translate): { id: MonthlyTabId; label: string; icon: React.ReactNode }[] => [
  { id: 'dashboard',        label: t('periodicClosure.tabDashboard'),      icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'cycle',            label: t('periodicClosure.tabCycle'),          icon: <Play className="w-4 h-4" /> },
  { id: 'verification',     label: t('periodicClosure.tabVerification'),   icon: <ClipboardCheck className="w-4 h-4" /> },
  { id: 'regularisations',  label: t('periodicClosure.tabAdjustments'),    icon: <BookOpen className="w-4 h-4" /> },
  { id: 'controles',        label: t('periodicClosure.tabControls'),       icon: <Shield className="w-4 h-4" /> },
  { id: 'verrouillage',     label: t('periodicClosure.tabLocking'),        icon: <Lock className="w-4 h-4" /> },
  { id: 'etats',            label: t('periodicClosure.tabMgmtStatements'), icon: <FileText className="w-4 h-4" /> },
  { id: 'sessions',         label: t('periodicClosure.tabSessions'),       icon: <History className="w-4 h-4" /> },
];

const buildAnnualTabs = (t: Translate): { id: AnnualTabId; label: string; icon: React.ReactNode }[] => [
  { id: 'dashboard',   label: t('periodicClosure.tabDashboard'),       icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'cycle',       label: t('periodicClosure.tabCycle'),           icon: <Play className="w-4 h-4" /> },
  { id: 'travaux',     label: t('periodicClosure.tabPrepWork'),        icon: <Settings className="w-4 h-4" /> },
  { id: 'inventaire',  label: t('periodicClosure.tabInventoryEntries'), icon: <BookOpen className="w-4 h-4" /> },
  { id: 'controles',   label: t('periodicClosure.tabControls'),        icon: <Shield className="w-4 h-4" /> },
  { id: 'etats',       label: t('periodicClosure.tabFinStatements'),   icon: <FileText className="w-4 h-4" /> },
  { id: 'validation',  label: t('periodicClosure.tabFinalValidation'), icon: <CheckCircle className="w-4 h-4" /> },
  { id: 'affectation', label: t('periodicClosure.tabAllocation'),      icon: <ArrowRight className="w-4 h-4" /> },
  { id: 'sessions',    label: t('periodicClosure.tabSessions'),        icon: <History className="w-4 h-4" /> },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CloturesPeriodiquesPage() {
  const { adapter } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();
  const PERIODICITE_LABEL = useMemo(() => buildPeriodiciteLabel(t), [t]);
  const [mode, setMode] = useState<ClotureMode>('mensuelle');
  const [tab, setTab] = useState<TabId>('dashboard');

  // FY state
  const [fiscalYears, setFiscalYears] = useState<DBFiscalYear[]>([]);
  const [selectedFYId, setSelectedFYId] = useState('');
  const [openingFYId, setOpeningFYId] = useState('');
  const [activeFY, setActiveFY] = useState<DBFiscalYear | null>(null);
  const [sessions, setSessions] = useState<DBClosureSession[]>([]);
  const [fyStats, setFyStats] = useState<FYStats | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  // Period state (monthly)
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [periodicite, setPeriodicite] = useState<Periodicite>('mensuelle');
  const {
    periods,
    loading: periodsLoading,
    createPeriodsForFY,
    deletePeriodsForFY,
    lockPeriod,
    unlockPeriod,
  } = useFiscalPeriods(selectedFYId);
  // Garde anti-double-génération (par exercice) pour l'auto-création
  const autoGenRef = useRef<Set<string>>(new Set());
  const [genState, setGenState] = useState<'idle' | 'generating' | 'error'>('idle');

  // Execution state
  const [steps, setSteps] = useState<ClotureStep[]>([]);
  const [executing, setExecuting] = useState(false);

  // Sub-tab for travaux préparatoires
  const [travauxSubTab, setTravauxSubTab] = useState<'controle' | 'immobilisations' | 'rapprochement'>('controle');

  // =========================================================================
  // LOAD DATA
  // =========================================================================

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const fys = await adapter.getAll<DBFiscalYear>('fiscalYears');
      setFiscalYears(fys);

      const active = fys.find(fy => fy.isActive) || fys.find(fy => !fy.isClosed) || fys[0] || null;
      setActiveFY(active);

      if (active && !selectedFYId) {
        setSelectedFYId(active.id);
      }

      const allSessions = await getClosureSessions(adapter);
      setSessions(allSessions);

      const targetFY = selectedFYId ? fys.find(f => f.id === selectedFYId) : active;
      if (targetFY) {
        const allEntries = await adapter.getAll<any>('journalEntries');
        const entries = allEntries.filter(
          (e: any) => e.date >= targetFY.startDate && e.date <= targetFY.endDate
        );
        // Exclude drafts from financial totals (consistent with financialStatementsService)
        const validEntries = entries.filter((e: any) => e.status !== 'draft');

        let produits = 0;
        let charges = 0;
        for (const entry of validEntries) {
          for (const line of entry.lines) {
            const cls = line.accountCode.charAt(0);
            if (cls === '7') produits += line.credit - line.debit;
            else if (cls === '6') charges += line.debit - line.credit;
          }
        }

        setFyStats({
          totalEntries: entries.length,
          drafts: entries.filter((e: any) => e.status === 'draft').length,
          produits,
          charges,
          resultat: produits - charges,
        });
      }
    } catch (err) {
      console.error('[loadDashboard]', err);
      toast.error('Erreur chargement tableau de bord');
    } finally {
      setDashLoading(false);
    }
  }, [adapter, selectedFYId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Reset tab when switching modes
  useEffect(() => { setTab('dashboard'); }, [mode]);

  // Init steps for annual mode
  useEffect(() => {
    if (mode === 'annuelle') {
      setSteps(closureOrchestrator.getSteps());
    } else {
      setSteps(closureOrchestrator.getMonthlySteps());
    }
  }, [mode]);

  // =========================================================================
  // PERIOD MANAGEMENT
  // =========================================================================

  // Auto-génération des périodes dès qu'un exercice est sélectionné (mode mensuel).
  // Une SEULE tentative par exercice : en cas d'échec on passe en état 'error'
  // (retry manuel), jamais de boucle automatique.
  useEffect(() => {
    if (mode !== 'mensuelle') return;
    if (!selectedFYId || periodsLoading) return;
    if (periods.length > 0) { setGenState('idle'); return; }
    if (autoGenRef.current.has(selectedFYId)) return;
    autoGenRef.current.add(selectedFYId);
    setGenState('generating');
    createPeriodsForFY(selectedFYId, periodicite)
      .then(() => setGenState('idle'))
      .catch((err) => {
        setGenState('error');
        console.error('[auto-gen periods]', err);
        toast.error(err instanceof Error ? err.message : t('periodicClosure.periodGenFailed'));
      });
  }, [mode, selectedFYId, periodsLoading, periods.length, periodicite, createPeriodsForFY, genState, t]);

  // Retry manuel après un échec de génération.
  const handleRetryGen = () => {
    if (!selectedFYId) return;
    autoGenRef.current.delete(selectedFYId);
    setGenState('idle'); // relance l'effet ci-dessus
  };

  // Changement de périodicité → régénère les périodes (si aucune n'est clôturée).
  const handlePeriodiciteChange = async (next: Periodicite) => {
    const prev = periodicite;
    setPeriodicite(next);
    if (!selectedFYId || mode !== 'mensuelle') return;
    autoGenRef.current.add(selectedFYId); // empêche l'effet de recréer en parallèle
    try {
      if (periods.length > 0) await deletePeriodsForFY(selectedFYId);
      const created = await createPeriodsForFY(selectedFYId, next);
      setSelectedPeriodId('');
      toast.success(t('periodicClosure.periodsGenerated', {
        count: String(created.length),
        adj: PERIODICITE_LABEL[next].adj,
      }));
    } catch (err) {
      setPeriodicite(prev); // rollback UI si la régénération est refusée
      toast.error(err instanceof Error ? err.message : t('periodicClosure.genericError'));
    }
  };

  /**
   * @param derogation renseignée quand l'utilisateur force le verrouillage malgré
   *        des contrôles non conformes — l'événement est journalisé AVANT le
   *        verrouillage pour rester opposable même si celui-ci échoue ensuite.
   */
  const handleLockPeriod = async (derogation?: { blockers: number; controles: string[] }) => {
    if (!selectedPeriodId) { toast.error(t('periodicClosure.selectPeriod')); return; }
    try {
      if (derogation) {
        const period = periods.find(p => p.id === selectedPeriodId);
        await logAudit(
          'CLOSURE_LOCK_OVERRIDE',
          'fiscalPeriod',
          selectedPeriodId,
          JSON.stringify({
            periode: period?.code,
            exercice: selectedFYId,
            controlesNonConformes: derogation.controles,
            nombreBloquants: derogation.blockers,
            utilisateur: user?.id ?? 'inconnu',
          }),
        );
      }
      await lockPeriod(selectedPeriodId, user?.id);
      toast.success(derogation
        ? t('periodicClosure.lockedByOverride')
        : t('periodicClosure.periodLocked'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('periodicClosure.genericError'));
    }
  };

  const handleUnlockPeriod = async () => {
    if (!selectedPeriodId) { toast.error(t('periodicClosure.selectPeriod')); return; }
    try {
      await unlockPeriod(selectedPeriodId, user?.id);
      toast.success(t('periodicClosure.periodReopened'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('periodicClosure.genericError'));
    }
  };

  // =========================================================================
  // EXECUTION (ANNUAL)
  // =========================================================================

  const buildCtx = (): ClotureContext => {
    const period = periods.find(p => p.id === selectedPeriodId);
    return {
      adapter,
      exerciceId: selectedFYId,
      mode: 'manual',
      userId: user?.id || 'comptable',
      openingExerciceId: openingFYId || undefined,
      periodId: selectedPeriodId || undefined,
      periodCode: period?.code,
      periodStart: period?.startDate,
      periodEnd: period?.endDate,
      onProgress: (step) => {
        setSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
      },
      onError: (step) => {
        setSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
      },
    };
  };

  const handleExecuteStep = async (stepId: string) => {
    if (!selectedFYId) { toast.error(t('periodicClosure.selectYear')); return; }
    setExecuting(true);
    try {
      const result = await closureOrchestrator.executeStep(stepId, buildCtx());
      setSteps(prev => prev.map(s => s.id === result.id ? result : s));
      if (result.status === 'done') toast.success(result.message || t('periodicClosure.ok'));
      else if (result.status === 'error') toast.error(result.message || t('periodicClosure.genericError'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('periodicClosure.unexpectedError'));
    } finally {
      setExecuting(false);
    }
  };

  const handleExecuteAll = async () => {
    if (!selectedFYId) { toast.error(t('periodicClosure.selectYear')); return; }
    setExecuting(true);
    try {
      const results = mode === 'annuelle'
        ? await closureOrchestrator.executeAll(buildCtx())
        : await closureOrchestrator.executeMonthly(buildCtx());
      setSteps(results);
      const errors = results.filter(s => s.status === 'error');
      if (errors.length === 0) {
        toast.success(t('periodicClosure.closingDone'));
        loadDashboard();
      } else {
        toast.error(t('periodicClosure.stepsInError', { count: String(errors.length) }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('periodicClosure.unexpectedError'));
    } finally {
      setExecuting(false);
    }
  };

  const selectedFY = fiscalYears.find(f => f.id === selectedFYId) || null;
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || null;
  const tabs = mode === 'mensuelle' ? buildMonthlyTabs(t) : buildAnnualTabs(t);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('periodicClosure.pageTitle')}</h1>
        {/* Mode selector */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['mensuelle', 'annuelle'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'mensuelle' ? t('periodicClosure.modeMonthly') : t('periodicClosure.modeAnnual')}
            </button>
          ))}
        </div>
      </div>

      {/* FY + Period selectors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('periodicClosure.fiscalYear')}</label>
            <select
              value={selectedFYId}
              onChange={e => { setSelectedFYId(e.target.value); setSelectedPeriodId(''); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">{t('periodicClosure.selectPlaceholder')}</option>
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.name} ({fy.startDate} → {fy.endDate}) {fy.isClosed ? t('periodicClosure.closedTag') : ''}
                </option>
              ))}
            </select>
          </div>

          {mode === 'mensuelle' && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('periodicClosure.periodicity')}</label>
                <select
                  value={periodicite}
                  onChange={e => handlePeriodiciteChange(e.target.value as Periodicite)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {(['mensuelle', 'trimestrielle', 'semestrielle'] as const).map(p => (
                    <option key={p} value={p}>
                      {t('periodicClosure.periodicityOption', {
                        noun: PERIODICITE_LABEL[p].noun,
                        count: String(PERIODICITE_LABEL[p].count),
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('periodicClosure.periodToClose')}</label>
                {periods.length > 0 ? (
                  <select
                    value={selectedPeriodId}
                    onChange={e => setSelectedPeriodId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">{t('periodicClosure.selectPlaceholder')}</option>
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label} [{p.status}]
                      </option>
                    ))}
                  </select>
                ) : genState === 'error' ? (
                  <div className="w-full px-3 py-2 text-sm border border-red-200 rounded bg-red-50 text-red-700 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {t('periodicClosure.genFailed')}
                    </span>
                    <button
                      onClick={handleRetryGen}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-white border border-red-300 rounded hover:bg-red-100"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {t('periodicClosure.retry')}
                    </button>
                  </div>
                ) : (
                  <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {selectedFYId ? t('periodicClosure.generatingPeriods') : t('periodicClosure.selectYear')}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'annuelle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('periodicClosure.nextYearCarry')}</label>
              <select
                value={openingFYId}
                onChange={e => setOpeningFYId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">{t('periodicClosure.optionalPlaceholder')}</option>
                {fiscalYears.filter(fy => fy.id !== selectedFYId).map(fy => (
                  <option key={fy.id} value={fy.id}>{fy.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={loadDashboard}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              {t('periodicClosure.refresh')}
            </button>
          </div>
        </div>

        {/* Périodes créées — dates start → end */}
        {mode === 'mensuelle' && periods.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              {t('periodicClosure.periodsSummary', {
                count: String(periods.length),
                noun: PERIODICITE_LABEL[periods[0].type].noun,
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              {periods.map(p => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
                >
                  <span className="font-mono font-medium text-gray-700">{p.code}</span>
                  <span className="text-gray-400">{p.startDate} → {p.endDate}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {/* ===== SHARED: Dashboard ===== */}
        {tab === 'dashboard' && (
          <DashboardSection
            mode={mode}
            loading={dashLoading}
            activeFY={selectedFY}
            stats={fyStats}
            periods={periods}
            selectedPeriod={selectedPeriod}
            onNavigateTab={setTab}
          />
        )}

        {/* ===== SHARED: Cycle de clôture (onglet dédié) ===== */}
        {tab === 'cycle' && (
          <CycleExecutionSection
            mode={mode}
            steps={steps}
            executing={executing}
            selectedFYId={selectedFYId}
            selectedPeriodId={selectedPeriodId}
            onExecuteStep={handleExecuteStep}
            onExecuteAll={handleExecuteAll}
          />
        )}

        {/* ===== SHARED: Sessions de clôture (onglet dédié) ===== */}
        {tab === 'sessions' && (
          <SessionsSection sessions={sessions} loading={dashLoading} />
        )}

        {/* ===== MONTHLY TABS ===== */}
        {mode === 'mensuelle' && tab === 'verification' && (
          <VerificationPrerequis
            fiscalYear={selectedFY}
            periods={periods}
            onNavigateTab={(id) => setTab(id as TabId)}
          />
        )}

        {mode === 'mensuelle' && tab === 'regularisations' && (
          <RegularisationsTab
            exerciceId={selectedFYId}
            dateClotureExercice={selectedFY?.endDate || ''}
            periodeCode={selectedPeriod?.code}
          />
        )}

        {mode === 'mensuelle' && tab === 'controles' && (
          <ControlesPanel
            controlIds={MONTHLY_CONTROL_IDS}
            fiscalYearId={selectedFYId}
            period={selectedPeriod}
            onNavigateTab={(id) => setTab(id as TabId)}
          />
        )}

        {mode === 'mensuelle' && tab === 'verrouillage' && (
          <VerrouillageSection
            period={selectedPeriod}
            fiscalYearId={selectedFYId}
            onLock={handleLockPeriod}
            onUnlock={handleUnlockPeriod}
            executing={executing}
          />
        )}

        {mode === 'mensuelle' && tab === 'etats' && <EtatsSYSCOHADA />}

        {/* ===== ANNUAL TABS ===== */}
        {mode === 'annuelle' && tab === 'travaux' && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
              {[
                { id: 'controle' as const, label: t('periodicClosure.subTabPeriodControl') },
                { id: 'immobilisations' as const, label: t('periodicClosure.subTabFixedAssets') },
                { id: 'rapprochement' as const, label: t('periodicClosure.subTabBankRecon') },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setTravauxSubTab(st.id)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    travauxSubTab === st.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            {travauxSubTab === 'controle' && (
              <VerificationPrerequis fiscalYear={selectedFY} periods={periods} />
            )}
            {travauxSubTab === 'immobilisations' && <Immobilisations />}
            {travauxSubTab === 'rapprochement' && <RapprochementBancaire />}
          </div>
        )}

        {mode === 'annuelle' && tab === 'inventaire' && (
          <RegularisationsTab
            exerciceId={selectedFYId}
            dateClotureExercice={selectedFY?.endDate || ''}
          />
        )}

        {mode === 'annuelle' && tab === 'controles' && (
          <ControlesPanel
            controlIds={ALL_CONTROL_IDS}
            fiscalYearId={selectedFYId}
            onNavigateTab={(id) => setTab(id as TabId)}
          />
        )}

        {mode === 'annuelle' && tab === 'etats' && <EtatsSYSCOHADA />}

        {mode === 'annuelle' && tab === 'validation' && <ValidationFinale />}

        {mode === 'annuelle' && tab === 'affectation' && (
          <AffectationTab
            exerciceId={selectedFYId}
            openingExerciceId={openingFYId || undefined}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CYCLE EXECUTION SECTION
// ============================================================================

function CycleExecutionSection({
  mode,
  steps,
  executing,
  selectedFYId,
  selectedPeriodId,
  onExecuteStep,
  onExecuteAll,
}: {
  mode: ClotureMode;
  steps: ClotureStep[];
  executing: boolean;
  selectedFYId: string;
  selectedPeriodId: string;
  onExecuteStep: (stepId: string) => void;
  onExecuteAll: () => void;
}) {
  const completedSteps = steps.filter(s => s.status === 'done').length;
  const errorSteps = steps.filter(s => s.status === 'error').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const allDone = completedSteps === totalSteps && totalSteps > 0;
  const hasErrors = errorSteps > 0;

  const { t } = useLanguage();
  const missingSelection = !selectedFYId || (mode === 'mensuelle' && !selectedPeriodId);

  // Détail des éléments bloquants (écritures non rapprochées, lignes non lettrées...) —
  // replié par défaut, une seule étape ouverte à la fois.
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600" />
          {mode === 'mensuelle' ? t('periodicClosure.cycleTitleMonthly') : t('periodicClosure.cycleTitleAnnual')}
          <span className="text-sm font-normal text-gray-500">
            {t('periodicClosure.stepsCount', { count: String(totalSteps) })}
          </span>
        </h2>
        <button
          onClick={onExecuteAll}
          disabled={executing || missingSelection || allDone}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {executing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {t('periodicClosure.runAll')}
        </button>
      </div>

      {missingSelection && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {!selectedFYId
            ? t('periodicClosure.selectYearForCycle')
            : t('periodicClosure.selectPeriodForCycle')}
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              hasErrors ? 'bg-red-500' : allDone ? 'bg-green-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-sm font-medium min-w-[48px] text-right ${
          hasErrors ? 'text-red-600' : allDone ? 'text-green-600' : 'text-gray-600'
        }`}>
          {progress}%
        </span>
      </div>

      {/* Steps list */}
      <div className="space-y-1">
        {steps.map((step, index) => {
          const isRunning = step.status === 'running';
          const isDone = step.status === 'done';
          const isError = step.status === 'error';
          const isPending = step.status === 'pending';
          // Garde de pré-requis : le verrouillage reste désactivé tant que les
          // étapes précédentes ne sont pas toutes vertes (intégrité SYSCOHADA).
          const isLockStep = /VERROUILLAGE/i.test(step.id);
          const lockBlocked = isLockStep && steps.slice(0, index).some(s => s.status !== 'done');

          const hasDetail = !!step.detail && step.detail.length > 0;
          const isExpanded = expandedStepId === step.id;

          return (
            <div
              key={step.id}
              className={`rounded-lg border transition-colors ${
                isRunning ? 'border-blue-200 bg-blue-50'
                  : isDone ? 'border-green-200 bg-green-50'
                  : isError ? 'border-red-200 bg-red-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Step number */}
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
                  isDone ? 'bg-green-600 text-white'
                    : isError ? 'bg-red-600 text-white'
                    : isRunning ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-white'
                }`}>
                  {isDone ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isError ? (
                    <XCircle className="w-4 h-4" />
                  ) : isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      isDone ? 'text-green-800' : isError ? 'text-red-800' : isRunning ? 'text-blue-800' : 'text-gray-700'
                    }`}>
                      {mode === 'mensuelle' ? `M${index + 1}` : `A${index + 1}`}. {step.label}
                    </span>
                    {step.status !== 'pending' && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        isDone ? 'bg-green-100 text-green-700'
                          : isError ? 'bg-red-100 text-red-700'
                          : isRunning ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isDone ? t('periodicClosure.stepDone')
                          : isError ? t('periodicClosure.stepError')
                          : isRunning ? t('periodicClosure.stepRunning')
                          : step.status}
                      </span>
                    )}
                  </div>
                  {step.message && (
                    <p className={`text-xs mt-0.5 truncate ${
                      isError ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {step.message}
                    </p>
                  )}
                  {hasDetail && (
                    <button
                      onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                      className="text-xs text-red-700 underline hover:no-underline mt-0.5"
                    >
                      {isExpanded
                        ? t('periodicClosure.hideDetail')
                        : t('periodicClosure.showDetail', { count: String(step.detail!.length) })}
                    </button>
                  )}
                </div>

                {/* Execute button */}
                <button
                  onClick={() => onExecuteStep(step.id)}
                  disabled={executing || missingSelection || isDone || lockBlocked}
                  title={lockBlocked ? t('periodicClosure.lockBlockedTitle') : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0 ${
                    isDone
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : isError
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRunning ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isError ? (
                    <RefreshCw className="w-3 h-3" />
                  ) : isDone ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  {isDone ? t('periodicClosure.ok') : isError ? t('periodicClosure.retry') : t('periodicClosure.run')}
                </button>
              </div>

              {/* Detail panel — liste des éléments bloquants concrets */}
              {hasDetail && isExpanded && (
                <div className="mx-3 mb-3 -mt-1 border border-red-200 bg-white rounded-md max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-gray-100 text-xs">
                    {step.detail!.map((item, i) => (
                      <li key={i} className="px-3 py-1.5 text-gray-700 font-mono">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary after execution */}
      {allDone && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {mode === 'mensuelle' ? t('periodicClosure.cycleDoneMonthly') : t('periodicClosure.cycleDoneAnnual')}
        </div>
      )}
      {hasErrors && !executing && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {t('periodicClosure.cycleErrors', { count: String(errorSteps) })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DASHBOARD SECTION
// ============================================================================

function DashboardSection({
  mode,
  loading,
  activeFY,
  stats,
  periods,
  selectedPeriod,
  onNavigateTab,
}: {
  mode: ClotureMode;
  loading: boolean;
  activeFY: DBFiscalYear | null;
  stats: FYStats | null;
  periods: DBFiscalPeriod[];
  selectedPeriod: DBFiscalPeriod | null;
  onNavigateTab: (tab: TabId) => void;
}) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">{t('periodicClosure.loading')}</span>
      </div>
    );
  }

  const closedPeriods = periods.filter(p => p.status === 'cloturee').length;
  const totalPeriods = periods.length;

  return (
    <div className="space-y-6">
      {/* Active FY */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5" />
          {mode === 'mensuelle' ? t('periodicClosure.selectedPeriod') : t('periodicClosure.exercise')}
        </h2>
        {activeFY ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('periodicClosure.exercise')}</p>
              <p className="font-medium">{activeFY.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('periodicClosure.period')}</p>
              <p className="font-medium">{activeFY.startDate} → {activeFY.endDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('periodicClosure.status')}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${
                activeFY.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
              }`}>
                {activeFY.isClosed ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {activeFY.isClosed ? t('periodicClosure.closed') : t('periodicClosure.open')}
              </span>
            </div>
            {mode === 'mensuelle' && selectedPeriod && (
              <div>
                <p className="text-sm text-gray-500">{t('periodicClosure.currentPeriod')}</p>
                <p className="font-medium">{selectedPeriod.label} [{selectedPeriod.status}]</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">{t('periodicClosure.noYearSelected')}</p>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label={t('periodicClosure.metricEntries')} value={stats ? String(stats.totalEntries) : '—'} />
        <MetricCard label={t('periodicClosure.metricDrafts')} value={stats ? String(stats.drafts) : '—'} alert={!!stats && stats.drafts > 0} />
        <MetricCard label={t('periodicClosure.metricRevenue')} value={stats ? formatCurrency(stats.produits) : '—'} />
        <MetricCard
          label={t('periodicClosure.metricResult')}
          value={stats ? formatCurrency(stats.resultat) : '—'}
          subtitle={stats ? (stats.resultat >= 0 ? t('periodicClosure.profit') : t('periodicClosure.loss')) : undefined}
        />
      </div>

      {/* Monthly: period progress */}
      {mode === 'mensuelle' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('periodicClosure.periodProgress')}</h3>
          {totalPeriods > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-gray-600">{t('periodicClosure.periodsClosedRatio', { closed: String(closedPeriods), total: String(totalPeriods) })}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${(closedPeriods / totalPeriods) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {periods.map(p => (
                  <span
                    key={p.id}
                    className={`px-2 py-0.5 text-xs rounded ${
                      p.status === 'cloturee' ? 'bg-green-100 text-green-700'
                        : p.status === 'en_cloture' ? 'bg-yellow-100 text-yellow-700'
                        : p.status === 'rouverte' ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.code.slice(5)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">{t('periodicClosure.periodsAutoHint')}</p>
          )}
        </div>
      )}

      {/* Sections overview — always visible */}
      <SectionsOverview mode={mode} onNavigateTab={onNavigateTab} />
    </div>
  );
}

// ============================================================================
// SESSIONS SECTION (onglet dédié)
// ============================================================================

function SessionsSection({ sessions, loading }: {
  sessions: DBClosureSession[];
  loading: boolean;
}) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">{t('periodicClosure.loading')}</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-gray-500" />
        {t('periodicClosure.sessionsTitle')}
        <span className="text-sm font-normal text-gray-500">({sessions.length})</span>
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">{t('periodicClosure.colType')}</th>
            <th className="pb-2">{t('periodicClosure.period')}</th>
            <th className="pb-2">{t('periodicClosure.status')}</th>
            <th className="pb-2">{t('periodicClosure.colProgress')}</th>
            <th className="pb-2">{t('periodicClosure.colDate')}</th>
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">{t('periodicClosure.noSessions')}</td>
            </tr>
          ) : (
            sessions.map(s => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2">{s.type}</td>
                <td className="py-2">{s.periode}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700'
                      : s.statut === 'ANNULEE' ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {s.statut}
                  </span>
                </td>
                <td className="py-2">{s.progression}%</td>
                <td className="py-2 text-gray-500">{s.dateCreation.slice(0, 10)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ label, value, subtitle, alert }: {
  label: string;
  value: string;
  subtitle?: string;
  alert?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 ${alert ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      {alert && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-1" />}
    </div>
  );
}

// ============================================================================
// SECTIONS OVERVIEW (always visible on dashboard)
// ============================================================================

/**
 * Référentiel des sections. `controlIds` rattache la section aux contrôles
 * RÉELLEMENT exécutés par `useControlesCoherence` : c'est ce lien qui permet
 * d'afficher un état vivant (et non un texte décoratif) sur le tableau de bord.
 */
interface SectionDef {
  tab: TabId;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  controlIds?: string[];
}

const buildMonthlySections = (t: Translate): SectionDef[] => [
  {
    tab: 'verification' as MonthlyTabId,
    title: t('periodicClosure.secVerifTitle'),
    description: t('periodicClosure.secVerifDesc'),
    icon: <ClipboardCheck className="w-5 h-5" />,
    details: [
      t('periodicClosure.secVerifD1'),
      t('periodicClosure.secVerifD2'),
      t('periodicClosure.secVerifD3'),
      t('periodicClosure.secVerifD4'),
      t('periodicClosure.secVerifD5'),
      t('periodicClosure.secVerifD6'),
    ],
  },
  {
    tab: 'regularisations' as MonthlyTabId,
    title: t('periodicClosure.secAdjTitle'),
    description: t('periodicClosure.secAdjDesc'),
    icon: <BookOpen className="w-5 h-5" />,
    details: [
      t('periodicClosure.secAdjD1'),
      t('periodicClosure.secAdjD2'),
      t('periodicClosure.secAdjD3'),
      t('periodicClosure.secAdjD4'),
      t('periodicClosure.secAdjD5'),
      t('periodicClosure.secAdjD6'),
      t('periodicClosure.secAdjD7'),
    ],
  },
  {
    tab: 'controles' as MonthlyTabId,
    title: t('periodicClosure.secCtrlTitle'),
    description: t('periodicClosure.secCtrlDescMonthly'),
    icon: <Shield className="w-5 h-5" />,
    details: [
      t('periodicClosure.secCtrlD1'),
      t('periodicClosure.secCtrlD2'),
      t('periodicClosure.secCtrlD3'),
      t('periodicClosure.secCtrlD5'),
      t('periodicClosure.secCtrlD6'),
      t('periodicClosure.secCtrlD8'),
      t('periodicClosure.secCtrlD10'),
      t('periodicClosure.secCtrlD11'),
      t('periodicClosure.secCtrlD13'),
    ],
    controlIds: MONTHLY_CONTROL_IDS,
  },
  {
    tab: 'verrouillage' as MonthlyTabId,
    title: t('periodicClosure.secLockTitle'),
    description: t('periodicClosure.secLockDesc'),
    icon: <Lock className="w-5 h-5" />,
    details: [
      t('periodicClosure.secLockD1'),
      t('periodicClosure.secLockD2'),
      t('periodicClosure.secLockD3'),
      t('periodicClosure.secLockD4'),
      t('periodicClosure.secLockD5'),
    ],
  },
  {
    tab: 'etats' as MonthlyTabId,
    title: t('periodicClosure.secMgmtTitle'),
    description: t('periodicClosure.secMgmtDesc'),
    icon: <FileText className="w-5 h-5" />,
    details: [
      t('periodicClosure.secMgmtD1'),
      t('periodicClosure.secMgmtD2'),
      t('periodicClosure.secMgmtD3'),
      t('periodicClosure.secMgmtD4'),
      t('periodicClosure.secMgmtD5'),
    ],
  },
];

const buildAnnualSections = (t: Translate): SectionDef[] => [
  {
    tab: 'travaux' as AnnualTabId,
    title: t('periodicClosure.secPrepTitle'),
    description: t('periodicClosure.secPrepDesc'),
    icon: <Settings className="w-5 h-5" />,
    details: [
      t('periodicClosure.secPrepD1'),
      t('periodicClosure.secPrepD2'),
      t('periodicClosure.secPrepD3'),
    ],
  },
  {
    tab: 'inventaire' as AnnualTabId,
    title: t('periodicClosure.secInvTitle'),
    description: t('periodicClosure.secInvDesc'),
    icon: <BookOpen className="w-5 h-5" />,
    details: [
      t('periodicClosure.secInvD1'),
      t('periodicClosure.secInvD2'),
      t('periodicClosure.secInvD3'),
      t('periodicClosure.secInvD4'),
      t('periodicClosure.secInvD5'),
    ],
  },
  {
    tab: 'controles' as AnnualTabId,
    title: t('periodicClosure.secCtrlTitle'),
    description: t('periodicClosure.secCtrlDescAnnual', { count: String(ANNUAL_BLOCKING_IDS.length) }),
    icon: <Shield className="w-5 h-5" />,
    details: [
      t('periodicClosure.secCtrlAnnualD1'),
      t('periodicClosure.secCtrlAnnualD2'),
      t('periodicClosure.secCtrlAnnualD3'),
      t('periodicClosure.secCtrlAnnualD4'),
      t('periodicClosure.secCtrlAnnualD5'),
      t('periodicClosure.secCtrlAnnualD6'),
      t('periodicClosure.secCtrlAnnualD7'),
      t('periodicClosure.secCtrlAnnualD8', { ids: ANNUAL_BLOCKING_IDS.join(', ') }),
    ],
    controlIds: ALL_CONTROL_IDS,
  },
  {
    tab: 'etats' as AnnualTabId,
    title: t('periodicClosure.secFinTitle'),
    description: t('periodicClosure.secFinDesc'),
    icon: <FileText className="w-5 h-5" />,
    details: [
      t('periodicClosure.secFinD1'),
      t('periodicClosure.secFinD2'),
      t('periodicClosure.secFinD3'),
      t('periodicClosure.secFinD4'),
      t('periodicClosure.secFinD5'),
    ],
  },
  {
    tab: 'validation' as AnnualTabId,
    title: t('periodicClosure.secValidTitle'),
    description: t('periodicClosure.secValidDesc'),
    icon: <CheckCircle className="w-5 h-5" />,
    details: [
      t('periodicClosure.secValidD1'),
      t('periodicClosure.secValidD2'),
      t('periodicClosure.secValidD3'),
      t('periodicClosure.secValidD4'),
      t('periodicClosure.secValidD5'),
    ],
  },
  {
    tab: 'affectation' as AnnualTabId,
    title: t('periodicClosure.secAllocTitle'),
    description: t('periodicClosure.secAllocDesc'),
    icon: <ArrowRight className="w-5 h-5" />,
    details: [
      t('periodicClosure.secAllocD1'),
      t('periodicClosure.secAllocD2'),
      t('periodicClosure.secAllocD3'),
      t('periodicClosure.secAllocD4'),
      t('periodicClosure.secAllocD5'),
      t('periodicClosure.secAllocD6'),
      t('periodicClosure.secAllocD7'),
    ],
  },
];

/**
 * Vue synthèse des sections — VIVANTE : chaque carte porte l'état réel des
 * contrôles qui lui sont rattachés (anomalies, corrections automatiques
 * disponibles) et ouvre l'onglet correspondant.
 */
function SectionsOverview({ mode, onNavigateTab }: { mode: ClotureMode; onNavigateTab: (tab: TabId) => void }) {
  const { t } = useLanguage();
  const sections = mode === 'mensuelle' ? buildMonthlySections(t) : buildAnnualSections(t);
  const { controles, loading } = useControlesCoherence(
    mode === 'mensuelle' ? MONTHLY_CONTROL_IDS : ALL_CONTROL_IDS,
  );

  const byId = new Map(controles.map(c => [c.id, c]));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-500" />
        {mode === 'mensuelle' ? t('periodicClosure.sectionsTitleMonthly') : t('periodicClosure.sectionsTitleAnnual')}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-300" />}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, idx) => {
          const sectionControls = (section.controlIds ?? [])
            .map(id => byId.get(id))
            .filter((c): c is ControleResult => !!c);
          const anomalies = sectionControls.reduce((s, c) => s + (c.anomaliesTotal || 0), 0);
          const autoFixes = sectionControls.reduce(
            (s, c) => s + buildRemediations(c).filter(p => p.mode === 'auto').length, 0,
          );
          const ko = sectionControls.filter(c => c.statut === 'non_conforme').length;
          const warn = sectionControls.filter(c => c.statut === 'attention').length;

          return (
            <button
              key={section.tab}
              type="button"
              onClick={() => onNavigateTab(section.tab)}
              className="text-left border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="text-blue-600">{section.icon}</div>
                <h3 className="text-sm font-semibold text-gray-800 flex-1">
                  {idx + 1}. {section.title}
                </h3>
                {sectionControls.length > 0 && !loading && (
                  ko > 0
                    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">{t('periodicClosure.nonCompliantCount', { count: String(ko) })}</span>
                    : warn > 0
                      ? <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">{t('periodicClosure.warnCount', { count: String(warn) })}</span>
                      : <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">{t('periodicClosure.compliant')}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">{section.description}</p>

              {sectionControls.length > 0 && !loading && (
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
                  <span className="text-gray-500">{t('periodicClosure.detailedAnomalies', { count: String(anomalies) })}</span>
                  {autoFixes > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                      <Wand2 className="w-3 h-3" />
                      {t('periodicClosure.autoFixes', { count: String(autoFixes) })}
                    </span>
                  )}
                </div>
              )}

              <ul className="space-y-1">
                {section.details.map((detail, i) => {
                  const controlId = /^(C\d+)\b/.exec(detail)?.[1];
                  const ctrl = controlId ? byId.get(controlId) : undefined;
                  return (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                      {ctrl
                        ? <span className="mt-0.5 flex-shrink-0"><StatutIcon statut={ctrl.statut} /></span>
                        : <ChevronRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />}
                      <span className="flex-1">
                        {detail}
                        {ctrl && ctrl.anomaliesTotal > 0 && (
                          <span className="ml-1 text-gray-400">({ctrl.anomaliesTotal})</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-[11px] text-blue-600 flex items-center gap-1">
                {t('periodicClosure.openSection')}
                <ArrowRight className="w-3 h-3" />
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ============================================================================
// VERROUILLAGE SECTION (MONTHLY)
// ============================================================================

function VerrouillageSection({
  period,
  fiscalYearId,
  onLock,
  onUnlock,
  executing,
}: {
  period: DBFiscalPeriod | null;
  fiscalYearId?: string;
  onLock: (derogation?: { blockers: number; controles: string[] }) => void;
  onUnlock: () => void;
  executing: boolean;
}) {
  // Pré-vol : contrôles non conformes SUR LA PÉRIODE. Tant qu'il en reste,
  // le verrouillage est refusé — sauf dérogation explicite et journalisée.
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const [blockerIds, setBlockerIds] = useState<string[]>([]);
  const [force, setForce] = useState(false);
  const blockers = blockerIds.length;
  useEffect(() => { setForce(false); }, [period?.id]);

  if (!period) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        <Lock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>{t('periodicClosure.selectPeriodForLock')}</p>
      </div>
    );
  }

  const isClosed = period.status === 'cloturee';
  const isReopened = period.status === 'rouverte';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {t('periodicClosure.lockSectionTitle')}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">{t('periodicClosure.period')}</p>
            <p className="font-medium">{period.label}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('periodicClosure.colCode')}</p>
            <p className="font-mono">{period.code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('periodicClosure.status')}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${
              isClosed ? 'bg-green-100 text-green-700'
                : isReopened ? 'bg-orange-100 text-orange-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {isClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {period.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('periodicClosure.colProgress')}</p>
            <p className="font-medium">{period.progression}%</p>
          </div>
        </div>

        {period.closedAt && (
          <p className="text-xs text-gray-400 mb-4">
            {t('periodicClosure.closedOnBy', {
              date: new Date(period.closedAt).toLocaleString(dateLocale),
              user: period.closedBy ?? '—',
            })}
          </p>
        )}
        {period.reopenedAt && (
          <p className="text-xs text-orange-500 mb-4">
            {t('periodicClosure.reopenedOnBy', {
              date: new Date(period.reopenedAt).toLocaleString(dateLocale),
              user: period.reopenedBy ?? '—',
            })}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!isClosed && (
            <>
              <button
                onClick={() => onLock(blockers > 0 ? { blockers, controles: blockerIds } : undefined)}
                disabled={executing || (blockers > 0 && !force)}
                title={blockers > 0 && !force
                  ? t('periodicClosure.lockBlockedByControls', { count: String(blockers) })
                  : undefined}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {t('periodicClosure.lockPeriod')}
              </button>
              {blockers > 0 && (
                <label className="flex items-center gap-2 text-xs text-red-700">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={e => setForce(e.target.checked)}
                    className="rounded border-red-300"
                  />
                  {t('periodicClosure.forceDespite', { count: String(blockers) })}
                </label>
              )}
            </>
          )}
          {isClosed && (
            <button
              onClick={onUnlock}
              disabled={executing}
              className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 disabled:opacity-50"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              {t('periodicClosure.reopenPeriod')}
            </button>
          )}
        </div>
      </div>

      {/* Pré-vol : contrôles de la période + corrections applicables */}
      {!isClosed && (
        <PreflightVerrouillage
          periodStart={period.startDate}
          periodEnd={period.endDate}
          periodLabel={period.label}
          fiscalYearId={fiscalYearId}
          onBlockersChange={setBlockerIds}
        />
      )}

      {/* Warning for reopening */}
      {isClosed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t('periodicClosure.reopenWarning')}
          </p>
        </div>
      )}
    </div>
  );
}

export default CloturesPeriodiquesPage;
