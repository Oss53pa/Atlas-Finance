/**
 * ReportingPage — analyses ABC & rotation du stock (source unique stockReportingService).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { PieChart, Loader2, RefreshCw } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getAbcAnalysis, getRotation, type AbcRow, type RotationRow } from '../../services/stock/stockReportingService';
import StockModuleGate from './StockModuleGate';

const ABC_COLOR: Record<'A' | 'B' | 'C', string> = {
  A: 'bg-[#235A6E] text-white', B: 'bg-amber-400 text-white', C: 'bg-gray-300 text-gray-700',
};

function ReportingInner() {
  const { adapter } = useData();
  const [tab, setTab] = useState<'abc' | 'rotation'>('abc');
  const [abc, setAbc] = useState<AbcRow[]>([]);
  const [rotation, setRotation] = useState<RotationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([getAbcAnalysis(adapter), getRotation(adapter)]);
      setAbc(a); setRotation(r);
    } finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { load(); }, [load]);

  const abcTotals = ['A', 'B', 'C'].map(c => {
    const rows = abc.filter(r => r.abcClass === c);
    return { c, count: rows.length, value: rows.reduce((s, r) => s + r.stockValue, 0) };
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-[#235A6E]" /> Analyses stock
        </h1>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {(['abc', 'rotation'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t === 'abc' ? 'Analyse ABC' : 'Rotation & couverture'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : tab === 'abc' ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {abcTotals.map(t => (
              <div key={t.c} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${ABC_COLOR[t.c as 'A']}`}>{t.c}</span>
                  <span className="text-sm text-gray-500">{t.count} article(s)</span>
                </div>
                <p className="text-lg font-semibold mt-1">{formatCurrency(t.value)}</p>
              </div>
            ))}
          </div>
          <TableCard empty={abc.length === 0} emptyText="Aucun stock valorisé à analyser.">
            <thead><tr className="bg-gray-50 border-b text-left text-gray-500">
              <th className="px-4 py-2">Classe</th><th className="px-4 py-2">Article</th>
              <th className="px-4 py-2 text-right">Valeur</th><th className="px-4 py-2 text-right">% </th>
              <th className="px-4 py-2 text-right">% cumulé</th>
            </tr></thead>
            <tbody>
              {abc.map(r => (
                <tr key={r.material.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${ABC_COLOR[r.abcClass]}`}>{r.abcClass}</span></td>
                  <td className="px-4 py-2"><span className="font-mono text-gray-500">{r.material.code}</span> — {r.material.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.stockValue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{r.sharePct.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-500">{r.cumulativePct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </>
      ) : (
        <TableCard empty={rotation.length === 0} emptyText="Aucune donnée de rotation.">
          <thead><tr className="bg-gray-50 border-b text-left text-gray-500">
            <th className="px-4 py-2">Article</th><th className="px-4 py-2 text-right">Sorties (val.)</th>
            <th className="px-4 py-2 text-right">Stock actuel</th><th className="px-4 py-2 text-right">Rotation</th>
            <th className="px-4 py-2 text-right">Couverture (j)</th>
          </tr></thead>
          <tbody>
            {rotation.map(r => (
              <tr key={r.material.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2"><span className="font-mono text-gray-500">{r.material.code}</span> — {r.material.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.issuedValue)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.currentValue)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.turnover.toFixed(2)}×</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.coverageDays > 0 ? Math.round(r.coverageDays) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}

function TableCard({ empty, emptyText, children }: { empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {empty ? <div className="p-10 text-center text-gray-400 text-sm">{emptyText}</div> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>
      )}
    </div>
  );
}

export default function ReportingPage() {
  return <StockModuleGate><ReportingInner /></StockModuleGate>;
}
