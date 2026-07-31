import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK, ATLAS_INK3, FONT_SANS, FONT_MONO } from './theme';

export interface PieDatum {
  name: string;
  value: number;
}

export interface AtlasPieProps {
  data: PieDatum[];
  /** index de la tranche détachée (défaut : la plus grande) */
  explodeIndex?: number;
  colors?: string[];
  /** anneau interne (0 = pie plein ; ex 40 = donut) */
  innerRadiusPct?: number;
  valueFormatter?: (n: number) => string;
  height?: number;
  className?: string;
}

/**
 * Pie « Daylight Pro » 2D premium : plein (ou anneau), coins arrondis, ombre douce,
 * tranche détachable, labels externes (% en gros + libellé) avec ligne de rappel.
 */
const AtlasPie: React.FC<AtlasPieProps> = ({
  data, explodeIndex, colors = ATLAS_SERIES, innerRadiusPct = 0, valueFormatter, height = 320, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const maxIdx = data.reduce((m, d, i, a) => (d.value > a[m].value ? i : m), 0);
    const exploded = explodeIndex ?? maxIdx;
    return {
      color: colors,
      tooltip: {
        trigger: 'item',
        valueFormatter: valueFormatter ? (v) => valueFormatter(Number(v)) : undefined,
        textStyle: { fontFamily: FONT_SANS },
      },
      series: [{
        type: 'pie',
        radius: [`${innerRadiusPct}%`, '72%'],
        center: ['50%', '50%'],
        selectedMode: 'single',
        selectedOffset: 16,
        padAngle: 1.5,
        itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6, shadowBlur: 16, shadowColor: 'rgba(38,30,21,0.16)' },
        label: {
          show: true, position: 'outside',
          formatter: (pm: any) => `{v|${pm.percent}%}\n{n|${pm.name}}`,
          rich: {
            v: { fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: ATLAS_INK, lineHeight: 18, align: 'left' },
            n: { fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: ATLAS_INK3, align: 'left' },
          },
        },
        labelLine: { show: true, length: 14, length2: 16, lineStyle: { color: ATLAS_INK3, width: 1 } },
        emphasis: { scale: true, scaleSize: 5, itemStyle: { shadowBlur: 24, shadowColor: 'rgba(38,30,21,0.24)' } },
        data: data.map((d, i) => ({ value: d.value, name: d.name, selected: i === exploded })),
      }],
    };
  }, [data, explodeIndex, colors, innerRadiusPct, valueFormatter]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasPie;
