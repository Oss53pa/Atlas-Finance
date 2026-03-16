/**
 * Table Block Renderer — Connected to live Atlas Finance data via useTableData
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTableData } from '../../hooks/useBlockData';
import type { TableBlock, TableColumn } from '../../types';

function formatCell(value: string | number | null, format?: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' FCFA';
    case 'percent':
      return value.toFixed(1) + '%';
    case 'number':
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
    default:
      return String(value);
  }
}

const TableBlockRenderer: React.FC<{ block: TableBlock }> = ({ block }) => {
  const { data: liveData, loading } = useTableData(block.source, block.periodOverride);

  // Use live data if available, otherwise fall back to block's stored data
  const columns: TableColumn[] = liveData?.columns
    ? liveData.columns.map(c => ({ ...c, visible: true } as TableColumn))
    : block.columns.filter(c => c.visible);
  const rows = liveData?.rows ?? block.rows;

  // Compute totals
  const totals: Record<string, number> = {};
  if (block.showTotal) {
    for (const col of columns) {
      if (col.format === 'currency' || col.format === 'number' || col.format === 'percent') {
        totals[col.key] = rows.reduce((sum, row) => {
          const v = row[col.key];
          return sum + (typeof v === 'number' ? v : 0);
        }, 0);
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      {(block.title || loading) && (
        <div className="flex items-center justify-between mb-2">
          {block.title && <div className="text-xs font-semibold text-neutral-800">{block.title}</div>}
          {loading && <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />}
        </div>
      )}
      {rows.length === 0 && !loading ? (
        <div className="py-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-300 rounded-lg">
          {block.source ? 'Aucune donnée pour cette période' : 'Connectez une source de données'}
        </div>
      ) : (
        <table className={`w-full text-xs ${block.bordered ? 'border border-neutral-200' : ''}`}>
          {block.showHeader && (
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {columns.map(col => (
                  <th key={col.key} className={`px-3 py-2 font-semibold text-neutral-700 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`} style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={`border-b border-neutral-200 ${block.striped && ri % 2 === 1 ? 'bg-neutral-50/50' : ''}`}>
                {columns.map(col => {
                  const value = row[col.key];
                  const isNeg = block.highlightNegative && typeof value === 'number' && value < 0;
                  return (
                    <td key={col.key} className={`px-3 py-1.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${isNeg ? 'text-red-600 font-medium' : 'text-neutral-700'} ${(col.format === 'currency' || col.format === 'number') ? "font-['JetBrains_Mono',monospace]" : ''}`}>
                      {formatCell(value ?? null, col.format)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {block.showTotal && Object.keys(totals).length > 0 && (
            <tfoot>
              <tr className="bg-neutral-100 border-t-2 border-neutral-300 font-bold">
                {columns.map((col, ci) => (
                  <td key={col.key} className={`px-3 py-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${(col.format === 'currency' || col.format === 'number') ? "font-['JetBrains_Mono',monospace]" : ''}`}>
                    {ci === 0 && totals[col.key] === undefined ? 'TOTAL' : formatCell(totals[col.key] ?? null, col.format)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
};

export default TableBlockRenderer;
