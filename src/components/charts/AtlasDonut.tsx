import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_SERIES, ATLAS_INK, ATLAS_INK2, ATLAS_INK3, FONT_SANS, FONT_MONO } from './theme';

export interface DonutDatum {
  name: string;
  value: number;
}

export interface AtlasDonutProps {
  data: DonutDatum[];
  /** index de la tranche détachée (défaut : aucune) */
  explodeIndex?: number;
  /** gros texte central (ex: "95,67%" ou un total formaté) */
  centerPrimary?: string;
  /** petit label central (ex: "TOTAL") */
  centerLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  /** formateur du tooltip (défaut : valeur brute) */
  valueFormatter?: (n: number) => string;
  height?: number;
  className?: string;
}

/**
 * Donut « Daylight Pro » 2D premium : anneau épais, coins arrondis, ombre douce,
 * tranche détachable, % par segment, total central, légende. Couleurs Atlas FnA.
 */
const AtlasDonut: React.FC<AtlasDonutProps> = ({
  data, explodeIndex, centerPrimary, centerLabel = 'TOTAL', colors = ATLAS_SERIES,
  showLegend = true, valueFormatter, height = 320, className,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const cx = showLegend ? '36%' : '50%';
    return {
      color: colors,
      tooltip: {
        trigger: 'item',
        valueFormatter: valueFormatter ? (v) => valueFormatter(Number(v)) : undefined,
        textStyle: { fontFamily: FONT_SANS },
      },
      legend: showLegend ? {
        orient: 'vertical', right: 8, top: 'middle',
        itemWidth: 11, itemHeight: 11, itemGap: 14, icon: 'roundRect',
        textStyle: { fontFamily: FONT_SANS, fontWeight: 600, fontSize: 13, color: ATLAS_INK2 },
      } : undefined,
      series: [{
        type: 'pie',
        radius: ['56%', '82%'],
        center: [cx, '52%'],
        selectedMode: 'single',
        selectedOffset: 18,
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 9, shadowBlur: 16, shadowColor: 'rgba(38,30,21,0.16)' },
        label: { show: true, position: 'inside', formatter: '{d}%', color: '#fff', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12 },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 5, itemStyle: { shadowBlur: 24, shadowColor: 'rgba(38,30,21,0.24)' } },
        data: data.map((d, i) => ({ value: d.value, name: d.name, selected: i === explodeIndex })),
      }],
      graphic: centerPrimary ? {
        elements: [
          { type: 'text', left: cx, top: '46%', style: { text: centerPrimary, fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, fill: ATLAS_INK, textAlign: 'center' } },
          { type: 'text', left: cx, top: '56%', style: { text: centerLabel, fontFamily: FONT_SANS, fontSize: 10, fontWeight: 700, fill: ATLAS_INK3, textAlign: 'center' } },
        ],
      } : undefined,
    };
  }, [data, explodeIndex, centerPrimary, centerLabel, colors, showLegend, valueFormatter]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasDonut;
