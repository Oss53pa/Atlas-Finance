import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import EChart from './EChart';
import { ATLAS_PETROL, ATLAS_INK, ATLAS_INK3, ATLAS_HAIRLINE, FONT_SANS, FONT_MONO } from './theme';

export interface AtlasGaugeProps {
  /** valeur 0–100 */
  value: number;
  label?: string;
  /** couleur de l'arc (défaut pétrole) */
  color?: string;
  /** suffixe de la valeur centrale (défaut %) */
  unit?: string;
  height?: number;
  className?: string;
}

/**
 * Jauge « Daylight Pro » : arc épais arrondi (progress), fond de piste clair,
 * valeur centrale en JetBrains Mono. Couleurs Atlas.
 */
const AtlasGauge: React.FC<AtlasGaugeProps> = ({
  value, label, color = ATLAS_PETROL, unit = '%', height = 220, className,
}) => {
  const v = Math.max(0, Math.min(100, value));
  const option = useMemo<EChartsOption>(() => ({
    series: [{
      type: 'gauge',
      startAngle: 220, endAngle: -40,
      min: 0, max: 100,
      radius: '92%',
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color } },
      axisLine: { lineStyle: { width: 16, color: [[1, ATLAS_HAIRLINE]] } },
      pointer: { show: false },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      anchor: { show: false },
      title: { show: !!label, offsetCenter: [0, '38%'], fontFamily: FONT_SANS, fontSize: 11, fontWeight: 700, color: ATLAS_INK3 },
      detail: {
        valueAnimation: true, offsetCenter: [0, '2%'],
        formatter: (val: number) => `${val.toFixed(1).replace('.', ',')}${unit}`,
        fontFamily: FONT_MONO, fontSize: 28, fontWeight: 700, color: ATLAS_INK,
      },
      data: [{ value: v, name: label || '' }],
    }],
  }), [v, label, color, unit]);

  return <EChart option={option} height={height} className={className} />;
};

export default AtlasGauge;
