import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

export interface LineSeries {
  name: string;
  /** `null` = pas de valeur (période non close) : la courbe s'interrompt. */
  data: (number | null)[];
  color?: string;
  /** aplat dégradé sous la courbe */
  area?: boolean;
}

export interface AtlasLineProps {
  categories: string[];
  series: LineSeries[];
  smooth?: boolean;
  showPoints?: boolean;
  /** lignes de repère de l'axe des valeurs (défaut : oui) */
  showGrid?: boolean;
  valueFormatter?: (n: number) => string;
  /** formateur des graduations de l'axe des valeurs (défaut : `valueFormatter`).
   *  À renseigner pour compacter l'axe (1,2 Md) sans perdre la précision de l'infobulle. */
  axisFormatter?: (n: number) => string;
  /** repère horizontal (plafond, cible, seuil…) */
  referenceLine?: { value: number; label?: string; color?: string };
  colors?: string[];
  height?: number;
  className?: string;
}

/**
 * Courbe « Daylight Pro » : ligne lisse, points colorés, aplat dégradé optionnel,
 * repères d'axe discrets. Couleurs Atlas.
 */
const AtlasLine: React.FC<AtlasLineProps> = ({
  categories, series, smooth = true, showPoints = true, showGrid = true, valueFormatter,
  axisFormatter, referenceLine, colors = ATLAS_SERIES, height = 300, className,
}) => {
  const option = useMemo<EChartsOption>(() => ({
    color: colors,
    grid: { left: 6, right: 16, top: series.length > 1 ? 34 : 18, bottom: 6, containLabel: true },
    legend: series.length > 1 ? { top: 2, itemWidth: 14, itemHeight: 4, icon: 'roundRect', textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK3 } } : undefined,
    tooltip: { trigger: 'axis', valueFormatter: valueFormatter ? (v) => valueFormatter(Number(v)) : undefined, textStyle: { fontFamily: FONT_SANS } },
    xAxis: {
      type: 'category', boundaryGap: false, data: categories,
      axisLine: { lineStyle: { color: ATLAS_HAIRLINE } }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT_SANS, color: ATLAS_INK3, fontSize: 11, fontWeight: 600 },
    },
    yAxis: {
      type: 'value', splitLine: showGrid ? { lineStyle: { color: ATLAS_HAIRLINE } } : { show: false },
      axisLabel: {
        fontFamily: FONT_MONO, color: ATLAS_INK3, fontSize: 10,
        formatter: (axisFormatter || valueFormatter) ? (v: number) => (axisFormatter || valueFormatter)!(Number(v)) : undefined,
      },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: series.map((s, i, all) => {
      const col = s.color || colors[i % colors.length];
      return {
        name: s.name, type: 'line' as const, data: s.data, smooth,
        symbol: showPoints ? 'circle' : 'none', symbolSize: 8,
        itemStyle: { color: col, borderColor: '#fff', borderWidth: 2 },
        lineStyle: { width: 2.5, color: col },
        areaStyle: s.area ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: col + '2b' }, { offset: 1, color: col + '00' },
          ]),
        } : undefined,
        // Porté par la dernière série pour rester au-dessus des tracés.
        markLine: referenceLine && i === all.length - 1 ? {
          silent: true, symbol: 'none',
          data: [{ yAxis: referenceLine.value }],
          lineStyle: { color: referenceLine.color || ATLAS_INK3, type: 'dashed' as const, width: 1.5 },
          label: {
            show: !!referenceLine.label, formatter: referenceLine.label ?? '',
            position: 'insideEndTop' as const,
            fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700,
            color: referenceLine.color || ATLAS_INK3,
          },
        } : undefined,
      };
    }),
  }), [categories, series, smooth, showPoints, showGrid, valueFormatter, axisFormatter, referenceLine, colors]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasLine;
