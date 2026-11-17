import { describe, expect, it } from 'vitest';
import type { QueryResult, WidgetConfig } from '../../core/types';
import { buildBarOption, buildLineOption, buildPieOption } from './chart-options';

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
      [1.5e12, null],
      [61.25, 64],
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
