import { describe, expect, it } from 'vitest';
import type { Query, WidgetConfig } from '../types';
import {
  changedSetting,
  changeWidgetType,
  fitToCatalog,
  setAggregation,
  setDimension,
  setDrillDown,
  setMeasure,
  setPageSize,
  setRowLimit,
  setSortOrder,
} from './edit-widget';

const in2024 = { field: 'year' as const, op: 'eq' as const, value: 2024 };
const southAsia = { field: 'region' as const, op: 'in' as const, value: ['South Asia'] };

const gdpByRegion: WidgetConfig = {
  id: 'gdp-by-region',
  type: 'bar',
  title: 'GDP by region',
  query: {
    dataset: 'wdi',
    measures: [{ field: 'gdp', agg: 'sum' }],
    dimensions: ['region'],
    filters: [in2024, southAsia],
    orderBy: [{ field: 'gdp', direction: 'desc' }],
    limit: 5,
  },
  options: { orientation: 'horizontal' },
  crossFilter: { emit: false },
};

const countries: WidgetConfig = {
  id: 'countries',
  type: 'table',
  title: 'Countries',
  query: {
    dataset: 'wdi',
    measures: [
      { field: 'gdpPerCapita', agg: 'avg' },
      { field: 'lifeExpectancy', agg: 'avg', alias: 'life' },
    ],
    dimensions: ['country', 'region'],
    filters: [in2024],
    orderBy: [{ field: 'region', direction: 'asc' }],
  },
};

const byIncome: Query = {
  dataset: 'wdi',
  measures: [{ field: 'population' }],
  dimensions: ['incomeLevel'],
};
const byYear: Query = { dataset: 'wdi', measures: [{ field: 'population' }], dimensions: ['year'] };

describe('changeWidgetType', () => {
  it('FR-5.5 keeps the settings the new type can use and drops options of the old type', () => {
    expect(changeWidgetType(gdpByRegion, 'pie', byIncome, 2024)).toEqual({
      id: 'gdp-by-region',
      type: 'pie',
      title: 'GDP by region',
      query: gdpByRegion.query,
      crossFilter: { emit: false },
    });
  });

  it('FR-5.5 turns a widget into a KPI of its first measure, for the latest year', () => {
    const kpi = changeWidgetType(countries, 'kpi', byIncome, 2024);
    expect(kpi.query).toEqual({
      dataset: 'wdi',
      measures: [{ field: 'gdpPerCapita', agg: 'avg' }],
      filters: [in2024],
    });
  });

  it('FR-5.5 groups a KPI the way the new type starts, with every year for a line', () => {
    const kpi = changeWidgetType(gdpByRegion, 'kpi', byIncome, 2024);
    expect(changeWidgetType(kpi, 'pie', byIncome, 2024).query.dimensions).toEqual(['incomeLevel']);
    const line = changeWidgetType(kpi, 'line', byYear, 2024);
    expect(line.query.dimensions).toEqual(['year']);
    expect(line.query.filters).toEqual([southAsia]);
  });

  it('FR-5.5 keeps one grouping for a chart, and only sorting by columns it still has', () => {
    const bar = changeWidgetType(countries, 'bar', byIncome, 2024);
    expect(bar.query.dimensions).toEqual(['country']);
    expect(bar.query).not.toHaveProperty('orderBy');
    expect(changeWidgetType(countries, 'table', byIncome, 2024)).toBe(countries);
  });

  it('FR-5.5 groups a map by country alone, with every country and its own filters', () => {
    const map = changeWidgetType(gdpByRegion, 'map', byIncome, 2024);
    expect(map).toEqual({
      id: 'gdp-by-region',
      type: 'map',
      title: 'GDP by region',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'gdp', agg: 'sum' }],
        dimensions: ['country'],
        filters: [in2024, southAsia],
      },
      crossFilter: { emit: false },
    });
    const kpi = changeWidgetType(gdpByRegion, 'kpi', byIncome, 2024);
    expect(changeWidgetType(kpi, 'map', byIncome, 2024).query.dimensions).toEqual(['country']);
  });
});

describe('editing one setting', () => {
  it('FR-5.5 swaps the first measure, with its usual aggregation, and sorts by the new one', () => {
    const population = setMeasure(gdpByRegion, 'population', 'sum');
    expect(population.query.measures).toEqual([{ field: 'population', agg: 'sum' }]);
    expect(population.query.orderBy).toEqual([{ field: 'population', direction: 'desc' }]);

    const income = setMeasure(countries, 'gdp', 'sum');
    expect(income.query.measures).toEqual([
      { field: 'gdp', agg: 'sum' },
      { field: 'lifeExpectancy', agg: 'avg', alias: 'life' },
    ]);
  });

  it('FR-5.5 changes the aggregation of the first measure', () => {
    expect(setAggregation(gdpByRegion, 'max').query.measures).toEqual([
      { field: 'gdp', agg: 'max' },
    ]);
  });

  it('FR-5.5 groups by another dimension, showing every year only when grouped by year', () => {
    const byIncomeLevel = setDimension(countries, 'incomeLevel', 2024);
    expect(byIncomeLevel.query.dimensions).toEqual(['incomeLevel', 'region']);
    expect(setDimension(countries, 'region', 2024).query.dimensions).toEqual(['region']);

    const overTime = setDimension(gdpByRegion, 'year', 2024);
    expect(overTime.query.filters).toEqual([southAsia]);
    expect(setDimension(overTime, 'region', 2024).query.filters).toEqual([southAsia, in2024]);
  });

  it('FR-5.5 keeps sorting on the grouping when the grouping changes', () => {
    expect(setDimension(countries, 'incomeLevel', 2024).query.orderBy).toEqual(
      countries.query.orderBy,
    );
    const sortedByCountry = setSortOrder(countries, { field: 'country', direction: 'asc' });
    expect(setDimension(sortedByCountry, 'incomeLevel', 2024).query.orderBy).toEqual([
      { field: 'incomeLevel', direction: 'asc' },
    ]);
  });

  it('FR-5.5 sets and clears the sort order and the row limit', () => {
    const order = { field: 'region', direction: 'asc' } as const;
    expect(setSortOrder(gdpByRegion, order).query.orderBy).toEqual([order]);
    expect(setSortOrder(gdpByRegion, undefined).query).not.toHaveProperty('orderBy');
    expect(setRowLimit(gdpByRegion, 10).query.limit).toBe(10);
    expect(setRowLimit(gdpByRegion, undefined).query).not.toHaveProperty('limit');
  });

  it('FR-5.5 sets and clears the rows a table shows a page, keeping its other options', () => {
    const paged = setPageSize(gdpByRegion, 10);
    expect(paged.options).toEqual({ ...gdpByRegion.options, pageSize: 10 });
    expect(setPageSize(paged, undefined).options).toEqual(gdpByRegion.options);
    const plain: WidgetConfig = { ...gdpByRegion };
    delete plain.options;
    expect(setPageSize(setPageSize(plain, 5), undefined)).not.toHaveProperty('options');
  });

  it('sets and clears the field a click drills down to', () => {
    const drilling = setDrillDown(gdpByRegion, 'country');
    expect(drilling.drillDown).toBe('country');
    expect(setDrillDown(drilling, undefined)).toEqual(gdpByRegion);
  });

  it('drops the drill-down when the widget is grouped by that field, or cannot drill', () => {
    const drilling = setDrillDown(gdpByRegion, 'country');
    expect(setDimension(drilling, 'incomeLevel', 2024).drillDown).toBe('country');
    expect(setDimension(drilling, 'country', 2024)).not.toHaveProperty('drillDown');
    expect(changeWidgetType(drilling, 'pie', byIncome, 2024).drillDown).toBe('country');
    expect(changeWidgetType(drilling, 'line', byYear, 2024)).not.toHaveProperty('drillDown');
    expect(changeWidgetType(drilling, 'kpi', byYear, 2024)).not.toHaveProperty('drillDown');
  });
});

describe('fitToCatalog', () => {
  // As the API's /meta lists them for a user whose column scope leaves out both GDP measures.
  const withoutGdp = {
    dimensions: [{ name: 'region' as const, label: 'Region' }],
    measures: [
      {
        name: 'population' as const,
        label: 'Population',
        format: 'number' as const,
        defaultAgg: 'sum' as const,
      },
      {
        name: 'lifeExpectancy' as const,
        label: 'Life expectancy (years)',
        format: 'number' as const,
        defaultAgg: 'avg' as const,
      },
    ],
  };

  it('FR-3.11 moves a new widget off a measure outside the column scope, sorting and title too', () => {
    expect(fitToCatalog(gdpByRegion, withoutGdp)).toEqual({
      ...gdpByRegion,
      title: 'Population by region',
      query: {
        ...gdpByRegion.query,
        measures: [{ field: 'population', agg: 'sum' }],
        orderBy: [{ field: 'population', direction: 'desc' }],
      },
    });
    const kpi: WidgetConfig = {
      id: 'total-gdp',
      type: 'kpi',
      title: 'Total GDP',
      query: { dataset: 'wdi', measures: [{ field: 'gdp', agg: 'sum' }], filters: [in2024] },
    };
    expect(fitToCatalog(kpi, withoutGdp)).toMatchObject({
      title: 'Population',
      query: { measures: [{ field: 'population', agg: 'sum' }], filters: [in2024] },
    });
  });

  it('FR-3.11 leaves a widget alone when its measure is allowed, or no measure is', () => {
    const lifeByRegion = setMeasure(gdpByRegion, 'lifeExpectancy', 'avg');
    expect(fitToCatalog(lifeByRegion, withoutGdp)).toBe(lifeByRegion);
    expect(fitToCatalog(gdpByRegion, { ...withoutGdp, measures: [] })).toBe(gdpByRegion);
  });
});

describe('changedSetting', () => {
  it('FR-5.10 names the one setting an edit changed, so that a run of them is one undo step', () => {
    expect(changedSetting(gdpByRegion, { ...gdpByRegion, title: 'GDP' })).toBe('title');
    expect(changedSetting(gdpByRegion, setRowLimit(gdpByRegion, 3))).toBe('query.limit');
    expect(changedSetting(countries, setPageSize(countries, 10))).toBe('options.pageSize');
    expect(changedSetting(gdpByRegion, { ...gdpByRegion, crossFilter: { emit: true } })).toBe(
      'crossFilter.emit',
    );
  });

  it('FR-5.10 names none when an edit changed several settings, or nothing', () => {
    // A new measure renames the sort that used the old one.
    expect(changedSetting(gdpByRegion, setMeasure(gdpByRegion, 'population', 'sum'))).toBe(
      undefined,
    );
    expect(changedSetting(gdpByRegion, { ...gdpByRegion })).toBe(undefined);
  });
});
