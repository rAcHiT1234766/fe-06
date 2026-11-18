import { describe, expect, it } from 'vitest';
import type { Query, WidgetConfig } from '../types';
import {
  changeWidgetType,
  setAggregation,
  setDimension,
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
});
