import { describe, expect, it } from 'vitest';
import { mergeQuery } from './merge-query';
import type { Query } from './types';

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
