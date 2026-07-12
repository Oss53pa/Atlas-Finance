/**
 * PhysicalInventoryPage — inventaire physique : documents de comptage, saisie
 * des quantités, écarts, validation (→ mouvements 701/702 + régularisation GL).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Plus, Loader2, RefreshCw, X, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import type { DBStockWarehouse, DBStockMaterial } from '../../lib/db';
import { formatCurrency } from '../../utils/formatters';
import {
  listCountDocuments, getCountLines, createCountDocument, saveCount, validateCount,
  COUNT_TYPE_LABELS, type CountDocument, type CountLine,
} from '../../services/stock/inventoryCountService';
import StockModuleGate from './StockModuleGate';

function todayISO() { return new Date().toISOString().slice(0, 10); }

function PhysicalInner() {
  const { adapter } = useData();
  const { user } = useAuth();
  const [docs, setDocs] = useState<CountDocument[]>([]);
  const [warehouses, setWarehouses] = useState<DBStockWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [openDoc, setOpenDoc] = useState<CountDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, w] = await Promise.all([listCountDocuments(adapter), adapter.getAll<DBStockWarehouse>('stockWarehouses')]);
      setDocs(d); setWarehouses(w.filter(x => x.active));
    } finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const whLabel = (id: string) => { const w = warehouses.find(x => x.id === id); return w ? `${w.code} — ${w.name}` : id; };

  if (openDoc) {
    return <CountDetail doc={openDoc} whLabel={whLabel} userId={user?.id}
      onBack={() => { setOpenDoc(null); load(); }} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-[#235A6E]" /> Inventaire physique
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCreateOpen(true)} disabled={!warehouses.length}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            <Plus className="w-4 h-4" /> Nouvel inventaire
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun inventaire. Lancez un comptage avec « Nouvel inventaire ».</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-left text-gray-500">
              <th className="px-4 py-2">N°</th><th className="px-4 py-2">Magasin</th><th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th><th className="px-4 py-2 text-center">Statut</th><th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-600">{d.docNumber}</td>
                  <td className="px-4 py-2">{whLabel(d.warehouseId)}</td>
                  <td className="px-4 py-2 text-gray-500">{d.countDate}</td>
                  <td className="px-4 py-2 text-gray-500">{COUNT_TYPE_LABELS[d.type]}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${d.status === 'valide' ? 'bg-green-100 text-green-700' : d.status === 'annule' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setOpenDoc(d)} className="text-[#235A6E] text-xs hover:underline">Ouvrir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && (
        <CreateModal warehouses={warehouses} userId={user?.id}
          onClose={() => setCreateOpen(false)}
          onCreated={async (doc) => { setCreateOpen(false); await load(); setOpenDoc(doc); }} />
      )}
    </div>
  );
}

function CreateModal({ warehouses, userId, onClose, onCreated }: {
  warehouses: DBStockWarehouse[]; userId?: string; onClose: () => void; onCreated: (d: CountDocument) => void;
}) {
  const { adapter } = useData();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [countDate, setCountDate] = useState(todayISO());
  const [type, setType] = useState<CountDocument['type']>('total');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const doc = await createCountDocument(adapter, { warehouseId, countDate, type, userId });
      toast.success('Inventaire créé — stock théorique figé');
      onCreated(doc);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Nouvel inventaire</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Magasin</label>
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date de comptage</label>
            <input type="date" value={countDate} onChange={e => setCountDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as CountDocument['type'])} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {Object.entries(COUNT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={submit} disabled={saving || !warehouseId} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Créer
          </button>
        </div>
      </div>
    </div>
  );
}

function CountDetail({ doc, whLabel, userId, onBack }: {
  doc: CountDocument; whLabel: (id: string) => string; userId?: string; onBack: () => void;
}) {
  const { adapter } = useData();
  const [lines, setLines] = useState<CountLine[]>([]);
  const [materials, setMaterials] = useState<Record<string, DBStockMaterial>>({});
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const readOnly = doc.status === 'valide' || doc.status === 'annule';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ls, mats] = await Promise.all([getCountLines(adapter, doc.id), adapter.getAll<DBStockMaterial>('stockMaterials')]);
      setLines(ls.sort((a, b) => (materialsCode(mats, a.materialId)).localeCompare(materialsCode(mats, b.materialId))));
      setMaterials(Object.fromEntries(mats.map(m => [m.id, m])));
    } finally { setLoading(false); }
  }, [adapter, doc.id]);
  useEffect(() => { load(); }, [load]);

  const onCount = async (line: CountLine, value: string) => {
    const counted = value === '' ? NaN : Number(value);
    if (Number.isNaN(counted)) return;
    await saveCount(adapter, line, counted);
    setLines(ls => ls.map(l => l.id === line.id ? { ...l, countedQty: counted, varianceQty: counted - l.bookQty, varianceValue: (counted - l.bookQty) * l.unitCost } : l));
  };

  const validate = async () => {
    setValidating(true);
    try {
      const res = await validateCount(adapter, doc.id, userId);
      toast.success(`Inventaire validé — ${res.adjustments} régularisation(s)${res.skippedSerial ? `, ${res.skippedSerial} article(s) sérialisé(s) ignoré(s)` : ''}`);
      onBack();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setValidating(false); }
  };

  const totalVariance = lines.reduce((s, l) => s + (l.varianceValue || 0), 0);
  const counted = lines.filter(l => l.countedQty != null).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"><ArrowLeft className="w-4 h-4" /> Retour</button>
          <h1 className="text-xl font-bold text-gray-900">{doc.docNumber} — {whLabel(doc.warehouseId)}</h1>
          <p className="text-sm text-gray-500">{COUNT_TYPE_LABELS[doc.type]} · {doc.countDate} · <span className="font-medium">{doc.status}</span></p>
        </div>
        {!readOnly && (
          <button onClick={validate} disabled={validating || counted === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Valider l'inventaire
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Lignes" value={`${counted}/${lines.length} comptées`} />
        <Kpi label="Écart valorisé" value={formatCurrency(totalVariance)} alert={Math.abs(totalVariance) > 0} />
        <Kpi label="Statut" value={doc.status} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : lines.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun stock à inventorier dans ce magasin.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b text-left text-gray-500">
                <th className="px-4 py-2">Article</th><th className="px-4 py-2 text-right">Théorique</th>
                <th className="px-4 py-2 text-right">Compté</th><th className="px-4 py-2 text-right">Écart</th>
                <th className="px-4 py-2 text-right">Écart valorisé</th>
              </tr></thead>
              <tbody>
                {lines.map(l => {
                  const m = materials[l.materialId];
                  const variance = l.varianceQty;
                  return (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2">{m ? <span><span className="font-mono text-gray-500">{m.code}</span> — {m.name}</span> : l.materialId}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.bookQty}</td>
                      <td className="px-4 py-2 text-right">
                        {readOnly ? <span className="tabular-nums">{l.countedQty ?? '—'}</span> : (
                          <input type="number" defaultValue={l.countedQty ?? ''} onBlur={e => onCount(l, e.target.value)}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                        )}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${variance ? (variance > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                        {variance != null ? (variance > 0 ? `+${variance}` : variance) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.varianceValue != null ? formatCurrency(l.varianceValue) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function materialsCode(mats: DBStockMaterial[], id: string): string {
  return mats.find(m => m.id === id)?.code || id;
}

function Kpi({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`border rounded-lg p-4 ${alert ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-1 text-gray-900">{value}</p>
    </div>
  );
}

export default function PhysicalInventoryPage() {
  return <StockModuleGate><PhysicalInner /></StockModuleGate>;
}
