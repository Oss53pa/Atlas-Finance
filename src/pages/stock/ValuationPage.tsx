/**
 * ValuationPage — valorisation du stock (CUMP / FIFO) à date.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Calculator, Loader2, RefreshCw } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getMaterialStockRows, type MaterialStockRow } from '../../services/stock/stockDashboardService';
import { MATERIAL_TYPE_LABELS } from '../../services/stock/materialService';
import StockModuleGate from './StockModuleGate';

function ValuationInner() {
  const { adapter } = useData();
  const [rows, setRows] = useState<MaterialStockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await getMaterialStockRows(adapter)).sort((a, b) => b.value - a.value)); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-[#235A6E]" /> Valorisation du stock
        </h1>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">Valeur totale du stock</span>
        <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun article valorisé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Désignation</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Méthode</th>
                  <th className="px-4 py-2 text-right">Quantité</th>
                  <th className="px-4 py-2 text-right">Coût unitaire</th>
                  <th className="px-4 py-2 text-right">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const unit = r.quantity > 0 ? r.value / r.quantity : (r.material.movingAvgCost || 0);
                  return (
                    <tr key={r.material.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-600">{r.material.code}</td>
                      <td className="px-4 py-2">{r.material.name}</td>
                      <td className="px-4 py-2 text-gray-500">{MATERIAL_TYPE_LABELS[r.material.materialType]}</td>
                      <td className="px-4 py-2"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{r.material.valuationMethod}</span></td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.quantity.toLocaleString('fr-FR')} {r.material.baseUom}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(unit)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">{formatCurrency(r.value)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-4 py-2" colSpan={6}>Total</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ValuationPage() {
  return <StockModuleGate><ValuationInner /></StockModuleGate>;
}
