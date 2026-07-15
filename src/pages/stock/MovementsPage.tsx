/**
 * MovementsPage — saisie des mouvements de stock (entrée / sortie / transfert)
 * et historique des documents. Chaque mouvement valorisé poste au grand livre.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRightLeft, Plus, Loader2, X, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import type { DBStockMaterial, DBStockWarehouse, DBStockMovementType } from '../../lib/db';
import { formatCurrency } from '../../utils/formatters';
import type { MovementLineInput } from '../../services/stock/stockMovementService';
import { submitOrPostMovement } from '../../services/stock/stockApprovalService';
import StockModuleGate from './StockModuleGate';

interface StockDoc { id: string; docNumber: string; docDate: string; movementTypeCode: string; status: string; reference?: string; journalEntryId?: string }

function todayISO() { return new Date().toISOString().slice(0, 10); }

function MovementsInner() {
  const { adapter } = useData();
  const { user } = useAuth();
  const [docs, setDocs] = useState<StockDoc[]>([]);
  const [types, setTypes] = useState<DBStockMovementType[]>([]);
  const [materials, setMaterials] = useState<DBStockMaterial[]>([]);
  const [warehouses, setWarehouses] = useState<DBStockWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t, m, w] = await Promise.all([
        adapter.getAll<StockDoc>('stockDocuments'),
        adapter.getAll<DBStockMovementType>('stockMovementTypes'),
        adapter.getAll<DBStockMaterial>('stockMaterials'),
        adapter.getAll<DBStockWarehouse>('stockWarehouses'),
      ]);
      setDocs(d.sort((a, b) => (b.docNumber || '').localeCompare(a.docNumber || '')));
      setTypes(t.filter(x => x.active).sort((a, b) => a.code.localeCompare(b.code)));
      setMaterials(m.filter(x => x.active));
      setWarehouses(w.filter(x => x.active));
    } finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const typeLabel = (code: string) => types.find(t => t.code === code)?.label || code;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-[#235A6E]" /> Mouvements de stock
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal(true)} disabled={!types.length || !materials.length || !warehouses.length}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            <Plus className="w-4 h-4" /> Nouveau mouvement
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </div>

      {(!materials.length || !warehouses.length) && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          Créez d'abord au moins un article et un magasin pour saisir des mouvements.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun mouvement enregistré.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="px-4 py-2">N° document</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Référence</th>
                  <th className="px-4 py-2 text-center">Statut</th>
                  <th className="px-4 py-2 text-center">GL</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-600">{d.docNumber}</td>
                    <td className="px-4 py-2 text-gray-500">{d.docDate}</td>
                    <td className="px-4 py-2">{d.movementTypeCode} — {typeLabel(d.movementTypeCode)}</td>
                    <td className="px-4 py-2 text-gray-500">{d.reference || '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${d.status === 'posted' ? 'bg-green-100 text-green-700' : d.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-2 text-center">{d.journalEntryId ? <span className="text-green-600 text-xs">✓ écriture</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <MovementModal
          types={types} materials={materials} warehouses={warehouses} userId={user?.id}
          onClose={() => setModal(false)}
          onPosted={async () => { setModal(false); await load(); }}
        />
      )}
    </div>
  );
}

function MovementModal({ types, materials, warehouses, userId, onClose, onPosted }: {
  types: DBStockMovementType[]; materials: DBStockMaterial[]; warehouses: DBStockWarehouse[];
  userId?: string; onClose: () => void; onPosted: () => void;
}) {
  const { adapter } = useData();
  const [typeCode, setTypeCode] = useState(types[0]?.code || '');
  const [date, setDate] = useState(todayISO());
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<MovementLineInput[]>([
    { materialId: materials[0]?.id || '', warehouseId: warehouses[0]?.id || '', quantity: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  const mt = types.find(t => t.code === typeCode);
  const isTransfer = mt?.direction === 'transfer';
  const isIn = mt?.direction === 'in';

  const setLine = (i: number, patch: Partial<MovementLineInput>) =>
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines(ls => [...ls, { materialId: materials[0]?.id || '', warehouseId: warehouses[0]?.id || '', quantity: 1 }]);
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await submitOrPostMovement(adapter, {
        movementTypeCode: typeCode, date, reference: reference || undefined,
        lines: lines.map(l => ({ ...l, quantity: Number(l.quantity), unitCost: l.unitCost != null ? Number(l.unitCost) : undefined })),
      }, userId);
      if (res.applied) {
        toast.success('Mouvement enregistré et comptabilisé');
      } else {
        toast.success(
          `Mouvement de ${res.amount.toLocaleString('fr-FR')} FCFA ≥ seuil — soumis pour validation (voir « Mouvements en attente »)`,
          { duration: 6000 },
        );
      }
      onPosted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">Nouveau mouvement de stock</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type de mouvement</label>
              <select value={typeCode} onChange={e => setTypeCode(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {types.map(t => <option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Référence {mt?.requiresReference ? '*' : ''}</label>
              <input value={reference} onChange={e => setReference(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((l, i) => {
              const mat = materials.find(m => m.id === l.materialId);
              return (
              <div key={i} className="border border-gray-100 rounded-lg p-2 bg-gray-50 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <label className="block text-[10px] text-gray-400 mb-0.5">Article</label>
                  <select value={l.materialId} onChange={e => setLine(i, { materialId: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {materials.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] text-gray-400 mb-0.5">{isTransfer ? 'Magasin source' : 'Magasin'}</label>
                  <select value={l.warehouseId} onChange={e => setLine(i, { warehouseId: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
                  </select>
                </div>
                {isTransfer && (
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Magasin dest.</label>
                    <select value={l.toWarehouseId || ''} onChange={e => setLine(i, { toWarehouseId: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                      <option value="">—</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
                    </select>
                  </div>
                )}
                <div className={isTransfer ? 'col-span-1' : 'col-span-2'}>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Qté</label>
                  <input type="number" value={l.quantity} onChange={e => setLine(i, { quantity: Number(e.target.value) })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                {isIn && (
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Coût unit.</label>
                    <input type="number" value={l.unitCost ?? ''} onChange={e => setLine(i, { unitCost: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                  </div>
                )}
                <div className="col-span-1 flex justify-end">
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              {mat?.batchManaged && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">N° de lot *</label>
                    <input value={l.batchNumber ?? ''} onChange={e => setLine(i, { batchNumber: e.target.value })} placeholder="LOT-…" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                  </div>
                  {isIn && (
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Péremption</label>
                      <input type="date" value={l.expiryDate ?? ''} onChange={e => setLine(i, { expiryDate: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                  )}
                </div>
              )}
              {mat?.serialManaged && (
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">N° de série ({(l.serialNumbers?.filter(Boolean).length) || 0}/{l.quantity}) — un par ligne</label>
                  <textarea rows={Math.min(4, Math.max(2, l.quantity))}
                    value={(l.serialNumbers ?? []).join('\n')}
                    onChange={e => setLine(i, { serialNumbers: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                    placeholder="SN-0001&#10;SN-0002" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono" />
                </div>
              )}
              </div>
            );})}
            <button onClick={addLine} className="flex items-center gap-1 px-2 py-1 text-xs text-[#235A6E] hover:bg-gray-50 rounded">
              <Plus className="w-3 h-3" /> Ajouter une ligne
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer & comptabiliser
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MovementsPage() {
  return <StockModuleGate><MovementsInner /></StockModuleGate>;
}
