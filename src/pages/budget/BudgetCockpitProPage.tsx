/**
 * BudgetCockpitProPage — /budget/cockpit-analytique (dashboards style REWISE).
 * 5 onglets, tous branchés aux données réelles du GL :
 *   Overview (P&L mensuel budget vs réalisé) · Budget (consommation) · Dépenses
 *   (charges + fournisseurs) · Variance (écarts) · Revenus (produits + clients).
 * Budget/Variance = v_budget_execution ; Dépenses/Revenus = GL + vues tiers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getMonthlyPnL, monthCard, getExpenseAnalysis, getRevenueAnalysis, getBudgetAnalysis, type PnLMonth, type ExpenseAnalysis, type RevenueAnalysis, type BudgetAnalysis, type BudgetLineAgg } from '../../features/budget/services/cockpitService';
import { useAccountNames } from '../../hooks/useAccountNames';
import { LayoutDashboard, Loader2, Wallet, PieChart, TrendingUp, Banknote, Receipt, Building2, Coins, Users, Scale, GitCompareArrows, ChevronRight } from 'lucide-react';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
type Tab = 'overview' | 'budget' | 'depenses' | 'variance' | 'revenus';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'budget', label: 'Budget' },
  { id: 'depenses', label: 'Dépenses' },
  { id: 'variance', label: 'Variance Analysis' }, { id: 'revenus', label: 'Revenus' },
];

const fmt = (n: number) => formatCurrency(Math.round(n));
const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0);

const BudgetCockpitProPage: React.FC = () => {
  const { adapter } = useData();
  const { label: acctLabel } = useAccountNames();
  const [tab, setTab] = useState<Tab>('overview');
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [months, setMonths] = useState<PnLMonth[]>([]);
  const [selected, setSelected] = useState<number[]>([new Date().getMonth() + 1]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exp, setExp] = useState<ExpenseAnalysis | null>(null);
  const [expLoading, setExpLoading] = useState(false);
  const [rev, setRev] = useState<RevenueAnalysis | null>(null);
  const [revLoading, setRevLoading] = useState(false);
  const [bud, setBud] = useState<BudgetAnalysis | null>(null);
  const [budLoading, setBudLoading] = useState(false);

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

  // Analyse des dépenses — chargée à la demande (onglet Dépenses), rechargée à l'année.
  useEffect(() => {
    if (tab !== 'depenses') return;
    let cancelled = false;
    (async () => {
      setExpLoading(true); setError(null);
      try { const e = await getExpenseAnalysis(adapter, annee); if (!cancelled) setExp(e); }
      catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setExpLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, annee, tab]);

  // Analyse des revenus — chargée à la demande (onglet Revenus), rechargée à l'année.
  useEffect(() => {
    if (tab !== 'revenus') return;
    let cancelled = false;
    (async () => {
      setRevLoading(true); setError(null);
      try { const r = await getRevenueAnalysis(adapter, annee); if (!cancelled) setRev(r); }
      catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setRevLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, annee, tab]);

  // Exécution budgétaire — chargée à la demande (onglets Budget & Variance), rechargée à l'année.
  useEffect(() => {
    if (tab !== 'budget' && tab !== 'variance') return;
    let cancelled = false;
    (async () => {
      setBudLoading(true); setError(null);
      try { const b = await getBudgetAnalysis(adapter, annee); if (!cancelled) setBud(b); }
      catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setBudLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, annee, tab]);

  const toggleMonth = (m: number) => setSelected((s) => s.includes(m) ? (s.length > 1 ? s.filter((x) => x !== m) : s) : [...s, m].sort((a, b) => a - b).slice(-3));
  // Cumul YTD (year-to-date) par mois — jusqu'au mois inclus, pas la somme des 12 mois
  // répétée à l'identique sous chaque colonne (sinon Janvier/Février/Mars affichent
  // tous le même total annuel, ce qui n'a pas de sens en lecture mensuelle).
  const ytdByPeriod = useMemo(() => {
    const map = new Map<number, { actual: number; goiA: number }>();
    let actual = 0, goiA = 0;
    for (const m of months) {
      actual += m.actual.netIncome;
      goiA += m.actual.goi;
      map.set(m.period, { actual, goiA });
    }
    return map;
  }, [months]);

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
      if (col === 'budget') return `${bm}%`; if (col === 'actual') return `${am}%`; return `${bm - am} pt`;
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

      {tab === 'depenses' ? (
        <DepensesTab exp={exp} loading={expLoading} annee={annee} setAnnee={setAnnee} acctLabel={acctLabel} />
      ) : tab === 'revenus' ? (
        <RevenusTab rev={rev} loading={revLoading} annee={annee} setAnnee={setAnnee} acctLabel={acctLabel} />
      ) : tab === 'budget' ? (
        <BudgetTab bud={bud} loading={budLoading} annee={annee} setAnnee={setAnnee} acctLabel={acctLabel} />
      ) : tab === 'variance' ? (
        <VarianceTab bud={bud} loading={budLoading} annee={annee} setAnnee={setAnnee} acctLabel={acctLabel} />
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
                  <td className="px-4 py-3">Net Income (YTD)</td>
                  {selMonths.map((m) => {
                    const y = ytdByPeriod.get(m.period) ?? { actual: 0, goiA: 0 };
                    return (
                      <td key={m.period} colSpan={3} className="px-4 py-3 text-right border-l border-[var(--color-border)]">
                        {fmt(y.actual)} <span className="text-gray-400 font-normal">({pct(y.actual, y.goiA)}%)</span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)]">Mapping SYSCOHADA : GOI = produits d'exploitation (70-76, 78-79) · OpEx = charges d'exploitation (60-66, 68, personnel 66 inclus) · Résultat financier = 77 − 67 · Tax = impôt sur le résultat (89). Réalisé issu du GL (écritures validées), budget de la version en vigueur. Les valeurs négatives de janvier sont de vraies extournes de provisions (cut-off de clôture).</p>
        </>
      )}
    </div>
  );
};

// --- Onglet Dépenses -------------------------------------------------------

const MonthlyBars: React.FC<{ values: number[] }> = ({ values }) => {
  const max = Math.max(1, ...values.map((v) => Math.max(0, v)));
  return (
    <div className="flex items-stretch gap-2 h-40 pt-2">
      {values.map((v, i) => {
        const h = Math.max(2, (Math.max(0, v) / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full">
            <div className="flex-1 w-full flex items-end">
              <div className="w-full rounded-t-md bg-[var(--color-primary)] transition-all" style={{ height: `${h}%`, opacity: v > 0 ? 0.85 : 0.15 }} title={`${MOIS[i]} : ${fmt(v)}`} />
            </div>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">{MOIS_COURT[i]}</span>
          </div>
        );
      })}
    </div>
  );
};

const ShareBar: React.FC<{ ratio: number }> = ({ ratio }) => (
  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
    <div className="h-full rounded-full bg-[var(--color-secondary)]" style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }} />
  </div>
);

const DepKpi: React.FC<{ label: string; value: string; accent?: string; icon: React.ReactNode }> = ({ label, value, accent = 'text-gray-900', icon }) => (
  <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-[var(--color-warning-light)] flex items-center justify-center text-[var(--color-secondary)] shrink-0">{icon}</div>
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</div>
      <div className={`font-mono text-base font-semibold truncate ${accent}`}>{value}</div>
    </div>
  </div>
);

const DepensesTab: React.FC<{ exp: ExpenseAnalysis | null; loading: boolean; annee: string; setAnnee: (v: string) => void; acctLabel: (c: string) => string }> = ({ exp, loading, annee, setAnnee, acctLabel }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (r: string) => setOpen((s) => { const n = new Set(s); n.has(r) ? n.delete(r) : n.add(r); return n; });
  if (loading && !exp) return <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;
  if (!exp) return null;
  const dispo = exp.budget - exp.total;
  const maxNat = exp.byNature[0]?.total || 1;
  const maxSup = exp.bySupplier[0]?.total || 1;
  const totalSup = exp.bySupplier.reduce((a, b) => a + b.total, 0);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Receipt className="w-5 h-5 text-[var(--color-primary)]" /> Dépenses</h1>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
          {[0, 1, 2, 3].map((d) => { const y = new Date().getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <span className="text-xs text-[var(--color-text-tertiary)]">Charges réelles (classe 6) issues du Grand Livre</span>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DepKpi label="Charges réalisées" value={fmt(exp.total)} icon={<Receipt className="w-5 h-5" />} />
        <DepKpi label="Budget charges" value={exp.budget > 0 ? fmt(exp.budget) : '—'} icon={<Wallet className="w-5 h-5" />} />
        <DepKpi label="Disponible" value={exp.budget > 0 ? fmt(dispo) : '—'} accent={dispo < 0 ? 'text-red-600' : 'text-emerald-600'} icon={<TrendingUp className="w-5 h-5" />} />
        <DepKpi label="Fournisseurs" value={String(exp.bySupplier.length)} icon={<Building2 className="w-5 h-5" />} />
      </div>

      {/* Évolution mensuelle */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-700">Évolution mensuelle des charges · {annee}</h2>
          <span className="text-xs text-[var(--color-text-tertiary)]">Total {fmt(exp.total)}</span>
        </div>
        <MonthlyBars values={exp.byMonth} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Par nature (dépliable jusqu'aux comptes) */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-[var(--color-border)]"><h2 className="text-sm font-medium text-gray-700">Dépenses par nature <span className="text-xs font-normal text-[var(--color-text-tertiary)]">· clic pour déplier les comptes</span></h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Rubrique / Compte</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Montant</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-40">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exp.byNature.map((n) => {
                const isOpen = open.has(n.rubrique);
                return (
                  <React.Fragment key={n.rubrique}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(n.rubrique)}>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1"><ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} /><span className="font-mono font-bold text-[var(--color-primary)]">{n.rubrique}</span> <span className="text-gray-700">{n.label}</span></span></td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(n.total)}</td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><ShareBar ratio={n.total / maxNat} /><span className="text-xs text-gray-400 w-9 text-right">{pct(n.total, exp.total)}%</span></div></td>
                    </tr>
                    {isOpen && n.accounts.map((a) => (
                      <tr key={a.code} className="bg-gray-50/40">
                        <td className="px-4 py-1.5 pl-11"><span className="font-mono text-xs text-gray-500">{a.code}</span> <span className="text-gray-600 text-xs">{acctLabel(a.code)}</span></td>
                        <td className="px-4 py-1.5 text-right text-gray-700">{fmt(a.total)}</td>
                        <td className="px-4 py-1.5 text-xs text-gray-400">{pct(a.total, n.total)}%</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {exp.byNature.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">Aucune charge sur {annee}.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Top fournisseurs */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Top fournisseurs</h2>
            <span className="text-xs text-[var(--color-text-tertiary)]">Σ top {exp.bySupplier.length} : {fmt(totalSup)}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Fournisseur</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Dépense</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-32">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exp.bySupplier.map((s) => (
                <tr key={s.code} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5"><div className="text-gray-900">{s.name}</div><div className="font-mono text-[11px] text-gray-400">{s.code}</div></td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(s.total)}</td>
                  <td className="px-4 py-2.5"><ShareBar ratio={s.total / maxSup} /></td>
                </tr>
              ))}
              {exp.bySupplier.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">Aucun mouvement fournisseur sur {annee}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)]">Par nature & par mois : GL classe 6 (écritures validées). Par fournisseur : contrepartie 40x du tiers (vue <span className="font-mono">v_expense_by_supplier</span>). Budget des charges : version en vigueur.</p>
    </div>
  );
};

// --- Onglet Revenus --------------------------------------------------------

const RevenusTab: React.FC<{ rev: RevenueAnalysis | null; loading: boolean; annee: string; setAnnee: (v: string) => void; acctLabel: (c: string) => string }> = ({ rev, loading, annee, setAnnee, acctLabel }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (r: string) => setOpen((s) => { const n = new Set(s); n.has(r) ? n.delete(r) : n.add(r); return n; });
  if (loading && !rev) return <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;
  if (!rev) return null;
  const ventes = rev.byNature.find((n) => n.rubrique === '70')?.total || 0;
  const autres = rev.total - ventes;
  const maxNat = rev.byNature[0]?.total || 1;
  const maxCli = rev.byClient[0]?.total || 1;
  const totalCli = rev.byClient.reduce((a, b) => a + b.total, 0);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Coins className="w-5 h-5 text-[var(--color-primary)]" /> Revenus</h1>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
          {[0, 1, 2, 3].map((d) => { const y = new Date().getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <span className="text-xs text-[var(--color-text-tertiary)]">Produits réels (classe 7) issus du Grand Livre</span>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DepKpi label="Produits réalisés" value={fmt(rev.total)} icon={<Coins className="w-5 h-5" />} />
        <DepKpi label="Ventes (70)" value={fmt(ventes)} icon={<Banknote className="w-5 h-5" />} />
        <DepKpi label="Autres produits" value={fmt(autres)} icon={<TrendingUp className="w-5 h-5" />} />
        <DepKpi label="Clients" value={String(rev.byClient.length)} icon={<Users className="w-5 h-5" />} />
      </div>

      {/* Évolution mensuelle */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-700">Évolution mensuelle des revenus · {annee}</h2>
          <span className="text-xs text-[var(--color-text-tertiary)]">Total {fmt(rev.total)}</span>
        </div>
        <MonthlyBars values={rev.byMonth} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Par nature (dépliable jusqu'aux comptes) */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-[var(--color-border)]"><h2 className="text-sm font-medium text-gray-700">Revenus par nature <span className="text-xs font-normal text-[var(--color-text-tertiary)]">· clic pour déplier les comptes</span></h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Rubrique / Compte</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Montant</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-40">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rev.byNature.map((n) => {
                const isOpen = open.has(n.rubrique);
                return (
                  <React.Fragment key={n.rubrique}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(n.rubrique)}>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1"><ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} /><span className="font-mono font-bold text-[var(--color-primary)]">{n.rubrique}</span> <span className="text-gray-700">{n.label}</span></span></td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(n.total)}</td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><ShareBar ratio={n.total / maxNat} /><span className="text-xs text-gray-400 w-9 text-right">{pct(n.total, rev.total)}%</span></div></td>
                    </tr>
                    {isOpen && n.accounts.map((a) => (
                      <tr key={a.code} className="bg-gray-50/40">
                        <td className="px-4 py-1.5 pl-11"><span className="font-mono text-xs text-gray-500">{a.code}</span> <span className="text-gray-600 text-xs">{acctLabel(a.code)}</span></td>
                        <td className="px-4 py-1.5 text-right text-gray-700">{fmt(a.total)}</td>
                        <td className="px-4 py-1.5 text-xs text-gray-400">{pct(a.total, n.total)}%</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {rev.byNature.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">Aucun produit sur {annee}.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Top clients */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Top clients</h2>
            <span className="text-xs text-[var(--color-text-tertiary)]">Σ top {rev.byClient.length} : {fmt(totalCli)}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Client</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Revenu</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-32">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rev.byClient.map((c) => (
                <tr key={c.code} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5"><div className="text-gray-900">{c.name}</div><div className="font-mono text-[11px] text-gray-400">{c.code}</div></td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(c.total)}</td>
                  <td className="px-4 py-2.5"><ShareBar ratio={c.total / maxCli} /></td>
                </tr>
              ))}
              {rev.byClient.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">Aucun mouvement client sur {annee}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)]">Par nature & par mois : GL classe 7 (écritures validées). Par client : contrepartie 41x du tiers (vue <span className="font-mono">v_revenue_by_client</span>).</p>
    </div>
  );
};

// --- Onglets Budget & Variance ---------------------------------------------

const GroupBars: React.FC<{ data: { b: number; r: number }[] }> = ({ data }) => {
  const max = Math.max(1, ...data.flatMap((d) => [d.b, d.r]));
  return (
    <div className="flex items-stretch gap-2 h-40 pt-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full">
          <div className="flex-1 w-full flex items-end justify-center gap-0.5">
            <div className="w-1/2 rounded-t bg-[var(--color-border)]" style={{ height: `${Math.max(2, (d.b / max) * 100)}%` }} title={`${MOIS[i]} · Budget ${fmt(d.b)}`} />
            <div className="w-1/2 rounded-t bg-[var(--color-primary)]" style={{ height: `${Math.max(2, (d.r / max) * 100)}%` }} title={`${MOIS[i]} · Réalisé ${fmt(d.r)}`} />
          </div>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">{MOIS_COURT[i]}</span>
        </div>
      ))}
    </div>
  );
};

const TauxBar: React.FC<{ ratio: number }> = ({ ratio }) => {
  const p = Math.max(0, ratio);
  const color = p > 1 ? 'bg-red-500' : p >= 0.9 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, p * 100)}%` }} />
    </div>
  );
};

// Écart coloré. goodWhenNegative : pour les charges (dépenser moins = favorable).
const Ecart: React.FC<{ value: number; goodWhenNegative?: boolean }> = ({ value, goodWhenNegative }) => {
  const favorable = goodWhenNegative ? value <= 0 : value >= 0;
  return <span className={favorable ? 'text-emerald-600' : 'text-red-600'}>{value > 0 ? '+' : ''}{fmt(value)}</span>;
};

const BudgetTab: React.FC<{ bud: BudgetAnalysis | null; loading: boolean; annee: string; setAnnee: (v: string) => void; acctLabel: (c: string) => string }> = ({ bud, loading, annee, setAnnee, acctLabel }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (r: string) => setOpen((s) => { const n = new Set(s); n.has(r) ? n.delete(r) : n.add(r); return n; });
  if (loading && !bud) return <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;
  if (!bud) return null;
  const c = bud.charges;
  if (c.budget === 0) return (
    <div className="rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center text-sm text-[var(--color-text-secondary)]">
      <div className="flex justify-center mb-3 text-neutral-300"><Wallet className="w-8 h-8" /></div>
      Aucune ligne budgétaire sur {annee}. Élaborez ou importez un budget (écran Élaboration) pour activer cet onglet.
    </div>
  );
  const taux = c.budget ? c.realise / c.budget : 0;
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Scale className="w-5 h-5 text-[var(--color-primary)]" /> Budget</h1>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
          {[0, 1, 2, 3].map((d) => { const y = new Date().getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <span className="text-xs text-[var(--color-text-tertiary)]">Consommation du budget de charges (classe 6) · version en vigueur</span>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <DepKpi label="Budget charges" value={fmt(c.budget)} icon={<Scale className="w-5 h-5" />} />
        <DepKpi label="Engagé" value={fmt(c.engage)} icon={<Receipt className="w-5 h-5" />} />
        <DepKpi label="Réalisé" value={fmt(c.realise)} icon={<Wallet className="w-5 h-5" />} accent="text-[var(--color-primary)]" />
        <DepKpi label="Disponible" value={fmt(c.disponible)} icon={<TrendingUp className="w-5 h-5" />} accent={c.disponible < 0 ? 'text-red-600' : 'text-emerald-600'} />
        <DepKpi label="Taux de consommation" value={`${pct(c.realise, c.budget)}%`} icon={<PieChart className="w-5 h-5" />} accent={taux > 1 ? 'text-red-600' : taux >= 0.9 ? 'text-amber-600' : 'text-gray-900'} />
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-700">Budget vs réalisé par mois · charges · {annee}</h2>
          <span className="inline-flex items-center gap-3 text-[11px] text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-[var(--color-border)] inline-block" /> Budget</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-[var(--color-primary)] inline-block" /> Réalisé</span>
          </span>
        </div>
        <GroupBars data={bud.byMonth.map((m) => ({ b: m.budgetCharges, r: m.realiseCharges }))} />
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-[var(--color-border)]"><h2 className="text-sm font-medium text-gray-700">Consommation par rubrique <span className="text-xs font-normal text-[var(--color-text-tertiary)]">· clic pour déplier les comptes</span></h2></div>
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Rubrique / Compte</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budget</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Réalisé</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Disponible</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-44">Taux consommé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bud.byRubriqueCharges.map((n) => {
              const t = n.budget ? n.realise / n.budget : 0;
              const isOpen = open.has(n.rubrique);
              return (
                <React.Fragment key={n.rubrique}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(n.rubrique)}>
                    <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1"><ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} /><span className="font-mono font-bold text-[var(--color-primary)]">{n.rubrique}</span> <span className="text-gray-700">{n.label}</span></span></td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{fmt(n.budget)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(n.realise)}</td>
                    <td className={`px-4 py-2.5 text-right ${n.disponible < 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(n.disponible)}</td>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><TauxBar ratio={t} /><span className="text-xs text-gray-500 w-10 text-right">{pct(n.realise, n.budget)}%</span></div></td>
                  </tr>
                  {isOpen && n.accounts.map((a) => {
                    const at = a.budget ? a.realise / a.budget : 0;
                    return (
                      <tr key={a.code} className="bg-gray-50/40">
                        <td className="px-4 py-1.5 pl-11"><span className="font-mono text-xs text-gray-500">{a.code}</span> <span className="text-gray-600 text-xs">{acctLabel(a.code)}</span></td>
                        <td className="px-4 py-1.5 text-right text-gray-500 text-xs">{fmt(a.budget)}</td>
                        <td className="px-4 py-1.5 text-right text-gray-700 text-xs">{fmt(a.realise)}</td>
                        <td className={`px-4 py-1.5 text-right text-xs ${a.budget - a.realise < 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(a.budget - a.realise)}</td>
                        <td className="px-4 py-1.5 text-xs text-gray-400">{pct(a.realise, a.budget)}%</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-text-tertiary)]">Budget = version en vigueur (<span className="font-mono">v_budget_execution</span>) · Engagé = registre des engagements · Réalisé = GL · Disponible = Budget − Engagé − Réalisé.</p>
    </div>
  );
};

// Table d'écart par rubrique, dépliable jusqu'aux comptes.
const EcartRubriqueTable: React.FC<{ title: string; rows: BudgetLineAgg[]; goodWhenNegative?: boolean; annee: string; acctLabel: (c: string) => string }> = ({ title, rows, goodWhenNegative, annee, acctLabel }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (r: string) => setOpen((s) => { const n = new Set(s); n.has(r) ? n.delete(r) : n.add(r); return n; });
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
      <div className="px-4 py-3 border-b border-[var(--color-border)]"><h2 className="text-sm font-medium text-gray-700">{title} <span className="text-xs font-normal text-[var(--color-text-tertiary)]">· clic pour déplier</span></h2></div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-[var(--color-border)]">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Rubrique / Compte</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budget</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Réalisé</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Écart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((n) => {
            const isOpen = open.has(n.rubrique);
            return (
              <React.Fragment key={n.rubrique}>
                <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(n.rubrique)}>
                  <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1"><ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} /><span className="font-mono font-bold text-[var(--color-primary)]">{n.rubrique}</span> <span className="text-gray-700">{n.label}</span></span></td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmt(n.budget)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(n.realise)}</td>
                  <td className="px-4 py-2.5 text-right font-medium"><Ecart value={n.realise - n.budget} goodWhenNegative={goodWhenNegative} /></td>
                </tr>
                {isOpen && n.accounts.map((a) => (
                  <tr key={a.code} className="bg-gray-50/40 text-xs">
                    <td className="px-4 py-1.5 pl-11"><span className="font-mono text-gray-500">{a.code}</span> <span className="text-gray-600">{acctLabel(a.code)}</span></td>
                    <td className="px-4 py-1.5 text-right text-gray-500">{fmt(a.budget)}</td>
                    <td className="px-4 py-1.5 text-right text-gray-700">{fmt(a.realise)}</td>
                    <td className="px-4 py-1.5 text-right"><Ecart value={a.realise - a.budget} goodWhenNegative={goodWhenNegative} /></td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">Aucun budget sur {annee}.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

const VarianceTab: React.FC<{ bud: BudgetAnalysis | null; loading: boolean; annee: string; setAnnee: (v: string) => void; acctLabel: (c: string) => string }> = ({ bud, loading, annee, setAnnee, acctLabel }) => {
  const [sub, setSub] = useState<'mois' | 'rubrique'>('mois');
  if (loading && !bud) return <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;
  if (!bud) return null;
  if (bud.charges.budget === 0 && bud.produits.budget === 0) return (
    <div className="rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center text-sm text-[var(--color-text-secondary)]">
      <div className="flex justify-center mb-3 text-neutral-300"><GitCompareArrows className="w-8 h-8" /></div>
      Aucun budget sur {annee}. Élaborez ou importez un budget pour l'analyse d'écart.
    </div>
  );
  const ecartCharges = bud.charges.realise - bud.charges.budget;   // >0 = dépassement (défavorable)
  const ecartProduits = bud.produits.realise - bud.produits.budget; // >0 = surperformance (favorable)
  const SUBS: { id: 'mois' | 'rubrique'; label: string }[] = [{ id: 'mois', label: 'Par mois' }, { id: 'rubrique', label: 'Par rubrique' }];
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><GitCompareArrows className="w-5 h-5 text-[var(--color-primary)]" /> Analyse d'écart</h1>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
          {[0, 1, 2, 3].map((d) => { const y = new Date().getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <span className="text-xs text-[var(--color-text-tertiary)]">Écart budget vs réalisé (favorable en vert)</span>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DepKpi label="Écart charges" value={fmt(ecartCharges)} icon={<Receipt className="w-5 h-5" />} accent={ecartCharges <= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <DepKpi label="Écart produits" value={fmt(ecartProduits)} icon={<Coins className="w-5 h-5" />} accent={ecartProduits >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <DepKpi label="Budget charges" value={fmt(bud.charges.budget)} icon={<Scale className="w-5 h-5" />} />
        <DepKpi label="Budget produits" value={fmt(bud.produits.budget)} icon={<Scale className="w-5 h-5" />} />
      </div>

      {/* Sous-onglets */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface-hover)] w-fit">
        {SUBS.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${sub === s.id ? 'bg-white shadow-sm text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-secondary)] hover:text-neutral-800'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {sub === 'mois' ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-[var(--color-border)]"><h2 className="text-sm font-medium text-gray-700">Écart par mois</h2></div>
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Mois</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budget charges</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Réalisé charges</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Écart charges</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budget produits</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Réalisé produits</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Écart produits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bud.byMonth.map((m) => (
                <tr key={m.period} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{MOIS[m.period - 1]}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmt(m.budgetCharges)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(m.realiseCharges)}</td>
                  <td className="px-4 py-2.5 text-right font-medium"><Ecart value={m.realiseCharges - m.budgetCharges} goodWhenNegative /></td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmt(m.budgetProduits)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(m.realiseProduits)}</td>
                  <td className="px-4 py-2.5 text-right font-medium"><Ecart value={m.realiseProduits - m.budgetProduits} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <EcartRubriqueTable title="Écart par rubrique · charges" rows={bud.byRubriqueCharges} goodWhenNegative annee={annee} acctLabel={acctLabel} />
          <EcartRubriqueTable title="Écart par rubrique · produits" rows={bud.byRubriqueProduits} annee={annee} acctLabel={acctLabel} />
        </div>
      )}
      <p className="text-xs text-[var(--color-text-tertiary)]">Écart = Réalisé − Budget. Charges : favorable (vert) si réalisé ≤ budget. Produits : favorable si réalisé ≥ budget. Source : <span className="font-mono">v_budget_execution</span>.</p>
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
