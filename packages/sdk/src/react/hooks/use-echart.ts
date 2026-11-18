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

// Charts animate briefly, so a filter change has finished drawing soon after the click (NFR-P4).
// ECharts' defaults run from 300 ms to a second: a line whose points all move far, as when its
// range changes, is drawn again with the entrance animation. Each series reads these settings
// from its own options before the chart's, so they are set on both.
const BRIEF_ANIMATION = {
  animationDuration: 200,
  animationDurationUpdate: 200,
  animationEasingUpdate: 'cubicOut',
} as const;

function withBriefAnimation(option: ChartOption, isAnimated: boolean): ChartOption {
  const { series } = option;
  return {
    ...option,
    ...BRIEF_ANIMATION,
    animation: isAnimated,
    ...(series && {
      series: Array.isArray(series)
        ? series.map((item) => ({ ...item, ...BRIEF_ANIMATION }))
        : { ...series, ...BRIEF_ANIMATION },
    }),
  };
}

export function useEChart(
  option: ChartOption,
  theme: object,
  /** Told which item was clicked, and whether Ctrl or Cmd was held to add it to a selection. */
  onItemClick?: (dataIndex: number, isAdditive: boolean) => void,
  onFinished?: () => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType>(null);
  // The chart subscribes to clicks once and calls whichever handler the latest render passed.
  const onItemClickRef = useRef(onItemClick);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onItemClickRef.current = onItemClick;
    onFinishedRef.current = onFinished;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container);
    chartRef.current = chart;
    chart.on('click', (event: ECElementEvent) => {
      const pointer = event.event?.event;
      const isAdditive = pointer instanceof MouseEvent && (pointer.ctrlKey || pointer.metaKey);
      onItemClickRef.current?.(event.dataIndex, isAdditive);
    });
    // Fired once a render, and any animation it started, is complete.
    chart.on('finished', () => onFinishedRef.current?.());
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
    chartRef.current?.setOption(withBriefAnimation(option, !prefersReducedMotion()), {
      notMerge: true,
    });
  }, [option]);

  // Declared after the option effect because ECharts ignores setTheme on a chart that has no option
  // yet. Later options keep the theme.
  useEffect(() => {
    chartRef.current?.setTheme(theme);
  }, [theme]);

  return containerRef;
}
