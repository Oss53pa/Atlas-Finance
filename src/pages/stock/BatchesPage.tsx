/**
 * BatchesPage — consultation des lots (péremption/qualité) et des n° de série.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Layers, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import type { DBStockMaterial } from '../../lib/db';
import {
  listBatches, listSerials, setBatchQuality, expiringBatches,
  QUALITY_LABELS, SERIAL_STATUS_LABELS, type StockBatch, type StockSerial,
} from '../../services/stock/batchSerialService';
import StockModuleGate from './StockModuleGate';

function todayISO() { return new Date().toISOString().slice(0, 10); }

function BatchesInner() {
  const { adapter } = useData();
  const [tab, setTab] = useState<'batches' | 'serials'>('batches');
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [serials, setSerials] = useState<StockSerial[]>([]);
  const [materials, setMaterials] = useState<Record<string, DBStockMaterial>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s, mats] = await Promise.all([
        listBatches(adapter), listSerials(adapter),
        adapter.getAll<DBStockMaterial>('stockMaterials'),
      ]);
      setBatches(b); setSerials(s);
      setMaterials(Object.fromEntries(mats.map(m => [m.id, m])));
    } finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const matLabel = (id: string) => materials[id] ? `${materials[id].code} — ${materials[id].name}` : id;
  const expiring = new Set(expiringBatches(batches, todayISO(), 30).map(b => b.id));

  const changeQuality = async (id: string, q: StockBatch['qualityStatus']) => {
    try { await setBatchQuality(adapter, id, q); await load(); toast.success('Statut qualité mis à jour'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-[#235A6E]" /> Lots & numéros de série
        </h1>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {(['batches', 'serials'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t === 'batches' ? `Lots (${batches.length})` : `N° série (${serials.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : tab === 'batches' ? (
          batches.length === 0 ? <Empty text="Aucun lot. Les lots sont créés à la réception d'articles gérés par lot." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="px-4 py-2">Lot</th><th className="px-4 py-2">Article</th>
                  <th className="px-4 py-2">Péremption</th><th className="px-4 py-2">Qualité</th>
                </tr></thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-600">{b.batchNumber}</td>
                      <td className="px-4 py-2">{matLabel(b.materialId)}</td>
                      <td className="px-4 py-2">
                        {b.expiryDate ? (
                          <span className={expiring.has(b.id) ? 'text-red-600 font-medium flex items-center gap-1' : 'text-gray-500'}>
                            {expiring.has(b.id) && <AlertTriangle className="w-3.5 h-3.5" />}{b.expiryDate}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <select value={b.qualityStatus} onChange={e => changeQuality(b.id, e.target.value as StockBatch['qualityStatus'])}
                          className="border border-gray-300 rounded px-2 py-1 text-xs">
                          {Object.entries(QUALITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          serials.length === 0 ? <Empty text="Aucun n° de série. Ils sont créés à la réception d'articles gérés par n° de série." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="px-4 py-2">N° série</th><th className="px-4 py-2">Article</th><th className="px-4 py-2">Statut</th>
                </tr></thead>
                <tbody>
                  {serials.map(s => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-600">{s.serialNumber}</td>
                      <td className="px-4 py-2">{matLabel(s.materialId)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'en_stock' ? 'bg-green-100 text-green-700' : s.status === 'sorti' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                          {SERIAL_STATUS_LABELS[s.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-10 text-center text-gray-400 text-sm">{text}</div>;
}

export default function BatchesPage() {
  return <StockModuleGate><BatchesInner /></StockModuleGate>;
}
