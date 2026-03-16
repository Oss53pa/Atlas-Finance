/**
 * Table Block Properties Panel
 */
import React from 'react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { TableBlock } from '../../types';

const TableProperties: React.FC<{ block: TableBlock }> = ({ block }) => {
  const { updateBlock } = useReportBuilderStore();

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-700">Bloc Tableau</div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Titre</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={e => updateBlock(block.id, { title: e.target.value })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        />
      </div>

      {/* Column visibility */}
      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Colonnes visibles</label>
        <div className="space-y-1">
          {block.columns.map((col, i) => (
            <label key={col.key} className="flex items-center gap-2 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={col.visible}
                onChange={e => {
                  const cols = [...block.columns];
                  cols[i] = { ...cols[i], visible: e.target.checked };
                  updateBlock(block.id, { columns: cols });
                }}
                className="rounded"
              />
              {col.label}
            </label>
          ))}
        </div>
      </div>

      {/* Display options */}
      <div className="space-y-2">
        <div className="text-[11px] text-neutral-500">Affichage</div>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.showHeader} onChange={e => updateBlock(block.id, { showHeader: e.target.checked })} className="rounded" />
          En-tête
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.showTotal} onChange={e => updateBlock(block.id, { showTotal: e.target.checked })} className="rounded" />
          Ligne total
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.striped} onChange={e => updateBlock(block.id, { striped: e.target.checked })} className="rounded" />
          Lignes alternées
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.bordered} onChange={e => updateBlock(block.id, { bordered: e.target.checked })} className="rounded" />
          Bordures
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.highlightNegative} onChange={e => updateBlock(block.id, { highlightNegative: e.target.checked })} className="rounded" />
          Négatifs en rouge
        </label>
      </div>
    </div>
  );
};

export default TableProperties;
