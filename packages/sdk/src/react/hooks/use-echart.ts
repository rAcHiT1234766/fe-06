import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import {
  init,
  use as registerChartModules,
  type ECElementEvent,
  type EChartsType,
} from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';
import type { ChartOption } from '../charts/chart-options';

// Registering only what the widgets draw keeps the rest of ECharts out of the bundle.
registerChartModules([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useEChart(
  option: ChartOption,
  theme: object,
  onItemClick?: (dataIndex: number) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType>(null);
  // The chart subscribes to clicks once and calls whichever handler the latest render passed.
  const onItemClickRef = useRef(onItemClick);
  useEffect(() => {
    onItemClickRef.current = onItemClick;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container);
    chartRef.current = chart;
    chart.on('click', (event: ECElementEvent) => onItemClickRef.current?.(event.dataIndex));
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);
    // Canvas text only uses fonts that have finished loading, so measure again once they have.
    void document.fonts.ready.then(() => {
      if (!chart.isDisposed()) chart.resize();
    });
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Replacing instead of merging stops series from an earlier option lingering on the chart.
    chartRef.current?.setOption(
      { ...option, animation: !prefersReducedMotion() },
      { notMerge: true },
    );
  }, [option]);

  // Declared after the option effect because ECharts ignores setTheme on a chart that has no option
  // yet. Later options keep the theme.
  useEffect(() => {
    chartRef.current?.setTheme(theme);
  }, [theme]);

  return containerRef;
}
