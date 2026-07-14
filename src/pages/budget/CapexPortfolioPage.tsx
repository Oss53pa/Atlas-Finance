/**
 * CapexPortfolioPage — /capex (refonte OPEX/CAPEX, Lot 5, §22.2).
 * Portefeuille des Business Cases CAPEX : pipeline par statut, accès au BCStepper.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getAccountLabel } from '../../utils/accountLabels';
import { listCapexRequests, type CapexRequest } from '../../features/budget/services/budgetService';
import { Layers, Loader2, Plus, ArrowRight } from 'lucide-react';

const STATUT_STYLE: Record<string, string> = {
  brouillon: 'bg-neutral-100 text-[var(--color-text-secondary)] dark:bg-neutral-700',
  demande: 'bg-neutral-100 text-[var(--color-text-secondary)] dark:bg-neutral-700',
  soumis: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  en_priorisation: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  approuve: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  approuve_avec_conditions: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  car_emis: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]',
  ajourne: 'bg-neutral-100 text-[var(--color-text-tertiary)]',
  rejete: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  fonds_disponibles: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]',
  clos: 'bg-neutral-100 text-[var(--color-text-tertiary)]',
};

const CapexPortfolioPage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CapexRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const r = await listCapexRequests(adapter); if (!cancelled) setRows(r); }
      catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  const totals = useMemo(() => ({
    count: rows.length,
    montant: rows.reduce((s, r) => s + (r.montant || 0), 0),
    approuves: rows.filter((r) => ['approuve', 'approuve_avec_conditions', 'car_emis', 'fonds_disponibles'].includes(r.statut as string)).length,
  }), [rows]);

  const open = useCallback((id: string) => navigate(`/capex/bc/${id}`), [navigate]);

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Layers className="w-6 h-6 text-[var(--color-primary)]" /> Portefeuille CAPEX</h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">{totals.count} business case(s) · {totals.approuves} approuvé(s) · {formatCurrency(totals.montant)}</p>
        </div>
        <button onClick={() => navigate('/capex/bc/new')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Nouveau Business Case</button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">Aucun business case. Créez-en un pour lancer un investissement.</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left">Intitulé</th>
                <th className="px-4 py-3 text-left">Compte</th>
                <th className="px-4 py-3 text-left">Catégorie</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-right">VAN</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => open(r.id)} className="border-b border-[var(--color-border-light)] hover:bg-neutral-50 dark:hover:bg-neutral-700/30 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{r.libelle}</td>
                  <td className="px-4 py-3"><span className="font-mono">{r.account_code}</span><span className="block text-xs text-[var(--color-text-tertiary)] truncate max-w-[140px]">{getAccountLabel(r.account_code)}</span></td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] text-xs">{r.categorie ? r.categorie.replace(/_/g, ' ') : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.montant)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{r.van != null ? <span className={r.van >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(r.van)}</span> : '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_STYLE[r.statut as string] || 'bg-neutral-100 text-[var(--color-text-secondary)]'}`}>{String(r.statut).replace(/_/g, ' ')}</span></td>
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

export default CapexPortfolioPage;
