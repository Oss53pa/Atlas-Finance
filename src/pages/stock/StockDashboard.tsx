/**
 * StockDashboard — vue d'ensemble du module Stock (KPIs + stock par article).
 * Source unique : stockDashboardService (quants + articles). États vides honnêtes.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, RefreshCw, Loader2, AlertTriangle, PackageX, TrendingDown, Warehouse, Plus,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getStockKpis, getMaterialStockRows, type StockKpis, type MaterialStockRow } from '../../services/stock/stockDashboardService';
import { MATERIAL_TYPE_LABELS } from '../../services/stock/materialService';
import StockModuleGate from './StockModuleGate';

function StockDashboardInner() {
  const { adapter } = useData();
  const [kpis, setKpis] = useState<StockKpis | null>(null);
  const [rows, setRows] = useState<MaterialStockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, r] = await Promise.all([getStockKpis(adapter), getMaterialStockRows(adapter)]);
      setKpis(k);
      setRows(r.sort((a, b) => b.value - a.value));
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Boxes className="w-6 h-6 text-[#235A6E]" /> Stocks — Tableau de bord
        </h1>
        <div className="flex items-center gap-2">
          <Link to="/stock/materials" className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b]">
            <Plus className="w-4 h-4" /> Nouvel article
          </Link>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Chargement…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Valeur du stock" value={kpis ? formatCurrency(kpis.totalValue) : '—'} icon={<Boxes className="w-5 h-5" />} />
            <Kpi label="Articles" value={kpis ? String(kpis.materialsCount) : '—'} sub={kpis ? `${kpis.activeMaterials} actifs` : undefined} icon={<Warehouse className="w-5 h-5" />} />
            <Kpi label="Ruptures" value={kpis ? String(kpis.stockouts) : '—'} alert={!!kpis && kpis.stockouts > 0} icon={<PackageX className="w-5 h-5" />} />
            <Kpi label="Sous le point de commande" value={kpis ? String(kpis.belowReorder) : '—'} alert={!!kpis && kpis.belowReorder > 0} icon={<TrendingDown className="w-5 h-5" />} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Stock par article</h2>
              <span className="text-xs text-gray-400">{rows.length} article(s)</span>
            </div>
            {rows.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                Aucun article. Créez votre référentiel via <Link to="/stock/materials" className="text-[#235A6E] underline">Articles</Link>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-left text-gray-500">
                      <th className="px-4 py-2">Code</th>
                      <th className="px-4 py-2">Désignation</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2 text-right">Quantité</th>
                      <th className="px-4 py-2 text-right">Valeur</th>
                      <th className="px-4 py-2 text-center">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.material.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-600">{r.material.code}</td>
                        <td className="px-4 py-2">{r.material.name}</td>
                        <td className="px-4 py-2 text-gray-500">{MATERIAL_TYPE_LABELS[r.material.materialType]}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{r.quantity.toLocaleString('fr-FR')} {r.material.baseUom}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.value)}</td>
                        <td className="px-4 py-2 text-center">
                          {r.stockout ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" /> Rupture</span>
                          ) : r.belowReorder ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">Sous mini</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon, alert }: { label: string; value: string; sub?: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`border rounded-lg p-4 ${alert ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between text-gray-400">
        <span className="text-sm text-gray-500">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-semibold mt-1 text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StockDashboard() {
  return <StockModuleGate><StockDashboardInner /></StockModuleGate>;
}
