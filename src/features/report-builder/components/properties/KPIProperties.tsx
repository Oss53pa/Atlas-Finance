/**
 * KPI Block Properties Panel
 */
import React from 'react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { KPIBlock, KPIFormat } from '../../types';

const formats: { value: KPIFormat; label: string }[] = [
  { value: 'currency', label: 'Monétaire (FCFA)' },
  { value: 'percent', label: 'Pourcentage (%)' },
  { value: 'number', label: 'Nombre' },
  { value: 'days', label: 'Jours' },
];

const sizes = [
  { value: 'small' as const, label: 'Petit' },
  { value: 'medium' as const, label: 'Moyen' },
  { value: 'large' as const, label: 'Grand' },
];

const KPIProperties: React.FC<{ block: KPIBlock }> = ({ block }) => {
  const { updateBlock } = useReportBuilderStore();

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-700">Bloc KPI</div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Libellé</label>
        <input
          type="text"
          value={block.label}
          onChange={e => updateBlock(block.id, { label: e.target.value })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-neutral-500 mb-1 block">Valeur</label>
          <input
            type="number"
            value={block.value ?? ''}
            onChange={e => updateBlock(block.id, { value: e.target.value ? Number(e.target.value) : null })}
            className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500 font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] text-neutral-500 mb-1 block">Valeur N-1</label>
          <input
            type="number"
            value={block.previousValue ?? ''}
            onChange={e => updateBlock(block.id, { previousValue: e.target.value ? Number(e.target.value) : null })}
            className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Format</label>
        <select
          value={block.format}
          onChange={e => updateBlock(block.id, { format: e.target.value as KPIFormat })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5"
        >
          {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Taille</label>
        <div className="flex gap-1">
          {sizes.map(s => (
            <button
              key={s.value}
              onClick={() => updateBlock(block.id, { size: s.value })}
              className={`flex-1 py-1 text-[10px] rounded-md font-medium ${block.size === s.value ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-100 text-neutral-500'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.showTrend} onChange={e => updateBlock(block.id, { showTrend: e.target.checked })} className="rounded" />
          Afficher tendance
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={block.showSparkline} onChange={e => updateBlock(block.id, { showSparkline: e.target.checked })} className="rounded" />
          Afficher sparkline
        </label>
      </div>
    </div>
  );
};

export default KPIProperties;
