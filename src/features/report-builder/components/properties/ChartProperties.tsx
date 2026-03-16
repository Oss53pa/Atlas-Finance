/**
 * Chart Block Properties Panel
 */
import React from 'react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { ChartBlock, ChartType } from '../../types';

const chartTypes: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Barres' },
  { value: 'grouped-bar', label: 'Barres groupées' },
  { value: 'stacked-bar', label: 'Barres empilées' },
  { value: 'line', label: 'Lignes' },
  { value: 'area', label: 'Aires' },
  { value: 'pie', label: 'Camembert' },
  { value: 'donut', label: 'Donut' },
];

const legendPositions = [
  { value: 'top' as const, label: 'Haut' },
  { value: 'bottom' as const, label: 'Bas' },
  { value: 'left' as const, label: 'Gauche' },
  { value: 'right' as const, label: 'Droite' },
];

const ChartProperties: React.FC<{ block: ChartBlock }> = ({ block }) => {
  const { updateBlock } = useReportBuilderStore();

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-700">Bloc Graphique</div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Titre</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={e => updateBlock(block.id, { title: e.target.value })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        />
      </div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Type de graphique</label>
        <select
          value={block.chartType}
          onChange={e => updateBlock(block.id, { chartType: e.target.value as ChartType })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5"
        >
          {chartTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Hauteur (px)</label>
        <input
          type="number"
          min={150}
          max={500}
          step={10}
          value={block.height}
          onChange={e => updateBlock(block.id, { height: Number(e.target.value) })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 font-mono"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.showLegend} onChange={e => updateBlock(block.id, { showLegend: e.target.checked })} className="rounded" />
          Afficher la légende
        </label>
        {block.showLegend && (
          <div>
            <label className="text-[11px] text-neutral-500 mb-1 block">Position légende</label>
            <select
              value={block.legendPosition}
              onChange={e => updateBlock(block.id, { legendPosition: e.target.value as typeof block.legendPosition })}
              className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5"
            >
              {legendPositions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.showGrid} onChange={e => updateBlock(block.id, { showGrid: e.target.checked })} className="rounded" />
          Grille
        </label>
      </div>
    </div>
  );
};

export default ChartProperties;
