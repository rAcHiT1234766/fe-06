import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { formatValue } from '../../core/format';
import type { QueryResult, WidgetConfig } from '../../core/types';
import {
  buildBarOption,
  buildLineOption,
  buildPieOption,
  createMapOptionBuilder,
  type BuildChartOption,
} from '../charts/chart-options';
import { toBlendableColor } from '../charts/blendable-color';
import { useIsMapRegistered } from '../charts/maps';
import { BreakpointContext } from '../breakpoint-context';
import { buildEChartsTheme } from '../charts/echarts-theme';
import { useDashKit } from '../context';
import { isProduction } from '../environment';
import { useSelection } from '../hooks/use-cross-filter';
import { useEChart } from '../hooks/use-echart';
import { DataTable } from './DataTable';
import { Pager, usePagedResult } from './Pager';

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
  const selection = useSelection(widget, result);
  const selectedValues = selection?.values;
  const outlineColor = theme.colors.text;
  const chartTheme = useMemo(() => buildEChartsTheme(theme), [theme]);
  const breakpoint = useContext(BreakpointContext);
  const isCompact = breakpoint === 'xs' || breakpoint === 'sm';
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
    selection &&
      ((rowIndex, isAdditive) => {
        // A map also reports clicks on countries with no row, which select nothing.
        const row = result.rows[rowIndex];
        if (row) selection.toggle(row[selection.field] ?? null, isAdditive);
      }),
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
  const selection = useSelection(widget, result);
  const paged = usePagedResult(result, widget.options?.pageSize);
  useDrawnInNextFrame(widget.id, selection?.values ?? paged.result);
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <>
      {/* Focusable so keyboard users can scroll a table taller or wider than its widget. */}
      <div
        ref={scrollRef}
        className="dk-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${widget.title} table`}
      >
        <DataTable result={paged.result} caption={widget.title} selection={selection} />
      </div>
      {paged.page && (
        <Pager
          label={`Pages of ${widget.title}`}
          page={paged.page}
          onPage={(index) => {
            paged.showPage(index);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }}
        />
      )}
    </>
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
/**
 * A map of countries. Until the host has registered its borders, the same figures show as a table,
 * and in development the console says which map is missing.
 */
export function MapView(props: WidgetViewProps) {
  const { theme } = useDashKit();
  const name = props.widget.options?.map ?? 'world';
  const isRegistered = useIsMapRegistered(name);
  const buildOption = useMemo(() => {
    const { chart, surface, text } = theme.colors;
    return createMapOptionBuilder({
      ...theme.colors,
      chart: chart.slice(0, 1).map(toBlendableColor),
      surface: toBlendableColor(surface),
      text: toBlendableColor(text),
    });
  }, [theme.colors]);
  useEffect(() => {
    if (isRegistered || isProduction()) return;
    const timer = setTimeout(
      () => console.warn(`DashKit: no map named "${name}" has been registered with registerMap().`),
      5000,
    );
    return () => clearTimeout(timer);
  }, [isRegistered, name]);
  return isRegistered ? (
    <ChartView {...props} buildOption={buildOption} />
  ) : (
    <TableView {...props} />
  );
}

export { KpiView, TableView, type WidgetViewProps };
