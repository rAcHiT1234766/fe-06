import type { BarSeriesOption, LineSeriesOption, PieSeriesOption } from 'echarts/charts';
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';
import { formatValue } from '../../core/format';
import type { QueryResult, WidgetConfig } from '../../core/types';

export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>;

type Column = QueryResult['columns'][number];

export type BuildChartOption = (result: QueryResult, widget: WidgetConfig) => ChartOption;

function describeResult({ columns, rows }: QueryResult) {
  const dimension = columns.find((column) => column.role === 'dimension');
  const categories = rows.map((row) =>
    dimension ? formatValue(row[dimension.name] ?? null, dimension.format) : '',
  );
  const measures = columns.filter((column) => column.role === 'measure');
  const valuesOf = (measure: Column) =>
    rows.map((row) => {
      const value = row[measure.name];
      return typeof value === 'number' ? value : null;
    });
  return { categories, measures, valuesOf };
}

const tooltipFor = (measure: Column) => ({
  valueFormatter: (value: unknown) =>
    formatValue(typeof value === 'number' ? value : null, measure.format),
});

const valueAxisFor = (measure: Column | undefined) => ({
  type: 'value' as const,
  axisLabel: {
    formatter: (value: number) => formatValue(value, measure?.format, 'compact'),
  },
});

function legendFor(widget: WidgetConfig, seriesCount: number) {
  const show = widget.options?.showLegend ?? seriesCount > 1;
  return {
    legend: { show, type: 'scroll' as const, bottom: 0 },
    grid: { top: 16, right: 16, bottom: show ? 40 : 8, left: 8 },
  };
}

export const buildBarOption: BuildChartOption = (result, widget) => {
  const { categories, measures, valuesOf } = describeResult(result);
  const isHorizontal = widget.options?.orientation === 'horizontal';
  // Reading top to bottom should follow the query's sort order, which a y axis would reverse.
  const categoryAxis = { type: 'category' as const, data: categories, inverse: isHorizontal };
  const valueAxis = valueAxisFor(measures[0]);
  return {
    ...legendFor(widget, measures.length),
    tooltip: { trigger: 'axis' },
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    series: measures.map((measure) => ({
      type: 'bar',
      name: measure.label,
      data: valuesOf(measure),
      tooltip: tooltipFor(measure),
      ...(widget.options?.stacked && { stack: 'total' }),
    })),
  };
};

export const buildLineOption: BuildChartOption = (result, widget) => {
  const { categories, measures, valuesOf } = describeResult(result);
  return {
    ...legendFor(widget, measures.length),
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categories, boundaryGap: false },
    // Starting the axis at zero would flatten series such as life expectancy into a straight line.
    yAxis: { ...valueAxisFor(measures[0]), scale: true },
    series: measures.map((measure) => ({
      type: 'line',
      name: measure.label,
      data: valuesOf(measure),
      tooltip: tooltipFor(measure),
    })),
  };
};

export const buildPieOption: BuildChartOption = (result, widget) => {
  const { categories, measures, valuesOf } = describeResult(result);
  // Each slice is labelled directly, so a legend would only repeat the names.
  const showLegend = widget.options?.showLegend ?? false;
  return {
    legend: { show: showLegend, type: 'scroll', bottom: 0 },
    tooltip: { trigger: 'item' },
    // A pie shows a single measure: the first one in the query.
    series: measures.slice(0, 1).map((measure) => {
      const values = valuesOf(measure);
      return {
        type: 'pie',
        name: measure.label,
        radius: widget.options?.donut ? ['34%', '58%'] : '58%',
        center: ['50%', showLegend ? '45%' : '50%'],
        // A smaller pie with short label lines leaves room for long category names to wrap by word.
        label: { overflow: 'break' },
        labelLine: { length: 8, length2: 8 },
        // '-' is how ECharts marks a missing value in a pie.
        data: categories.map((name, index) => ({ name, value: values[index] ?? '-' })),
        tooltip: tooltipFor(measure),
      };
    }),
  };
};
