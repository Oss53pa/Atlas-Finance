/**
 * GlSetupPage — détermination comptable des mouvements de stock (OBYC-like).
 * Édition des comptes SYSCOHADA par classe de valorisation × clé de transaction.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Settings, Loader2, Save, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import type { DBStockGlDetermination } from '../../lib/db';
import { listDeterminations, updateDetermination } from '../../services/stock/glDeterminationService';
import { getAccountLabel } from '../../utils/accountLabels';
import StockModuleGate from './StockModuleGate';

const KEY_HELP: Record<string, string> = {
  BSX: 'Compte de stock (bilan, classe 3)',
  GBB: 'Contrepartie de sortie / consommation (charge)',
  WRX: 'Réception non facturée (GR/IR, ex. 408)',
  PRD: 'Écart de prix',
  UMB: 'Écart d\'inventaire (± 6031 / 758)',
};

function GlSetupInner() {
  const { adapter } = useData();
  const [rows, setRows] = useState<DBStockGlDetermination[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, Partial<DBStockGlDetermination>>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await listDeterminations(adapter)); setDirty({}); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const edit = (id: string, field: 'debitAccount' | 'creditAccount', value: string) => {
    setDirty(d => ({ ...d, [id]: { ...d[id], [field]: value } }));
  };
  const valueOf = (r: DBStockGlDetermination, field: 'debitAccount' | 'creditAccount') =>
    dirty[r.id]?.[field] ?? r[field] ?? '';

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [id, patch] of Object.entries(dirty)) {
        await updateDetermination(adapter, id, patch);
      }
      toast.success('Détermination comptable enregistrée');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setSaving(false); }
  };

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#235A6E]" /> Détermination comptable — Stock
        </h1>
        <button onClick={saveAll} disabled={!hasDirty || saving}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        Ces comptes pilotent l'écriture générée à chaque mouvement de stock. BSX = compte de stock ;
        GBB = contrepartie de sortie ; WRX = réception non facturée ; UMB = écart d'inventaire.
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Aucune détermination. Activez le module (l'activation seede les valeurs SYSCOHADA par défaut).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="px-4 py-2">Classe</th>
                  <th className="px-4 py-2">Clé</th>
                  <th className="px-4 py-2">Compte débit</th>
                  <th className="px-4 py-2">Compte crédit</th>
                  <th className="px-4 py-2">Rôle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-gray-600">{r.valuationClass}</td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{r.transactionKey}</span></td>
                    <td className="px-4 py-2">
                      <AccountInput value={valueOf(r, 'debitAccount')} onChange={v => edit(r.id, 'debitAccount', v)} />
                    </td>
                    <td className="px-4 py-2">
                      <AccountInput value={valueOf(r, 'creditAccount')} onChange={v => edit(r.id, 'creditAccount', v)} />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">{KEY_HELP[r.transactionKey]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const label = value ? getAccountLabel(value) : '';
  return (
    <div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="—"
        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm font-mono" />
      {label && label !== value && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[8rem]">{label}</p>}
    </div>
  );
}

export default function GlSetupPage() {
  return <StockModuleGate><GlSetupInner /></StockModuleGate>;
}
