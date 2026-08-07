/**
 * VolumesModal — éditeur volumes × prix d'une ligne de revenus (Lot 4, §14.1).
 * Quantité × prix unitaire par mois ; le montant budgété est recalculé serveur.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { listVolumes, saveVolumesForLine, volumeMontant, type VolumeRow } from '../../features/budget/services/volumesService';
import { X, Loader2, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';


const VolumesModal: React.FC<{ adapter: any; budgetLineId: string; accountCode: string; onClose: () => void; onSaved: () => void }> = ({ adapter, budgetLineId, accountCode, onClose, onSaved }) => {
  const { t } = useLanguage();
  const MOIS = useMemo(() => t('volumesModal.monthsShort').split(','), [t]);
  const [rows, setRows] = useState<Record<number, VolumeRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const v = await listVolumes(adapter, budgetLineId); if (!cancelled) setRows(v); }
      catch (e: any) { if (!cancelled) setError(e?.message || t('volumesModal.error')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, budgetLineId, t]);

  const set = useCallback((m: number, field: 'quantite' | 'prix_unitaire', val: string) => {
    setRows((r) => ({ ...r, [m]: { period: m, quantite: r[m]?.quantite || 0, prix_unitaire: r[m]?.prix_unitaire || 0, [field]: Number(val) || 0 } }));
  }, []);

  const total = useMemo(() => Array.from({ length: 12 }, (_, i) => volumeMontant(rows[i + 1]?.quantite || 0, rows[i + 1]?.prix_unitaire || 0)).reduce((a, b) => a + b, 0), [rows]);

  const save = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const entries: VolumeRow[] = Array.from({ length: 12 }, (_, i) => ({ period: i + 1, quantite: rows[i + 1]?.quantite || 0, prix_unitaire: rows[i + 1]?.prix_unitaire || 0 }));
      await saveVolumesForLine(adapter, budgetLineId, entries);
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message || t('volumesModal.failed')); } finally { setSaving(false); }
  }, [adapter, budgetLineId, rows, onSaved, onClose, t]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{t('volumesModal.title', { account: accountCode })}</h2>
          <button onClick={onClose} className="p-1 text-[var(--color-text-tertiary)] hover:text-neutral-700"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> {t('volumesModal.loading')}</div>
        ) : (
          <div className="p-5">
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase text-[var(--color-text-secondary)]"><th className="text-left py-1">{t('volumesModal.colMonth')}</th><th className="text-right">{t('volumesModal.colQuantity')}</th><th className="text-right">{t('volumesModal.colUnitPrice')}</th><th className="text-right">{t('volumesModal.colAmount')}</th></tr></thead>
              <tbody>
                {MOIS.map((mois, i) => {
                  const m = i + 1; const q = rows[m]?.quantite || 0; const p = rows[m]?.prix_unitaire || 0;
                  return (
                    <tr key={mois} className="border-b border-[var(--color-border-light)]">
                      <td className="py-1 text-[var(--color-text-secondary)]">{mois}</td>
                      <td className="py-1"><input type="number" value={q || ''} onChange={(e) => set(m, 'quantite', e.target.value)} className="w-24 px-2 py-1 text-right rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-xs" /></td>
                      <td className="py-1"><input type="number" value={p || ''} onChange={(e) => set(m, 'prix_unitaire', e.target.value)} className="w-28 px-2 py-1 text-right rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-xs" /></td>
                      <td className="py-1 text-right font-mono text-xs text-[var(--color-primary)] dark:text-[var(--color-primary)]">{formatCurrency(volumeMontant(q, p))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="font-medium"><td colSpan={3} className="py-2 text-right">{t('volumesModal.annualTotal')}</td><td className="py-2 text-right font-mono text-[var(--color-primary)] dark:text-[var(--color-primary)]">{formatCurrency(total)}</td></tr></tfoot>
            </table>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-700">{t('volumesModal.close')}</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('volumesModal.save')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolumesModal;
