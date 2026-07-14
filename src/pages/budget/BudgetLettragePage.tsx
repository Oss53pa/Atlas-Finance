/**
 * BudgetLettragePage — /budget/lettrage (refonte OPEX/CAPEX, Lot 2, §8.4).
 *
 * Lettrage budgétaire a posteriori : rapproche des écritures GL validées avec des
 * engagements ouverts quand le lien n'a pas été fait à la saisie. On choisit un
 * engagement, on voit les lignes GL candidates (même compte, validées, non
 * rapprochées, proximité de montant suggérée), on rapproche ligne à ligne.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getAccountLabel } from '../../utils/accountLabels';
import {
  listEngagements, createRapprochement, engagementRestant, type BudgetEngagement,
} from '../../features/budget/services/engagementService';
import { listCandidateLines, type CandidateLine } from '../../features/budget/services/lettrageService';
import { Link2, Loader2, Sparkles, FileSignature, CheckCircle2 } from 'lucide-react';

const BudgetLettragePage: React.FC = () => {
  const { adapter } = useData();
  const [engagements, setEngagements] = useState<BudgetEngagement[]>([]);
  const [selected, setSelected] = useState<BudgetEngagement | null>(null);
  const [candidates, setCandidates] = useState<CandidateLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCand, setLoadingCand] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const eng = await listEngagements(adapter, { statut: ['ouvert', 'partiellement_facture', 'surfacture'] });
        if (cancelled) return;
        setEngagements(eng);
        // conserve la sélection si toujours présente
        setSelected((s) => (s ? eng.find((e) => e.id === s.id) ?? null : null));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const loadCandidates = useCallback(async (eng: BudgetEngagement) => {
    setSelected(eng); setLoadingCand(true); setCandidates([]); setError(null); setNotice(null);
    try {
      const c = await listCandidateLines(adapter, { accountCode: eng.account_code, resteAFacturer: engagementRestant(eng) });
      setCandidates(c);
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement des candidats');
    } finally {
      setLoadingCand(false);
    }
  }, [adapter]);

  const rapprocher = useCallback(async (line: CandidateLine) => {
    if (!selected) return;
    setBusyLine(line.id); setError(null); setNotice(null);
    try {
      const reste = engagementRestant(selected);
      const montant = Math.min(line.montant, reste > 0 ? reste : line.montant);
      await createRapprochement(adapter, { journalLineId: line.id, engagementId: selected.id, montant, mode: 'lettrage' });
      setNotice(`Écriture ${line.entry_number ?? ''} rapprochée (${formatCurrency(montant)}).`);
      setRefreshKey((k) => k + 1);
      // recharge les candidats de l'engagement (statut/reste peuvent changer)
      const eng = (await listEngagements(adapter, { statut: ['ouvert', 'partiellement_facture', 'surfacture'] }))
        .find((e) => e.id === selected.id);
      if (eng) await loadCandidates(eng); else { setSelected(null); setCandidates([]); }
    } catch (e: any) {
      setError(e?.message || 'Échec du rapprochement');
    } finally {
      setBusyLine(null);
    }
  }, [adapter, selected, loadCandidates]);

  const suggestedCount = useMemo(() => candidates.filter((c) => c.suggested).length, [candidates]);

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Link2 className="w-6 h-6 text-[var(--color-primary)]" /> Lettrage budgétaire a posteriori
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">
          Rapproche des écritures GL validées avec des engagements ouverts (lien non fait à la saisie).
        </p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Engagements ouverts */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Engagements ouverts
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
          ) : engagements.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--color-text-secondary)]">Aucun engagement ouvert à lettrer.</div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-light)] max-h-[520px] overflow-y-auto">
              {engagements.map((e) => {
                const reste = engagementRestant(e);
                const active = selected?.id === e.id;
                return (
                  <li key={e.id}>
                    <button onClick={() => loadCandidates(e)}
                      className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition ${active ? 'bg-[var(--color-primary-light)] border-l-2 border-[var(--color-primary)]' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm text-[var(--color-text-primary)]">{e.account_code}</span>
                        <span className="font-mono text-sm font-medium text-[var(--color-primary)] dark:text-[var(--color-primary)]">{formatCurrency(reste)}</span>
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                        {e.fournisseur_libelle || getAccountLabel(e.account_code)} · {e.periode?.slice(0, 7)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Candidats GL */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] flex items-center justify-between">
            <span>Écritures GL candidates</span>
            {suggestedCount > 0 && <span className="inline-flex items-center gap-1 text-[var(--color-secondary)]"><Sparkles className="w-3.5 h-3.5" /> {suggestedCount} suggérée(s)</span>}
          </div>
          {!selected ? (
            <div className="py-10 text-center text-sm text-[var(--color-text-secondary)]">Sélectionnez un engagement à gauche.</div>
          ) : loadingCand ? (
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Recherche…</div>
          ) : candidates.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--color-text-secondary)]">Aucune écriture validée non rapprochée sur le compte {selected.account_code}.</div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-light)] max-h-[520px] overflow-y-auto">
              {candidates.map((c) => (
                <li key={c.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${c.suggested ? 'bg-[var(--color-warning-light)]' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {c.suggested && <Sparkles className="w-3.5 h-3.5 text-[var(--color-secondary)] shrink-0" />}
                      <span className="font-mono text-sm text-[var(--color-text-primary)]">{formatCurrency(c.montant)}</span>
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] truncate">{c.entry_number} · {c.date?.slice(0, 10)} · {c.label || getAccountLabel(c.account_code)}</div>
                  </div>
                  <button onClick={() => rapprocher(c)} disabled={busyLine === c.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 shrink-0">
                    {busyLine === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Rapprocher
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetLettragePage;
