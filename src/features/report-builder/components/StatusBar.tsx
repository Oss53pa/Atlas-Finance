/**
 * StatusBar — Page count, zoom, period, version
 * Project colors: neutral-*
 */
import React from 'react';
import { useReportBuilderStore } from '../store/useReportBuilderStore';

const StatusBar: React.FC = () => {
  const { document: doc, zoomLevel, setZoom } = useReportBuilderStore();

  if (!doc) return null;

  const totalBlocks = doc.pages.reduce((sum, p) => sum + p.blocks.length, 0);

  return (
    <div className="h-7 border-t border-neutral-200 bg-neutral-50 flex items-center px-4 gap-6 text-[10px] text-neutral-500 shrink-0">
      <span>{doc.period.label}</span>
      <span>{doc.pages.length} page{doc.pages.length > 1 ? 's' : ''}</span>
      <span>{totalBlocks} bloc{totalBlocks > 1 ? 's' : ''}</span>
      <span className="capitalize">{doc.status.replace('_', ' ')}</span>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <input
          type="range"
          min={50}
          max={200}
          step={10}
          value={zoomLevel}
          onChange={e => setZoom(Number(e.target.value))}
          className="w-20 h-1 accent-neutral-600"
        />
        <span className="w-7 text-right font-mono">{zoomLevel}%</span>
      </div>
      <span className="text-neutral-400">v{doc.version}</span>
    </div>
  );
};

export default StatusBar;
