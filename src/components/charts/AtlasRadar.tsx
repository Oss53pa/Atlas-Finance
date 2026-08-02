import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK2, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

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
 * Radar « Daylight Pro » : toile large, séries superposées remplies, valeurs aux sommets.
 * Graduation affichée sur UN SEUL axe (le haut) via overlay — pas sur tous (anti-fouillis).
 */
const AtlasRadar: React.FC<AtlasRadarProps> = ({
  indicators, series, colors = ATLAS_SERIES, height = 360, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const cy = 0.50;                    // centre vertical (fraction de height)
    const R = Math.round(height * 0.44); // rayon (px) — toile large
    const centerYpx = Math.round(height * cy);
    const max = indicators[0]?.max || 100;
    const legendH = series.length > 1 ? 22 : 0;

    // graduation sur le seul axe du haut (0 exclu, au centre)
    const scale = [0.25, 0.5, 0.75, 1].map((f) => ({
      v: Math.round(max * f),
      topPx: centerYpx - Math.round(f * R),
    }));

    return {
      color: colors,
      tooltip: { trigger: 'item', textStyle: { fontFamily: FONT_SANS } },
      legend: series.length > 1 ? { bottom: 2, itemWidth: 11, itemHeight: 11, icon: 'roundRect', textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK3 } } : undefined,
      radar: {
        indicator: indicators,
        shape: 'polygon',
        radius: R,
        center: ['50%', `${cy * 100}%`],
        splitNumber: 4,
        axisName: { fontFamily: FONT_SANS, color: ATLAS_INK2, fontSize: 11, fontWeight: 600 },
        axisLabel: { show: false },
        splitLine: { lineStyle: { color: ATLAS_HAIRLINE } },
        splitArea: { areaStyle: { color: ['rgba(247,245,239,0)', 'rgba(38,30,21,0.02)'] } },
        axisLine: { lineStyle: { color: ATLAS_HAIRLINE } },
      },
      graphic: {
        elements: scale.map((s) => ({
          type: 'text' as const,
          left: '49%',
          top: s.topPx - legendH / 2,
          style: { text: `${s.v}`, fontFamily: FONT_MONO, fontSize: 9, fill: ATLAS_INK3, textAlign: 'right' as const },
        })),
      },
      series: [{
        type: 'radar',
        label: { show: true, formatter: (p: any) => `${p.value}`, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, color: ATLAS_INK2 },
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
    };
  }, [indicators, series, colors, height]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasRadar;
