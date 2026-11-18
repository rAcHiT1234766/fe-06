import { describe, expect, it } from 'vitest';
import type { DashboardConfig, Query } from '../types';
import { migrate, validateDashboard } from './schema';

const gdp: Query = { dataset: 'wdi', measures: [{ field: 'gdp', agg: 'sum' }] };

const dashboard: DashboardConfig = {
  id: 'overview',
  schemaVersion: 1,
  title: 'Overview',
  widgets: [
    { id: 'total-gdp', type: 'kpi', title: 'Total GDP', query: gdp },
    { id: 'gdp-by-region', type: 'bar', title: 'GDP by region', query: gdp },
  ],
  layouts: {
    lg: [
      { i: 'total-gdp', x: 0, y: 0, w: 3, h: 3 },
      { i: 'gdp-by-region', x: 3, y: 0, w: 9, h: 5 },
    ],
  },
};

describe('migrate', () => {
  it('passes a current config through unchanged', () => {
    expect(migrate(dashboard)).toBe(dashboard);
  });

  it('refuses a config from a newer schema', () => {
    const newer = { ...dashboard, schemaVersion: 2 } as unknown as DashboardConfig;
    expect(() => migrate(newer)).toThrow('schema version 2');
    expect(() => migrate(newer)).toThrow(expect.objectContaining({ code: 'UNKNOWN' }));
  });
});

describe('validateDashboard', () => {
  it('accepts a complete dashboard, and an empty one', () => {
    expect(validateDashboard(dashboard)).toEqual([]);
    expect(validateDashboard({ ...dashboard, widgets: [], layouts: { lg: [] } })).toEqual([]);
  });

  it('asks for titles, once for all the widgets that lack one', () => {
    const untitled = {
      ...dashboard,
      title: ' ',
      widgets: dashboard.widgets.map((widget) => ({ ...widget, title: '' })),
    };
    expect(validateDashboard(untitled)).toEqual([
      'The dashboard needs a title.',
      'Every widget needs a title.',
    ]);
  });

  it('names widgets that share an id or do not have exactly one place on the grid', () => {
    const [kpi, bar] = dashboard.widgets;
    const broken: DashboardConfig = {
      ...dashboard,
      widgets: [kpi!, { ...bar!, id: 'total-gdp' }, { ...bar!, id: 'unplaced', title: 'Unplaced' }],
      layouts: {
        lg: [
          { i: 'total-gdp', x: 0, y: 0, w: 3, h: 3 },
          { i: 'gdp-by-region', x: 3, y: 0, w: 9, h: 5 },
        ],
      },
    };
    expect(validateDashboard(broken)).toEqual([
      'More than one widget has the id "total-gdp".',
      '"Unplaced" has no place on the grid.',
      'The grid has a place for "gdp-by-region", which is not a widget.',
    ]);

    const twice = {
      ...dashboard,
      layouts: { lg: [...dashboard.layouts.lg, dashboard.layouts.lg[0]!] },
    };
    expect(validateDashboard(twice)).toEqual(['"Total GDP" has more than one place on the grid.']);
  });

  it('asks for a measure, a row limit the API accepts, and a page size', () => {
    const [kpi, bar] = dashboard.widgets;
    const broken = {
      ...dashboard,
      widgets: [
        { ...kpi!, query: { ...gdp, measures: [] } },
        { ...bar!, query: { ...gdp, limit: 1001 }, options: { pageSize: 0 } },
      ],
    };
    expect(validateDashboard(broken)).toEqual([
      '"Total GDP" needs a measure.',
      '"GDP by region" needs a row limit from 1 to 1000, or none.',
      '"GDP by region" needs a page size from 1 to 1000 rows, or none.',
    ]);
  });

  it('asks for minimum sizes that fit the grid', () => {
    const [kpi, bar] = dashboard.layouts.lg;
    const sized = (minimums: [object, object]) => ({
      ...dashboard,
      layouts: {
        lg: [
          { ...kpi!, ...minimums[0] },
          { ...bar!, ...minimums[1] },
        ],
      },
    });
    expect(validateDashboard(sized([{ minW: 12, minH: 1 }, { minW: 4 }]))).toEqual([]);
    expect(validateDashboard(sized([{ minW: 13 }, { minW: 1.5, minH: 0 }]))).toEqual([
      '"Total GDP" needs a minimum width from 1 to 12 columns, or none.',
      '"GDP by region" needs a minimum width from 1 to 12 columns, or none.',
      '"GDP by region" needs a minimum height of at least 1 row, or none.',
    ]);
  });
});
