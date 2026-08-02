import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_PETROL, ATLAS_AMBER, ATLAS_INK3, FONT_SANS, FONT_MONO } from './theme';

export interface HeatCell {
  x: number;
  y: number;
  value: number;
}

export interface AtlasHeatmapProps {
  xLabels: string[];
  yLabels: string[];
  data: HeatCell[];
  min?: number;
  max?: number;
  /** dégradé bas → haut (défaut : pétrole clair → ambre) */
  lowColor?: string;
  highColor?: string;
  valueFormatter?: (n: number) => string;
  height?: number;
  className?: string;
}

/**
 * Heat map « Daylight Pro » : cellules arrondies, échelle de couleur Atlas,
 * barre visuelle. Couleurs de marque.
 */
const AtlasHeatmap: React.FC<AtlasHeatmapProps> = ({
  xLabels, yLabels, data, min = 0, max, lowColor = '#DCE7EA', highColor = ATLAS_AMBER,
  valueFormatter, height = 300, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const computedMax = max ?? data.reduce((m, d) => Math.max(m, d.value), 0);
    return {
      tooltip: { position: 'top', valueFormatter: valueFormatter ? (v) => valueFormatter(Number(v)) : undefined, textStyle: { fontFamily: FONT_SANS } },
      grid: { left: 6, right: 6, top: 10, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category', data: xLabels, splitArea: { show: false },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT_SANS, color: ATLAS_INK3, fontSize: 10.5, fontWeight: 600 },
      },
      yAxis: {
        type: 'category', data: yLabels, splitArea: { show: false },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT_SANS, color: ATLAS_INK3, fontSize: 10.5, fontWeight: 600 },
      },
      visualMap: {
        min, max: computedMax, calculable: true, orient: 'horizontal', left: 'center', bottom: 2,
        inRange: { color: [lowColor, ATLAS_PETROL, highColor] },
        textStyle: { fontFamily: FONT_MONO, fontSize: 10, color: ATLAS_INK3 },
      },
      series: [{
        type: 'heatmap',
        data: data.map((d) => [d.x, d.y, d.value]),
        itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 4 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(38,30,21,0.2)' } },
      }],
    };
  }, [xLabels, yLabels, data, min, max, lowColor, highColor, valueFormatter]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasHeatmap;
