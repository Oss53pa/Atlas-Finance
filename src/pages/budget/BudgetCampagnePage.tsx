/**
 * BudgetCampagnePage — /budget/campagne (refonte OPEX/CAPEX, Lot 3, §11).
 *
 * Orchestration de la campagne budgétaire : cycle de statut (préparation → ouverte
 * → consolidation → arbitrage → votée → clôturée), cadrage (taux d'indexation,
 * dates), et tableau de complétude par centre de coût (soumis / en cours / non
 * commencé) sur la version en vigueur. S'appuie sur campagneService.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  listCampagnes, createCampagne, setCampagneStatut, updateCampagne, canTransitionCampagne,
  type BudgetCampagne, type CampagneStatut,
} from '../../features/budget/services/campagneService';
import {
  getActiveFiscalYear, getActiveBudgetVersion, getBudgetLinesWithPeriods,
  type BudgetVersion,
} from '../../features/budget/services/budgetService';
import { listOrgTree, type SectionOrgNode } from '../../features/budget/services/sectionGovernanceService';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Loader2, ArrowRight, CheckCircle2, Circle, Clock, Plus } from 'lucide-react';

const STEPS: CampagneStatut[] = ['preparation', 'ouverte', 'consolidation', 'arbitrage', 'votee', 'cloturee'];
const LABEL: Record<CampagneStatut, string> = {
  preparation: 'Préparation', ouverte: 'Ouverte', consolidation: 'Consolidation',
  arbitrage: 'Arbitrage', votee: 'Votée', cloturee: 'Clôturée',
};
const NEXT_LABEL: Partial<Record<CampagneStatut, string>> = {
  preparation: 'Ouvrir la campagne', ouverte: 'Passer en consolidation',
  consolidation: 'Passer en arbitrage', arbitrage: 'Voter le budget', votee: 'Clôturer',
};

const BudgetCampagnePage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [campagnes, setCampagnes] = useState<BudgetCampagne[]>([]);
  const [current, setCurrent] = useState<BudgetCampagne | null>(null);
  const [version, setVersion] = useState<BudgetVersion | null>(null);
  const [sections, setSections] = useState<SectionOrgNode[]>([]);
  const [lineCountBySection, setLineCountBySection] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [camps, v, tree] = await Promise.all([listCampagnes(adapter), getActiveBudgetVersion(adapter), listOrgTree(adapter)]);
        const cur = camps.find((c) => c.statut !== 'cloturee') ?? camps[0] ?? null;
        const counts: Record<string, number> = {};
        if (v) {
          const lines = await getBudgetLinesWithPeriods(adapter, v.id);
          for (const l of lines) if (l.section_id) counts[l.section_id] = (counts[l.section_id] || 0) + 1;
        }
        if (cancelled) return;
        setCampagnes(camps); setCurrent(cur); setVersion(v);
        setSections(tree.filter((s) => s.type_axe === 'centre_cout')); setLineCountBySection(counts);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const create = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy?.id) { setError('Aucun exercice actif.'); return; }
      await createCampagne(adapter, { fiscalYearId: fy.id, libelle: `Campagne budgétaire ${fy.code}` });
      setNotice('Campagne créée.'); setRefreshKey((k) => k + 1);
    } catch (e: any) { setError(e?.message || 'Échec.'); } finally { setBusy(false); }
  }, [adapter]);

  const advance = useCallback(async () => {
    if (!current) return;
    const idx = STEPS.indexOf(current.statut);
    const next = STEPS[idx + 1];
    if (!next || !canTransitionCampagne(current.statut, next)) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await setCampagneStatut(adapter, current.id, next);
      setNotice(`Campagne : ${LABEL[next]}.`); setRefreshKey((k) => k + 1);
    } catch (e: any) { setError(e?.message || 'Transition refusée.'); } finally { setBusy(false); }
  }, [adapter, current]);

  const setTaux = useCallback(async (val: string) => {
    if (!current) return;
    const taux = Number(val);
    try { await updateCampagne(adapter, current.id, { taux_indexation_defaut: Number.isFinite(taux) ? taux : null }); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || 'Échec.'); }
  }, [adapter, current]);

  const completude = useMemo(() => {
    const started = sections.filter((s) => (lineCountBySection[s.id] || 0) > 0).length;
    return { started, total: sections.length, pct: sections.length ? Math.round((started / sections.length) * 100) : 0 };
  }, [sections, lineCountBySection]);

  const idx = current ? STEPS.indexOf(current.statut) : -1;

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[var(--color-primary)]" /> Campagne budgétaire
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">Cadrage, saisie, consolidation, arbitrage, vote.</p>
        </div>
        {!current && <button onClick={create} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"><Plus className="w-4 h-4" /> Nouvelle campagne</button>}
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : !current ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          Aucune campagne. Lancez-en une pour cadrer l'élaboration budgétaire de l'exercice.
        </div>
      ) : (
        <>
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="text-base font-semibold text-[var(--color-text-primary)]">{current.libelle}</div>
              {NEXT_LABEL[current.statut] && (
                <button onClick={advance} disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} {NEXT_LABEL[current.statut]}
                </button>
              )}
            </div>
            {/* Stepper */}
            <div className="flex items-center gap-1 flex-wrap">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    i < idx ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]'
                    : i === idx ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]'}`}>
                    {i < idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i === idx ? <Clock className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                    {LABEL[s]}
                  </span>
                  {i < STEPS.length - 1 && <span className="text-neutral-300">·</span>}
                </React.Fragment>
              ))}
            </div>
            {/* Cadrage */}
            <div className="mt-4 flex items-center gap-3 flex-wrap text-sm">
              <label className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                Taux d'indexation par défaut
                <input type="number" step="0.01" defaultValue={current.taux_indexation_defaut ?? ''} onBlur={(e) => setTaux(e.target.value)}
                  disabled={current.statut !== 'preparation'} placeholder="0.03"
                  className="w-24 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-sm disabled:opacity-60" />
              </label>
            </div>
          </div>

          {/* Complétude par centre de coût */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">Complétude de la saisie ({completude.started}/{completude.total} centres · {completude.pct}%)</span>
            </div>
            {sections.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">Aucun centre de coût. Initialisez l'organisation depuis le hub.</div>
            ) : (
              <ul className="divide-y divide-[var(--color-border-light)]">
                {sections.map((s) => {
                  const n = lineCountBySection[s.id] || 0;
                  return (
                    <li key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {n > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-neutral-300" />}
                        <span className="font-mono text-sm text-[var(--color-text-primary)]">{s.code}</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">{s.libelle}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-text-tertiary)]">{n > 0 ? `${n} ligne(s)` : 'non commencé'}</span>
                        <button onClick={() => navigate(`/budget/saisie/${s.id}`)} className="text-xs text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">Saisir</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetCampagnePage;
