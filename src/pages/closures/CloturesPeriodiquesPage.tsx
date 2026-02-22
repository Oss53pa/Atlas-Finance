/**
 * CloturesPeriodiquesPage — Module clôture comptable unifié.
 * Mode Mensuelle (6 onglets, réversible) + Mode Annuelle (7 onglets, irréversible).
 * Source de vérité: Dexie via DataAdapter.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { getClosureSessions } from '../../services/closureService';
import { closureOrchestrator } from '../../services/cloture/closureOrchestrator';
import type { ClotureStep, ClotureContext } from '../../services/cloture/closureOrchestrator';
import { useControlesCoherence, MONTHLY_CONTROL_IDS, ANNUAL_BLOCKING_IDS } from './hooks/useControlesCoherence';
import type { ControleStatut, ControleResult } from './hooks/useControlesCoherence';
import { useFiscalPeriods } from './hooks/useFiscalPeriods';
import type { DBFiscalYear, DBClosureSession, DBFiscalPeriod } from '../../lib/db';
import { formatCurrency } from '../../utils/formatters';
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
} from 'lucide-react';

// Sections
import ControlePeriodes from './sections/ControlePeriodes';
import Immobilisations from './sections/Immobilisations';
import RapprochementBancaire from './sections/RapprochementBancaire';
import EtatsSYSCOHADA from './sections/EtatsSYSCOHADA';
import ValidationFinale from './sections/ValidationFinale';

// New components
import RegularisationsTab from './components/RegularisationsTab';
import AffectationTab from './components/AffectationTab';

// ============================================================================
// TYPES
// ============================================================================

type ClotureMode = 'mensuelle' | 'annuelle';

type MonthlyTabId = 'dashboard' | 'verification' | 'regularisations' | 'controles' | 'verrouillage' | 'etats';
type AnnualTabId = 'dashboard' | 'travaux' | 'inventaire' | 'controles' | 'etats' | 'validation' | 'affectation';

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

const STATUT_BADGE: Record<ControleStatut, { bg: string; text: string; label: string }> = {
  conforme:       { bg: 'bg-green-100', text: 'text-green-800', label: 'Conforme' },
  non_conforme:   { bg: 'bg-red-100',   text: 'text-red-800',   label: 'Non conforme' },
  attention:      { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Attention' },
  non_applicable: { bg: 'bg-gray-100',  text: 'text-gray-500',  label: 'N/A' },
  en_attente:     { bg: 'bg-gray-100',  text: 'text-gray-500',  label: 'En attente' },
};

const STEP_ICON: Record<string, React.ReactNode> = {
  pending:  <ChevronRight className="w-4 h-4 text-gray-400" />,
  running:  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  done:     <CheckCircle className="w-4 h-4 text-green-600" />,
  error:    <XCircle className="w-4 h-4 text-red-600" />,
  skipped:  <Info className="w-4 h-4 text-gray-400" />,
};

const MONTHLY_TABS: { id: MonthlyTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',        label: 'Tableau de bord',   icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'verification',     label: 'Vérification',      icon: <ClipboardCheck className="w-4 h-4" /> },
  { id: 'regularisations',  label: 'Régularisations',   icon: <BookOpen className="w-4 h-4" /> },
  { id: 'controles',        label: 'Contrôles',         icon: <Shield className="w-4 h-4" /> },
  { id: 'verrouillage',     label: 'Verrouillage',      icon: <Lock className="w-4 h-4" /> },
  { id: 'etats',            label: 'États de gestion',  icon: <FileText className="w-4 h-4" /> },
];

const ANNUAL_TABS: { id: AnnualTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',   label: 'Tableau de bord',       icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'travaux',     label: 'Travaux préparatoires',  icon: <Settings className="w-4 h-4" /> },
  { id: 'inventaire',  label: 'Écritures d\'inventaire', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'controles',   label: 'Contrôles',              icon: <Shield className="w-4 h-4" /> },
  { id: 'etats',       label: 'États financiers',       icon: <FileText className="w-4 h-4" /> },
  { id: 'validation',  label: 'Validation finale',      icon: <CheckCircle className="w-4 h-4" /> },
  { id: 'affectation', label: 'Affectation & Reports',  icon: <ArrowRight className="w-4 h-4" /> },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CloturesPeriodiquesPage() {
  const { adapter } = useData();
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
  const { periods, refresh: refreshPeriods, createPeriodsForFY, lockPeriod, unlockPeriod } = useFiscalPeriods(selectedFYId);

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

        let produits = 0;
        let charges = 0;
        for (const entry of entries) {
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
    } catch {
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

  const handleCreatePeriods = async () => {
    if (!selectedFYId) return;
    try {
      await createPeriodsForFY(selectedFYId);
      toast.success('Périodes mensuelles créées');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleLockPeriod = async () => {
    if (!selectedPeriodId) { toast.error('Sélectionnez une période'); return; }
    try {
      await lockPeriod(selectedPeriodId, 'comptable');
      toast.success('Période verrouillée');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleUnlockPeriod = async () => {
    if (!selectedPeriodId) { toast.error('Sélectionnez une période'); return; }
    try {
      await unlockPeriod(selectedPeriodId, 'comptable');
      toast.success('Période réouverte');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
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
      userId: 'comptable',
      openingExerciceId: openingFYId || undefined,
      periodId: selectedPeriodId || undefined,
      periodCode: period?.code,
      onProgress: (step) => {
        setSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
      },
      onError: (step) => {
        setSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
      },
    };
  };

  const handleExecuteStep = async (stepId: string) => {
    if (!selectedFYId) { toast.error('Sélectionnez un exercice'); return; }
    setExecuting(true);
    try {
      const result = await closureOrchestrator.executeStep(stepId, buildCtx());
      setSteps(prev => prev.map(s => s.id === result.id ? result : s));
      if (result.status === 'done') toast.success(result.message || 'OK');
      else if (result.status === 'error') toast.error(result.message || 'Erreur');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setExecuting(false);
    }
  };

  const handleExecuteAll = async () => {
    if (!selectedFYId) { toast.error('Sélectionnez un exercice'); return; }
    setExecuting(true);
    try {
      const results = mode === 'annuelle'
        ? await closureOrchestrator.executeAll(buildCtx())
        : await closureOrchestrator.executeMonthly(buildCtx());
      setSteps(results);
      const errors = results.filter(s => s.status === 'error');
      if (errors.length === 0) {
        toast.success('Clôture terminée avec succès');
        loadDashboard();
      } else {
        toast.error(`${errors.length} étape(s) en erreur`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setExecuting(false);
    }
  };

  const selectedFY = fiscalYears.find(f => f.id === selectedFYId) || null;
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || null;
  const tabs = mode === 'mensuelle' ? MONTHLY_TABS : ANNUAL_TABS;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clôtures Périodiques</h1>
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
              {m === 'mensuelle' ? 'Mensuelle' : 'Annuelle'}
            </button>
          ))}
        </div>
      </div>

      {/* FY + Period selectors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercice fiscal</label>
            <select
              value={selectedFYId}
              onChange={e => { setSelectedFYId(e.target.value); setSelectedPeriodId(''); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Sélectionner --</option>
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.name} ({fy.startDate} → {fy.endDate}) {fy.isClosed ? '[Clôturé]' : ''}
                </option>
              ))}
            </select>
          </div>

          {mode === 'mensuelle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
              {periods.length > 0 ? (
                <select
                  value={selectedPeriodId}
                  onChange={e => setSelectedPeriodId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">-- Sélectionner --</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} [{p.status}]
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={handleCreatePeriods}
                  disabled={!selectedFYId}
                  className="w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded hover:bg-gray-50 text-gray-500 disabled:opacity-50"
                >
                  Créer les périodes mensuelles
                </button>
              )}
            </div>
          )}

          {mode === 'annuelle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exercice N+1 (reports)</label>
              <select
                value={openingFYId}
                onChange={e => setOpeningFYId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">-- Optionnel --</option>
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
              Actualiser
            </button>
          </div>
        </div>
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
            sessions={sessions}
            periods={periods}
            selectedPeriod={selectedPeriod}
          />
        )}

        {/* ===== MONTHLY TABS ===== */}
        {mode === 'mensuelle' && tab === 'verification' && <ControlePeriodes />}

        {mode === 'mensuelle' && tab === 'regularisations' && selectedFY && (
          <RegularisationsTab
            exerciceId={selectedFYId}
            dateClotureExercice={selectedFY.endDate}
            periodeCode={selectedPeriod?.code}
          />
        )}

        {mode === 'mensuelle' && tab === 'controles' && (
          <ControlesSection controlIds={MONTHLY_CONTROL_IDS} />
        )}

        {mode === 'mensuelle' && tab === 'verrouillage' && (
          <VerrouillageSection
            period={selectedPeriod}
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
                { id: 'controle' as const, label: 'Contrôle Périodes' },
                { id: 'immobilisations' as const, label: 'Immobilisations' },
                { id: 'rapprochement' as const, label: 'Rapprochement Bancaire' },
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
            {travauxSubTab === 'controle' && <ControlePeriodes />}
            {travauxSubTab === 'immobilisations' && <Immobilisations />}
            {travauxSubTab === 'rapprochement' && <RapprochementBancaire />}
          </div>
        )}

        {mode === 'annuelle' && tab === 'inventaire' && selectedFY && (
          <RegularisationsTab
            exerciceId={selectedFYId}
            dateClotureExercice={selectedFY.endDate}
          />
        )}

        {mode === 'annuelle' && tab === 'controles' && (
          <ControlesSection />
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
// DASHBOARD SECTION
// ============================================================================

function DashboardSection({
  mode,
  loading,
  activeFY,
  stats,
  sessions,
  periods,
  selectedPeriod,
}: {
  mode: ClotureMode;
  loading: boolean;
  activeFY: DBFiscalYear | null;
  stats: FYStats | null;
  sessions: DBClosureSession[];
  periods: DBFiscalPeriod[];
  selectedPeriod: DBFiscalPeriod | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Chargement...</span>
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
          {mode === 'mensuelle' ? 'Période sélectionnée' : 'Exercice'}
        </h2>
        {activeFY ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Exercice</p>
              <p className="font-medium">{activeFY.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Période</p>
              <p className="font-medium">{activeFY.startDate} → {activeFY.endDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Statut</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${
                activeFY.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
              }`}>
                {activeFY.isClosed ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {activeFY.isClosed ? 'Clôturé' : 'Ouvert'}
              </span>
            </div>
            {mode === 'mensuelle' && selectedPeriod && (
              <div>
                <p className="text-sm text-gray-500">Période courante</p>
                <p className="font-medium">{selectedPeriod.label} [{selectedPeriod.status}]</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Aucun exercice sélectionné</p>
        )}
      </div>

      {/* Key metrics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Écritures" value={String(stats.totalEntries)} />
          <MetricCard label="Brouillons" value={String(stats.drafts)} alert={stats.drafts > 0} />
          <MetricCard label="Produits (cl.7)" value={formatCurrency(stats.produits)} />
          <MetricCard
            label="Résultat"
            value={formatCurrency(stats.resultat)}
            subtitle={stats.resultat >= 0 ? 'Bénéfice' : 'Perte'}
          />
        </div>
      )}

      {/* Monthly: period progress */}
      {mode === 'mensuelle' && totalPeriods > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Progression des périodes</h3>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-gray-600">{closedPeriods}/{totalPeriods} périodes clôturées</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${totalPeriods > 0 ? (closedPeriods / totalPeriods) * 100 : 0}%` }}
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
        </div>
      )}

      {/* Sessions */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Sessions de clôture</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune session de clôture enregistrée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Type</th>
                <th className="pb-2">Période</th>
                <th className="pb-2">Statut</th>
                <th className="pb-2">Progression</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
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
              ))}
            </tbody>
          </table>
        )}
      </div>
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
// CONTROLES SECTION
// ============================================================================

function ControlesSection({ controlIds }: { controlIds?: string[] }) {
  const { controles, loading, error, lastRun, refresh } = useControlesCoherence(controlIds);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">
          Exécution des {controlIds ? controlIds.length : 17} contrôles...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Erreur</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const conformes = controles.filter(c => c.statut === 'conforme').length;
  const nonConformes = controles.filter(c => c.statut === 'non_conforme').length;
  const attentions = controles.filter(c => c.statut === 'attention').length;
  const na = controles.filter(c => c.statut === 'non_applicable').length;
  const blockingFailed = controles.filter(c => c.blocking && c.statut === 'non_conforme');

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-700 font-medium">{conformes} conformes</span>
          <span className="text-red-700 font-medium">{nonConformes} non conformes</span>
          <span className="text-yellow-700 font-medium">{attentions} attention</span>
          <span className="text-gray-500">{na} N/A</span>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-xs text-gray-400">
              {new Date(lastRun).toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Relancer
          </button>
        </div>
      </div>

      {/* Blocking warning */}
      {blockingFailed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {blockingFailed.length} contrôle(s) bloquant(s) non conforme(s) — la validation finale est bloquée
          </p>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            {blockingFailed.map(c => (
              <li key={c.id}>{c.id}: {c.nom} — {c.messageResultat}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-gray-500">
              <th className="px-4 py-2 w-16">ID</th>
              <th className="px-4 py-2">Contrôle</th>
              <th className="px-4 py-2 w-28">Statut</th>
              <th className="px-4 py-2 w-20">Bloquant</th>
              <th className="px-4 py-2">Résultat</th>
            </tr>
          </thead>
          <tbody>
            {controles.map(c => {
              const badge = STATUT_BADGE[c.statut] || STATUT_BADGE.en_attente;
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-400">{c.id}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-800">{c.nom}</p>
                    <p className="text-xs text-gray-400">{c.description}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {c.blocking ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Oui</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.messageResultat}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// VERROUILLAGE SECTION (MONTHLY)
// ============================================================================

function VerrouillageSection({
  period,
  onLock,
  onUnlock,
  executing,
}: {
  period: DBFiscalPeriod | null;
  onLock: () => void;
  onUnlock: () => void;
  executing: boolean;
}) {
  if (!period) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        <Lock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>Sélectionnez une période pour gérer le verrouillage</p>
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
          Verrouillage de la période
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Période</p>
            <p className="font-medium">{period.label}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Code</p>
            <p className="font-mono">{period.code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Statut</p>
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
            <p className="text-sm text-gray-500">Progression</p>
            <p className="font-medium">{period.progression}%</p>
          </div>
        </div>

        {period.closedAt && (
          <p className="text-xs text-gray-400 mb-4">
            Clôturé le {new Date(period.closedAt).toLocaleString('fr-FR')} par {period.closedBy}
          </p>
        )}
        {period.reopenedAt && (
          <p className="text-xs text-orange-500 mb-4">
            Réouvert le {new Date(period.reopenedAt).toLocaleString('fr-FR')} par {period.reopenedBy}
          </p>
        )}

        <div className="flex gap-3">
          {!isClosed && (
            <button
              onClick={onLock}
              disabled={executing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Verrouiller la période
            </button>
          )}
          {isClosed && (
            <button
              onClick={onUnlock}
              disabled={executing}
              className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 disabled:opacity-50"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Réouvrir la période
            </button>
          )}
        </div>
      </div>

      {/* Warning for reopening */}
      {isClosed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            La réouverture d'une période clôturée est une opération réversible mais doit être justifiée.
            Toute réouverture est tracée dans la piste d'audit.
          </p>
        </div>
      )}
    </div>
  );
}

export default CloturesPeriodiquesPage;
