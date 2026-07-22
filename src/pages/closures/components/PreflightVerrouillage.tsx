/**
 * PreflightVerrouillage — contrôle avant verrouillage d'une période.
 *
 * Le verrouillage était jusqu'ici un simple changement de statut : une période
 * pouvait être clôturée avec des brouillons et des pièces déséquilibrées. Ce
 * pré-vol exécute les contrôles mensuels SUR LA PÉRIODE (et non sur l'exercice
 * entier), affiche le détail des éléments bloquants et propose les corrections
 * applicables — automatiques quand c'est possible.
 */
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Loader2, RefreshCw, Wand2, XCircle,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useControlesCoherence, MONTHLY_CONTROL_IDS } from '../hooks/useControlesCoherence';
import type { ControleResult } from '../hooks/useControlesCoherence';
import { applyRemediation, buildRemediations } from '../../../services/cloture/remediationService';
import { formatCurrency } from '../../../utils/formatters';

export interface PreflightVerrouillageProps {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  fiscalYearId?: string;
  /** Remonte les identifiants des contrôles bloquants (gating + trace de dérogation). */
  onBlockersChange?: (controleIds: string[]) => void;
}

/** Un contrôle NON CONFORME empêche le verrouillage ; « attention » avertit seulement. */
function isBlocker(c: ControleResult): boolean {
  return c.statut === 'non_conforme';
}

export default function PreflightVerrouillage({
  periodStart,
  periodEnd,
  periodLabel,
  fiscalYearId,
  onBlockersChange,
}: PreflightVerrouillageProps) {
  const { adapter } = useData();
  const { user } = useAuth();
  const scope = useMemo(() => ({ start: periodStart, end: periodEnd }), [periodStart, periodEnd]);
  const { controles, loading, refresh } = useControlesCoherence(MONTHLY_CONTROL_IDS, scope);
  const [applying, setApplying] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const blockers = controles.filter(isBlocker);
  const warnings = controles.filter(c => c.statut === 'attention');

  const blockerIds = blockers.map(c => c.id).join(',');
  React.useEffect(() => {
    if (!loading) onBlockersChange?.(blockerIds ? blockerIds.split(',') : []);
  }, [loading, blockerIds, onBlockersChange]);

  const fixables = useMemo(
    () => controles
      .filter(c => c.statut === 'non_conforme' || c.statut === 'attention')
      .flatMap(c => buildRemediations(c).filter(p => p.mode === 'auto').map(p => ({ controle: c, proposal: p }))),
    [controles],
  );

  const runAll = async () => {
    setApplying('__ALL__');
    let applied = 0;
    const failures: string[] = [];
    try {
      for (const { controle, proposal } of fixables) {
        try {
          const outcome = await applyRemediation(adapter, controle, proposal, { fiscalYearId, userId: user?.id });
          applied += outcome.applied;
          if (!outcome.ok) failures.push(`${proposal.controleId} : ${outcome.message}`);
        } catch (err) {
          failures.push(`${proposal.controleId} : ${err instanceof Error ? err.message : 'erreur'}`);
        }
      }
      if (failures.length === 0) toast.success(`${applied} correction(s) appliquée(s)`);
      else toast.error(`${applied} appliquée(s), ${failures.length} en échec`);
      await refresh();
    } finally {
      setApplying(null);
    }
  };

  const runOne = async (controle: ControleResult) => {
    const proposal = buildRemediations(controle).find(p => p.mode === 'auto');
    if (!proposal) return;
    setApplying(proposal.id);
    try {
      const outcome = await applyRemediation(adapter, controle, proposal, { fiscalYearId, userId: user?.id });
      if (outcome.ok) toast.success(outcome.message);
      else toast.error(outcome.message);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Correction impossible');
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Contrôle de la période {periodLabel}…
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          {blockers.length === 0
            ? <CheckCircle className="w-4 h-4 text-green-600" />
            : <XCircle className="w-4 h-4 text-red-600" />}
          Pré-vol de verrouillage — {periodLabel}
          <span className="font-normal text-gray-400">({periodStart} → {periodEnd})</span>
        </h3>
        <div className="flex items-center gap-2">
          {fixables.length > 0 && (
            <button
              onClick={runAll}
              disabled={applying !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {applying === '__ALL__' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              Corriger automatiquement ({fixables.length})
            </button>
          )}
          <button
            onClick={refresh}
            disabled={applying !== null}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Relancer
          </button>
        </div>
      </div>

      <p className={`text-xs mb-3 ${blockers.length > 0 ? 'text-red-700' : warnings.length > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
        {blockers.length > 0
          ? `${blockers.length} contrôle(s) non conforme(s) sur la période — le verrouillage est bloqué.`
          : warnings.length > 0
            ? `Aucun bloquant. ${warnings.length} point(s) d'attention à arbitrer avant de verrouiller.`
            : 'Tous les contrôles de la période sont conformes — la période peut être verrouillée.'}
      </p>

      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
        {controles.map(c => {
          const auto = buildRemediations(c).find(p => p.mode === 'auto');
          const open = openId === c.id;
          return (
            <li key={c.id} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpenId(open ? null : c.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  disabled={c.anomaliesTotal === 0}
                >
                  {c.statut === 'conforme' ? <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    : c.statut === 'non_conforme' ? <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                    : c.statut === 'attention' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                  <span className="text-xs font-mono text-gray-400">{c.id}</span>
                  <span className="text-xs font-medium text-gray-700 truncate">{c.nom}</span>
                  <span className="text-xs text-gray-500 truncate hidden md:inline">— {c.messageResultat}</span>
                  {c.anomaliesTotal > 0 && (
                    open
                      ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
                {auto && (
                  <button
                    onClick={() => runOne(c)}
                    disabled={applying !== null}
                    title={auto.impact}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50 flex-shrink-0"
                  >
                    {applying === auto.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    Corriger ({auto.cibles})
                  </button>
                )}
              </div>

              {open && c.anomaliesTotal > 0 && (
                <div className="mt-2 ml-6 border border-gray-100 rounded max-h-56 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <tbody>
                      {c.anomalies.slice(0, 50).map((a, i) => (
                        <tr key={`${a.ref}-${i}`} className="border-b last:border-0">
                          <td className="px-2 py-1 font-mono text-gray-600">{a.ref}</td>
                          <td className="px-2 py-1 text-gray-500 truncate max-w-xs">{a.libelle}</td>
                          <td className="px-2 py-1 text-gray-400">{a.date ?? a.accountCode ?? ''}</td>
                          <td className="px-2 py-1 text-right text-gray-700">
                            {a.montant === undefined ? '' : formatCurrency(a.montant)}
                          </td>
                          <td className="px-2 py-1 text-gray-400">{a.info ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {c.anomaliesTotal > 50 && (
                    <p className="px-2 py-1 text-[11px] text-gray-400 border-t">
                      … {c.anomaliesTotal - 50} élément(s) supplémentaire(s)
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
