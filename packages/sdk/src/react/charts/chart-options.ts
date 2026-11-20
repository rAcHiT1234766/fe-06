import type {
  BarSeriesOption,
  LineSeriesOption,
  MapSeriesOption,
  PieSeriesOption,
} from 'echarts/charts';
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components';
import { color, type ComposeOption } from 'echarts/core';
import { formatValue } from '../../core/format';
import type { ColorTokens, QueryResult, Scalar, WidgetConfig } from '../../core/types';

export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | MapSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
>;

type Column = QueryResult['columns'][number];

/** The values a chart's own cross-filter selected, and the colour that outlines them. */
export interface ChartSelection {
  values: Scalar[];
  outlineColor: string;
}

/**
 * `isCompact` is set on a phone or tablet-sized dashboard, below 900 px, where a chart may have half
 * of that width or less.
 */
export type BuildChartOption = (
  result: QueryResult,
  widget: WidgetConfig,
  selection?: ChartSelection,
  isCompact?: boolean,
) => ChartOption;

// On a narrow chart, long category names beside horizontal bars would leave no room for the bars.
// The full names stay in the tooltip and in the chart's data table.
const COMPACT_CATEGORY_LABEL = { width: 110, overflow: 'truncate' as const };

function describeResult({ columns, rows }: QueryResult) {
  const dimension = columns.find((column) => column.role === 'dimension');
  const keys = rows.map((row) => (dimension ? (row[dimension.name] ?? null) : null));
  const categories = keys.map((key) => (dimension ? formatValue(key, dimension.format) : ''));
  const measures = columns.filter((column) => column.role === 'measure');
  const valuesOf = (measure: Column) =>
    rows.map((row) => {
      const value = row[measure.name];
      return typeof value === 'number' ? value : null;
    });
  return { keys, categories, measures, valuesOf };
}

// Dimming the other items and outlining the selected ones shows the selection without relying on
// colour alone.
function markSelection<Item extends object>(
  item: Item,
  key: Scalar,
  selection: ChartSelection | undefined,
) {
  if (!selection) return item;
  const itemStyle = selection.values.includes(key)
    ? { borderColor: selection.outlineColor, borderWidth: 2 }
    : { opacity: 0.35 };
  return { ...item, itemStyle };
}

const seriesData = (
  values: (number | null)[],
  keys: Scalar[],
  selection: ChartSelection | undefined,
) => values.map((value, index) => markSelection({ value }, keys[index] ?? null, selection));

// ECharts passes NaN for a missing value in a pie or a map, which reads as "no value", not a number.
const tooltipFor = (measure: Column) => ({
  valueFormatter: (value: unknown) =>
    formatValue(typeof value === 'number' && !Number.isNaN(value) ? value : null, measure.format),
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

export const buildBarOption: BuildChartOption = (result, widget, selection, isCompact) => {
  const { keys, categories, measures, valuesOf } = describeResult(result);
  const isHorizontal = widget.options?.orientation === 'horizontal';
  // Reading top to bottom should follow the query's sort order, which a y axis would reverse.
  const categoryAxis = {
    type: 'category' as const,
    data: categories,
    inverse: isHorizontal,
    ...(isHorizontal && isCompact && { axisLabel: COMPACT_CATEGORY_LABEL }),
  };
  const valueAxis = valueAxisFor(measures[0]);
  return {
    ...legendFor(widget, measures.length),
    tooltip: { trigger: 'axis' },
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    series: measures.map((measure) => ({
      type: 'bar',
      name: measure.label,
      data: seriesData(valuesOf(measure), keys, selection),
      tooltip: tooltipFor(measure),
      ...(widget.options?.stacked && { stack: 'total' }),
    })),
  };
};

export const buildLineOption: BuildChartOption = (result, widget, selection) => {
  const { keys, categories, measures, valuesOf } = describeResult(result);
  return {
    ...legendFor(widget, measures.length),
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categories, boundaryGap: false },
    // Starting the axis at zero would flatten series such as life expectancy into a straight line.
    yAxis: { ...valueAxisFor(measures[0]), scale: true },
    series: measures.map((measure) => ({
      type: 'line',
      name: measure.label,
      data: seriesData(valuesOf(measure), keys, selection),
      tooltip: tooltipFor(measure),
    })),
  };
};

export const buildPieOption: BuildChartOption = (result, widget, selection) => {
  const { keys, categories, measures, valuesOf } = describeResult(result);
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
        data: categories.map((name, index) =>
          // '-' is how ECharts marks a missing value in a pie.
          markSelection(
            { name, value: values[index] ?? ('-' as const) },
            keys[index] ?? null,
            selection,
          ),
        ),
        tooltip: tooltipFor(measure),
      };
    }),
  };
};

/**
 * The values at which a map's colour classes start: quantiles, so each of up to `classes` classes
 * holds about as many countries. On a linear scale the two countries above a billion people would
 * leave nearly every other country in the palest shade.
 */
export function quantileBreaks(values: number[], classes = 5): number[] {
  const sorted = values.toSorted((a, b) => a - b);
  const breaks: number[] = [];
  for (let index = 1; index < classes; index++) {
    const value = sorted[Math.floor((index * sorted.length) / classes)];
    const previous = breaks.at(-1) ?? sorted[0];
    // Equal quantiles would make empty classes, so a class starts only above the last one.
    if (value !== undefined && previous !== undefined && value > previous) breaks.push(value);
  }
  return breaks;
}

type MapColors = Pick<ColorTokens, 'chart' | 'surface' | 'surfaceRaised' | 'text' | 'textMuted'>;

// ECharts' parser is typed as always returning channels, but returns undefined for a colour it
// cannot read, such as oklch().
const canBlend = (value: string) => (color.parse(value) as number[] | undefined) !== undefined;

/**
 * The colours of `count` classes, one hue from light to dark: from near the surface, through the
 * theme's first chart colour, to a shade towards the text colour, so the top classes differ as much
 * as the bottom ones. In dark mode the text is light, so the largest values are the lightest, which
 * stand out most on a dark surface. Colours ECharts cannot blend leave every class in the chart
 * colour; `MapView` converts them first, so that happens only where nothing can be drawn.
 */
export function mapClassColors(count: number, colors: MapColors): string[] {
  const base = colors.chart[0] ?? colors.text;
  if (count === 1) return [base];
  if (![base, colors.surface, colors.text].every(canBlend)) return Array<string>(count).fill(base);
  // Three quarters of the way is the chart colour itself. ECharts blends nothing past 1, which
  // rounding can reach there.
  const shade = (position: number) =>
    position <= 0.75
      ? color.lerp(Math.min(1, 0.2 + (0.8 * position) / 0.75), [colors.surface, base])
      : color.lerp((0.5 * (position - 0.75)) / 0.25, [base, colors.text]);
  return Array.from({ length: count }, (_, index) => shade(index / (count - 1)));
}

/**
 * A map of the first measure, one country per row, coloured in quantile classes of one hue.
 * Countries with no value keep the raised surface colour and say "—" in the tooltip.
 */
export function createMapOptionBuilder(colors: MapColors): BuildChartOption {
  return (result, widget, selection, isCompact) => {
    const { keys, measures, valuesOf } = describeResult(result);
    const measure = measures[0];
    const values = measure ? valuesOf(measure) : [];
    const breaks = quantileBreaks(values.filter((value) => value !== null));
    const classColors = mapClassColors(breaks.length + 1, colors);
    const label = (value: number) => formatValue(value, measure?.format, 'compact');
    const bounds = [undefined, ...breaks, undefined];
    const pieces = bounds.slice(0, -1).map((gte, index) => {
      const lt = bounds[index + 1];
      return {
        ...(gte !== undefined && { gte }),
        ...(lt !== undefined && { lt }),
        color: classColors[index],
        label:
          gte === undefined
            ? lt === undefined
              ? 'All values'
              : `Under ${label(lt)}`
            : lt === undefined
              ? `${label(gte)} and over`
              : `${label(gte)} to ${label(lt)}`,
      };
    });
    return {
      tooltip: { trigger: 'item' },
      // The classes are listed at the bottom left, beside the map. A narrow map is short, so they go
      // above it, which leaves any room to spare below the map rather than between the two.
      visualMap: {
        type: 'piecewise',
        pieces,
        selectedMode: false,
        orient: 'vertical',
        left: 8,
        ...(isCompact ? { top: 8 } : { bottom: 8 }),
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 4,
        textStyle: { color: colors.textMuted },
      },
      series: measure
        ? [
            {
              type: 'map',
              map: widget.options?.map ?? 'world',
              name: measure.label,
              roam: false,
              selectedMode: false,
              // Room for the five classes, a line of text each, above a narrow map; beside a wide one.
              top: isCompact ? 108 : 8,
              right: 8,
              bottom: 8,
              left: isCompact ? 8 : 128,
              // Without it the map stretches to fill the space left, squashing the countries.
              preserveAspect: 'contain',
              ...(isCompact && { preserveAspectVerticalAlign: 'top' }),
              label: { show: false },
              itemStyle: { areaColor: colors.surfaceRaised, borderColor: colors.surface },
              emphasis: {
                label: { show: false },
                // No hover fill, so a country keeps its class colour and gains an outline. ECharts
                // documents null for this, which its types leave out.
                itemStyle: {
                  areaColor: null as unknown as string,
                  borderColor: colors.text,
                  borderWidth: 1,
                },
              },
              data: values.map((value, index) =>
                // '-' is how ECharts marks a missing value, which no class colours.
                markSelection(
                  { name: String(keys[index] ?? ''), value: value ?? ('-' as const) },
                  keys[index] ?? null,
                  selection,
                ),
              ),
              tooltip: tooltipFor(measure),
            },
          ]
        : [],
    };
  };
}
