/**
 * KPI Grid Block Renderer — Multiple KPIs in a row
 */
import React from 'react';
import KPIBlockRenderer from './KPIBlockRenderer';
import type { KPIGridBlock, KPIBlock } from '../../types';

interface Props {
  block: KPIGridBlock;
}

const KPIGridBlockRenderer: React.FC<Props> = ({ block }) => {
  return (
    <div className={`grid gap-4 grid-cols-${block.columns}`} style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}>
      {block.kpis.map((kpi, i) => (
        <KPIBlockRenderer
          key={i}
          block={{
            id: `${block.id}-kpi-${i}`,
            type: 'kpi',
            locked: block.locked,
            style: {},
            ...kpi,
          } as KPIBlock}
        />
      ))}
    </div>
  );
};

export default KPIGridBlockRenderer;
