import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

export interface ComboBarSeries {
  name: string;
  data: number[];
  color?: string;
  /** empiler avec les autres barres marquées stacked */
  stacked?: boolean;
}

export interface ComboLineSeries {
  name: string;
  data: number[];
  color?: string;
  /** tracer sur l'axe de droite (défaut : oui — c'est l'intérêt du combiné) */
  onRightAxis?: boolean;
  area?: boolean;
}

export interface AtlasComboProps {
  categories: string[];
  bars: ComboBarSeries[];
  lines: ComboLineSeries[];
  /** formateur de l'axe gauche + tooltip des barres (ex: montants) */
  valueFormatter?: (n: number) => string;
  /** formateur de l'axe droit + tooltip des courbes (ex: pourcentages) */
  rightFormatter?: (n: number) => string;
  colors?: string[];
  height?: number;
  className?: string;
}

/**
 * Combiné « Daylight Pro » : barres pilules sur l'axe gauche (montants) + courbes
 * lissées sur un second axe droit (taux, ratios, %). Deux unités qui ne se
 * comparent pas gardent chacune leur échelle, sans mentir sur les proportions.
 */
const AtlasCombo: React.FC<AtlasComboProps> = ({
  categories, bars, lines, valueFormatter, rightFormatter,
  colors = ATLAS_SERIES, height = 340, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const usesRight = lines.some((l) => l.onRightAxis !== false);
    const axisLabel = (fmt?: (n: number) => string) => ({
      fontFamily: FONT_MONO, color: ATLAS_INK3, fontSize: 10,
      formatter: fmt ? (v: number) => fmt(Number(v)) : undefined,
    });
    return {
      color: colors,
      grid: { left: 6, right: usesRight ? 10 : 12, top: 34, bottom: 6, containLabel: true },
      legend: {
        top: 2, itemWidth: 12, itemHeight: 8, icon: 'roundRect',
        textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK3 },
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, textStyle: { fontFamily: FONT_SANS } },
      xAxis: {
        type: 'category', data: categories,
        axisLine: { lineStyle: { color: ATLAS_HAIRLINE } }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT_SANS, color: ATLAS_INK3, fontSize: 11, fontWeight: 600 },
      },
      yAxis: [
        {
          type: 'value', splitLine: { lineStyle: { color: ATLAS_HAIRLINE } },
          axisLine: { show: false }, axisTick: { show: false }, axisLabel: axisLabel(valueFormatter),
        },
        {
          type: 'value', splitLine: { show: false },
          axisLine: { show: false }, axisTick: { show: false }, axisLabel: axisLabel(rightFormatter),
        },
      ],
      series: [
        ...bars.map((b, i) => ({
          name: b.name, type: 'bar' as const, yAxisIndex: 0, data: b.data,
          stack: b.stacked ? 'total' : undefined,
          barMaxWidth: 30, barGap: '20%',
          itemStyle: { color: b.color || colors[i % colors.length], borderRadius: [10, 10, 10, 10] },
          tooltip: { valueFormatter: valueFormatter ? (v: unknown) => valueFormatter(Number(v)) : undefined },
        })),
        ...lines.map((l, i) => {
          const col = l.color || colors[(bars.length + i) % colors.length];
          return {
            name: l.name, type: 'line' as const,
            yAxisIndex: l.onRightAxis === false ? 0 : 1,
            data: l.data, smooth: true, symbol: 'circle', symbolSize: 7,
            itemStyle: { color: col, borderColor: '#fff', borderWidth: 2 },
            lineStyle: { width: 2.5, color: col },
            tooltip: {
              valueFormatter: (l.onRightAxis === false ? valueFormatter : rightFormatter)
                ? (v: unknown) => (l.onRightAxis === false ? valueFormatter! : rightFormatter!)(Number(v))
                : undefined,
            },
          };
        }),
      ],
    };
  }, [categories, bars, lines, valueFormatter, rightFormatter, colors]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasCombo;
