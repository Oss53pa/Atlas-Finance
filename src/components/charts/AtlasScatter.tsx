import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK2, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

export interface ScatterPoint {
  x: number;
  y: number;
  /** libellé du point dans l'infobulle */
  label?: string;
}

export interface ScatterSeries {
  name: string;
  points: ScatterPoint[];
  color?: string;
}

export interface AtlasScatterProps {
  series: ScatterSeries[];
  xName?: string;
  yName?: string;
  xFormatter?: (n: number) => string;
  yFormatter?: (n: number) => string;
  colors?: string[];
  height?: number;
  className?: string;
}

/**
 * Nuage de points « Daylight Pro » : deux axes de valeurs, un groupe = une teinte.
 * Sert à lire une corrélation (marge vs volume, retard vs encours) là où une
 * série temporelle n'aurait rien à ordonner.
 */
const AtlasScatter: React.FC<AtlasScatterProps> = ({
  series, xName, yName, xFormatter, yFormatter,
  colors = ATLAS_SERIES, height = 320, className,
}) => {
  const option = useMemo<EChartsOption>(() => ({
    color: colors,
    grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    legend: {
      top: 2, itemWidth: 11, itemHeight: 11, icon: 'circle',
      textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK2 },
    },
    tooltip: {
      trigger: 'item',
      textStyle: { fontFamily: FONT_SANS },
      formatter: (p: any) => {
        const pt = series[p.seriesIndex]?.points[p.dataIndex];
        const x = xFormatter ? xFormatter(p.value[0]) : p.value[0];
        const y = yFormatter ? yFormatter(p.value[1]) : p.value[1];
        return `${p.marker}${pt?.label ?? p.seriesName}<br/>${xName ?? 'x'} : <b>${x}</b><br/>${yName ?? 'y'} : <b>${y}</b>`;
      },
    },
    xAxis: {
      type: 'value', name: xName, nameTextStyle: { fontFamily: FONT_SANS, fontSize: 11, color: ATLAS_INK3 },
      splitLine: { lineStyle: { color: ATLAS_HAIRLINE } },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT_MONO, color: ATLAS_INK3, fontSize: 10, formatter: xFormatter ? (v: number) => xFormatter(Number(v)) : undefined },
    },
    yAxis: {
      type: 'value', name: yName, nameTextStyle: { fontFamily: FONT_SANS, fontSize: 11, color: ATLAS_INK3 },
      splitLine: { lineStyle: { color: ATLAS_HAIRLINE } },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT_MONO, color: ATLAS_INK3, fontSize: 10, formatter: yFormatter ? (v: number) => yFormatter(Number(v)) : undefined },
    },
    series: series.map((s, i) => ({
      name: s.name, type: 'scatter' as const, symbolSize: 13,
      data: s.points.map((p) => [p.x, p.y]),
      itemStyle: {
        color: s.color || colors[i % colors.length],
        borderColor: '#fff', borderWidth: 1.5,
        shadowBlur: 8, shadowColor: 'rgba(38,30,21,0.14)',
      },
      emphasis: { scale: 1.3 },
    })),
  }), [series, xName, yName, xFormatter, yFormatter, colors]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasScatter;
