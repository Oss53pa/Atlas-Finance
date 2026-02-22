import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { getClosureSessions } from '../../services/closureService';
import { closureOrchestrator } from '../../services/cloture/closureOrchestrator';
import type { ClotureStep, ClotureContext } from '../../services/cloture/closureOrchestrator';
import { useControlesCoherence } from './hooks/useControlesCoherence';
import type { ControleStatut } from './hooks/useControlesCoherence';
import type { DBFiscalYear, DBClosureSession } from '../../lib/db';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import {
  Lock,
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
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'dashboard' | 'controles' | 'execution';

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
  conforme:        { bg: 'bg-green-100', text: 'text-green-800', label: 'Conforme' },
  non_conforme:    { bg: 'bg-red-100',   text: 'text-red-800',   label: 'Non conforme' },
  attention:       { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Attention' },
  non_applicable:  { bg: 'bg-gray-100',  text: 'text-gray-500',  label: 'N/A' },
  en_attente:      { bg: 'bg-gray-100',  text: 'text-gray-500',  label: 'En attente' },
};

const STEP_ICON: Record<string, React.ReactNode> = {
  pending:  <ChevronRight className="w-4 h-4 text-gray-400" />,
  running:  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  done:     <CheckCircle className="w-4 h-4 text-green-600" />,
  error:    <XCircle className="w-4 h-4 text-red-600" />,
  skipped:  <Info className="w-4 h-4 text-gray-400" />,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CloturesPeriodiquesPage() {
  const { adapter } = useData();
  const [tab, setTab] = useState<TabId>('dashboard');

  // --- Dashboard state ---
  const [fiscalYears, setFiscalYears] = useState<DBFiscalYear[]>([]);
  const [activeFY, setActiveFY] = useState<DBFiscalYear | null>(null);
  const [sessions, setSessions] = useState<DBClosureSession[]>([]);
  const [fyStats, setFyStats] = useState<FYStats | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  // --- Execution state ---
  const [selectedFYId, setSelectedFYId] = useState('');
  const [openingFYId, setOpeningFYId] = useState('');
  const [steps, setSteps] = useState<ClotureStep[]>([]);
  const [executing, setExecuting] = useState(false);

  // =========================================================================
  // LOAD DASHBOARD DATA
  // =========================================================================

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const fys = await adapter.getAll<DBFiscalYear>('fiscalYears');
      setFiscalYears(fys);

      const active = fys.find(fy => fy.isActive) || fys.find(fy => !fy.isClosed) || fys[0] || null;
      setActiveFY(active);

      const allSessions = await getClosureSessions(adapter);
      setSessions(allSessions);

      if (active) {
        setSelectedFYId(active.id);
        const allEntries = await adapter.getAll<any>('journalEntries');
        const entries = allEntries.filter(
          (e: any) => e.date >= active.startDate && e.date <= active.endDate
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
    } catch (err) {
      toast.error('Erreur chargement tableau de bord');
    } finally {
      setDashLoading(false);
    }
  }, [adapter]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // =========================================================================
  // EXECUTION HANDLERS
  // =========================================================================

  const initSteps = () => setSteps(closureOrchestrator.getSteps());

  useEffect(() => { initSteps(); }, []);

  const buildCtx = (): ClotureContext => ({
    adapter,
    exerciceId: selectedFYId,
    mode: 'manual',
    userId: 'comptable',
    openingExerciceId: openingFYId || undefined,
    onProgress: (step) => {
      setSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
    },
    onError: (step) => {
      setSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
    },
  });

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
    initSteps();
    try {
      const results = await closureOrchestrator.executeAll(buildCtx());
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

  // =========================================================================
  // RENDER
  // =========================================================================

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <FileText className="w-4 h-4" /> },
    { id: 'controles', label: 'Contrôles', icon: <Shield className="w-4 h-4" /> },
    { id: 'execution', label: 'Exécution', icon: <Play className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Clôtures Périodiques</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
      {tab === 'dashboard' && (
        <DashboardTab
          loading={dashLoading}
          activeFY={activeFY}
          stats={fyStats}
          sessions={sessions}
          onRefresh={loadDashboard}
        />
      )}
      {tab === 'controles' && <ControlesTab />}
      {tab === 'execution' && (
        <ExecutionTab
          fiscalYears={fiscalYears}
          selectedFYId={selectedFYId}
          onSelectFY={setSelectedFYId}
          openingFYId={openingFYId}
          onSelectOpeningFY={setOpeningFYId}
          steps={steps}
          executing={executing}
          onExecuteStep={handleExecuteStep}
          onExecuteAll={handleExecuteAll}
          onReset={initSteps}
        />
      )}
    </div>
  );
}

// ============================================================================
// TAB: DASHBOARD
// ============================================================================

function DashboardTab({
  loading,
  activeFY,
  stats,
  sessions,
  onRefresh,
}: {
  loading: boolean;
  activeFY: DBFiscalYear | null;
  stats: FYStats | null;
  sessions: DBClosureSession[];
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active FY */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Exercice actif
          </h2>
          <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-600 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {activeFY ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nom</p>
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
            <div>
              <p className="text-sm text-gray-500">Code</p>
              <p className="font-medium">{activeFY.code}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Aucun exercice trouvé</p>
        )}
      </div>

      {/* Key metrics from Dexie */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Écritures" value={String(stats.totalEntries)} />
          <MetricCard
            label="Brouillons"
            value={String(stats.drafts)}
            alert={stats.drafts > 0}
          />
          <MetricCard label="Produits (cl.7)" value={formatCurrency(stats.produits)} />
          <MetricCard
            label="Résultat"
            value={formatCurrency(stats.resultat)}
            subtitle={stats.resultat >= 0 ? 'Bénéfice' : 'Perte'}
          />
        </div>
      )}

      {/* Closure sessions */}
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
// TAB: CONTROLES
// ============================================================================

function ControlesTab() {
  const { controles, loading, error, lastRun, refresh } = useControlesCoherence();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Exécution des 17 contrôles...</span>
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

  return (
    <div className="space-y-4">
      {/* Summary + Refresh */}
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
              Dernier lancement : {new Date(lastRun).toLocaleTimeString('fr-FR')}
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

      {/* Controls table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-gray-500">
              <th className="px-4 py-2 w-16">ID</th>
              <th className="px-4 py-2">Contrôle</th>
              <th className="px-4 py-2 w-28">Statut</th>
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
// TAB: EXECUTION
// ============================================================================

function ExecutionTab({
  fiscalYears,
  selectedFYId,
  onSelectFY,
  openingFYId,
  onSelectOpeningFY,
  steps,
  executing,
  onExecuteStep,
  onExecuteAll,
  onReset,
}: {
  fiscalYears: DBFiscalYear[];
  selectedFYId: string;
  onSelectFY: (id: string) => void;
  openingFYId: string;
  onSelectOpeningFY: (id: string) => void;
  steps: ClotureStep[];
  executing: boolean;
  onExecuteStep: (id: string) => void;
  onExecuteAll: () => void;
  onReset: () => void;
}) {
  const doneCount = steps.filter(s => s.status === 'done').length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const openFYs = fiscalYears.filter(fy => !fy.isClosed);

  return (
    <div className="space-y-6">
      {/* FY selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercice à clôturer</label>
            <select
              value={selectedFYId}
              onChange={e => onSelectFY(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              disabled={executing}
            >
              <option value="">-- Sélectionner --</option>
              {openFYs.map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.name} ({fy.startDate} → {fy.endDate})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercice d'ouverture (N+1)</label>
            <select
              value={openingFYId}
              onChange={e => onSelectOpeningFY(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              disabled={executing}
            >
              <option value="">-- Optionnel (requis pour reports) --</option>
              {fiscalYears.filter(fy => fy.id !== selectedFYId).map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.name} ({fy.startDate} → {fy.endDate})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression : {doneCount}/{total}</span>
          <span className="text-sm text-gray-500">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {steps.map(step => (
          <div key={step.id} className="flex items-center gap-4 px-5 py-3">
            {STEP_ICON[step.status]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{step.label}</p>
              {step.message && (
                <p className={`text-xs mt-0.5 ${
                  step.status === 'error' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {step.message}
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              step.status === 'done' ? 'bg-green-100 text-green-700'
              : step.status === 'error' ? 'bg-red-100 text-red-700'
              : step.status === 'running' ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
            }`}>
              {step.status}
            </span>
            {step.status === 'pending' && !executing && (
              <button
                onClick={() => onExecuteStep(step.id)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Exécuter
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExecuteAll}
          disabled={executing || !selectedFYId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Tout exécuter
        </button>
        <button
          onClick={onReset}
          disabled={executing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}

export default CloturesPeriodiquesPage;
