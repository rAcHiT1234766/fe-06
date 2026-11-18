import { useContext, useLayoutEffect, useMemo } from 'react';
import { formatValue } from '../../core/format';
import type { QueryResult, WidgetConfig } from '../../core/types';
import {
  buildBarOption,
  buildLineOption,
  buildPieOption,
  type BuildChartOption,
} from '../charts/chart-options';
import { BreakpointContext } from '../breakpoint-context';
import { buildEChartsTheme } from '../charts/echarts-theme';
import { useDashKit } from '../context';
import { useSelection } from '../hooks/use-cross-filter';
import { useEChart } from '../hooks/use-echart';
import { DataTable } from './DataTable';

interface WidgetViewProps {
  widget: WidgetConfig;
  result: QueryResult;
}

/** Reports drawing `content` to the render timing; the browser has painted it by the next frame. */
function useDrawnInNextFrame(widgetId: string, content: unknown) {
  const { timing } = useDashKit();
  useLayoutEffect(() => {
    timing.started(widgetId);
    const frame = requestAnimationFrame(() => timing.finished(widgetId, 'other'));
    return () => cancelAnimationFrame(frame);
  }, [timing, widgetId, content]);
}

function ChartView({
  widget,
  result,
  buildOption,
}: WidgetViewProps & { buildOption: BuildChartOption }) {
  const { theme, timing } = useDashKit();
  const selection = useSelection(widget);
  const selectedValues = selection?.values;
  const outlineColor = theme.colors.text;
  const chartTheme = useMemo(() => buildEChartsTheme(theme), [theme]);
  const isCompact = useContext(BreakpointContext) === 'xs';
  const option = useMemo(
    () =>
      buildOption(
        result,
        widget,
        selectedValues && { values: selectedValues, outlineColor },
        isCompact,
      ),
    [buildOption, result, widget, selectedValues, outlineColor, isCompact],
  );
  // The chart reports when ECharts has finished drawing this option.
  useLayoutEffect(() => timing.started(widget.id), [timing, widget.id, option]);
  const chartRef = useEChart(
    option,
    chartTheme,
    selection && ((rowIndex) => selection.toggle(result.rows[rowIndex]?.[selection.field] ?? null)),
    () => timing.finished(widget.id, 'chart'),
  );
  return (
    <>
      <div ref={chartRef} className="dk-chart" role="img" aria-label={`${widget.title} chart`} />
      {/* The canvas is out of reach for screen readers and keyboards, so they get the same numbers,
          and the same filter buttons, as a table. */}
      <div className="dk-visually-hidden dk-chart-data">
        <DataTable result={result} caption={widget.title} selection={selection} />
      </div>
    </>
  );
}

function TableView({ widget, result }: WidgetViewProps) {
  const selection = useSelection(widget);
  useDrawnInNextFrame(widget.id, selection?.values ?? result);
  return (
    // Focusable so keyboard users can scroll a table taller or wider than its widget.
    <div
      className="dk-table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${widget.title} table`}
    >
      <DataTable result={result} caption={widget.title} selection={selection} />
    </div>
  );
}

function KpiView({ widget, result }: WidgetViewProps) {
  useDrawnInNextFrame(widget.id, result);
  const measure = result.columns.find((column) => column.role === 'measure');
  const value = measure ? (result.rows[0]?.[measure.name] ?? null) : null;
  return (
    <p className="dk-kpi">
      <span className="dk-kpi-value">{formatValue(value, measure?.format, 'compact')}</span>
      <span className="dk-kpi-label">{measure?.label}</span>
    </p>
  );
}

export const BarView = (props: WidgetViewProps) => (
  <ChartView {...props} buildOption={buildBarOption} />
);
export const LineView = (props: WidgetViewProps) => (
  <ChartView {...props} buildOption={buildLineOption} />
);
export const PieView = (props: WidgetViewProps) => (
  <ChartView {...props} buildOption={buildPieOption} />
);
export { KpiView, TableView, type WidgetViewProps };
