import { describe, expect, it } from 'vitest';
import type { DashboardConfig, Query } from '../types';
import { isSameDashboard } from './same-dashboard';

const gdp: Query = { dataset: 'wdi', measures: [{ field: 'gdp', agg: 'sum' }] };

const dashboard: DashboardConfig = {
  id: 'overview',
  schemaVersion: 1,
  title: 'Overview',
  widgets: [
    { id: 'kpi-1', type: 'kpi', title: 'Total GDP', query: gdp },
    {
      id: 'gdp-by-region',
      type: 'bar',
      title: 'GDP by region',
      query: { ...gdp, dimensions: ['region'] },
    },
  ],
  layouts: {
    lg: [
      { i: 'kpi-1', x: 0, y: 0, w: 3, h: 3 },
      { i: 'gdp-by-region', x: 3, y: 0, w: 9, h: 5 },
    ],
  },
};

describe('isSameDashboard', () => {
  it('finds a copy the same, however deep', () => {
    expect(isSameDashboard(dashboard, structuredClone(dashboard))).toBe(true);
  });

  it('ignores the order of widgets and of layout items, which means nothing', () => {
    const reordered: DashboardConfig = {
      ...dashboard,
      widgets: dashboard.widgets.toReversed(),
      layouts: { lg: dashboard.layouts.lg.toReversed() },
    };
    expect(isSameDashboard(dashboard, reordered)).toBe(true);
  });

  it('counts a property set to undefined as missing, as JSON does', () => {
    const [kpi, bar] = dashboard.widgets;
    // A host compiled with looser settings than this package's can pass one.
    const withUndefined = {
      ...dashboard,
      description: undefined,
      widgets: [{ ...kpi!, options: undefined }, bar!],
    } as unknown as DashboardConfig;
    expect(isSameDashboard(dashboard, withUndefined)).toBe(true);
  });

  it('sees any change to what is shown or where', () => {
    const [kpi, bar] = dashboard.widgets;
    const [kpiItem, barItem] = dashboard.layouts.lg;
    const changes: DashboardConfig[] = [
      { ...dashboard, title: 'Another title' },
      { ...dashboard, widgets: [{ ...kpi!, title: 'GDP' }, bar!] },
      {
        ...dashboard,
        widgets: [kpi!, { ...bar!, query: { ...bar!.query, dimensions: ['incomeLevel'] } }],
      },
      { ...dashboard, widgets: [kpi!] },
      { ...dashboard, layouts: { lg: [{ ...kpiItem!, h: 4 }, barItem!] } },
      { ...dashboard, layouts: { ...dashboard.layouts, md: [kpiItem!, barItem!] } },
    ];
    for (const changed of changes) expect(isSameDashboard(dashboard, changed)).toBe(false);
  });
});
