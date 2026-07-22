/**
 * BudgetTablePage — Sous-module « Table & Import » du module Budget.
 *
 * Deux sous-onglets :
 *   • Table  : lignes budgétaires (Compte × Cost center) avec Budgété / Réel /
 *              Écart, filtrables (année, cost center, type, mois, recherche), en
 *              vue Synthèse ou Mensuel (12 mois). Source = v_budget_vs_actual.
 *   • Import : interface d'import Excel/CSV (BudgetImportPanel mutualisé).
 *
 * Aucune écriture directe Supabase ici : tout passe par budgetService (adapter).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import DataTable, { type Column } from '../../components/ui/DataTable';
import BudgetImportPanel from '../budget/BudgetImportPanel';
import { getBudgetVsActual, type BudgetVsActualRow } from '../../features/budget/services/budgetService';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import { Table2, Upload, RefreshCw, LayoutList, CalendarDays } from 'lucide-react';

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const NO_SECTION = '__none__';

type SubTab = 'table' | 'import';
type ViewMode = 'synthese' | 'mensuel';

interface SyntheseRow extends Record<string, unknown> {
  key: string; account_code: string; account_label: string; section: string;
  type: string; budget: number; realise: number; ecart: number; ecart_pct: number | null;
}
interface MensuelRow extends Record<string, unknown> {
  key: string; account_code: string; account_label: string; section: string; type: string;
  m1: number; m2: number; m3: number; m4: number; m5: number; m6: number;
  m7: number; m8: number; m9: number; m10: number; m11: number; m12: number; total: number;
}

const fmt = (n: number) => formatCurrency(n);

const BudgetTablePage: React.FC = () => {
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();

  const [subTab, setSubTab] = useState<SubTab>('table');
  const [view, setView] = useState<ViewMode>('synthese');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BudgetVsActualRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Filtres
  const [annee, setAnnee] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('all'); // 'all' | NO_SECTION | id
  const [type, setType] = useState<'all' | 'exploitation' | 'investissement'>('all');
  const [mois, setMois] = useState<'all' | number>('all');
  const [search, setSearch] = useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [bva, secs] = await Promise.all([getBudgetVsActual(adapter), listSections(adapter)]);
      setRows(bva);
      setSections(secs);
      // Année par défaut = la plus récente présente dans les données
      const annees = Array.from(new Set(bva.map(r => r.annee).filter(Boolean))).sort();
      setAnnee(prev => prev || (annees.length ? annees[annees.length - 1] : ''));
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  // Référentiels dérivés
  const annees = useMemo(
    () => Array.from(new Set(rows.map(r => r.annee).filter(Boolean))).sort(),
    [rows],
  );
  const sectionLabel = useMemo(() => {
    const m = new Map<string, string>();
    sections.forEach(s => m.set(s.id, `${s.code} — ${s.libelle}`));
    return m;
  }, [sections]);
  // Sections réellement présentes dans le budget (id → label), pour le filtre
  const sectionsInData = useMemo(() => {
    const ids = new Set<string>();
    let hasNone = false;
    rows.forEach(r => { if (r.section_id) ids.add(r.section_id); else hasNone = true; });
    const list = Array.from(ids).map(id => ({ id, label: sectionLabel.get(id) || id }));
    list.sort((a, b) => a.label.localeCompare(b.label));
    return { list, hasNone };
  }, [rows, sectionLabel]);

  // Lignes filtrées au niveau période (année / type / cost center / recherche)
  const filteredPeriodRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (annee && r.annee !== annee) return false;
      if (type !== 'all' && r.budget_type !== type) return false;
      if (sectionId === NO_SECTION) { if (r.section_id) return false; }
      else if (sectionId !== 'all') { if (r.section_id !== sectionId) return false; }
      if (q) {
        const label = fmtAccount(r.account_code).toLowerCase();
        if (!label.includes(q) && !r.account_code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, annee, type, sectionId, search, fmtAccount]);

  // Agrégat Synthèse : 1 ligne par (compte × section), respecte le filtre Mois
  const syntheseRows = useMemo<SyntheseRow[]>(() => {
    const map = new Map<string, SyntheseRow>();
    for (const r of filteredPeriodRows) {
      if (mois !== 'all' && r.period !== mois) continue;
      const key = `${r.account_code}__${r.section_id ?? ''}`;
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          account_code: r.account_code,
          account_label: fmtAccount(r.account_code),
          section: r.section_id ? (sectionLabel.get(r.section_id) || r.section_id) : '—',
          type: r.budget_type,
          budget: 0, realise: 0, ecart: 0, ecart_pct: null,
        };
        map.set(key, row);
      }
      row.budget += r.budget;
      row.realise += r.realise;
    }
    const out = Array.from(map.values());
    out.forEach(r => {
      r.ecart = r.budget - r.realise;
      r.ecart_pct = r.budget ? (r.ecart / r.budget) * 100 : null;
    });
    out.sort((a, b) => a.account_code.localeCompare(b.account_code));
    return out;
  }, [filteredPeriodRows, mois, fmtAccount, sectionLabel]);

  // Agrégat Mensuel : 1 ligne par (compte × section), budget ventilé sur 12 mois
  const mensuelRows = useMemo<MensuelRow[]>(() => {
    const map = new Map<string, MensuelRow>();
    for (const r of filteredPeriodRows) {
      const key = `${r.account_code}__${r.section_id ?? ''}`;
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          account_code: r.account_code,
          account_label: fmtAccount(r.account_code),
          section: r.section_id ? (sectionLabel.get(r.section_id) || r.section_id) : '—',
          type: r.budget_type,
          m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, total: 0,
        };
        map.set(key, row);
      }
      if (r.period >= 1 && r.period <= 12) {
        (row as any)[`m${r.period}`] += r.budget;
        row.total += r.budget;
      }
    }
    const out = Array.from(map.values());
    out.sort((a, b) => a.account_code.localeCompare(b.account_code));
    return out;
  }, [filteredPeriodRows, fmtAccount, sectionLabel]);

  const totals = useMemo(() => {
    const budget = syntheseRows.reduce((s, r) => s + r.budget, 0);
    const realise = syntheseRows.reduce((s, r) => s + r.realise, 0);
    return { budget, realise, ecart: budget - realise, count: syntheseRows.length };
  }, [syntheseRows]);

  const syntheseColumns: Column<SyntheseRow>[] = [
    { key: 'account_code', label: 'Compte', sortable: true, render: r => <span className="font-mono text-xs">{r.account_code}</span> },
    { key: 'account_label', label: 'Libellé', sortable: true },
    { key: 'section', label: 'Cost center', sortable: true },
    { key: 'type', label: 'Type', sortable: true, render: r => <span className="capitalize">{r.type}</span> },
    { key: 'budget', label: 'Budgété', sortable: true, align: 'right', render: r => fmt(r.budget) },
    { key: 'realise', label: 'Réel', sortable: true, align: 'right', render: r => fmt(r.realise) },
    { key: 'ecart', label: 'Écart', sortable: true, align: 'right', render: r => <span className={r.ecart < 0 ? 'text-red-600' : 'text-green-600'}>{fmt(r.ecart)}</span> },
    { key: 'ecart_pct', label: 'Écart %', align: 'right', render: r => r.ecart_pct == null ? '—' : `${r.ecart_pct.toFixed(1)}%` },
  ];

  const mensuelColumns: Column<MensuelRow>[] = [
    { key: 'account_code', label: 'Compte', sortable: true, render: r => <span className="font-mono text-xs">{r.account_code}</span> },
    { key: 'section', label: 'Cost center', sortable: true },
    ...MONTHS_SHORT.map((m, i) => ({
      key: `m${i + 1}`, label: m, align: 'right' as const,
      render: (r: MensuelRow) => { const v = r[`m${i + 1}`] as number; return v ? fmt(v) : '—'; },
    })),
    { key: 'total', label: 'Total', sortable: true, align: 'right', render: r => <span className="font-semibold">{fmt(r.total)}</span> },
  ];

  const selectCls = 'border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm bg-[var(--color-surface)]';

  return (
    <div className="space-y-4">
      {/* Sous-onglets Table / Import */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {([['table', 'Table budgétaire', Table2], ['import', 'Import', Upload]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === id
                ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {subTab === 'import' && (
        <div className="max-w-3xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <BudgetImportPanel onImported={load} />
        </div>
      )}

      {subTab === 'table' && (
        <>
          {/* KPI totaux */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Lignes', value: formatNumber(totals.count) },
              { label: 'Budgété', value: fmt(totals.budget) },
              { label: 'Réel', value: fmt(totals.realise) },
              { label: 'Écart', value: fmt(totals.ecart), red: totals.ecart < 0 },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">{k.label}</p>
                <p className={`text-lg font-bold ${k.red ? 'text-red-600' : 'text-[var(--color-text-primary)]'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Barre de filtres */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un compte…"
              className={`${selectCls} min-w-[200px] flex-1`}
            />
            <select value={annee} onChange={e => setAnnee(e.target.value)} className={selectCls} title="Année / exercice">
              {annees.length === 0 && <option value="">— Année —</option>}
              {annees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} className={selectCls} title="Cost center">
              <option value="all">Tous les cost centers</option>
              {sectionsInData.list.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              {sectionsInData.hasNone && <option value={NO_SECTION}>Sans cost center</option>}
            </select>
            <select value={type} onChange={e => setType(e.target.value as any)} className={selectCls} title="Type de budget">
              <option value="all">Tous types</option>
              <option value="exploitation">Exploitation</option>
              <option value="investissement">Investissement</option>
            </select>
            <select
              value={mois}
              onChange={e => setMois(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className={selectCls}
              title="Mois"
              disabled={view === 'mensuel'}
            >
              <option value="all">Toute l'année</option>
              {MONTHS_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>

            {/* Bascule de vue */}
            <div className="ml-auto flex items-center rounded-lg border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setView('synthese')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === 'synthese' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'}`}
              ><LayoutList className="w-4 h-4" />Synthèse</button>
              <button
                onClick={() => setView('mensuel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === 'mensuel' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'}`}
              ><CalendarDays className="w-4 h-4" />Mensuel</button>
            </div>
            <button onClick={load} className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]" title="Actualiser">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          {view === 'synthese' ? (
            <DataTable<SyntheseRow>
              columns={syntheseColumns}
              data={syntheseRows}
              loading={loading}
              searchable={false}
              showColumnFilter={false}
              exportable
              pageSize={25}
              emptyMessage="Aucune ligne budgétaire. Importez un budget via l'onglet « Import »."
            />
          ) : (
            <DataTable<MensuelRow>
              columns={mensuelColumns}
              data={mensuelRows}
              loading={loading}
              searchable={false}
              showColumnFilter={false}
              exportable
              pageSize={25}
              emptyMessage="Aucune ligne budgétaire. Importez un budget via l'onglet « Import »."
            />
          )}
        </>
      )}
    </div>
  );
};

export default BudgetTablePage;
