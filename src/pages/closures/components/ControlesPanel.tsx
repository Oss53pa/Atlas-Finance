/**
 * ControlesPanel — Contrôles de cohérence de clôture, développés de bout en bout.
 *
 * Chaque contrôle est dépliable et expose :
 *   1. la MESURE       — valeur attendue / réelle / écart / tolérance ;
 *   2. la RÈGLE        — règles métier SYSCOHADA appliquées ;
 *   3. le DÉTAIL       — la liste des éléments fautifs (pièce, compte, montant) ;
 *   4. la CORRECTION   — propositions applicables, dont certaines automatiquement.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronRight, ExternalLink,
  Loader2, RefreshCw, Shield, Wand2, XCircle,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useControlesCoherence } from '../hooks/useControlesCoherence';
import type { ControleResult, ControleStatut } from '../hooks/useControlesCoherence';
import {
  buildRemediations,
  applyRemediation,
  type RemediationProposal,
} from '../../../services/cloture/remediationService';
import { formatCurrency } from '../../../utils/formatters';

type Translate = (key: string, params?: Record<string, string>) => string;

const STATUT_BADGE: Record<ControleStatut, { bg: string; text: string; labelKey: string }> = {
  conforme:       { bg: 'bg-green-100',  text: 'text-green-800',  labelKey: 'closureControls.statusCompliant' },
  non_conforme:   { bg: 'bg-red-100',    text: 'text-red-800',    labelKey: 'closureControls.statusNonCompliant' },
  attention:      { bg: 'bg-yellow-100', text: 'text-yellow-800', labelKey: 'closureControls.statusWarning' },
  non_applicable: { bg: 'bg-gray-100',   text: 'text-gray-500',   labelKey: 'closureControls.statusNa' },
  en_attente:     { bg: 'bg-gray-100',   text: 'text-gray-500',   labelKey: 'closureControls.statusPending' },
};

const MODE_BADGE: Record<string, { bg: string; text: string; labelKey: string }> = {
  auto:     { bg: 'bg-emerald-100', text: 'text-emerald-800', labelKey: 'closureControls.modeAuto' },
  assistee: { bg: 'bg-amber-100',   text: 'text-amber-800',   labelKey: 'closureControls.modeAssisted' },
  manuelle: { bg: 'bg-gray-100',    text: 'text-gray-600',    labelKey: 'closureControls.modeManual' },
};

/** Nombre d'anomalies affichées avant repli. */
const ANOMALIES_VISIBLE = 25;

export interface ControlesPanelProps {
  controlIds?: string[];
  fiscalYearId?: string;
  /** Période sélectionnée — active le sélecteur de périmètre Exercice / Période. */
  period?: { label: string; startDate: string; endDate: string } | null;
  /** Bascule vers un autre onglet de la page clôture (routes `#tab:<id>`). */
  onNavigateTab?: (tabId: string) => void;
}

export default function ControlesPanel({ controlIds, fiscalYearId, period, onNavigateTab }: ControlesPanelProps) {
  const { adapter } = useData();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const navigate = useNavigate();
  const [scope, setScope] = useState<'exercice' | 'periode'>('exercice');
  const range = useMemo(
    () => (scope === 'periode' && period ? { start: period.startDate, end: period.endDate } : undefined),
    [scope, period],
  );
  const { controles, loading, error, lastRun, refresh } = useControlesCoherence(controlIds, range);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [showAllAnomalies, setShowAllAnomalies] = useState<Record<string, boolean>>({});

  /** Propositions de correction par contrôle (dérivées des anomalies). */
  const remediationsByControl = useMemo(() => {
    const map = new Map<string, RemediationProposal[]>();
    for (const c of controles) map.set(c.id, buildRemediations(c));
    return map;
  }, [controles]);

  const autoProposals = useMemo(
    () => controles.flatMap(c =>
      (remediationsByControl.get(c.id) ?? [])
        .filter(p => p.mode === 'auto')
        .map(p => ({ controle: c, proposal: p })),
    ),
    [controles, remediationsByControl],
  );

  const runProposal = async (controle: ControleResult, proposal: RemediationProposal) => {
    if (proposal.action === 'NAVIGUER') {
      if (proposal.route?.startsWith('#tab:')) {
        onNavigateTab?.(proposal.route.slice(5));
      } else if (proposal.route) {
        navigate(proposal.route);
      }
      return;
    }
    setApplying(proposal.id);
    try {
      const outcome = await applyRemediation(adapter, controle, proposal, {
        fiscalYearId,
        userId: user?.id,
      });
      if (outcome.ok) toast.success(outcome.message);
      else toast.error(outcome.message);
      if (outcome.errors.length > 0) console.warn('[remediation]', proposal.id, outcome.errors);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('closureControls.fixFailed'));
    } finally {
      setApplying(null);
    }
  };

  const runAllAuto = async () => {
    if (autoProposals.length === 0) return;
    setApplying('__ALL__');
    let totalApplied = 0;
    const failures: string[] = [];
    try {
      for (const { controle, proposal } of autoProposals) {
        try {
          const outcome = await applyRemediation(adapter, controle, proposal, {
            fiscalYearId,
            userId: user?.id,
          });
          totalApplied += outcome.applied;
          if (!outcome.ok) failures.push(`${proposal.controleId} : ${outcome.message}`);
        } catch (err) {
          failures.push(`${proposal.controleId} : ${err instanceof Error ? err.message : t('closureControls.error')}`);
        }
      }
      if (failures.length === 0) {
        toast.success(t('closureControls.fixesApplied', { count: String(totalApplied) }));
      } else {
        toast.error(t('closureControls.fixesPartial', {
          applied: String(totalApplied),
          failed: String(failures.length),
        }));
        console.warn('[remediation:all]', failures);
      }
      await refresh();
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">
          {t('closureControls.runningChecks', { count: String(controlIds ? controlIds.length : 17) })}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">{t('closureControls.errorTitle')}</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const conformes = controles.filter(c => c.statut === 'conforme').length;
  const nonConformes = controles.filter(c => c.statut === 'non_conforme').length;
  const attentions = controles.filter(c => c.statut === 'attention').length;
  const na = controles.filter(c => c.statut === 'non_applicable').length;
  const blockingFailed = controles.filter(c => c.blocking && c.statut === 'non_conforme');
  const totalAnomalies = controles.reduce((s, c) => s + (c.anomaliesTotal || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-700 font-medium">{t('closureControls.compliantCount', { count: String(conformes) })}</span>
          <span className="text-red-700 font-medium">{t('closureControls.nonCompliantCount', { count: String(nonConformes) })}</span>
          <span className="text-yellow-700 font-medium">{t('closureControls.warningCount', { count: String(attentions) })}</span>
          <span className="text-gray-500">{t('closureControls.naCount', { count: String(na) })}</span>
          {totalAnomalies > 0 && (
            <span className="text-gray-600 border-l border-gray-200 pl-4">
              {t('closureControls.detailedAnomalies', { count: String(totalAnomalies) })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {period && (
            <div className="flex bg-gray-100 rounded-md p-0.5">
              {([
                { id: 'exercice' as const, label: t('closureControls.scopeYear') },
                { id: 'periode' as const, label: period.label },
              ]).map(s => (
                <button
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    scope === s.id ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {lastRun && (
            <span className="text-xs text-gray-400">
              {new Date(lastRun).toLocaleTimeString(dateLocale)}
            </span>
          )}
          {autoProposals.length > 0 && (
            <button
              onClick={runAllAuto}
              disabled={applying !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {applying === '__ALL__'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Wand2 className="w-3.5 h-3.5" />}
              {t('closureControls.applyAutoFixes', { count: String(autoProposals.length) })}
            </button>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('closureControls.rerun')}
          </button>
        </div>
      </div>

      {/* Blocking warning */}
      {blockingFailed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t('closureControls.blockingWarning', { count: String(blockingFailed.length) })}
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
              <th className="px-4 py-2 w-8" />
              <th className="px-4 py-2 w-16">ID</th>
              <th className="px-4 py-2">{t('closureControls.colCheck')}</th>
              <th className="px-4 py-2 w-28">{t('closureControls.colStatus')}</th>
              <th className="px-4 py-2 w-20">{t('closureControls.colBlocking')}</th>
              <th className="px-4 py-2">{t('closureControls.colResult')}</th>
              <th className="px-4 py-2 w-32">{t('closureControls.colFixes')}</th>
            </tr>
          </thead>
          <tbody>
            {controles.map(c => {
              const badge = STATUT_BADGE[c.statut] || STATUT_BADGE.en_attente;
              const props = remediationsByControl.get(c.id) ?? [];
              const autos = props.filter(p => p.mode === 'auto').length;
              const isOpen = expanded === c.id;
              return (
                <React.Fragment key={c.id}>
                  <tr
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : c.id)}
                  >
                    <td className="px-4 py-2 text-gray-400">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-400">{c.id}</td>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-800">{c.nom}</p>
                      <p className="text-xs text-gray-400">{c.description}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {t(badge.labelKey)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {c.blocking ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">{t('closureControls.yes')}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">{t('closureControls.no')}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {c.messageResultat}
                      {c.anomaliesTotal > 0 && (
                        <span className="ml-2 text-xs text-blue-600 underline">
                          {t('closureControls.itemsCount', { count: String(c.anomaliesTotal) })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {props.length === 0 ? (
                        <span className="text-xs text-gray-300">—</span>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {t('closureControls.proposedCount', { count: String(props.length) })}
                          {autos > 0 && <span className="text-emerald-700 font-medium">{t('closureControls.autoSuffix', { count: String(autos) })}</span>}
                        </span>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="border-b last:border-0 bg-gray-50/60">
                      <td colSpan={7} className="px-4 py-4">
                        <ControleDetail
                          controle={c}
                          proposals={props}
                          applying={applying}
                          showAll={!!showAllAnomalies[c.id]}
                          onToggleShowAll={() =>
                            setShowAllAnomalies(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                          onRun={proposal => runProposal(c, proposal)}
                          t={t}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// DÉTAIL D'UN CONTRÔLE
// ============================================================================

function ControleDetail({
  controle,
  proposals,
  applying,
  showAll,
  onToggleShowAll,
  onRun,
  t,
}: {
  controle: ControleResult;
  proposals: RemediationProposal[];
  applying: string | null;
  showAll: boolean;
  onToggleShowAll: () => void;
  onRun: (proposal: RemediationProposal) => void;
  t: Translate;
}) {
  const anomalies = showAll ? controle.anomalies : controle.anomalies.slice(0, ANOMALIES_VISIBLE);
  const masquees = controle.anomaliesTotal - anomalies.length;

  return (
    <div className="space-y-4">
      {/* 1. Mesure */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label={t('closureControls.metricExpected')} value={fmt(controle.valeurAttendue)} />
        <Metric label={t('closureControls.metricActual')} value={fmt(controle.valeurReelle)} />
        <Metric label={t('closureControls.metricGap')} value={fmt(controle.ecart)} alert={!!controle.ecart && Math.abs(controle.ecart) > (controle.tolerance ?? 0)} />
        <Metric label={t('closureControls.metricTolerance')} value={fmt(controle.tolerance)} />
        <Metric label={t('closureControls.metricRuntime')} value={`${controle.tempsExecution} ms`} />
      </div>

      {/* 2. Règles métier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('closureControls.appliedRules')}</p>
          <ul className="space-y-1">
            {controle.reglesMetier.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                <Shield className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
          {controle.comptesConcernes && controle.comptesConcernes.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {t('closureControls.accountsLabel')} <span className="font-mono">{controle.comptesConcernes.slice(0, 12).join(', ')}</span>
              {controle.comptesConcernes.length > 12 && ` … (+${controle.comptesConcernes.length - 12})`}
            </p>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('closureControls.recommendations')}</p>
          {controle.recommandations.length === 0 ? (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              {t('closureControls.noActionRequired')}
            </p>
          ) : (
            <ul className="space-y-1">
              {controle.recommandations.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <ChevronRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3. Détail des anomalies */}
      {controle.anomaliesTotal > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">
              {t('closureControls.affectedItems', { count: String(controle.anomaliesTotal) })}
            </p>
            {controle.anomalies.length > ANOMALIES_VISIBLE && (
              <button onClick={onToggleShowAll} className="text-xs text-blue-600 underline hover:no-underline">
                {showAll
                  ? t('closureControls.collapse')
                  : t('closureControls.showAll', { count: String(controle.anomalies.length) })}
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-400 border-b">
                  <th className="px-3 py-1.5">{t('closureControls.colReference')}</th>
                  <th className="px-3 py-1.5">{t('closureControls.colLabel')}</th>
                  <th className="px-3 py-1.5 w-24">{t('closureControls.colDate')}</th>
                  <th className="px-3 py-1.5 w-20">{t('closureControls.colAccount')}</th>
                  <th className="px-3 py-1.5 w-32 text-right">{t('closureControls.colAmount')}</th>
                  <th className="px-3 py-1.5">{t('closureControls.colInfo')}</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={`${a.ref}-${a.lineId ?? a.entryId ?? i}`} className="border-b last:border-0">
                    <td className="px-3 py-1.5 font-mono text-gray-700">{a.ref}</td>
                    <td className="px-3 py-1.5 text-gray-600 max-w-xs truncate" title={a.libelle}>{a.libelle}</td>
                    <td className="px-3 py-1.5 text-gray-400">{a.date ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-500">{a.accountCode ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-gray-700">
                      {a.montant === undefined ? '—' : formatCurrency(a.montant)}
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{a.info ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {masquees > 0 && (
            <p className="px-3 py-1.5 text-xs text-gray-400 border-t">
              {t('closureControls.hiddenItems', { count: String(masquees) })}
            </p>
          )}
        </div>
      )}

      {/* 4. Corrections proposées */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('closureControls.proposedFixes')}
        </p>
        {proposals.length === 0 ? (
          <p className="text-xs text-gray-400">
            {controle.statut === 'conforme'
              ? t('closureControls.compliantNoFix')
              : t('closureControls.noAutomatableFix')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {proposals.map(p => {
              const badge = MODE_BADGE[p.mode];
              const busy = applying === p.id;
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-800">{p.titre}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}>
                      {t(badge.labelKey)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{p.description}</p>
                  <p className="text-xs text-gray-700 mb-2 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">{t('closureControls.effectLabel')}</span> {p.impact}</span>
                  </p>

                  {p.preview && p.preview.length > 0 && (
                    <div className="mb-2 border border-gray-100 rounded bg-gray-50 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{t('closureControls.entryPreview')}</p>
                      <table className="w-full text-[11px]">
                        <tbody>
                          {p.preview.map((l, i) => (
                            <tr key={i}>
                              <td className="font-mono text-gray-600">{l.accountCode}</td>
                              <td className="text-gray-500 truncate">{l.libelle}</td>
                              <td className="text-right text-gray-700">{l.debit ? formatCurrency(l.debit) : ''}</td>
                              <td className="text-right text-gray-700">{l.credit ? formatCurrency(l.credit) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    onClick={() => onRun(p)}
                    disabled={applying !== null}
                    className={`mt-auto flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                      p.mode === 'manuelle'
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : p.mode === 'assistee'
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : p.mode === 'manuelle' ? <ExternalLink className="w-3.5 h-3.5" />
                      : <Wand2 className="w-3.5 h-3.5" />}
                    {p.mode === 'manuelle'
                      ? t('closureControls.openScreen')
                      : t('closureControls.applyWithCount', { count: String(p.cibles) })}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${alert ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${alert ? 'text-amber-800' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function fmt(v?: number): string {
  if (v === undefined || v === null || Number.isNaN(v)) return '—';
  return Math.abs(v) >= 1000 ? formatCurrency(v) : String(Math.round(v * 100) / 100);
}

/** Icône d'état réutilisée par la vue synthèse des sections. */
export function StatutIcon({ statut }: { statut: ControleStatut }) {
  if (statut === 'conforme') return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
  if (statut === 'non_conforme') return <XCircle className="w-3.5 h-3.5 text-red-600" />;
  if (statut === 'attention') return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
  return <ChevronRight className="w-3.5 h-3.5 text-gray-300" />;
}
