import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

export interface BarSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface AtlasBarProps {
  categories: string[];
  series: BarSeries[];
  horizontal?: boolean;
  stacked?: boolean;
  showValues?: boolean;
  /** lignes de repère de l'axe des valeurs (défaut : oui) */
  showGrid?: boolean;
  valueFormatter?: (n: number) => string;
  colors?: string[];
  height?: number;
  className?: string;
}

/**
 * Barres « Daylight Pro » : pilules arrondies sur piste claire, valeurs, couleurs Atlas.
 * Gère mono/multi-séries, groupées ou empilées, vertical/horizontal.
 */
const AtlasBar: React.FC<AtlasBarProps> = ({
  categories, series, horizontal = false, stacked = false, showValues = true,
  showGrid = true, valueFormatter, colors = ATLAS_SERIES, height = 300, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const catAxis = {
      type: 'category' as const, data: categories,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT_SANS, color: ATLAS_INK3, fontSize: 11, fontWeight: 600 },
    };
    const valAxis = {
      type: 'value' as const, splitLine: showGrid ? { lineStyle: { color: ATLAS_HAIRLINE } } : { show: false },
      axisLabel: { fontFamily: FONT_MONO, color: ATLAS_INK3, fontSize: 10 },
      axisLine: { show: false }, axisTick: { show: false },
    };
    return {
      color: colors,
      grid: { left: 6, right: 12, top: series.length > 1 ? 34 : 20, bottom: 6, containLabel: true },
      legend: series.length > 1 ? { top: 2, itemWidth: 11, itemHeight: 11, icon: 'roundRect', textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK3 } } : undefined,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: valueFormatter ? (v) => valueFormatter(Number(v)) : undefined, textStyle: { fontFamily: FONT_SANS } },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: series.map((s, i) => ({
        name: s.name, type: 'bar' as const,
        data: s.data, stack: stacked ? 'total' : undefined,
        barMaxWidth: 34, barGap: '20%',
        itemStyle: { color: s.color || colors[i % colors.length], borderRadius: horizontal ? [12, 12, 12, 12] : [12, 12, 12, 12] },
        showBackground: !stacked, backgroundStyle: { color: ATLAS_HAIRLINE, borderRadius: 12 },
        label: showValues && !stacked ? {
          show: true, position: horizontal ? 'right' : 'top',
          formatter: (p: any) => (valueFormatter ? valueFormatter(Number(p.value)) : String(p.value)),
          fontFamily: FONT_MONO, color: ATLAS_INK, fontWeight: 700, fontSize: 10.5,
        } : undefined,
      })),
    };
  }, [categories, series, horizontal, stacked, showValues, showGrid, valueFormatter, colors]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasBar;
