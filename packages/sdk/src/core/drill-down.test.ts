import { describe, expect, it } from 'vitest';
import { drilledInto, drilledQuery, ownQuery } from './drill-down';
import type { ActiveFilter, WidgetConfig } from './types';

const regions: WidgetConfig = {
  id: 'regions',
  type: 'bar',
  title: 'Population by region',
  drillDown: 'country',
  query: {
    dataset: 'wdi',
    measures: [{ field: 'population', agg: 'sum' }],
    dimensions: ['region'],
    filters: [{ field: 'year', op: 'eq', value: 2024 }],
    orderBy: [{ field: 'population', direction: 'desc' }],
  },
};

const southAsia: ActiveFilter = {
  field: 'region',
  values: ['South Asia'],
  sourceWidgetId: 'regions',
};

describe('drilledInto', () => {
  it('finds the widget’s own selection on the field it is clicked on', () => {
    expect(drilledInto(regions, [southAsia])).toBe(southAsia);
  });

  it('ignores selections made elsewhere, by another widget or by the host', () => {
    expect(drilledInto(regions, [{ ...southAsia, sourceWidgetId: 'host' }])).toBeUndefined();
    expect(drilledInto(regions, [])).toBeUndefined();
  });

  it('does not drill a widget without drillDown, that does not emit, or that names its own field', () => {
    const plain: WidgetConfig = { ...regions };
    delete plain.drillDown;
    expect(drilledInto(plain, [southAsia])).toBeUndefined();
    expect(drilledInto({ ...regions, crossFilter: { emit: false } }, [southAsia])).toBeUndefined();
    expect(drilledInto({ ...regions, drillDown: 'region' }, [southAsia])).toBeUndefined();
  });
});

describe('drilledQuery', () => {
  it('groups by the drill-down field within the selected values', () => {
    expect(drilledQuery(regions.query, southAsia, 'country')).toEqual({
      ...regions.query,
      dimensions: ['country'],
      filters: [
        { field: 'year', op: 'eq', value: 2024 },
        { field: 'region', op: 'in', value: ['South Asia'] },
      ],
    });
  });

  it('sorts by the new field where the query sorted by the old one', () => {
    const byName = { ...regions.query, orderBy: [{ field: 'region', direction: 'asc' as const }] };
    expect(drilledQuery(byName, southAsia, 'country').orderBy).toEqual([
      { field: 'country', direction: 'asc' },
    ]);
  });

  it('keeps one of each dimension when the query already groups by the new field', () => {
    const both = { ...regions.query, dimensions: ['region' as const, 'country' as const] };
    expect(drilledQuery(both, southAsia, 'country').dimensions).toEqual(['country']);
  });

  it('keeps several selected values together', () => {
    const two = { ...southAsia, values: ['South Asia', 'East Asia & Pacific'] };
    expect(drilledQuery(regions.query, two, 'country').filters?.at(-1)).toEqual({
      field: 'region',
      op: 'in',
      value: ['South Asia', 'East Asia & Pacific'],
    });
  });
});

describe('ownQuery', () => {
  it('is the drilled query while drilled, and the widget’s own query otherwise', () => {
    expect(ownQuery(regions, [southAsia]).dimensions).toEqual(['country']);
    expect(ownQuery(regions, [])).toBe(regions.query);
  });
});
