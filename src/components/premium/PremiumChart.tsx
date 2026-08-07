import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { EChart, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from '../charts';

export type PremiumSeries = {
  key: string;
  label: string;
  data: number[];                 // values aligned with `xLabels`
  tone?: 'gold' | 'obsidian' | 'success' | 'danger' | 'muted';
  variant?: 'area' | 'line' | 'dashed';
  reference?: boolean;            // render as a horizontal target line
};

// Petrol Cream — 'gold' = pétrole (série principale), 'obsidian' = ambre (série spark)
const TONE: Record<NonNullable<PremiumSeries['tone']>, string> = {
  gold:     '#235A6E',
  obsidian: '#E89A2E',
  success:  '#15803D',
  danger:   '#C0322B',
  muted:    '#8A8170',
};

export interface PremiumChartProps {
  xLabels: string[];
  series: PremiumSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
}

/**
 * PremiumChart — courbes/aplats « Daylight Pro » sur le socle ECharts du kit Atlas.
 * Conserve l'API historique (xLabels + séries à tonalité/variante) et l'infobulle
 * sombre de la maquette. Les couleurs sont en hex : un canvas ne résout pas les
 * var(--color-*) (rendu noir).
 */
const PremiumChart: React.FC<PremiumChartProps> = ({
  xLabels, series, height = 240, yFormatter, showGrid = true, showLegend = false,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const plotted = series.filter((s) => !s.reference);
    const refs = series.filter((s) => s.reference);

    return {
      grid: { left: 4, right: 16, top: showLegend ? 30 : 12, bottom: 4, containLabel: true },
      legend: showLegend
        ? {
            top: 0, itemWidth: 14, itemHeight: 3, icon: 'roundRect',
            textStyle: { fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: '#8B8272' },
            data: plotted.map((s) => s.label),
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#13323D',
        borderColor: 'rgba(232,154,46,0.22)',
        borderWidth: 1,
        padding: [10, 12],
        extraCssText: 'border-radius:10px;box-shadow:0 12px 24px -8px rgba(38,30,21,0.34);',
        textStyle: { color: '#F7F5EF', fontFamily: FONT_SANS, fontSize: 12 },
        valueFormatter: yFormatter ? (v) => yFormatter(Number(v)) : undefined,
      },
      xAxis: {
        type: 'category', boundaryGap: false, data: xLabels,
        axisLine: { lineStyle: { color: ATLAS_HAIRLINE } }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT_SANS, color: '#8B8272', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitLine: showGrid ? { lineStyle: { color: ATLAS_HAIRLINE, type: 'dashed' } } : { show: false },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: {
          fontFamily: FONT_MONO, color: '#8B8272', fontSize: 10,
          formatter: yFormatter ? (v: number) => yFormatter(Number(v)) : undefined,
        },
      },
      series: [
        ...plotted.map((s) => {
          const col = TONE[s.tone ?? 'gold'];
          const isArea = s.variant === 'area' || !s.variant;
          return {
            name: s.label, type: 'line' as const, data: s.data, smooth: true,
            symbol: 'circle', symbolSize: 0, showSymbol: false,
            emphasis: { focus: 'series' as const, itemStyle: { borderColor: '#fff', borderWidth: 2 } },
            itemStyle: { color: col, borderColor: '#fff', borderWidth: 2 },
            lineStyle: { width: 2, color: col, type: s.variant === 'dashed' ? ('dashed' as const) : ('solid' as const) },
            areaStyle: isArea
              ? {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: col + '52' }, { offset: 1, color: col + '00' },
                  ]),
                }
              : undefined,
          };
        }),
        // Cibles : une ligne horizontale à la dernière valeur de la série repère.
        ...(refs.length
          ? [{
              type: 'line' as const, data: [] as number[], silent: true,
              markLine: {
                symbol: 'none',
                data: refs.map((r) => ({
                  yAxis: r.data[r.data.length - 1] ?? 0,
                  lineStyle: { color: TONE[r.tone ?? 'muted'], type: 'dashed' as const, width: 1.5 },
                  label: {
                    formatter: r.label, position: 'insideEndTop' as const,
                    fontFamily: FONT_SANS, fontSize: 10, color: TONE[r.tone ?? 'muted'],
                  },
                })),
              },
            }]
          : []),
      ],
    };
  }, [xLabels, series, yFormatter, showGrid, showLegend]);

  return <EChart option={option} height={height} />;
};

export default PremiumChart;
