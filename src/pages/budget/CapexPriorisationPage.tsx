/**
 * CapexPriorisationPage — /capex/priorisation (refonte OPEX/CAPEX, Lot 5, §17).
 *
 * Arbitrage du portefeuille : BC soumis classés par score composite, ligne de
 * flottaison cumulée vs enveloppe (au-dessus = servi, en dessous = sous l'eau).
 * Décisions de séance (approuver / ajourner / rejeter). Scoring 100 % code.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { listCapexRequests, type CapexPriorite, type CapexRequest } from '../../features/budget/services/budgetService';
import { updateBcFields } from '../../features/budget/services/capexBcService';
import { computeRanking, listCriteria, type BcScoringInput, type RankedBc, type ScoringCritere } from '../../features/budget/services/capexScoringService';
import CapexPrioriteKanban from './CapexPrioriteKanban';
import { Trophy, Loader2, Check, Clock, X, Waves, Table2, Columns3 } from 'lucide-react';

function getClient(adapter: any): any | null {
  const c = (adapter as any).client;
  return adapter.getMode?.() === 'saas' && c ? c : null;
}

const CapexPriorisationPage: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<BcScoringInput[]>([]);
  /**
   * Kanban = TOUT le portefeuille vivant (hors rejeté/clos), pas seulement les
   * candidats au scoring : un BC approuvé ou déjà passé en CAR garde une priorité
   * et doit rester visible. Le tableau de score, lui, reste borné aux soumis.
   */
  const [portfolioRows, setPortfolioRows] = useState<CapexRequest[]>([]);
  const [vue, setVue] = useState<'tableau' | 'kanban'>('tableau');
  const [criteria, setCriteria] = useState<ScoringCritere[]>([]);
  const [enveloppe, setEnveloppe] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [reqs, crit] = await Promise.all([listCapexRequests(adapter), listCriteria(adapter)]);
        const candidates = reqs.filter((r) => ['soumis', 'en_priorisation'].includes(r.statut as string));
        // risque moyen P×I par BC
        const client = getClient(adapter);
        const riskByReq: Record<string, number> = {};
        if (client && candidates.length) {
          const { data } = await client.from('capex_bc_risques').select('request_id,probabilite,impact')
            .in('request_id', candidates.map((c) => c.id));
          const agg: Record<string, { s: number; n: number }> = {};
          for (const r of (data || [])) { const k = r.request_id; (agg[k] ??= { s: 0, n: 0 }); agg[k].s += r.probabilite * r.impact; agg[k].n += 1; }
          for (const [k, v] of Object.entries(agg)) riskByReq[k] = v.n ? v.s / v.n : 0;
        }
        const mapped: BcScoringInput[] = candidates.map((r) => ({
          id: r.id, libelle: r.libelle, montant: r.montant || 0, van: r.van ?? null, tri: r.tri ?? null,
          paybackMois: (r as any).payback_simple_mois ?? null, categorie: r.categorie ?? null,
          riskPI: riskByReq[r.id] || 0, obligatoire: !!(r as any).obligatoire, urgence: !!(r as any).urgence,
        }));
        if (cancelled) return;
        const vivants = reqs.filter((r) => !['rejete', 'clos'].includes(r.statut as string));
        setItems(mapped); setPortfolioRows(vivants); setCriteria(crit);
        setEnveloppe((e) => (e === '0' ? String(mapped.reduce((s, m) => s + m.montant, 0)) : e));
      } catch (e: any) { if (!cancelled) setError(e?.message || t('capexPrio.error')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const ranked: RankedBc[] = useMemo(
    () => computeRanking(items, criteria, Number(enveloppe) || 0),
    [items, criteria, enveloppe],
  );
  const passeCount = ranked.filter((r) => r.passe).length;
  const passeMontant = ranked.filter((r) => r.passe).reduce((s, r) => s + r.montant, 0);

  /** Persiste la priorité posée au drag & drop. Optimiste, rollback si la base refuse. */
  const changePriorite = useCallback(async (id: string, priorite: CapexPriorite) => {
    const before = portfolioRows;
    setPortfolioRows((rs) => rs.map((r) => (r.id === id ? { ...r, priorite } : r)));
    try { await updateBcFields(adapter, id, { priorite }); }
    catch (e) { setPortfolioRows(before); throw e; }
  }, [adapter, portfolioRows]);

  const decide = useCallback(async (id: string, statut: 'approuve' | 'ajourne' | 'rejete') => {
    setBusyId(id); setError(null); setNotice(null);
    try { await updateBcFields(adapter, id, { statut }); setNotice(t('capexPrio.bcDecided', { statut })); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || t('capexPrio.failure')); } finally { setBusyId(null); }
  }, [adapter]);

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Trophy className="w-6 h-6 text-[var(--color-primary)]" /> {t('capexPrio.title')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">{t('capexPrio.bcInPlay', { count: String(ranked.length) })} · {t('capexPrio.served', { count: String(passeCount) })} · {t('capexPrio.underEnvelope', { amount: formatCurrency(passeMontant) })}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([['tableau', t('capexPrio.viewTable'), Table2], ['kanban', t('capexPrio.viewKanban'), Columns3]] as const).map(([k, lbl, Icon]) => (
              <button key={k} onClick={() => setVue(k)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  vue === k ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-3.5 h-3.5" /> {lbl}
              </button>
            ))}
          </div>
          {vue === 'tableau' && (
            <label className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
              {t('capexPrio.envelope')}
              <input type="number" value={enveloppe} onChange={(e) => setEnveloppe(e.target.value)}
                className="w-40 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-sm" />
            </label>
          )}
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> {t('capexPrio.loading')}</div>
      ) : vue === 'kanban' ? (
        /* Le kanban a sa PROPRE condition de vide : il couvre tout le portefeuille
           vivant, donc il ne doit pas être masqué quand aucun BC n'est « soumis ». */
        portfolioRows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">{t('capexPrio.emptyKanban')}</div>
        ) : (
          <CapexPrioriteKanban
            rows={portfolioRows}
            onChangePriorite={changePriorite}
            onOpen={(id) => navigate(`/capex/bc/${id}`)}
          />
        )
      ) : ranked.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">{t('capexPrio.emptyTable')}</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">{t('capexPrio.colBusinessCase')}</th>
                <th className="px-4 py-3 text-right">{t('capexPrio.colScore')}</th>
                <th className="px-4 py-3 text-right">{t('capexPrio.colAmount')}</th>
                <th className="px-4 py-3 text-right">{t('capexPrio.colCumulative')}</th>
                <th className="px-4 py-3 text-right">{t('capexPrio.colNpv')}</th>
                <th className="px-4 py-3 text-left">{t('capexPrio.colCategory')}</th>
                <th className="px-4 py-3 text-right">{t('capexPrio.colDecision')}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => {
                const prev = ranked[i - 1];
                const waterlineHere = prev && prev.passe && !r.passe;
                return (
                  <React.Fragment key={r.id}>
                    {waterlineHere && (
                      <tr><td colSpan={8} className="px-4 py-1 bg-blue-50 dark:bg-blue-950/30 text-[11px] text-blue-600 dark:text-blue-300"><span className="inline-flex items-center gap-1"><Waves className="w-3.5 h-3.5" /> {t('capexPrio.waterline', { amount: formatCurrency(Number(enveloppe) || 0) })}</span></td></tr>
                    )}
                    <tr className={`border-b border-[var(--color-border-light)] ${!r.passe ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-[var(--color-text-tertiary)]">{i + 1}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/capex/bc/${r.id}`)} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)]">{r.libelle}</button>
                        {r.obligatoire && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">{t('capexPrio.mandatory')}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-[var(--color-primary)] dark:text-[var(--color-primary)]">{r.score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.montant)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-tertiary)]">{formatCurrency(r.cumul)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{r.van != null ? formatCurrency(r.van) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{r.categorie ? r.categorie.replace(/_/g, ' ') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button title={t('capexPrio.approve')} disabled={busyId === r.id} onClick={() => decide(r.id, 'approuve')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40">{busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                          <button title={t('capexPrio.postpone')} disabled={busyId === r.id} onClick={() => decide(r.id, 'ajourne')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-amber-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"><Clock className="w-4 h-4" /></button>
                          <button title={t('capexPrio.reject')} disabled={busyId === r.id} onClick={() => decide(r.id, 'rejete')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CapexPriorisationPage;
