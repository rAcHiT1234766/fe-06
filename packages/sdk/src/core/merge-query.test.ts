import { describe, expect, it } from 'vitest';
import { applyDefaultFilters, mergeQuery } from './merge-query';
import type { DashboardConfig, Query } from './types';

const populationByIncome: Query = {
  dataset: 'wdi',
  measures: [{ field: 'population', agg: 'sum' }],
  dimensions: ['incomeLevel'],
  filters: [{ field: 'year', op: 'eq', value: 2024 }],
};

describe('mergeQuery', () => {
  it('FR-4.1 narrows a widget query with each active filter as an `in` condition', () => {
    const merged = mergeQuery(populationByIncome, [
      { field: 'region', values: ['South Asia'], sourceWidgetId: 'by-region' },
      { field: 'country', values: ['India', 'Nepal'], sourceWidgetId: 'countries' },
    ]);
    expect(merged).toEqual({
      ...populationByIncome,
      filters: [
        { field: 'year', op: 'eq', value: 2024 },
        { field: 'region', op: 'in', value: ['South Asia'] },
        { field: 'country', op: 'in', value: ['India', 'Nepal'] },
      ],
    });
    expect(populationByIncome.filters).toHaveLength(1);
  });

  it('returns the widget query itself when no filter applies, so nothing is fetched again', () => {
    expect(mergeQuery(populationByIncome, [])).toBe(populationByIncome);
  });
});

describe('applyDefaultFilters', () => {
  const dashboard: DashboardConfig = {
    id: 'overview',
    schemaVersion: 1,
    title: 'Overview',
    widgets: [
      { id: 'by-income', type: 'pie', title: 'By income', query: populationByIncome },
      {
        id: 'unlinked',
        type: 'kpi',
        title: 'Unlinked',
        query: { dataset: 'wdi', measures: [{ field: 'gdp' }] },
        crossFilter: { listen: false },
      },
    ],
    layouts: { lg: [] },
  };

  it('adds the default filters to every widget, including ones that ignore cross-filters', () => {
    const southAsia = { field: 'region' as const, op: 'eq' as const, value: 'South Asia' };
    const widgets = applyDefaultFilters({ ...dashboard, defaultFilters: [southAsia] });
    expect(widgets.map((widget) => widget.query.filters)).toEqual([
      [{ field: 'year', op: 'eq', value: 2024 }, southAsia],
      [southAsia],
    ]);
  });

  it('keeps the widgets as they are without default filters', () => {
    expect(applyDefaultFilters(dashboard)).toBe(dashboard.widgets);
  });
});
