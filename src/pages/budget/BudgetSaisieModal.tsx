/**
 * BudgetSaisieModal — Saisie manuelle du budget (action, pas un module).
 * Lancé depuis le Cockpit. Grille éditable compte × 12 mois, écriture réelle
 * (budgetService). Verrouillage respecté (triggers DB).
 */
import React, { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import {
  getActiveFiscalYear, ensureActiveVersion, getActiveBudgetVersion,
  getBudgetLinesWithPeriods, saveBudgetLine, deleteBudgetLine, inferBudgetType, type BudgetLineEdit,
} from '../../features/budget/services/budgetService';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import { Plus, Save, Trash2, Table2, Lock, X } from 'lucide-react';

interface AccountLite { code: string; name: string }

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
type Row = BudgetLineEdit & { _dirty?: boolean; _new?: boolean };

interface Props { open: boolean; onClose: () => void; onSaved?: () => void }

const BudgetSaisieModal: React.FC<Props> = ({ open, onClose, onSaved }) => {
  const { adapter } = useData();
  const { toast } = useToast();
  const [versionId, setVersionId] = useState('');
  const [annee, setAnnee] = useState('');
  const [statut, setStatut] = useState('brouillon');
  const [rows, setRows] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy) { toast.error('Aucun exercice fiscal'); setLoading(false); return; }
      setAnnee(fy.code);
      const vid = await ensureActiveVersion(adapter, fy.id, `Budget ${fy.code}`);
      setVersionId(vid);
      const [v, lignes, accs, secs] = await Promise.all([
        getActiveBudgetVersion(adapter),
        getBudgetLinesWithPeriods(adapter, vid),
        adapter.getAll<any>('accounts'),
        listSections(adapter),
      ]);
      setStatut(v?.statut || 'brouillon');
      setRows(lignes);
      // Comptes budgétables : classes 2 (invest), 6 & 7 (exploitation)
      setAccounts((accs || [])
        .map((a: any) => ({ code: String(a.code || ''), name: String(a.name || a.libelle || '') }))
        .filter(a => /^[267]/.test(a.code))
        .sort((a, b) => a.code.localeCompare(b.code)));
      setSections(secs);
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, adapter]);

  const locked = statut === 'verrouille';
  const addRow = () => setRows(r => [...r, { id: '', budget_type: 'exploitation', account_code: '', section_id: null, periods: {}, _new: true, _dirty: true }]);
  const setCell = (idx: number, key: 'account_code' | 'budget_type', val: string) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: key === 'budget_type' ? (val as any) : val, budget_type: key === 'account_code' ? inferBudgetType(val) : row.budget_type, _dirty: true } : row));
  const setPeriod = (idx: number, p: number, val: string) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, periods: { ...row.periods, [p]: parseFloat(val) || 0 }, _dirty: true } : row));
  const setSection = (idx: number, sectionId: string) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, section_id: sectionId || null, _dirty: true } : row));
  const rowTotal = (row: Row) => Object.values(row.periods).reduce((s, v) => s + (v || 0), 0);
  const accountName = (code: string) => accounts.find(a => a.code === code)?.name || '';

  const saveAll = async () => {
    const dirty = rows.filter(r => r._dirty && r.account_code.trim());
    if (dirty.length === 0) { toast('Rien à enregistrer'); return; }
    setSaving(true);
    try {
      for (const row of dirty) {
        const id = await saveBudgetLine(adapter, versionId, { id: row.id || undefined, budget_type: row.budget_type, account_code: row.account_code, section_id: row.section_id, periods: row.periods });
        row.id = id; row._dirty = false; row._new = false;
      }
      toast.success(`${dirty.length} ligne(s) enregistrée(s)`);
      onSaved?.(); load();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };
  const remove = async (idx: number) => {
    const row = rows[idx];
    if (row.id) { try { await deleteBudgetLine(adapter, row.id); } catch (e: any) { toast.error(e?.message); return; } }
    setRows(r => r.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} containerClassName="max-w-6xl">
      <DialogContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Table2 className="w-5 h-5 text-[var(--color-primary)]" /></div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Saisie du Budget</h3>
              <p className="text-xs text-gray-500">Exercice {annee} {locked && <span className="text-amber-700 inline-flex items-center gap-1"><Lock className="w-3 h-3" />verrouillé</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!locked && <>
              <button onClick={addRow} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Plus className="w-4 h-4" />Ligne</button>
              <button onClick={saveAll} disabled={saving} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"><Save className="w-4 h-4" />{saving ? '…' : 'Enregistrer'}</button>
            </>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {locked && <div className="bg-amber-50 text-amber-800 px-4 py-2 text-xs">Version verrouillée : saisie désactivée (déverrouillez depuis « Versions & Validation »).</div>}

        {/* Autocomplétion des comptes (plan comptable réel, classes 2/6/7) */}
        <datalist id="budget-accounts-list">
          {accounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
        </datalist>

        <div className="overflow-x-auto max-h-[60vh]">
          <table className="text-xs border-collapse min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 w-44">Compte</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 w-24">Type</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 w-40">Section / Centre</th>
                {MOIS.map(m => <th key={m} className="px-1 py-2 text-right font-semibold text-gray-600 w-20">{m}</th>)}
                <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">Total</th>
                <th className="px-1 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={17} className="px-4 py-8 text-center text-gray-400">Chargement…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={17} className="px-4 py-8 text-center text-gray-400">Aucune ligne. Ajoutez-en une.</td></tr>}
              {rows.map((row, idx) => (
                <tr key={row.id || `new-${idx}`} className={row._dirty ? 'bg-amber-50/40' : ''}>
                  <td className="px-2 py-1 sticky left-0 bg-white">
                    <input list="budget-accounts-list" value={row.account_code} disabled={locked} onChange={e => setCell(idx, 'account_code', e.target.value)} placeholder="Compte…" className="w-36 border border-gray-200 rounded px-1.5 py-1 font-mono disabled:bg-gray-50" />
                    {accountName(row.account_code) && <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{accountName(row.account_code)}</div>}
                  </td>
                  <td className="px-2 py-1"><select value={row.budget_type} disabled={locked} onChange={e => setCell(idx, 'budget_type', e.target.value)} className="border border-gray-200 rounded px-1 py-1 disabled:bg-gray-50"><option value="exploitation">Exploit.</option><option value="investissement">Invest.</option></select></td>
                  <td className="px-2 py-1">
                    <select value={row.section_id || ''} disabled={locked} onChange={e => setSection(idx, e.target.value)} className="w-36 border border-gray-200 rounded px-1 py-1 disabled:bg-gray-50">
                      <option value="">— Aucune —</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
                    </select>
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(p => (
                    <td key={p} className="px-0.5 py-1"><input type="number" value={row.periods[p] ?? ''} disabled={locked} onChange={e => setPeriod(idx, p, e.target.value)} className="w-20 border border-gray-200 rounded px-1 py-1 text-right disabled:bg-gray-50" /></td>
                  ))}
                  <td className="px-2 py-1 text-right font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(rowTotal(row))}</td>
                  <td className="px-1 py-1 text-center">{!locked && <button onClick={() => remove(idx)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 px-4 py-2">Compte : tapez pour rechercher dans le plan comptable (classes 2/6/7). Section/Centre : optionnel (gérez-les dans Comptabilité Analytique). Type déduit du compte, modifiable.</p>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetSaisieModal;
