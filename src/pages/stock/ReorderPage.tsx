/**
 * ReorderPage — réapprovisionnement (MRP-lite) & alertes de stock.
 * Propositions de réappro (point de commande) + alertes rupture / surstock /
 * dormant / péremption. Source unique : reorderService.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { PackageX, Loader2, RefreshCw, TrendingDown, TrendingUp, Clock, CalendarClock, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import { getReorderProposals, getStockAlerts, type ReorderProposal, type StockAlerts } from '../../services/stock/reorderService';
import { generatePurchaseOrders } from '../../services/stock/purchaseOrderService';
import StockModuleGate from './StockModuleGate';

function todayISO2() { return new Date().toISOString().slice(0, 10); }

function todayISO() { return new Date().toISOString().slice(0, 10); }

function ReorderInner() {
  const { adapter } = useData();
  const [proposals, setProposals] = useState<ReorderProposal[]>([]);
  const [alerts, setAlerts] = useState<StockAlerts | null>(null);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, tp] = await Promise.all([
        getReorderProposals(adapter),
        getStockAlerts(adapter, todayISO()),
        adapter.getAll<any>('thirdParties').catch(() => []),
      ]);
      setProposals(p); setAlerts(a);
      setSuppliers(Object.fromEntries((tp as any[]).map(t => [t.id, t.name || t.code || t.id])));
    } finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const supplierName = (id?: string) => (id && suppliers[id]) ? suppliers[id] : (id ? id.slice(0, 8) : '—');

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === proposals.length ? new Set() : new Set(proposals.map(p => p.material.id)));

  const generate = async () => {
    const chosen = proposals.filter(p => selected.has(p.material.id));
    if (chosen.length === 0) { toast.error('Sélectionnez au moins une proposition'); return; }
    setGenerating(true);
    try {
      const res = await generatePurchaseOrders(adapter, chosen, todayISO2());
      const msg = `${res.orders.length} commande(s) fournisseur créée(s) (brouillon)`
        + (res.skippedNoSupplier ? ` — ${res.skippedNoSupplier} article(s) sans fournisseur ignoré(s)` : '');
      res.orders.length ? toast.success(msg) : toast.error(res.skippedNoSupplier ? 'Aucun fournisseur par défaut sur les articles sélectionnés' : msg);
      setSelected(new Set());
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-[#235A6E]" /> Réappro & alertes
        </h1>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {loading || !alerts ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <AlertCard label="Ruptures" value={alerts.stockouts.length} icon={<PackageX className="w-4 h-4" />} tone={alerts.stockouts.length ? 'red' : 'gray'} />
            <AlertCard label="Sous le mini" value={alerts.belowReorder.length} icon={<TrendingDown className="w-4 h-4" />} tone={alerts.belowReorder.length ? 'amber' : 'gray'} />
            <AlertCard label="Surstock" value={alerts.overstock.length} icon={<TrendingUp className="w-4 h-4" />} tone={alerts.overstock.length ? 'amber' : 'gray'} />
            <AlertCard label="Dormants (90j)" value={alerts.dormant.length} icon={<Clock className="w-4 h-4" />} tone={alerts.dormant.length ? 'amber' : 'gray'} />
            <AlertCard label="Péremption <30j" value={alerts.expiring.length} icon={<CalendarClock className="w-4 h-4" />} tone={alerts.expiring.length ? 'red' : 'gray'} />
          </div>

          {/* Propositions de réappro */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Propositions de réapprovisionnement</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{proposals.length} article(s)</span>
                <button onClick={generate} disabled={generating || selected.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  Générer commande(s) ({selected.size})
                </button>
              </div>
            </div>
            {proposals.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Aucun réappro nécessaire (renseignez un point de commande sur les articles).</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b text-left text-gray-500">
                    <th className="px-3 py-2 w-8"><input type="checkbox" checked={selected.size === proposals.length && proposals.length > 0} onChange={toggleAll} /></th>
                    <th className="px-4 py-2">Article</th><th className="px-4 py-2 text-right">Dispo</th>
                    <th className="px-4 py-2 text-right">Pt cmd</th><th className="px-4 py-2 text-right">Maxi</th>
                    <th className="px-4 py-2 text-right">Qté suggérée</th><th className="px-4 py-2">Fournisseur</th>
                    <th className="px-4 py-2 text-right">Délai</th>
                  </tr></thead>
                  <tbody>
                    {proposals.map(p => (
                      <tr key={p.material.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2"><input type="checkbox" checked={selected.has(p.material.id)} onChange={() => toggle(p.material.id)} /></td>
                        <td className="px-4 py-2"><span className="font-mono text-gray-500">{p.material.code}</span> — {p.material.name}</td>
                        <td className={`px-4 py-2 text-right tabular-nums ${p.available <= 0 ? 'text-red-600 font-medium' : ''}`}>{p.available}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-500">{p.reorderPoint}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-500">{p.maxLevel ?? '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#235A6E]">{p.suggestedQty} {p.material.baseUom}</td>
                        <td className="px-4 py-2 text-gray-500">{supplierName(p.supplierId)}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{p.leadTimeDays != null ? `${p.leadTimeDays} j` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Détails alertes secondaires */}
          {(alerts.dormant.length > 0 || alerts.expiring.length > 0 || alerts.overstock.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MiniList title="Articles dormants" items={alerts.dormant.map(d => `${d.material.code} — ${d.material.name}${d.lastMovement ? ` (dernier: ${d.lastMovement})` : ' (jamais mouvementé)'}`)} />
              <MiniList title="Surstock" items={alerts.overstock.map(o => `${o.material.code} — dispo ${o.available} > maxi ${o.maxLevel}`)} />
              <MiniList title="Lots proches péremption" items={alerts.expiring.map(b => `${b.batchNumber} — exp. ${b.expiryDate}`)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'red' | 'amber' | 'gray' }) {
  const cls = tone === 'red' ? 'border-red-300 bg-red-50 text-red-700' : tone === 'amber' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-500';
  return (
    <div className={`border rounded-lg p-3 ${cls}`}>
      <div className="flex items-center gap-1.5 text-xs">{icon}{label}</div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title} ({items.length})</h3>
      {items.length === 0 ? <p className="text-xs text-gray-400">—</p> : (
        <ul className="space-y-1 text-xs text-gray-600 max-h-48 overflow-y-auto">
          {items.map((it, i) => <li key={i} className="truncate">{it}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function ReorderPage() {
  return <StockModuleGate><ReorderInner /></StockModuleGate>;
}
