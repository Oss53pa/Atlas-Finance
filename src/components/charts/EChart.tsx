import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export interface EChartProps {
  option: echarts.EChartsCoreOption;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  /** callback ECharts instance (ex: brancher un event) */
  onInit?: (chart: echarts.ECharts) => void;
}

/**
 * Wrapper React minimal pour ECharts : init/dispose propres, resize auto (ResizeObserver),
 * mise à jour de l'option sans recréer l'instance. Base de tout le kit charts Atlas.
 */
const EChart: React.FC<EChartProps> = ({ option, height = 320, className, style, onInit }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chartRef.current = chart;
    onInit?.(chart);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={elRef} className={className} style={{ width: '100%', height, ...style }} />;
};

export default EChart;
