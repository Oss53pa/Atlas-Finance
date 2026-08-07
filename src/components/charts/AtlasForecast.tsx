import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_PETROL, ATLAS_SUCCESS, ATLAS_INK2, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

export interface AtlasForecastProps {
  categories: string[];
  /** réalisé — `null` là où il n'y a pas encore de données */
  actual: (number | null)[];
  /** prévision (trait pointillé) */
  predicted: (number | null)[];
  /** bornes de l'intervalle de confiance, alignées sur `categories` */
  lower?: (number | null)[];
  upper?: (number | null)[];
  labels?: { actual?: string; predicted?: string; band?: string };
  actualColor?: string;
  predictedColor?: string;
  valueFormatter?: (n: number) => string;
  height?: number;
  className?: string;
}

/**
 * Prévision « Daylight Pro » : réalisé plein, prévision pointillée, intervalle de
 * confiance en bande continue. La bande est rendue par un empilement borne basse
 * (invisible) + épaisseur — deux aplats superposés se seraient masqués l'un
 * l'autre et la borne haute aurait été lue comme une série à part entière.
 */
const AtlasForecast: React.FC<AtlasForecastProps> = ({
  categories, actual, predicted, lower, upper, labels,
  actualColor = ATLAS_SUCCESS, predictedColor = ATLAS_PETROL,
  valueFormatter, height = 350, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const hasBand = !!lower && !!upper;
    const bandBase = hasBand ? lower!.map((v) => (v == null ? null : v)) : [];
    const bandSpan = hasBand
      ? upper!.map((u, i) => {
          const l = lower![i];
          return u == null || l == null ? null : Math.max(0, u - l);
        })
      : [];

    return {
      grid: { left: 6, right: 16, top: 34, bottom: 6, containLabel: true },
      legend: {
        top: 2, itemWidth: 14, itemHeight: 4, icon: 'roundRect',
        data: [labels?.actual ?? 'Réalisé', labels?.predicted ?? 'Prévision'],
        textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 12, color: ATLAS_INK2 },
      },
      tooltip: {
        trigger: 'axis',
        textStyle: { fontFamily: FONT_SANS },
        valueFormatter: valueFormatter ? (v) => valueFormatter(Number(v)) : undefined,
      },
      xAxis: {
        type: 'category', boundaryGap: false, data: categories,
        axisLine: { lineStyle: { color: ATLAS_HAIRLINE } }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT_SANS, color: ATLAS_INK3, fontSize: 11, fontWeight: 600 },
      },
      yAxis: {
        type: 'value', splitLine: { lineStyle: { color: ATLAS_HAIRLINE } },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: {
          fontFamily: FONT_MONO, color: ATLAS_INK3, fontSize: 10,
          formatter: valueFormatter ? (v: number) => valueFormatter(Number(v)) : undefined,
        },
      },
      series: [
        ...(hasBand
          ? [
              {
                name: 'ic-base', type: 'line' as const, data: bandBase, stack: 'ic',
                lineStyle: { opacity: 0 }, symbol: 'none', silent: true,
                areaStyle: { color: 'transparent' }, tooltip: { show: false },
              },
              {
                name: labels?.band ?? 'Intervalle de confiance',
                type: 'line' as const, data: bandSpan, stack: 'ic',
                lineStyle: { opacity: 0 }, symbol: 'none', silent: true,
                areaStyle: { color: predictedColor + '24' }, tooltip: { show: false },
              },
            ]
          : []),
        {
          name: labels?.actual ?? 'Réalisé', type: 'line' as const, data: actual,
          smooth: true, symbol: 'circle', symbolSize: 7, connectNulls: false,
          itemStyle: { color: actualColor, borderColor: '#fff', borderWidth: 2 },
          lineStyle: { width: 2.5, color: actualColor },
        },
        {
          name: labels?.predicted ?? 'Prévision', type: 'line' as const, data: predicted,
          smooth: true, symbol: 'circle', symbolSize: 6, connectNulls: false,
          itemStyle: { color: predictedColor, borderColor: '#fff', borderWidth: 2 },
          lineStyle: { width: 2.5, color: predictedColor, type: 'dashed' as const },
        },
      ],
    };
  }, [categories, actual, predicted, lower, upper, labels, actualColor, predictedColor, valueFormatter]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasForecast;
