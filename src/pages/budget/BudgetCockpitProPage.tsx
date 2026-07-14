/**
 * BudgetCockpitProPage — /budget/cockpit-analytique (dashboards style REWISE).
 * Onglets : Overview (P&L mensuel + cartes) · Budget · Variance · Revenus.
 * Construit une vue à la fois (validation itérative). Overview = données réelles
 * (getMonthlyPnL depuis v_budget_execution + v_actual_exploitation).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getMonthlyPnL, monthCard, type PnLMonth } from '../../features/budget/services/cockpitService';
import { LayoutDashboard, Loader2, Wallet, PieChart, TrendingUp, Banknote } from 'lucide-react';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
type Tab = 'overview' | 'budget' | 'variance' | 'revenus';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'budget', label: 'Budget' },
  { id: 'variance', label: 'Variance Analysis' }, { id: 'revenus', label: 'Revenus' },
];

const fmt = (n: number) => formatCurrency(Math.round(n));
const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0);

const BudgetCockpitProPage: React.FC = () => {
  const { adapter } = useData();
  const [tab, setTab] = useState<Tab>('overview');
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [months, setMonths] = useState<PnLMonth[]>([]);
  const [selected, setSelected] = useState<number[]>([new Date().getMonth() + 1]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const m = await getMonthlyPnL(adapter, annee); if (!cancelled) setMonths(m); }
      catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, annee]);

  const toggleMonth = (m: number) => setSelected((s) => s.includes(m) ? (s.length > 1 ? s.filter((x) => x !== m) : s) : [...s, m].sort((a, b) => a - b).slice(-3));
  const yearTotal = useMemo(() => months.reduce((acc, m) => ({
    budget: acc.budget + m.budget.netIncome, actual: acc.actual + m.actual.netIncome, goiA: acc.goiA + m.actual.goi,
  }), { budget: 0, actual: 0, goiA: 0 }), [months]);

  const selMonths = selected.map((p) => months.find((m) => m.period === p)).filter(Boolean) as PnLMonth[];

  // Lignes du P&L (label, accès budget/actual). NOI Margin & % traités à part.
  const ROWS: { key: string; label: string; get: (l: PnLMonth['budget']) => number; strong?: boolean; percent?: boolean }[] = [
    { key: 'goi', label: 'Gross Operating Income', get: (l) => l.goi },
    { key: 'opex', label: 'Operating Expenses', get: (l) => l.opex },
    { key: 'noi', label: 'Net Operating Income (NOI)', get: (l) => l.noi, strong: true },
    { key: 'margin', label: 'NOI Margin', get: () => 0, percent: true },
    { key: 'finInc', label: 'Financial Incomes', get: (l) => l.finInc },
    { key: 'finExp', label: 'Financial Expenses', get: (l) => l.finExp },
    { key: 'resFin', label: 'Résultat Financier', get: (l) => l.resFin, strong: true },
    { key: 'tax', label: 'Tax', get: (l) => l.tax },
    { key: 'net', label: 'Net income / loss', get: (l) => l.netIncome, strong: true },
    { key: 'div', label: 'Dividends paid', get: () => 0 },
  ];

  const cell = (m: PnLMonth, r: typeof ROWS[number], col: 'budget' | 'actual' | 'balance') => {
    if (r.percent) {
      const bm = pct(m.budget.noi, m.budget.goi), am = pct(m.actual.noi, m.actual.goi);
      if (col === 'budget') return `${bm}`; if (col === 'actual') return `${am}`; return `${bm - am}`;
    }
    const b = r.get(m.budget), a = r.get(m.actual);
    if (col === 'budget') return fmt(b); if (col === 'actual') return fmt(a); return fmt(b - a);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Onglets internes */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto">
        {TABS.map((tt) => (
          <button key={tt.id} onClick={() => setTab(tt.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${tab === tt.id ? 'border-[var(--color-primary)] text-[var(--color-primary)] dark:text-[var(--color-primary)] font-medium' : 'border-transparent text-[var(--color-text-secondary)] hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
            {tt.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}

      {tab !== 'overview' ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center text-sm text-[var(--color-text-secondary)]">
          <div className="flex justify-center mb-3 text-neutral-300">
            {tab === 'budget' ? <Wallet className="w-8 h-8" /> : tab === 'variance' ? <PieChart className="w-8 h-8" /> : <TrendingUp className="w-8 h-8" />}
          </div>
          Onglet « {TABS.find((x) => x.id === tab)?.label} » — à construire après validation de l'Overview.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : (
        <>
          <header className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-[var(--color-primary)]" /> Overview</h1>
            <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
              {[0, 1, 2, 3].map((d) => { const y = new Date().getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <span className="text-xs text-[var(--color-text-tertiary)]">Sélectionnez des mois (max 3)</span>
          </header>

          {/* Bande des mois */}
          <div className="flex items-center gap-1 flex-wrap">
            {MOIS.map((mo, i) => {
              const p = i + 1; const on = selected.includes(p);
              return (
                <button key={mo} onClick={() => toggleMonth(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${on ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-neutral-800'}`}>
                  {mo}
                </button>
              );
            })}
          </div>

          {/* Cartes par mois sélectionné */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {selMonths.map((m) => {
              const c = monthCard(m);
              return (
                <div key={m.period} className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-warning-light)] flex items-center justify-center text-[var(--color-secondary)] shrink-0"><Banknote className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{MOIS[m.period - 1]} · {annee}</div>
                      <Row label={`No budgeted`} value={c.noBudget} />
                      <Row label={`Overspent`} value={c.overspent} tone={c.overspent > 0 ? 'danger' : undefined} />
                      <Row label={`Incoming`} value={c.incoming} />
                      <Row label={`Budgeted`} value={c.budgeted} />
                      <div className="border-t border-neutral-100 dark:border-neutral-700 mt-1 pt-1"><Row label="Available to budget" value={c.available} strong /></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tableau P&L par mois (Budgeted / Actual / Balance) */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">&nbsp;</th>
                  {selMonths.map((m) => (
                    <th key={m.period} colSpan={3} className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 border-l border-[var(--color-border)]">{MOIS[m.period - 1]}</th>
                  ))}
                </tr>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-2 text-left" />
                  {selMonths.map((m) => (
                    <React.Fragment key={m.period}>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 border-l border-[var(--color-border)]">Budgeted</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actual</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Balance</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ROWS.map((r) => (
                  <tr key={r.key} className={r.strong ? 'bg-gray-50/50' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-2.5 ${r.strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{r.label}</td>
                    {selMonths.map((m) => (
                      <React.Fragment key={m.period}>
                        <td className="px-4 py-2.5 text-right text-gray-500 border-l border-[var(--color-border)]">{cell(m, r, 'budget')}</td>
                        <td className={`px-4 py-2.5 text-right ${r.strong ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>{cell(m, r, 'actual')}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400">{cell(m, r, 'balance')}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-[var(--color-border)] font-semibold text-gray-900">
                  <td className="px-4 py-3">Net Income (year)</td>
                  {selMonths.map((m) => (
                    <td key={m.period} colSpan={3} className="px-4 py-3 text-right border-l border-[var(--color-border)]">
                      {fmt(yearTotal.actual)} <span className="text-gray-400 font-normal">({pct(yearTotal.actual, yearTotal.goiA)}%)</span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)]">Mapping SYSCOHADA : GOI = produits 70-76, OpEx = charges 60-65/68, Financier 66/67 & 77, Tax 69/89 (ajustable). Réalisé issu du GL, budget de la version en vigueur.</p>
        </>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; tone?: 'danger'; strong?: boolean }> = ({ label, value, tone, strong }) => (
  <div className="flex items-center justify-between text-xs py-0.5">
    <span className={strong ? 'font-semibold text-neutral-800 dark:text-neutral-100' : 'text-[var(--color-text-secondary)]'}>{label}</span>
    <span className={`font-mono ${tone === 'danger' ? 'text-red-600' : strong ? 'font-semibold text-[var(--color-text-primary)]' : 'text-neutral-700 dark:text-neutral-200'}`}>{formatCurrency(Math.round(value))}</span>
  </div>
);

export default BudgetCockpitProPage;
