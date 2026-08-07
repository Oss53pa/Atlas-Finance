/**
 * CapexEnveloppePage — /capex/enveloppe (refonte OPEX/CAPEX, Lot 5, §17.3).
 * Enveloppe CAPEX annuelle : votée / réservée / appropriée / réserve / disponible
 * (invariant 11) + saisie des enveloppes votées par direction.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getActiveFiscalYear, type FiscalYearLite } from '../../features/budget/services/budgetService';
import { listEnveloppes, upsertEnveloppe, deleteEnveloppe, computeEnveloppeGlobal, type Enveloppe, type EnveloppeState } from '../../features/budget/services/enveloppeService';
import { listOrgTree, type SectionOrgNode } from '../../features/budget/services/sectionGovernanceService';
import { Wallet, Loader2, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CapexEnveloppePage: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const [fy, setFy] = useState<FiscalYearLite | null>(null);
  const [envs, setEnvs] = useState<Enveloppe[]>([]);
  const [state, setState] = useState<EnveloppeState | null>(null);
  const [sections, setSections] = useState<SectionOrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dir, setDir] = useState(''); const [vote, setVote] = useState(''); const [reserve, setReserve] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const f = await getActiveFiscalYear(adapter);
        const tree = await listOrgTree(adapter);
        if (!f) { if (!cancelled) { setError(t('capexEnvelope.noActiveFiscalYear')); setLoading(false); } return; }
        const [e, s] = await Promise.all([listEnveloppes(adapter, f.id), computeEnveloppeGlobal(adapter, f.id)]);
        if (cancelled) return;
        setFy(f); setEnvs(e); setState(s); setSections(tree);
      } catch (e: any) { if (!cancelled) setError(e?.message || t('capexEnvelope.error')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey, t]);

  const add = useCallback(async () => {
    if (!fy || !(Number(vote) > 0)) return;
    setError(null);
    try {
      await upsertEnveloppe(adapter, { fiscalYearId: fy.id, directionSectionId: dir || null, montantVote: Number(vote), reservePct: (Number(reserve) || 0) / 100 });
      setDir(''); setVote(''); setReserve(''); setRefreshKey((k) => k + 1);
    } catch (e: any) { setError(e?.message || t('capexEnvelope.failed')); }
  }, [adapter, fy, dir, vote, reserve, t]);

  const remove = useCallback(async (id: string) => { try { await deleteEnveloppe(adapter, id); setRefreshKey((k) => k + 1); } catch (e: any) { setError(e?.message || t('capexEnvelope.failed')); } }, [adapter, t]);

  const tiles = useMemo(() => state ? [
    { label: t('capexEnvelope.tileVoted'), value: state.votee, accent: 'text-[var(--color-text-primary)]' },
    { label: t('capexEnvelope.tileReserved'), value: state.reservee, accent: 'text-amber-600' },
    { label: t('capexEnvelope.tileAppropriated'), value: state.appropriee, accent: 'text-[#3D6FA8]' },
    { label: t('capexEnvelope.tileContingency'), value: state.reserve, accent: 'text-violet-600' },
    { label: t('capexEnvelope.tileAvailable'), value: state.disponible, accent: state.disponible < 0 ? 'text-red-600' : 'text-emerald-600' },
  ] : [], [state, t]);

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Wallet className="w-6 h-6 text-[var(--color-primary)]" /> {t('capexEnvelope.title')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">{t('capexEnvelope.subtitle', { year: fy?.code || '—' })}</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> {t('capexEnvelope.loading')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)] leading-tight">{tile.label}</div>
                <div className={`font-mono text-sm font-semibold mt-1 ${tile.accent}`}>{formatCurrency(tile.value)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('capexEnvelope.votedEnvelopes')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select value={dir} onChange={(e) => setDir(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
                <option value="">{t('capexEnvelope.companyGlobal')}</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
              </select>
              <input type="number" value={vote} onChange={(e) => setVote(e.target.value)} placeholder={t('capexEnvelope.votedAmountPlaceholder')} className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono" />
              <input type="number" value={reserve} onChange={(e) => setReserve(e.target.value)} placeholder={t('capexEnvelope.reservePlaceholder')} className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono" />
              <button onClick={add} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm"><Plus className="w-4 h-4 inline" /> {t('capexEnvelope.add')}</button>
            </div>
            <ul className="divide-y divide-[var(--color-border-light)]">
              {envs.length === 0 ? <li className="py-3 text-sm text-[var(--color-text-tertiary)] text-center">{t('capexEnvelope.emptyEnvelopes')}</li> : envs.map((e) => (
                <li key={e.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <span className="text-[var(--color-text-secondary)]">{e.direction_section_id ? sections.find((s) => s.id === e.direction_section_id)?.libelle ?? t('capexEnvelope.division') : t('capexEnvelope.companyGlobal')} <span className="text-xs text-[var(--color-text-tertiary)]">{t('capexEnvelope.reservePct', { pct: String(Math.round(e.reserve_pct * 100)) })}</span></span>
                  <span className="flex items-center gap-2"><span className="font-mono">{formatCurrency(e.montant_vote)}</span><button onClick={() => remove(e.id)} className="text-neutral-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default CapexEnveloppePage;
