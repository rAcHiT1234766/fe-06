import { useMemo, type ComponentType } from 'react';
import { formatValue } from '../../core/format';
import type { QueryResult, WidgetConfig, WidgetType } from '../../core/types';
import {
  buildBarOption,
  buildLineOption,
  buildPieOption,
  type BuildChartOption,
} from '../charts/chart-options';
import { buildEChartsTheme } from '../charts/echarts-theme';
import { useDashKit } from '../context';
import { useEChart } from '../hooks/use-echart';
import { DataTable } from './DataTable';

interface WidgetViewProps {
  widget: WidgetConfig;
  result: QueryResult;
}

function ChartView({
  widget,
  result,
  buildOption,
}: WidgetViewProps & { buildOption: BuildChartOption }) {
  const { theme } = useDashKit();
  const chartTheme = useMemo(() => buildEChartsTheme(theme), [theme]);
  const option = useMemo(() => buildOption(result, widget), [buildOption, result, widget]);
  const chartRef = useEChart(option, chartTheme);
  return (
    <>
      <div ref={chartRef} className="dk-chart" role="img" aria-label={`${widget.title} chart`} />
      {/* The canvas is invisible to screen readers, so they get the same numbers as a table. */}
      <div className="dk-visually-hidden">
        <DataTable result={result} caption={widget.title} />
      </div>
    </>
  );
}

function TableView({ widget, result }: WidgetViewProps) {
  return (
    // Focusable so keyboard users can scroll a table taller or wider than its widget.
    <div
      className="dk-table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${widget.title} table`}
    >
      <DataTable result={result} caption={widget.title} />
    </div>
  );
}

function KpiView({ result }: WidgetViewProps) {
  const measure = result.columns.find((column) => column.role === 'measure');
  const value = measure ? (result.rows[0]?.[measure.name] ?? null) : null;
  return (
    <p className="dk-kpi">
      <span className="dk-kpi-value">{formatValue(value, measure?.format, 'compact')}</span>
      <span className="dk-kpi-label">{measure?.label}</span>
    </p>
  );
}

export const widgetViews: Record<WidgetType, ComponentType<WidgetViewProps>> = {
  bar: (props) => <ChartView {...props} buildOption={buildBarOption} />,
  line: (props) => <ChartView {...props} buildOption={buildLineOption} />,
  pie: (props) => <ChartView {...props} buildOption={buildPieOption} />,
  table: TableView,
  kpi: KpiView,
};
