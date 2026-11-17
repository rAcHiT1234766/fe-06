import { describe, expect, it } from 'vitest';
import type { DashboardConfig, Query, WidgetConfig } from '../types';
import { addWidget, duplicateWidget, removeWidget, withYearRule } from './edit-dashboard';

const gdp: Query = { dataset: 'wdi', measures: [{ field: 'gdp', agg: 'sum' }] };
const kpi: Omit<WidgetConfig, 'id'> = { type: 'kpi', title: 'Total GDP', query: gdp };

const dashboard: DashboardConfig = {
  id: 'overview',
  schemaVersion: 1,
  title: 'Overview',
  widgets: [
    { ...kpi, id: 'kpi-1' },
    { id: 'gdp-by-region', type: 'bar', title: 'GDP by region', query: gdp },
  ],
  layouts: {
    lg: [
      { i: 'kpi-1', x: 0, y: 0, w: 3, h: 3 },
      { i: 'gdp-by-region', x: 3, y: 0, w: 9, h: 5 },
    ],
  },
};

describe('editing a dashboard', () => {
  it('FR-5.4 adds a widget at the left edge below everything else, with a free id', () => {
    const added = addWidget(dashboard, kpi, { w: 3, h: 2 });
    expect(added.widgets.at(-1)).toEqual({ ...kpi, id: 'kpi-2' });
    expect(added.layouts.lg.at(-1)).toEqual({ i: 'kpi-2', x: 0, y: 5, w: 3, h: 2 });
    expect(
      addWidget({ ...dashboard, widgets: [], layouts: { lg: [] } }, kpi, { w: 3, h: 2 }),
    ).toMatchObject({ layouts: { lg: [{ i: 'kpi-1', x: 0, y: 0 }] } });
  });

  it('FR-5.4 removes a widget together with its place in the layout', () => {
    const removed = removeWidget(dashboard, 'kpi-1');
    expect(removed.widgets.map(({ id }) => id)).toEqual(['gdp-by-region']);
    expect(removed.layouts.lg.map(({ i }) => i)).toEqual(['gdp-by-region']);
  });

  it('FR-5.9 duplicates a widget with its size, below everything else', () => {
    const duplicated = duplicateWidget(dashboard, 'gdp-by-region');
    expect(duplicated.widgets.at(-1)).toEqual({
      id: 'bar-1',
      type: 'bar',
      title: 'GDP by region (copy)',
      query: gdp,
    });
    expect(duplicated.widgets.at(-1)?.query).not.toBe(gdp);
    expect(duplicated.layouts.lg.at(-1)).toEqual({ i: 'bar-1', x: 0, y: 5, w: 9, h: 5 });
  });
});

describe('withYearRule', () => {
  const inYear = (value: number) => ({ field: 'year' as const, op: 'eq' as const, value });

  it('shows one year, the latest, unless the widget already chose one', () => {
    expect(withYearRule(gdp, 2024).filters).toEqual([inYear(2024)]);
    const chosen = { ...gdp, filters: [inYear(2010)] };
    expect(withYearRule(chosen, 2024)).toBe(chosen);
    expect(withYearRule(gdp, undefined)).toBe(gdp);
  });

  it('shows every year when the widget is grouped by year', () => {
    const byYear: Query = { ...gdp, dimensions: ['year'], filters: [inYear(2024)] };
    expect(withYearRule(byYear, 2024).filters).toEqual([]);
  });
});
