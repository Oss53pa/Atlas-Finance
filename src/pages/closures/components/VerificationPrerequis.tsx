/**
 * VerificationPrerequis — Section « Vérification » reconstruite sur des données RÉELLES.
 *
 * L'écran précédent (`sections/ControlePeriodes`, supprimé) affichait des
 * pré-requis FABRIQUÉS : `validations {comptable, fiscal, audit, direction}` valait
 * simplement `isClosed`, `etapesObligatoires` (« Rapprochement bancaire :
 * complété ») était dérivé du même booléen, `progression` valait 0/50/100 selon
 * le statut, et les 7 « règles de clôture » n'étaient JAMAIS évaluées — leurs
 * `condition` étaient des chaînes décoratives.
 *
 * Ici, chaque règle est calculée sur les écritures de la période, expose les
 * pièces concernées et, quand c'est possible, la correction applicable.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CalendarCheck, CheckCircle, ChevronDown, ChevronRight,
  Info, Loader2, RefreshCw, Wand2, XCircle,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { DBFiscalPeriod, DBFiscalYear, DBJournalEntry } from '../../../lib/db';
import {
  applyRemediation, buildRemediations,
  type ControleAnomalie, type ControleLike,
} from '../../../services/cloture/remediationService';
import { formatCurrency } from '../../../utils/formatters';

/** Délai légal OHADA de clôture mensuelle (jours après la fin de période). */
const DELAI_LEGAL_JOURS = 10;

type RegleStatut = 'ok' | 'bloquant' | 'avertissement' | 'na';

interface RegleResultat {
  id: string;
  nom: string;
  regle: string;
  statut: RegleStatut;
  message: string;
  anomalies: ControleAnomalie[];
  /** Contrôle synthétique passé au moteur de correction (null = pas d'automatisation). */
  controle: ControleLike | null;
}

interface PeriodeVerification {
  period: DBFiscalPeriod;
  regles: RegleResultat[];
  bloquants: number;
  avertissements: number;
}

export interface VerificationPrerequisProps {
  fiscalYear: DBFiscalYear | null;
  periods: DBFiscalPeriod[];
  onNavigateTab?: (tabId: string) => void;
}

export default function VerificationPrerequis({ fiscalYear, periods }: VerificationPrerequisProps) {
  const { adapter } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [resultats, setResultats] = useState<PeriodeVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPeriod, setOpenPeriod] = useState<string | null>(null);
  const [openRegle, setOpenRegle] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const analyser = useCallback(async () => {
    if (!fiscalYear || periods.length === 0) {
      setResultats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
      const today = new Date().toISOString().slice(0, 10);
      const ordered = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));

      const out: PeriodeVerification[] = ordered.map((period, index) => {
        const entries = allEntries.filter(
          (e: any) => e.date >= period.startDate && e.date <= period.endDate,
        );
        const drafts = entries.filter((e: any) => e.status === 'draft');
        const validees = entries.filter((e: any) => e.status === 'validated' || e.status === 'posted');

        // --- R1 : la période doit être terminée -----------------------------
        const terminee = period.endDate < today;

        // --- R2 : ordre chronologique ---------------------------------------
        const anterieuresOuvertes = ordered
          .slice(0, index)
          .filter(p => p.status !== 'cloturee');

        // --- R3 : délai légal OHADA -----------------------------------------
        const limite = new Date(period.endDate);
        limite.setDate(limite.getDate() + DELAI_LEGAL_JOURS);
        const dateLimite = limite.toISOString().slice(0, 10);
        const enRetard = terminee && period.status !== 'cloturee' && today > dateLimite;

        // --- R4 : aucun brouillon -------------------------------------------
        const draftAnomalies: ControleAnomalie[] = drafts.map((e: any) => {
          const ecart = Number((((e.totalDebit || 0) - (e.totalCredit || 0))).toFixed(2));
          const equilibree = Math.abs(ecart) <= 1;
          return {
            ref: e.entryNumber || e.id,
            libelle: e.label || t('closurePrereq.entryNoLabel'),
            montant: Number(e.totalDebit) || 0,
            ecart: equilibree ? undefined : ecart,
            date: e.date,
            entryId: e.id,
            info: equilibree
              ? t('closurePrereq.balancedValidatable')
              : t('closurePrereq.unbalancedBy', { amount: formatCurrency(Math.abs(ecart)) }),
            corrigeable: equilibree,
          };
        });

        // --- R5 : aucune pièce validée déséquilibrée ------------------------
        const desequilibrees: ControleAnomalie[] = validees
          .filter((e: any) => Math.abs((e.totalDebit || 0) - (e.totalCredit || 0)) > 1)
          .map((e: any) => ({
            ref: e.entryNumber || e.id,
            libelle: e.label || t('closurePrereq.entryNoLabel'),
            montant: Number(((e.totalDebit || 0) - (e.totalCredit || 0)).toFixed(2)),
            date: e.date,
            entryId: e.id,
            info: `D ${formatCurrency(e.totalDebit || 0)} / C ${formatCurrency(e.totalCredit || 0)}`,
            corrigeable: false,
          }));

        // --- R6 : lettrage des comptes de tiers de la période ----------------
        const tiersLines: ControleAnomalie[] = [];
        let tiersTotal = 0;
        for (const e of validees as any[]) {
          for (const l of e.lines || []) {
            if (!l.accountCode?.startsWith('401') && !l.accountCode?.startsWith('411')) continue;
            tiersTotal++;
            if (l.lettrageCode) continue;
            tiersLines.push({
              ref: e.entryNumber || e.id,
              libelle: l.label || l.accountName || t('closurePrereq.unmatchedLine'),
              montant: (l.debit || 0) - (l.credit || 0),
              date: e.date,
              entryId: e.id,
              lineId: l.id,
              accountCode: l.accountCode,
              thirdPartyCode: l.thirdPartyCode,
              info: l.thirdPartyCode
                ? t('closurePrereq.thirdPartyRef', { code: l.thirdPartyCode })
                : t('closurePrereq.noThirdParty'),
              corrigeable: true,
            });
          }
        }
        const tauxLettrage = tiersTotal > 0
          ? Math.round(((tiersTotal - tiersLines.length) / tiersTotal) * 100)
          : 100;

        const regles: RegleResultat[] = [
          {
            id: 'R1',
            nom: t('closurePrereq.r1Name'),
            regle: t('closurePrereq.r1Rule'),
            statut: terminee ? 'ok' : 'bloquant',
            message: terminee
              ? t('closurePrereq.r1Ended', { date: period.endDate })
              : t('closurePrereq.r1Running', { date: period.endDate }),
            anomalies: [],
            controle: null,
          },
          {
            id: 'R2',
            nom: t('closurePrereq.r2Name'),
            regle: t('closurePrereq.r2Rule'),
            statut: anterieuresOuvertes.length === 0 ? 'ok' : 'bloquant',
            message: anterieuresOuvertes.length === 0
              ? t('closurePrereq.r2Ok')
              : t('closurePrereq.r2Ko', { count: String(anterieuresOuvertes.length) }),
            anomalies: anterieuresOuvertes.map(p => ({
              ref: p.code,
              libelle: p.label,
              date: p.endDate,
              info: t('closurePrereq.statusLabel', { status: p.status }),
            })),
            controle: null,
          },
          {
            id: 'R3',
            nom: t('closurePrereq.r3Name', { days: String(DELAI_LEGAL_JOURS) }),
            regle: t('closurePrereq.r3Rule', { days: String(DELAI_LEGAL_JOURS) }),
            statut: period.status === 'cloturee' ? 'ok' : enRetard ? 'avertissement' : terminee ? 'ok' : 'na',
            message: period.status === 'cloturee'
              ? t('closurePrereq.r3Closed')
              : enRetard
                ? t('closurePrereq.r3Overdue', { date: dateLimite })
                : terminee
                  ? t('closurePrereq.r3Due', { date: dateLimite })
                  : t('closurePrereq.r3Na'),
            anomalies: [],
            controle: null,
          },
          {
            id: 'R4',
            nom: t('closurePrereq.r4Name'),
            regle: t('closurePrereq.r4Rule'),
            statut: drafts.length === 0 ? 'ok' : 'bloquant',
            message: drafts.length === 0
              ? t('closurePrereq.r4Ok')
              : t('closurePrereq.r4Ko', {
                count: String(drafts.length),
                auto: String(draftAnomalies.filter(a => a.corrigeable).length),
              }),
            anomalies: draftAnomalies,
            controle: drafts.length === 0 ? null : {
              id: 'C8', nom: t('closurePrereq.c8Name'), statut: 'attention',
              anomalies: draftAnomalies, anomaliesTotal: draftAnomalies.length,
            },
          },
          {
            id: 'R5',
            nom: t('closurePrereq.r5Name'),
            regle: t('closurePrereq.r5Rule'),
            statut: desequilibrees.length === 0 ? 'ok' : 'bloquant',
            message: desequilibrees.length === 0
              ? t('closurePrereq.r5Ok', { count: String(validees.length) })
              : t('closurePrereq.r5Ko', { count: String(desequilibrees.length) }),
            anomalies: desequilibrees,
            controle: desequilibrees.length === 0 ? null : {
              id: 'C2', nom: t('closurePrereq.c2Name'), statut: 'non_conforme',
              anomalies: desequilibrees, anomaliesTotal: desequilibrees.length,
            },
          },
          {
            id: 'R6',
            nom: t('closurePrereq.r6Name'),
            regle: t('closurePrereq.r6Rule'),
            statut: tiersTotal === 0 ? 'na' : tauxLettrage >= 80 ? 'ok' : 'avertissement',
            message: tiersTotal === 0
              ? t('closurePrereq.r6Na')
              : t('closurePrereq.r6Rate', {
                rate: String(tauxLettrage),
                count: String(tiersLines.length),
              }),
            anomalies: tiersLines,
            controle: tiersLines.length === 0 ? null : {
              id: 'C13', nom: t('closurePrereq.c13Name'), statut: 'attention',
              anomalies: tiersLines, anomaliesTotal: tiersLines.length,
            },
          },
        ];

        return {
          period,
          regles,
          bloquants: regles.filter(r => r.statut === 'bloquant').length,
          avertissements: regles.filter(r => r.statut === 'avertissement').length,
        };
      });

      setResultats(out);
    } finally {
      setLoading(false);
    }
  }, [adapter, fiscalYear, periods, t]);

  useEffect(() => { analyser(); }, [analyser]);

  const corriger = async (regle: RegleResultat) => {
    if (!regle.controle) return;
    const proposal = buildRemediations(regle.controle).find(p => p.mode === 'auto');
    if (!proposal) return;
    setApplying(regle.id + proposal.id);
    try {
      const outcome = await applyRemediation(adapter, regle.controle, proposal, {
        fiscalYearId: fiscalYear?.id,
        userId: user?.id,
      });
      if (outcome.ok) toast.success(outcome.message);
      else toast.error(outcome.message);
      await analyser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('closurePrereq.fixFailed'));
    } finally {
      setApplying(null);
    }
  };

  const totalBloquants = useMemo(
    () => resultats.reduce((s, r) => s + r.bloquants, 0),
    [resultats],
  );
  const pretes = resultats.filter(r => r.bloquants === 0 && r.period.status !== 'cloturee').length;

  if (!fiscalYear) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>{t('closurePrereq.selectYear')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">{t('closurePrereq.checking')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            {t('closurePrereq.heading', { year: fiscalYear.name })}
          </h3>
          <p className="text-sm text-gray-500">
            {t('closurePrereq.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={totalBloquants > 0 ? 'text-red-700 font-medium' : 'text-green-700 font-medium'}>
            {t('closurePrereq.blockingCount', { count: String(totalBloquants) })}
          </span>
          <span className="text-gray-500">{t('closurePrereq.readyCount', { count: String(pretes) })}</span>
          <button
            onClick={analyser}
            disabled={applying !== null}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('closurePrereq.rerun')}
          </button>
        </div>
      </div>

      {resultats.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
          {t('closurePrereq.noPeriods')}
        </div>
      )}

      <div className="space-y-2">
        {resultats.map(res => {
          const isOpen = openPeriod === res.period.id;
          const cloturee = res.period.status === 'cloturee';
          return (
            <div key={res.period.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenPeriod(isOpen ? null : res.period.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-mono text-xs text-gray-500 w-20">{res.period.code}</span>
                <span className="text-sm font-medium text-gray-800 flex-1">{res.period.label}</span>
                <span className="text-xs text-gray-400 hidden md:inline">
                  {res.period.startDate} → {res.period.endDate}
                </span>
                {cloturee ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{t('closurePrereq.closed')}</span>
                ) : res.bloquants > 0 ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    {t('closurePrereq.blockingCount', { count: String(res.bloquants) })}
                  </span>
                ) : res.avertissements > 0 ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    {t('closurePrereq.warningCount', { count: String(res.avertissements) })}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{t('closurePrereq.ready')}</span>
                )}
              </button>

              {isOpen && (
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {res.regles.map(regle => {
                    const key = `${res.period.id}:${regle.id}`;
                    const open = openRegle === key;
                    const proposal = regle.controle
                      ? buildRemediations(regle.controle).find(p => p.mode === 'auto')
                      : undefined;
                    return (
                      <li key={regle.id} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setOpenRegle(open ? null : key)}
                            disabled={regle.anomalies.length === 0}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left disabled:cursor-default"
                          >
                            {regle.statut === 'ok' ? <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                              : regle.statut === 'bloquant' ? <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                              : regle.statut === 'avertissement' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                              : <Info className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                            <span className="text-xs font-mono text-gray-400">{regle.id}</span>
                            <span className="text-xs font-medium text-gray-700">{regle.nom}</span>
                            <span className="text-xs text-gray-500 truncate">— {regle.message}</span>
                            {regle.anomalies.length > 0 && (
                              open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                          {proposal && (
                            <button
                              onClick={() => corriger(regle)}
                              disabled={applying !== null}
                              title={proposal.impact}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50 flex-shrink-0"
                            >
                              {applying === regle.id + proposal.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Wand2 className="w-3 h-3" />}
                              {t('closurePrereq.fixAction', { count: String(proposal.cibles) })}
                            </button>
                          )}
                        </div>
                        <p className="ml-6 mt-0.5 text-[11px] text-gray-400">{regle.regle}</p>

                        {open && regle.anomalies.length > 0 && (
                          <div className="mt-2 ml-6 border border-gray-100 rounded max-h-56 overflow-y-auto">
                            <table className="w-full text-[11px]">
                              <tbody>
                                {regle.anomalies.slice(0, 50).map((a, i) => (
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
                            {regle.anomalies.length > 50 && (
                              <p className="px-2 py-1 text-[11px] text-gray-400 border-t">
                                {t('closurePrereq.moreItems', { count: String(regle.anomalies.length - 50) })}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
