import { describe, expect, it } from 'vitest';
import type { QueryResult, WidgetConfig } from '../../core/types';
import {
  buildBarOption,
  buildLineOption,
  buildPieOption,
  createMapOptionBuilder,
  mapClassColors,
  quantileBreaks,
} from './chart-options';

const populationByRegion: QueryResult = {
  columns: [
    { name: 'region', role: 'dimension', label: 'Region' },
    { name: 'population', role: 'measure', label: 'Population', format: 'number' },
  ],
  rows: [
    { region: 'South Asia', population: 2_000_000_000 },
    { region: 'East Asia & Pacific', population: 2_400_000_000 },
  ],
  meta: { rowCount: 2, truncated: false, durationMs: 1 },
};

const gdpByYear: QueryResult = {
  columns: [
    { name: 'year', role: 'dimension', label: 'Year', format: 'year' },
    { name: 'gdp', role: 'measure', label: 'GDP', format: 'currency' },
    { name: 'internetUsers', role: 'measure', label: 'Internet users', format: 'percent' },
  ],
  rows: [
    { year: 2023, gdp: 1.5e12, internetUsers: 61.25 },
    { year: 2024, gdp: null, internetUsers: 64 },
  ],
  meta: { rowCount: 2, truncated: false, durationMs: 1 },
};

const widget = (type: WidgetConfig['type'], options?: WidgetConfig['options']): WidgetConfig => ({
  id: 'w',
  type,
  title: 'Widget',
  query: { dataset: 'wdi', measures: [{ field: 'population' }] },
  ...(options && { options }),
});

type Series = { data: unknown[]; tooltip: { valueFormatter: (value: unknown) => string } };
const seriesOf = (option: object) => (option as { series: Series[] }).series;

describe('chart option builders', () => {
  it('draws one bar per category, keeping missing values as gaps', () => {
    const option = buildBarOption(gdpByYear, widget('bar'));
    expect(option.xAxis).toMatchObject({ type: 'category', data: ['2023', '2024'] });
    expect(seriesOf(option).map((series) => series.data)).toEqual([
      [{ value: 1.5e12 }, { value: null }],
      [{ value: 61.25 }, { value: 64 }],
    ]);
  });

  it('formats tooltip values with each measure’s own format', () => {
    const [gdp, internet] = seriesOf(buildBarOption(gdpByYear, widget('bar')));
    expect(gdp?.tooltip.valueFormatter(1.5e12)).toBe('$1,500,000,000,000');
    expect(gdp?.tooltip.valueFormatter(null)).toBe('—');
    expect(internet?.tooltip.valueFormatter(61.25)).toBe('61.3%');
  });

  it('labels the value axis compactly', () => {
    const { yAxis } = buildBarOption(populationByRegion, widget('bar')) as {
      yAxis: { axisLabel: { formatter: (value: number) => string } };
    };
    expect(yAxis.axisLabel.formatter(2_400_000_000)).toBe('2.4B');
  });

  it('shows a legend only when there is more than one series, unless configured', () => {
    expect(buildBarOption(populationByRegion, widget('bar')).legend).toMatchObject({ show: false });
    expect(buildBarOption(gdpByYear, widget('bar')).legend).toMatchObject({ show: true });
    expect(
      buildBarOption(populationByRegion, widget('bar', { showLegend: true })).legend,
    ).toMatchObject({ show: true });
  });

  it('swaps the axes for horizontal bars and keeps the sort order top to bottom', () => {
    const option = buildBarOption(populationByRegion, widget('bar', { orientation: 'horizontal' }));
    expect(option.xAxis).toMatchObject({ type: 'value' });
    expect(option.yAxis).toMatchObject({ type: 'category', inverse: true });
  });

  it('FR-6.8 shortens long category names beside horizontal bars on a phone', () => {
    const horizontal = widget('bar', { orientation: 'horizontal' });
    expect(buildBarOption(populationByRegion, horizontal, undefined, true).yAxis).toMatchObject({
      axisLabel: { width: 110, overflow: 'truncate' },
    });
    expect(buildBarOption(populationByRegion, horizontal).yAxis).not.toHaveProperty('axisLabel');
    expect(
      buildBarOption(populationByRegion, widget('bar'), undefined, true).xAxis,
    ).not.toHaveProperty('axisLabel');
  });

  it('stacks bars only when asked', () => {
    expect(seriesOf(buildBarOption(gdpByYear, widget('bar')))[0]).not.toHaveProperty('stack');
    expect(seriesOf(buildBarOption(gdpByYear, widget('bar', { stacked: true })))[0]).toMatchObject({
      stack: 'total',
    });
  });

  it('draws lines on an axis that does not have to start at zero', () => {
    const option = buildLineOption(gdpByYear, widget('line'));
    expect(option.yAxis).toMatchObject({ scale: true });
    expect(seriesOf(option)).toHaveLength(2);
  });

  it('FR-4.3 NFR-A4 keeps every item and marks the selection by opacity and outline', () => {
    const selection = { values: ['South Asia'], outlineColor: 'black' };
    const selected = { itemStyle: { borderColor: 'black', borderWidth: 2 } };
    const dimmed = { itemStyle: { opacity: 0.35 } };

    const [bars] = seriesOf(buildBarOption(populationByRegion, widget('bar'), selection));
    expect(bars?.data).toEqual([
      { value: 2_000_000_000, ...selected },
      { value: 2_400_000_000, ...dimmed },
    ]);
    const [slices] = seriesOf(buildPieOption(populationByRegion, widget('pie'), selection));
    expect(slices?.data).toEqual([
      { name: 'South Asia', value: 2_000_000_000, ...selected },
      { name: 'East Asia & Pacific', value: 2_400_000_000, ...dimmed },
    ]);
  });

  it('FR-4.5 marks the selected point of a line by its raw value', () => {
    const selection = { values: [2024], outlineColor: 'black' };
    const [gdp] = seriesOf(buildLineOption(gdpByYear, widget('line'), selection));
    expect(gdp?.data).toEqual([
      { value: 1.5e12, itemStyle: { opacity: 0.35 } },
      { value: null, itemStyle: { borderColor: 'black', borderWidth: 2 } },
    ]);
  });

  it('draws one labelled pie slice per category for the first measure', () => {
    const option = buildPieOption(gdpByYear, widget('pie', { donut: true }));
    expect(seriesOf(option)).toEqual([
      expect.objectContaining({
        radius: ['34%', '58%'],
        data: [
          { name: '2023', value: 1.5e12 },
          { name: '2024', value: '-' },
        ],
      }),
    ]);
    expect(option.legend).toMatchObject({ show: false });
    expect(buildPieOption(gdpByYear, widget('pie', { showLegend: true })).legend).toMatchObject({
      show: true,
    });
  });
});

describe('quantileBreaks', () => {
  it('starts five classes of about equal size', () => {
    const values = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    expect(quantileBreaks(values)).toEqual([3, 5, 7, 9]);
  });

  it('makes fewer classes rather than empty ones', () => {
    expect(quantileBreaks([1, 1, 1, 1, 1, 1, 1, 1, 2, 2])).toEqual([2]);
    expect(quantileBreaks([5])).toEqual([]);
    expect(quantileBreaks([])).toEqual([]);
  });
});

describe('createMapOptionBuilder', () => {
  const colors = {
    chart: ['#4f46e5'],
    surface: '#ffffff',
    surfaceRaised: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#475569',
  };
  const buildMapOption = createMapOptionBuilder(colors);

  const byCountry = (values: (number | null)[]): QueryResult => ({
    columns: [
      { name: 'country', role: 'dimension', label: 'Country' },
      { name: 'population', role: 'measure', label: 'Population', format: 'number' },
    ],
    rows: values.map((population, index) => ({ country: `Country ${index + 1}`, population })),
    meta: { rowCount: values.length, truncated: false, durationMs: 1 },
  });

  type MapSeries = Series & { map: string; top: number; left: number };
  const mapSeries = (option: object) => seriesOf(option)[0] as MapSeries;
  const piecesOf = (option: object) =>
    (option as { visualMap: { pieces: { color: string; label: string }[] } }).visualMap.pieces;

  it('colours countries in quantile classes, labelled by their bounds', () => {
    const option = buildMapOption(byCountry([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), widget('map'));
    const colorsOfClasses = mapClassColors(5, colors);
    expect(piecesOf(option)).toEqual([
      { lt: 3, color: colorsOfClasses[0], label: 'Under 3' },
      { gte: 3, lt: 5, color: colorsOfClasses[1], label: '3 to 5' },
      { gte: 5, lt: 7, color: colorsOfClasses[2], label: '5 to 7' },
      { gte: 7, lt: 9, color: colorsOfClasses[3], label: '7 to 9' },
      { gte: 9, color: colorsOfClasses[4], label: '9 and over' },
    ]);
  });

  it('runs the classes from near the surface, through the chart colour, towards the text', () => {
    expect(mapClassColors(5, colors)).toEqual([
      // 20%, 47% and 73% of the way from white to the chart colour,
      'rgba(220,218,250,1)',
      'rgba(173,169,243,1)',
      'rgba(126,119,236,1)',
      // the chart colour itself, exactly, though the arithmetic rounds past it,
      'rgba(79,70,229,1)',
      // and halfway to the text colour.
      'rgba(47,47,136,1)',
    ]);
    expect(mapClassColors(2, colors)).toEqual(['rgba(220,218,250,1)', 'rgba(47,47,136,1)']);
  });

  it('names each area after its country and leaves a missing value uncoloured', () => {
    const series = mapSeries(buildMapOption(byCountry([5, null]), widget('map')));
    expect(series.map).toBe('world');
    expect(series.data).toEqual([
      { name: 'Country 1', value: 5 },
      { name: 'Country 2', value: '-' },
    ]);
    expect(series.tooltip.valueFormatter(Number.NaN)).toBe('—');
    expect(mapSeries(buildMapOption(byCountry([5]), widget('map', { map: 'europe' }))).map).toBe(
      'europe',
    );
  });

  it('shows one class for a single value, and every class in a colour it cannot blend', () => {
    const option = buildMapOption(byCountry([5]), widget('map'));
    expect(piecesOf(option)).toEqual([{ color: '#4f46e5', label: 'All values' }]);
    const oklch = 'oklch(60% 0.2 270)';
    expect(mapClassColors(3, { ...colors, chart: [oklch] })).toEqual([oklch, oklch, oklch]);
  });

  it('FR-4.3 marks the selected countries, and puts the classes above a narrow map', () => {
    const selection = { values: ['Country 2'], outlineColor: '#000000' };
    const option = buildMapOption(byCountry([5, 6]), widget('map'), selection, true);
    const series = mapSeries(option);
    expect(series.data).toEqual([
      { name: 'Country 1', value: 5, itemStyle: { opacity: 0.35 } },
      { name: 'Country 2', value: 6, itemStyle: { borderColor: '#000000', borderWidth: 2 } },
    ]);
    expect([series.top, series.left]).toEqual([108, 8]);
    expect(option.visualMap).toMatchObject({ top: 8, left: 8 });
    expect(mapSeries(buildMapOption(byCountry([5, 6]), widget('map')))).toMatchObject({
      top: 8,
      left: 128,
    });
  });
});
