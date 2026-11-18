import { describe, expect, it } from 'vitest';
import type { DashboardConfig, Query, WidgetConfig } from '../types';
import {
  addWidget,
  arrangeWidgets,
  duplicateWidget,
  nextWidgetId,
  removeWidget,
  updateWidget,
  withYearRule,
} from './edit-dashboard';

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
  it('FR-5.4 adds a widget at the left edge, below everything else', () => {
    const added = addWidget(dashboard, { ...kpi, id: 'kpi-2' }, { w: 3, h: 2 });
    expect(added.widgets.at(-1)).toEqual({ ...kpi, id: 'kpi-2' });
    expect(added.layouts.lg.at(-1)).toEqual({ i: 'kpi-2', x: 0, y: 5, w: 3, h: 2 });
    const empty = { ...dashboard, widgets: [], layouts: { lg: [] } };
    expect(addWidget(empty, { ...kpi, id: 'kpi-1' }, { w: 3, h: 2 }).layouts.lg).toEqual([
      { i: 'kpi-1', x: 0, y: 0, w: 3, h: 2 },
    ]);
  });

  it('gives each new widget the first free id for its type', () => {
    expect(nextWidgetId(dashboard, 'kpi')).toBe('kpi-2');
    expect(nextWidgetId(dashboard, 'bar')).toBe('bar-1');
  });

  it('FR-5.6 replaces one widget and leaves the others as they were', () => {
    const renamed = { ...dashboard.widgets[1]!, title: 'GDP' };
    const updated = updateWidget(dashboard, renamed);
    expect(updated.widgets).toEqual([dashboard.widgets[0], renamed]);
    expect(updated.widgets[0]).toBe(dashboard.widgets[0]);
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

  it('FR-5.9 gives a copy the minimum size of the widget it copies', () => {
    const withMinimum: DashboardConfig = {
      ...dashboard,
      layouts: { lg: [dashboard.layouts.lg[0]!, { ...dashboard.layouts.lg[1]!, minW: 6 }] },
    };
    const duplicated = duplicateWidget(withMinimum, 'gdp-by-region');
    expect(duplicated.layouts.lg.at(-1)).toEqual({ i: 'bar-1', x: 0, y: 5, w: 9, h: 5, minW: 6 });
  });

  it('FR-5.2 FR-5.3 takes moved and resized positions and keeps each widget’s own minimum', () => {
    const withMinimum: DashboardConfig = {
      ...dashboard,
      layouts: {
        lg: [{ ...dashboard.layouts.lg[0]!, minW: 3, minH: 3 }, dashboard.layouts.lg[1]!],
      },
    };
    // As the grid reports them: swapped, resized, and with the minimums it applied while resizing.
    const arranged = arrangeWidgets(withMinimum, [
      { i: 'gdp-by-region', x: 0, y: 0, w: 8, h: 5, minW: 4, minH: 3 },
      { i: 'kpi-1', x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
    ]);
    expect(arranged.layouts).toEqual({
      lg: [
        { i: 'gdp-by-region', x: 0, y: 0, w: 8, h: 5 },
        { i: 'kpi-1', x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
      ],
    });
    expect(arranged.widgets).toBe(withMinimum.widgets);
  });

  it('returns the same dashboard when the grid reports the layout unchanged', () => {
    const unmoved = dashboard.layouts.lg.map((item) => ({ ...item, minW: 2, minH: 2 }));
    expect(arrangeWidgets(dashboard, unmoved)).toBe(dashboard);
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
