/**
 * BudgetSaisiePage — /budget/saisie (CDC V3 §2 · saisie manuelle ligne à ligne).
 * Grille éditable : compte × 12 mois, ajout/suppression de lignes, écriture
 * réelle (budget_lines + budget_line_periods). Verrouillage respecté (triggers).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import {
  getActiveFiscalYear, ensureActiveVersion, getActiveBudgetVersion,
  getBudgetLinesWithPeriods, saveBudgetLine, deleteBudgetLine,
  inferBudgetType, type BudgetLineEdit,
} from '../../features/budget/services/budgetService';
import { ArrowLeft, Plus, Save, Trash2, Table2, Lock } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

type Row = BudgetLineEdit & { _dirty?: boolean; _new?: boolean };

const BudgetSaisiePage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [versionId, setVersionId] = useState<string>('');
  const [annee, setAnnee] = useState('');
  const [statut, setStatut] = useState<string>('brouillon');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy) { toast.error('Aucun exercice fiscal'); setLoading(false); return; }
      setAnnee(fy.code);
      const vid = await ensureActiveVersion(adapter, fy.id, `Budget ${fy.code}`);
      setVersionId(vid);
      const v = await getActiveBudgetVersion(adapter);
      setStatut(v?.statut || 'brouillon');
      setRows(await getBudgetLinesWithPeriods(adapter, vid));
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const locked = statut === 'verrouille';

  const addRow = () => setRows(r => [...r, { id: '', budget_type: 'exploitation', account_code: '', section_id: null, periods: {}, _new: true, _dirty: true }]);
  const setCell = (idx: number, key: 'account_code' | 'budget_type', val: string) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: key === 'budget_type' ? (val as any) : val, budget_type: key === 'account_code' ? inferBudgetType(val) : row.budget_type, _dirty: true } : row));
  const setPeriod = (idx: number, p: number, val: string) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, periods: { ...row.periods, [p]: parseFloat(val) || 0 }, _dirty: true } : row));

  const rowTotal = (row: Row) => Object.values(row.periods).reduce((s, v) => s + (v || 0), 0);

  const saveAll = async () => {
    const dirty = rows.filter(r => r._dirty && r.account_code.trim());
    if (dirty.length === 0) { toast('Rien à enregistrer'); return; }
    setSaving(true);
    try {
      for (const row of dirty) {
        const id = await saveBudgetLine(adapter, versionId, {
          id: row.id || undefined, budget_type: row.budget_type, account_code: row.account_code, section_id: row.section_id, periods: row.periods,
        });
        row.id = id; row._dirty = false; row._new = false;
      }
      toast.success(`${dirty.length} ligne(s) enregistrée(s)`);
      load();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const remove = async (idx: number) => {
    const row = rows[idx];
    if (row.id) { try { await deleteBudgetLine(adapter, row.id); } catch (e: any) { toast.error(e?.message); return; } }
    setRows(r => r.filter((_, i) => i !== idx));
  };

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement…</div>;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-4">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Table2 className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Saisie du Budget</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Exercice {annee} · version active {locked && <span className="text-amber-700 inline-flex items-center gap-1"><Lock className="w-3 h-3" />verrouillée</span>}</p>
        </div>
        {!locked && (
          <>
            <button onClick={addRow} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-1"><Plus className="w-4 h-4" />Ligne</button>
            <button onClick={saveAll} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        )}
      </div>

      {locked && <div className="bg-amber-50 text-amber-800 rounded-lg px-4 py-2 text-xs">Version verrouillée : la saisie est désactivée. Déverrouillez-la depuis « Versions & Validation ».</div>}

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
        <table className="text-xs border-collapse min-w-[1000px]">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 w-28">Compte</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-24">Type</th>
              {MOIS.map(m => <th key={m} className="px-1 py-2 text-right font-semibold text-gray-600 w-20">{m}</th>)}
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">Total</th>
              <th className="px-1 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && <tr><td colSpan={16} className="px-4 py-10 text-center text-gray-400">Aucune ligne. Ajoutez-en une ou importez un budget.</td></tr>}
            {rows.map((row, idx) => (
              <tr key={row.id || `new-${idx}`} className={row._dirty ? 'bg-amber-50/40' : ''}>
                <td className="px-2 py-1 sticky left-0 bg-white">
                  <input value={row.account_code} disabled={locked} onChange={e => setCell(idx, 'account_code', e.target.value)} placeholder="601100" className="w-24 border border-gray-200 rounded px-1.5 py-1 font-mono disabled:bg-gray-50" />
                </td>
                <td className="px-2 py-1">
                  <select value={row.budget_type} disabled={locked} onChange={e => setCell(idx, 'budget_type', e.target.value)} className="w-22 border border-gray-200 rounded px-1 py-1 disabled:bg-gray-50">
                    <option value="exploitation">Exploit.</option>
                    <option value="investissement">Invest.</option>
                  </select>
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(p => (
                  <td key={p} className="px-0.5 py-1">
                    <input type="number" value={row.periods[p] ?? ''} disabled={locked} onChange={e => setPeriod(idx, p, e.target.value)} className="w-20 border border-gray-200 rounded px-1 py-1 text-right disabled:bg-gray-50" />
                  </td>
                ))}
                <td className="px-2 py-1 text-right font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(rowTotal(row))}</td>
                <td className="px-1 py-1 text-center">
                  {!locked && <button onClick={() => remove(idx)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">Le type est déduit du compte (classe 2 = investissement) mais reste modifiable. Les lignes modifiées sont surlignées jusqu'à enregistrement.</p>
    </div>
  );
};

export default BudgetSaisiePage;
