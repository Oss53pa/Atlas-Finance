import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK2, FONT_SANS, FONT_MONO } from './theme';

export interface FunnelStage {
  name: string;
  value: number;
  /** ligne secondaire dans l'infobulle (ex : valeur pondérée du stade) */
  detail?: string;
}

export interface AtlasFunnelProps {
  stages: FunnelStage[];
  colors?: string[];
  valueFormatter?: (n: number) => string;
  height?: number;
  className?: string;
}

/**
 * Entonnoir « Daylight Pro » : chaque palier est proportionnel à son effectif,
 * mis à l'échelle sur le plus grand stade. Un empilement de blocs dont la
 * hauteur venait d'un diviseur fixe ne disait rien de la déperdition réelle —
 * ici la largeur relative EST le taux de passage.
 */
const AtlasFunnel: React.FC<AtlasFunnelProps> = ({
  stages, colors = ATLAS_SERIES, valueFormatter, height = 320, className,
}) => {
  const option = useMemo<EChartsOption>(() => ({
    color: colors,
    tooltip: {
      trigger: 'item',
      textStyle: { fontFamily: FONT_SANS },
      formatter: (p: any) => {
        const stage = stages[p.dataIndex];
        const v = valueFormatter ? valueFormatter(p.value) : String(p.value);
        return `${p.marker}${p.name}<br/><b>${v}</b>${stage?.detail ? `<br/>${stage.detail}` : ''}`;
      },
    },
    legend: {
      bottom: 0, itemWidth: 11, itemHeight: 11, icon: 'roundRect',
      textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK2 },
    },
    series: [{
      type: 'funnel',
      top: 12, bottom: 42, left: '8%', width: '84%',
      sort: 'descending',
      gap: 4,
      minSize: '18%',
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: {
        position: 'inside', color: '#fff',
        fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12,
        formatter: (p: any) => (valueFormatter ? valueFormatter(p.value) : String(p.value)),
      },
      emphasis: { label: { fontSize: 13 } },
      data: stages.map((s) => ({ name: s.name, value: s.value })),
    }],
  }), [stages, colors, valueFormatter]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasFunnel;
