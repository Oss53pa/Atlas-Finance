/**
 * CapexCarRegistrePage — /capex/car
 *
 * REGISTRE des Capital Appropriation Requests : toutes les CAR du tenant, tous
 * business cases confondus (référence, montant approprié, date, statut, BC).
 * Le formulaire d'émission, lui, vit sur la fiche du Business Case (CarModal),
 * car une CAR s'adosse toujours à un BC approuvé et à son enveloppe restante.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { listAllCars, type Car } from '../../features/budget/services/capexCarService';
import { Landmark, Loader2, Search, ArrowRight, AlertTriangle } from 'lucide-react';

const STATUT_STYLE: Record<string, string> = {
  emise: 'bg-emerald-100 text-emerald-700',
  annulee: 'bg-red-100 text-red-700',
  cloturee: 'bg-neutral-100 text-[var(--color-text-tertiary)]',
};

type CarRow = Car & { business_case?: string };

const CapexCarRegistrePage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await listAllCars(adapter)); }
    catch (e: any) { setError(e?.message || 'Erreur de chargement'); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.reference || '').toLowerCase().includes(q) ||
      (r.business_case || '').toLowerCase().includes(q));
  }, [rows, query]);

  const total = useMemo(() => visible.reduce((s, r) => s + (r.montant_approprie || 0), 0), [visible]);

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Landmark className="w-6 h-6 text-[var(--color-primary)]" /> Registre des CAR</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{visible.length} appropriation(s) · {formatCurrency(total)} approprié(s)</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Référence / business case…"
            className="pl-8 pr-3 py-2 text-sm border border-[var(--color-border)] rounded-lg w-72 bg-[var(--color-surface)]" />
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          {rows.length === 0
            ? "Aucune CAR émise. Une CAR s'émet depuis la fiche d'un Business Case approuvé (bouton « Émettre le CAR »)."
            : 'Aucune CAR ne correspond à la recherche.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left">Référence</th>
                <th className="px-4 py-3 text-left">Business Case</th>
                <th className="px-4 py-3 text-right">Montant approprié</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-left">Justification</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/capex/car/${r.id}`)} className="border-b border-[var(--color-border-light)] hover:bg-neutral-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-primary)]">{r.reference || '—'}</td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{r.business_case || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.montant_approprie)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{r.date_appropriation || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_STYLE[String(r.statut)] || 'bg-neutral-100 text-[var(--color-text-secondary)]'}`}>{String(r.statut)}</span></td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)] max-w-[260px] truncate" title={r.justification || ''}>{r.justification || '—'}</td>
                  <td className="px-4 py-3 text-right"><ArrowRight className="w-4 h-4 text-neutral-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CapexCarRegistrePage;
