import { describe, expect, it, vi } from 'vitest';
import { createFilterStore, emittedField, filtersFor } from './filter-store';
import type { ActiveFilter, WidgetConfig } from './types';

const widget = (overrides: Partial<WidgetConfig> = {}): WidgetConfig => ({
  id: 'by-region',
  type: 'bar',
  title: 'Population by region',
  query: { dataset: 'wdi', measures: [{ field: 'population' }], dimensions: ['region'] },
  ...overrides,
});

const southAsia: ActiveFilter = {
  field: 'region',
  values: ['South Asia'],
  sourceWidgetId: 'by-region',
};

describe('createFilterStore', () => {
  it('FR-4.1 selects the clicked value for its field', () => {
    const store = createFilterStore();
    store.toggle('region', 'South Asia', 'by-region');
    expect(store.getFilters()).toEqual([southAsia]);
  });

  it('FR-4.2 removes the filter when the same value is clicked again', () => {
    const store = createFilterStore();
    store.toggle('region', 'South Asia', 'by-region');
    store.toggle('region', 'South Asia', 'by-region');
    expect(store.getFilters()).toEqual([]);
  });

  it('replaces the value when another one is clicked, keeping the filter in place', () => {
    const byIncome: ActiveFilter = {
      field: 'incomeLevel',
      values: ['Low income'],
      sourceWidgetId: 'pie',
    };
    const store = createFilterStore([southAsia, byIncome]);
    store.toggle('region', 'East Asia & Pacific', 'by-region');
    expect(store.getFilters()).toEqual([
      { ...southAsia, values: ['East Asia & Pacific'] },
      byIncome,
    ]);
  });

  it('FR-4.10 adds a value to the widget’s selection with additive, and takes one out again', () => {
    const store = createFilterStore();
    store.toggle('region', 'South Asia', 'by-region', true);
    store.toggle('region', 'North America', 'by-region', true);
    expect(store.getFilters()).toEqual([{ ...southAsia, values: ['South Asia', 'North America'] }]);
    store.toggle('region', 'South Asia', 'by-region', true);
    expect(store.getFilters()).toEqual([{ ...southAsia, values: ['North America'] }]);
    store.toggle('region', 'North America', 'by-region', true);
    expect(store.getFilters()).toEqual([]);
  });

  it('FR-4.10 lets a plain click replace several selected values with one', () => {
    const store = createFilterStore([{ ...southAsia, values: ['South Asia', 'North America'] }]);
    store.toggle('region', 'South Asia', 'by-region');
    expect(store.getFilters()).toEqual([southAsia]);
  });

  it('FR-4.10 starts a new selection, as a click does, rather than add to another widget’s', () => {
    const fromHost: ActiveFilter = { ...southAsia, sourceWidgetId: 'host' };
    const store = createFilterStore([fromHost]);
    store.toggle('region', 'North America', 'by-region', true);
    expect(store.getFilters()).toEqual([{ ...southAsia, values: ['North America'] }]);
  });

  it('sets a field’s selection from a filter control, replacing a click’s, and clears it', () => {
    const store = createFilterStore([southAsia]);
    const listener = vi.fn();
    store.subscribe(listener);
    store.select('region', ['East Asia & Pacific'], 'filter-control');
    expect(store.getFilters()).toEqual([
      { field: 'region', values: ['East Asia & Pacific'], sourceWidgetId: 'filter-control' },
    ]);
    store.select('year', [2010], 'filter-control');
    expect(store.getFilters()).toHaveLength(2);
    store.select('region', [], 'filter-control');
    expect(store.getFilters()).toEqual([
      { field: 'year', values: [2010], sourceWidgetId: 'filter-control' },
    ]);
    expect(listener).toHaveBeenCalledTimes(3);
    // Clearing a field with no selection changes nothing, so nobody is told of a change.
    store.select('country', [], 'filter-control');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('removes one field or every filter', () => {
    const store = createFilterStore([southAsia]);
    store.toggle('year', 2024, 'trend');
    store.remove('region');
    expect(store.getFilters()).toEqual([
      { field: 'year', values: [2024], sourceWidgetId: 'trend' },
    ]);
    store.clearAll();
    expect(store.getFilters()).toEqual([]);
  });

  it('FR-4.9 notifies subscribers of every change, including filters set by the host', () => {
    const store = createFilterStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set([southAsia]);
    store.set(store.getFilters());
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    store.clearAll();
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('filtersFor', () => {
  it('FR-4.3 leaves out the selection a widget made itself', () => {
    expect(filtersFor([southAsia], widget())).toEqual([]);
    expect(filtersFor([southAsia], widget({ id: 'countries' }))).toEqual([southAsia]);
  });

  it('FR-4.8 gives a widget that does not listen no filters at all', () => {
    expect(
      filtersFor([southAsia], widget({ id: 'countries', crossFilter: { listen: false } })),
    ).toEqual([]);
  });
});

describe('emittedField', () => {
  it('FR-4.8 lets bar and pie widgets emit their first dimension unless switched off', () => {
    expect(emittedField(widget())).toBe('region');
    expect(emittedField(widget({ type: 'pie' }))).toBe('region');
    expect(emittedField(widget({ crossFilter: { emit: false } }))).toBeUndefined();
  });

  it('FR-4.5 lets line and table widgets emit when switched on', () => {
    expect(emittedField(widget({ type: 'table' }))).toBeUndefined();
    expect(emittedField(widget({ type: 'line', crossFilter: { emit: true } }))).toBe('region');
  });

  it('never emits from a widget without a dimension', () => {
    const kpi = widget({ type: 'kpi', crossFilter: { emit: true } });
    expect(
      emittedField({ ...kpi, query: { dataset: 'wdi', measures: [{ field: 'gdp' }] } }),
    ).toBeUndefined();
  });
});
