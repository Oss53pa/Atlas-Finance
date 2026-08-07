import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_PETROL, ATLAS_SUCCESS, ATLAS_ERROR, ATLAS_INK, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

export interface WaterfallItem {
  name: string;
  value: number;
  /** barre de total (part de zéro) plutôt qu'une variation */
  isTotal?: boolean;
}

export interface AtlasWaterfallProps {
  items: WaterfallItem[];
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
  valueFormatter?: (n: number) => string;
  height?: number;
  className?: string;
}

/**
 * Cascade « Daylight Pro » : chaque variation part du cumul précédent, les
 * totaux partent de zéro. Un histogramme classique montrait cinq barres
 * indépendantes là où l'intérêt est justement l'enchaînement solde initial →
 * flux → solde final. Rendu par un socle invisible empilé sous la variation.
 */
const AtlasWaterfall: React.FC<AtlasWaterfallProps> = ({
  items, positiveColor = ATLAS_SUCCESS, negativeColor = ATLAS_ERROR,
  totalColor = ATLAS_PETROL, valueFormatter, height = 350, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const base: number[] = [];
    const span: number[] = [];
    let running = 0;
    for (const it of items) {
      if (it.isTotal) {
        base.push(0);
        span.push(it.value);
        running = it.value;
      } else {
        // La barre couvre [running, running + value] quel que soit le signe.
        base.push(Math.min(running, running + it.value));
        span.push(Math.abs(it.value));
        running += it.value;
      }
    }

    return {
      grid: { left: 6, right: 12, top: 24, bottom: 6, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        textStyle: { fontFamily: FONT_SANS },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[params.length - 1] : params;
          const it = items[p.dataIndex];
          const v = valueFormatter ? valueFormatter(it.value) : String(it.value);
          return `${it.name}<br/><b>${v}</b>`;
        },
      },
      xAxis: {
        type: 'category', data: items.map((i) => i.name),
        axisLine: { lineStyle: { color: ATLAS_HAIRLINE } }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT_SANS, color: ATLAS_INK3, fontSize: 11, fontWeight: 600, interval: 0, width: 90, overflow: 'break' },
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
        {
          name: 'socle', type: 'bar', stack: 'wf', silent: true,
          itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } },
          data: base, barMaxWidth: 46, tooltip: { show: false },
        },
        {
          name: 'variation', type: 'bar', stack: 'wf', barMaxWidth: 46,
          data: span.map((v, i) => ({
            value: v,
            itemStyle: {
              color: items[i].isTotal ? totalColor : items[i].value >= 0 ? positiveColor : negativeColor,
              borderRadius: 8,
            },
          })),
          label: {
            show: true, position: 'top',
            formatter: (p: any) => (valueFormatter ? valueFormatter(items[p.dataIndex].value) : String(items[p.dataIndex].value)),
            fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, color: ATLAS_INK,
          },
        },
      ],
    };
  }, [items, positiveColor, negativeColor, totalColor, valueFormatter]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasWaterfall;
