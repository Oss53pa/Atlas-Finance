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
import AccountCombobox from '../../components/common/AccountCombobox';
import { useAccountNames } from '../../hooks/useAccountNames';
import {
  getActiveFiscalYear, ensureActiveVersion, getActiveBudgetVersion,
  getBudgetLinesWithPeriods, saveBudgetLine, deleteBudgetLine, inferBudgetType, type BudgetLineEdit,
} from '../../features/budget/services/budgetService';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import { Plus, Save, Trash2, Table2, Lock, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Comptes budgétables : investissement (classe 2) + exploitation (classes 6 & 7). */
const BUDGET_CLASSES = ['2', '6', '7'];
type Row = BudgetLineEdit & { _dirty?: boolean; _new?: boolean };

interface Props { open: boolean; onClose: () => void; onSaved?: () => void }

const BudgetSaisieModal: React.FC<Props> = ({ open, onClose, onSaved }) => {
  const { adapter } = useData();
  const { toast } = useToast();
  const { t } = useLanguage();
  const MOIS = React.useMemo(() => t('budgetEntry.monthsShort').split(','), [t]);
  const [versionId, setVersionId] = useState('');
  const [annee, setAnnee] = useState('');
  const [statut, setStatut] = useState('brouillon');
  const [rows, setRows] = useState<Row[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const { label: accountName } = useAccountNames();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy) { toast.error(t('budgetEntry.noFiscalYear')); setLoading(false); return; }
      setAnnee(fy.code);
      const vid = await ensureActiveVersion(adapter, fy.id, `Budget ${fy.code}`);
      setVersionId(vid);
      const [v, lignes, secs] = await Promise.all([
        getActiveBudgetVersion(adapter),
        getBudgetLinesWithPeriods(adapter, vid),
        listSections(adapter),
      ]);
      setStatut(v?.statut || 'brouillon');
      setRows(lignes);
      setSections(secs);
    } catch (e: any) { toast.error(e?.message || t('budgetEntry.error')); }
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

  const saveAll = async () => {
    const dirty = rows.filter(r => r._dirty && r.account_code.trim());
    if (dirty.length === 0) { toast.info(t('budgetEntry.nothingToSave')); return; }
    setSaving(true);
    try {
      for (const row of dirty) {
        const id = await saveBudgetLine(adapter, versionId, { id: row.id || undefined, budget_type: row.budget_type, account_code: row.account_code, section_id: row.section_id, periods: row.periods });
        row.id = id; row._dirty = false; row._new = false;
      }
      toast.success(t('budgetEntry.linesSaved', { count: String(dirty.length) }));
      onSaved?.(); load();
    } catch (e: any) { toast.error(e?.message || t('budgetEntry.error')); }
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
              <h3 className="text-base font-bold text-gray-900">{t('budgetEntry.title')}</h3>
              <p className="text-xs text-gray-500">{t('budgetEntry.fiscalYear', { year: annee })} {locked && <span className="text-amber-700 inline-flex items-center gap-1"><Lock className="w-3 h-3" />{t('budgetEntry.lockedBadge')}</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!locked && <>
              <button onClick={addRow} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Plus className="w-4 h-4" />{t('budgetEntry.addLine')}</button>
              <button onClick={saveAll} disabled={saving} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"><Save className="w-4 h-4" />{saving ? '…' : t('budgetEntry.save')}</button>
            </>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {locked && <div className="bg-amber-50 text-amber-800 px-4 py-2 text-xs">{t('budgetEntry.lockedNotice')}</div>}

        <div className="overflow-x-auto max-h-[60vh]">
          <table className="text-xs border-collapse min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 w-44">{t('budgetEntry.colAccount')}</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 w-24">{t('budgetEntry.colType')}</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-600 w-40">{t('budgetEntry.colSection')}</th>
                {MOIS.map(m => <th key={m} className="px-1 py-2 text-right font-semibold text-gray-600 w-20">{m}</th>)}
                <th className="px-2 py-2 text-right font-semibold text-gray-600 w-24">{t('budgetEntry.colTotal')}</th>
                <th className="px-1 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={17} className="px-4 py-8 text-center text-gray-400">{t('budgetEntry.loading')}</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={17} className="px-4 py-8 text-center text-gray-400">{t('budgetEntry.emptyRows')}</td></tr>}
              {rows.map((row, idx) => (
                <tr key={row.id || `new-${idx}`} className={row._dirty ? 'bg-amber-50/40' : ''}>
                  <td className="px-2 py-1 sticky left-0 bg-white">
                    <AccountCombobox value={row.account_code} onChange={(code) => setCell(idx, 'account_code', code)}
                      classPrefix={BUDGET_CLASSES} disabled={locked} placeholder={t('budgetEntry.accountPlaceholder')} inputClassName="w-36" />
                    <div className="text-[10px] text-gray-400 truncate max-w-[140px]" title={accountName(row.account_code)}>
                      {row.account_code ? (accountName(row.account_code) || t('budgetEntry.accountOffChart')) : ''}
                    </div>
                  </td>
                  <td className="px-2 py-1"><select value={row.budget_type} disabled={locked} onChange={e => setCell(idx, 'budget_type', e.target.value)} className="border border-gray-200 rounded px-1 py-1 disabled:bg-gray-50"><option value="exploitation">{t('budgetEntry.typeOpex')}</option><option value="investissement">{t('budgetEntry.typeCapex')}</option></select></td>
                  <td className="px-2 py-1">
                    <select value={row.section_id || ''} disabled={locked} onChange={e => setSection(idx, e.target.value)} className="w-36 border border-gray-200 rounded px-1 py-1 disabled:bg-gray-50">
                      <option value="">{t('budgetEntry.sectionNone')}</option>
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
        <p className="text-[11px] text-gray-400 px-4 py-2">{t('budgetEntry.footnote')}</p>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetSaisieModal;
