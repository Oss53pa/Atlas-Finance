/**
 * Block Style Properties — background, border, padding, etc.
 */
import React from 'react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { ReportBlock } from '../../types';

const BlockStyleProperties: React.FC<{ block: ReportBlock }> = ({ block }) => {
  const { updateBlockStyle } = useReportBuilderStore();

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-700">Style du bloc</div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Arrière-plan</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={block.style.backgroundColor || '#ffffff'}
            onChange={e => updateBlockStyle(block.id, { backgroundColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-neutral-200"
          />
          <button
            onClick={() => updateBlockStyle(block.id, { backgroundColor: undefined })}
            className="text-[10px] text-neutral-400 hover:text-neutral-600"
          >
            Transparent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-neutral-500 mb-1 block">Bordure (px)</label>
          <input
            type="number"
            min={0}
            max={5}
            value={block.style.borderWidth ?? 0}
            onChange={e => updateBlockStyle(block.id, { borderWidth: Number(e.target.value) })}
            className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1 font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] text-neutral-500 mb-1 block">Arrondi (px)</label>
          <input
            type="number"
            min={0}
            max={24}
            value={block.style.borderRadius ?? 0}
            onChange={e => updateBlockStyle(block.id, { borderRadius: Number(e.target.value) })}
            className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1 font-mono"
          />
        </div>
      </div>

      {block.style.borderWidth && block.style.borderWidth > 0 && (
        <div>
          <label className="text-[11px] text-neutral-500 mb-1 block">Couleur bordure</label>
          <input
            type="color"
            value={block.style.borderColor || '#e5e5e5'}
            onChange={e => updateBlockStyle(block.id, { borderColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-neutral-200"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-neutral-500 mb-1 block">Padding (px)</label>
          <input
            type="number"
            min={0}
            max={48}
            value={block.style.padding ?? 0}
            onChange={e => updateBlockStyle(block.id, { padding: Number(e.target.value) })}
            className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1 font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] text-neutral-500 mb-1 block">Marge bas (px)</label>
          <input
            type="number"
            min={0}
            max={48}
            value={block.style.marginBottom ?? 8}
            onChange={e => updateBlockStyle(block.id, { marginBottom: Number(e.target.value) })}
            className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Opacité</label>
        <input
          type="range"
          min={10}
          max={100}
          value={(block.style.opacity ?? 1) * 100}
          onChange={e => updateBlockStyle(block.id, { opacity: Number(e.target.value) / 100 })}
          className="w-full"
        />
        <div className="text-right text-[10px] text-neutral-400">{Math.round((block.style.opacity ?? 1) * 100)}%</div>
      </div>
    </div>
  );
};

export default BlockStyleProperties;
