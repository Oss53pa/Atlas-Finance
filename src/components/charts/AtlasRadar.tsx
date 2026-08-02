import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK2, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS } from './theme';

export interface RadarIndicator {
  name: string;
  max: number;
}

export interface RadarSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface AtlasRadarProps {
  indicators: RadarIndicator[];
  series: RadarSeries[];
  colors?: string[];
  height?: number;
  className?: string;
}

/**
 * Radar « Daylight Pro » : toile hexagonale douce, séries superposées remplies,
 * points sur les sommets. Couleurs Atlas.
 */
const AtlasRadar: React.FC<AtlasRadarProps> = ({
  indicators, series, colors = ATLAS_SERIES, height = 320, className,
}) => {
  const option = useMemo<EChartsOption>(() => ({
    color: colors,
    tooltip: { trigger: 'item', textStyle: { fontFamily: FONT_SANS } },
    legend: series.length > 1 ? { bottom: 2, itemWidth: 11, itemHeight: 11, icon: 'roundRect', textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK3 } } : undefined,
    radar: {
      indicator: indicators,
      shape: 'polygon',
      radius: '66%',
      splitNumber: 4,
      axisName: { fontFamily: FONT_SANS, color: ATLAS_INK2, fontSize: 11, fontWeight: 600 },
      splitLine: { lineStyle: { color: ATLAS_HAIRLINE } },
      splitArea: { areaStyle: { color: ['rgba(247,245,239,0)', 'rgba(38,30,21,0.02)'] } },
      axisLine: { lineStyle: { color: ATLAS_HAIRLINE } },
    },
    series: [{
      type: 'radar',
      data: series.map((s, i) => {
        const col = s.color || colors[i % colors.length];
        return {
          name: s.name, value: s.data,
          symbol: 'circle', symbolSize: 5,
          itemStyle: { color: col, borderColor: '#fff', borderWidth: 1.5 },
          lineStyle: { color: col, width: 2 },
          areaStyle: { color: col, opacity: 0.34 },
        };
      }),
    }],
  }), [indicators, series, colors]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasRadar;
