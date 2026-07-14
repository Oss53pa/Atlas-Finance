/**
 * BudgetMatrixGridPage — /budget/saisie/:sectionId (refonte OPEX/CAPEX, Lot 3).
 *
 * Grille d'élaboration OPEX : comptes de charge (classe 6) en lignes × 12 mois en
 * colonnes, pour la version en vigueur et un centre de coût (section analytique).
 * Saisie cellule ; le total de ligne est éditable = répartition 1/12 (clé de
 * saisonnalité simple). Colonne de référence Réel N-1 (société). Enregistrement
 * ligne à ligne (source_prefill tracée). Version verrouillée => lecture seule.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getAccountLabel } from '../../utils/accountLabels';
import {
  getDefaultAnnee, getActiveBudgetVersion, getBudgetLinesWithPeriods, saveBudgetLine,
  getActualExploitation, type BudgetVersion,
} from '../../features/budget/services/budgetService';
import { listOrgTree, type SectionOrgNode } from '../../features/budget/services/sectionGovernanceService';
import VolumesModal from './VolumesModal';
import { Grid3x3, Loader2, Plus, Save, Lock, ArrowLeft, Trash2, Boxes } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
type Row = { id?: string; account_code: string; periods: Record<number, number>; dirty: boolean; source?: string; commentaire?: string };

const rowTotal = (r: Row) => Array.from({ length: 12 }, (_, i) => r.periods[i + 1] || 0).reduce((a, b) => a + b, 0);
/** Répartit un montant annuel en 12 (le dernier mois absorbe le reste d'arrondi). */
function spread12(annual: number): Record<number, number> {
  const base = Math.floor((annual / 12) * 100) / 100;
  const out: Record<number, number> = {};
  let acc = 0;
  for (let m = 1; m <= 11; m++) { out[m] = base; acc += base; }
  out[12] = Math.round((annual - acc) * 100) / 100;
  return out;
}

const BudgetMatrixGridPage: React.FC<{ nature?: 'opex' | 'revenus' }> = ({ nature = 'opex' }) => {
  const { sectionId = '' } = useParams();
  const isRevenus = nature === 'revenus';
  const classPrefix = isRevenus ? '7' : '6';
  const { adapter } = useData();
  const navigate = useNavigate();
  const [annee, setAnnee] = useState('');
  const [version, setVersion] = useState<BudgetVersion | null>(null);
  const [section, setSection] = useState<SectionOrgNode | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [refN1, setRefN1] = useState<Record<string, number>>({});
  const [refN1Monthly, setRefN1Monthly] = useState<Record<string, Record<number, number>>>({});
  const [taux, setTaux] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [volumesLine, setVolumesLine] = useState<{ id: string; account: string } | null>(null);

  const locked = version?.statut === 'verrouille';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const [v, tree] = await Promise.all([getActiveBudgetVersion(adapter), listOrgTree(adapter)]);
        const sec = tree.find((s) => s.id === sectionId) ?? null;
        let lines: Row[] = [];
        if (v) {
          const all = await getBudgetLinesWithPeriods(adapter, v.id);
          lines = all
            .filter((l) => l.section_id === sectionId && ((l.nature ?? 'opex') === nature))
            .map((l) => ({ id: l.id, account_code: l.account_code, periods: l.periods, dirty: false, source: l.source_prefill ?? undefined, commentaire: l.commentaire ?? undefined }));
        }
        // référence réel N-1 (société) : total par compte + détail mensuel
        const n1 = await getActualExploitation(adapter, String(Number(a) - 1));
        const ref: Record<string, number> = {};
        const refMonthly: Record<string, Record<number, number>> = {};
        for (const r of n1) if (r.classe === classPrefix) {
          ref[r.account_code] = (ref[r.account_code] || 0) + r.montant_realise;
          (refMonthly[r.account_code] ??= {})[r.period] = (refMonthly[r.account_code][r.period] || 0) + r.montant_realise;
        }
        if (cancelled) return;
        setAnnee(a); setVersion(v); setSection(sec); setRows(lines); setRefN1(ref); setRefN1Monthly(refMonthly);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, sectionId, refreshKey]);

  const setCell = useCallback((idx: number, month: number, val: string) => {
    setRows((rs) => rs.map((r, i) => i === idx ? { ...r, periods: { ...r.periods, [month]: Number(val) || 0 }, dirty: true } : r));
  }, []);
  const setAccount = useCallback((idx: number, code: string) => {
    setRows((rs) => rs.map((r, i) => i === idx ? { ...r, account_code: code, dirty: true } : r));
  }, []);
  const setComment = useCallback((idx: number, val: string) => {
    setRows((rs) => rs.map((r, i) => i === idx ? { ...r, commentaire: val, dirty: true } : r));
  }, []);
  const setTotal = useCallback((idx: number, val: string) => {
    const annual = Number(val) || 0;
    setRows((rs) => rs.map((r, i) => i === idx ? { ...r, periods: spread12(annual), dirty: true, source: 'n1_indexe' } : r));
  }, []);
  const addRow = useCallback(() => setRows((rs) => [...rs, { account_code: '', periods: {}, dirty: true }]), []);
  const removeRow = useCallback((idx: number) => setRows((rs) => rs.filter((_, i) => i !== idx)), []);
  const prefillFromN1 = useCallback((idx: number) => {
    setRows((rs) => rs.map((r, i) => {
      if (i !== idx || !r.account_code) return r;
      const total = refN1[r.account_code] || 0;
      return { ...r, periods: spread12(total), dirty: true, source: 'n1' };
    }));
  }, [refN1]);

  /**
   * Pré-remplissage global depuis le réel N-1 (recopie mois par mois), éventuellement
   * indexé de `taux` %. Génère les lignes manquantes pour tous les comptes classe 6
   * présents en N-1, met à jour celles déjà là. ZBB = tout remettre à 0.
   */
  const applyFromN1 = useCallback((indexed: boolean) => {
    const factor = indexed ? 1 + (Number(taux) || 0) / 100 : 1;
    setRows((rs) => {
      const map = new Map(rs.map((r) => [r.account_code, { ...r }]));
      for (const [code, months] of Object.entries(refN1Monthly)) {
        const periods: Record<number, number> = {};
        for (let m = 1; m <= 12; m++) periods[m] = Math.round((months[m] || 0) * factor * 100) / 100;
        const ex = map.get(code);
        if (ex) { ex.periods = periods; ex.dirty = true; ex.source = indexed ? 'n1_indexe' : 'n1'; }
        else map.set(code, { account_code: code, periods, dirty: true, source: indexed ? 'n1_indexe' : 'n1' });
      }
      return [...map.values()];
    });
  }, [refN1Monthly, taux]);

  const zbbAll = useCallback(() => {
    setRows((rs) => rs.map((r) => ({ ...r, periods: {}, dirty: true, source: 'zbb' })));
  }, []);

  const columnTotals = useMemo(() => {
    const t: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) t[m] = rows.reduce((s, r) => s + (r.periods[m] || 0), 0);
    return t;
  }, [rows]);
  const grandTotal = useMemo(() => rows.reduce((s, r) => s + rowTotal(r), 0), [rows]);
  const dirtyCount = rows.filter((r) => r.dirty && r.account_code.trim()).length;

  const saveAll = useCallback(async () => {
    if (!version) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const toSave = rows.filter((r) => r.dirty && r.account_code.trim());
      for (const r of toSave) {
        await saveBudgetLine(adapter, version.id, {
          id: r.id, budget_type: 'exploitation', account_code: r.account_code.trim(),
          section_id: sectionId, periods: r.periods, nature, source_prefill: r.source ?? 'manuel',
          commentaire: r.commentaire ?? null,
        });
      }
      setNotice(`${toSave.length} ligne(s) enregistrée(s).`);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [adapter, version, rows, sectionId]);

  return (
    <div className="p-6 space-y-4 max-w-full">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/analytique')} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:bg-neutral-100 dark:hover:bg-neutral-700" title="Sections">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Grid3x3 className="w-6 h-6 text-[var(--color-primary)]" /> {isRevenus ? 'Budget des revenus' : 'Saisie budgétaire OPEX'}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">
              {section ? `${section.code} · ${section.libelle}` : 'Section inconnue'} · exercice {annee}
              {version && <> · version <span className="font-medium">{version.libelle}</span></>}
              {locked && <span className="ml-2 inline-flex items-center gap-1 text-[var(--color-primary)]"><Lock className="w-3.5 h-3.5" /> verrouillée</span>}
            </p>
          </div>
        </div>
        {!locked && (
          <div className="flex items-center gap-2">
            <button onClick={addRow} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700">
              <Plus className="w-4 h-4" /> Compte
            </button>
            <button onClick={saveAll} disabled={saving || dirtyCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
            </button>
          </div>
        )}
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}

      {!loading && version && !locked && (
        <div className="flex items-center gap-2 flex-wrap text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl px-3 py-2">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Pré-remplir :</span>
          <button onClick={() => applyFromN1(false)} className="px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs hover:border-[var(--color-primary)]">N-1 (mensuel)</button>
          <span className="inline-flex items-center gap-1">
            <button onClick={() => applyFromN1(true)} className="px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs hover:border-[var(--color-primary)]">N-1 indexé</button>
            <input value={taux} onChange={(e) => setTaux(e.target.value)} placeholder="%" type="number"
              className="w-14 px-1.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-mono" />
            <span className="text-xs text-[var(--color-text-tertiary)]">%</span>
          </span>
          <button onClick={zbbAll} className="px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs hover:border-red-400">ZBB (vider)</button>
          <span className="text-xs text-[var(--color-text-tertiary)]">puis Enregistrer</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : !version ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Aucune version budgétaire en vigueur. Créez-en une depuis <button onClick={() => navigate('/budget/versions')} className="underline">Versions &amp; validation</button>.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <table className="text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                <th className="px-3 py-3 text-left sticky left-0 bg-[var(--color-surface)] z-10 min-w-[220px]">Compte</th>
                {MOIS.map((m) => <th key={m} className="px-2 py-3 text-right min-w-[84px]">{m}</th>)}
                <th className="px-3 py-3 text-right min-w-[110px] bg-[var(--color-primary-light)]">Total</th>
                <th className="px-3 py-3 text-right min-w-[110px]">Réel N-1</th>
                {!locked && <th className="px-2 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={16} className="px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">Aucune ligne. Ajoutez un compte de charge (classe 6).</td></tr>
              ) : rows.map((r, idx) => {
                const total = rowTotal(r);
                const n1 = refN1[r.account_code] || 0;
                return (
                  <tr key={r.id ?? `new-${idx}`} className="border-b border-[var(--color-border-light)]">
                    <td className="px-3 py-2 sticky left-0 bg-[var(--color-surface)] z-10">
                      {r.id ? (
                        <div>
                          <div className="font-mono text-[var(--color-text-primary)]">{r.account_code}</div>
                          <div className="text-xs text-[var(--color-text-tertiary)] truncate max-w-[190px]">{getAccountLabel(r.account_code)}</div>
                        </div>
                      ) : (
                        <input value={r.account_code} onChange={(e) => setAccount(idx, e.target.value)} disabled={locked}
                          placeholder={isRevenus ? '7011' : '6132'} className="w-24 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-sm" />
                      )}
                      {(r.id || r.account_code) && (
                        <input value={r.commentaire ?? ''} onChange={(e) => setComment(idx, e.target.value)} disabled={locked}
                          placeholder="justification…" title="Justification de la ligne"
                          className="mt-1 w-full max-w-[200px] px-1.5 py-0.5 rounded border border-transparent hover:border-neutral-200 dark:hover:border-neutral-600 bg-transparent text-[11px] text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none" />
                      )}
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <td key={m} className="px-1 py-1">
                        <input type="number" value={r.periods[m] || ''} onChange={(e) => setCell(idx, m, e.target.value)} disabled={locked}
                          className="w-full px-1 py-1 text-right rounded border border-transparent hover:border-neutral-200 focus:border-[var(--color-primary)] dark:bg-neutral-900 dark:hover:border-neutral-600 font-mono text-xs disabled:opacity-60" />
                      </td>
                    ))}
                    <td className="px-2 py-1 bg-[var(--color-primary-light)]">
                      <input type="number" value={total || ''} onChange={(e) => setTotal(idx, e.target.value)} disabled={locked}
                        title="Éditer le total = répartir en 1/12"
                        className="w-full px-1 py-1 text-right rounded border border-transparent hover:border-[var(--color-primary-light)] dark:bg-neutral-900 font-mono text-xs font-medium text-[var(--color-primary)] dark:text-[var(--color-primary)] disabled:opacity-60" />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-[var(--color-text-tertiary)]">
                      <button onClick={() => prefillFromN1(idx)} disabled={locked || !n1} title="Pré-remplir depuis N-1" className="hover:text-[var(--color-primary)] disabled:hover:text-[var(--color-text-tertiary)]">
                        {n1 ? formatCurrency(n1) : '—'}
                      </button>
                    </td>
                    {!locked && (
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          {isRevenus && r.id && <button onClick={() => setVolumesLine({ id: r.id!, account: r.account_code })} title="Volumes × prix" className="p-1 text-neutral-300 hover:text-[var(--color-primary)]"><Boxes className="w-4 h-4" /></button>}
                          {!r.id && <button onClick={() => removeRow(idx)} className="p-1 text-neutral-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-hover)]">
                <td className="px-3 py-3 sticky left-0 bg-neutral-50 dark:bg-neutral-900 z-10">Total ({rows.length})</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <td key={m} className="px-2 py-3 text-right font-mono text-xs">{formatCurrency(columnTotals[m])}</td>
                ))}
                <td className="px-3 py-3 text-right font-mono text-[var(--color-primary)] dark:text-[var(--color-primary)] bg-[var(--color-primary-light)]">{formatCurrency(grandTotal)}</td>
                <td className="px-3 py-3" />
                {!locked && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {volumesLine && (
        <VolumesModal adapter={adapter} budgetLineId={volumesLine.id} accountCode={volumesLine.account}
          onClose={() => setVolumesLine(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
};

export default BudgetMatrixGridPage;
