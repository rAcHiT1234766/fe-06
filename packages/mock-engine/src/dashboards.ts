import type { DashboardConfig, FilterControl, LayoutItem, WidgetConfig } from '@dashkit/sdk';
import { MAX_ROWS, parseQuery } from './parse-query.ts';
import { dimensions } from './schema.ts';
import { invalidRequest, isOneOf, isRecord } from './validation.ts';

const WIDGET_TYPES: WidgetConfig['type'][] = ['bar', 'line', 'pie', 'table', 'kpi'];

/** The dashboard every tenant starts with. The same layout shows different data to each user. */
export function createStarterDashboard(latestYear: number): DashboardConfig {
  const inLatestYear = [{ field: 'year' as const, op: 'eq' as const, value: latestYear }];
  return {
    id: 'overview',
    schemaVersion: 1,
    title: 'World development overview',
    description: `World Bank indicators for ${latestYear}, with life expectancy since 2000.`,
    widgets: [
      {
        id: 'total-population',
        type: 'kpi',
        title: 'Total population',
        query: {
          dataset: 'wdi',
          measures: [{ field: 'population', agg: 'sum' }],
          filters: inLatestYear,
        },
      },
      {
        id: 'population-by-region',
        type: 'bar',
        title: 'Population by region',
        // Region names are too long to sit side by side under vertical bars.
        options: { orientation: 'horizontal' },
        query: {
          dataset: 'wdi',
          measures: [{ field: 'population', agg: 'sum' }],
          dimensions: ['region'],
          filters: inLatestYear,
          orderBy: [{ field: 'population', direction: 'desc' }],
        },
      },
      {
        id: 'gdp-by-income',
        type: 'pie',
        title: 'GDP by income level',
        query: {
          dataset: 'wdi',
          measures: [{ field: 'gdp', agg: 'sum' }],
          dimensions: ['incomeLevel'],
          filters: inLatestYear,
        },
      },
      {
        id: 'life-expectancy-trend',
        type: 'line',
        title: 'Average life expectancy',
        query: {
          dataset: 'wdi',
          measures: [{ field: 'lifeExpectancy', agg: 'avg' }],
          dimensions: ['year'],
          orderBy: [{ field: 'year', direction: 'asc' }],
        },
      },
      {
        id: 'countries',
        type: 'table',
        title: 'Countries',
        query: {
          dataset: 'wdi',
          measures: [
            { field: 'gdpPerCapita', agg: 'avg' },
            { field: 'lifeExpectancy', agg: 'avg' },
            { field: 'internetUsers', agg: 'avg' },
          ],
          dimensions: ['country', 'region'],
          filters: inLatestYear,
          orderBy: [{ field: 'gdpPerCapita', direction: 'desc' }],
        },
      },
    ],
    layouts: {
      lg: [
        { i: 'total-population', x: 0, y: 0, w: 3, h: 3 },
        { i: 'population-by-region', x: 3, y: 0, w: 9, h: 3 },
        { i: 'gdp-by-income', x: 0, y: 3, w: 4, h: 4 },
        { i: 'life-expectancy-trend', x: 4, y: 3, w: 8, h: 4 },
        { i: 'countries', x: 0, y: 7, w: 12, h: 5 },
      ],
    },
  };
}

/**
 * The second dashboard every tenant starts with: filter controls above the grid, and a chart of
 * regions that drills down to countries. Population and life expectancy only, which every demo
 * user may query.
 */
export function createExplorerDashboard(latestYear: number): DashboardConfig {
  const inLatestYear = [{ field: 'year' as const, op: 'eq' as const, value: latestYear }];
  const population = { field: 'population' as const, agg: 'sum' as const };
  const lifeExpectancy = { field: 'lifeExpectancy' as const, agg: 'avg' as const };
  return {
    id: 'population',
    schemaVersion: 1,
    title: 'Population explorer',
    description: `Population and life expectancy in ${latestYear}, or the year chosen. Click a region to see its countries.`,
    filterControls: [{ field: 'region' }, { field: 'incomeLevel' }, { field: 'year' }],
    widgets: [
      {
        id: 'population',
        type: 'kpi',
        title: 'Population',
        query: { dataset: 'wdi', measures: [population], filters: inLatestYear },
      },
      {
        id: 'life-expectancy',
        type: 'kpi',
        title: 'Average life expectancy',
        query: { dataset: 'wdi', measures: [lifeExpectancy], filters: inLatestYear },
      },
      {
        id: 'population-by-region',
        type: 'bar',
        title: 'Population by region',
        options: { orientation: 'horizontal' },
        drillDown: 'country',
        query: {
          dataset: 'wdi',
          measures: [population],
          dimensions: ['region'],
          filters: inLatestYear,
          orderBy: [{ field: 'population', direction: 'desc' }],
        },
      },
      {
        id: 'population-by-income',
        type: 'pie',
        title: 'Population by income level',
        options: { donut: true },
        query: {
          dataset: 'wdi',
          measures: [population],
          dimensions: ['incomeLevel'],
          filters: inLatestYear,
        },
      },
      {
        id: 'most-populous',
        type: 'table',
        title: 'Countries by population',
        options: { pageSize: 10 },
        query: {
          dataset: 'wdi',
          measures: [population, lifeExpectancy],
          dimensions: ['country', 'region'],
          filters: inLatestYear,
          orderBy: [{ field: 'population', direction: 'desc' }],
        },
      },
    ],
    layouts: {
      lg: [
        { i: 'population', x: 0, y: 0, w: 3, h: 3 },
        { i: 'life-expectancy', x: 0, y: 3, w: 3, h: 3 },
        { i: 'population-by-region', x: 3, y: 0, w: 9, h: 6 },
        { i: 'population-by-income', x: 0, y: 6, w: 4, h: 6 },
        { i: 'most-populous', x: 4, y: 6, w: 8, h: 6 },
      ],
    },
  };
}

const isWholeNumber = (value: unknown, min: number, max = Infinity) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const isFilterControl = (value: unknown): value is FilterControl =>
  isRecord(value) &&
  isOneOf(Object.keys(dimensions), value.field) &&
  (value.label === undefined || typeof value.label === 'string');

// The same limits the builder checks: a minimum width fits the twelve-column grid.
const isLayoutItem = (value: unknown): value is LayoutItem =>
  isRecord(value) &&
  typeof value.i === 'string' &&
  ['x', 'y', 'w', 'h'].every((key) => typeof value[key] === 'number') &&
  (value.minW === undefined || isWholeNumber(value.minW, 1, 12)) &&
  (value.minH === undefined || isWholeNumber(value.minH, 1));

/**
 * Checks a dashboard sent for saving. The config is stored as sent, so this rejects anything the
 * viewer could not render: missing fields, unknown widget types, invalid queries, unplaced widgets.
 */
export function parseDashboardConfig(body: unknown, id: string): DashboardConfig {
  if (!isRecord(body) || body.id !== id) throw invalidRequest('Dashboard id must match the URL');
  if (body.schemaVersion !== 1) throw invalidRequest('Unsupported schemaVersion');
  if (typeof body.title !== 'string' || body.title.trim() === '') {
    throw invalidRequest('A title is required');
  }
  if (!Array.isArray(body.widgets)) throw invalidRequest('"widgets" must be an array');

  const widgetIds = body.widgets.map((widget: unknown) => {
    if (!isRecord(widget) || typeof widget.id !== 'string' || typeof widget.title !== 'string') {
      throw invalidRequest('Each widget needs an id and a title');
    }
    if (!isOneOf(WIDGET_TYPES, widget.type)) {
      throw invalidRequest(`Unknown widget type ${JSON.stringify(widget.type)}`);
    }
    parseQuery(widget.query);
    const pageSize = isRecord(widget.options) ? widget.options.pageSize : undefined;
    if (pageSize !== undefined && !isWholeNumber(pageSize, 1, MAX_ROWS)) {
      throw invalidRequest(`"pageSize" must be a whole number from 1 to ${MAX_ROWS}`);
    }
    const { drillDown } = widget;
    if (drillDown !== undefined && !isOneOf(Object.keys(dimensions), drillDown)) {
      throw invalidRequest(`"drillDown" must be one of ${Object.keys(dimensions).join(', ')}`);
    }
    return widget.id;
  });
  if (new Set(widgetIds).size !== widgetIds.length) {
    throw invalidRequest('Widget ids must be unique');
  }

  const { filterControls } = body;
  if (filterControls !== undefined) {
    if (!Array.isArray(filterControls) || !filterControls.every(isFilterControl)) {
      throw invalidRequest('"filterControls" must list dimensions, each with an optional label');
    }
    const fields = filterControls.map(({ field }) => field);
    if (new Set(fields).size !== fields.length) {
      throw invalidRequest('A field can have only one filter control');
    }
    const { defaultFilters } = body;
    if (
      Array.isArray(defaultFilters) &&
      defaultFilters.some((filter) => isRecord(filter) && isOneOf(fields, filter.field))
    ) {
      throw invalidRequest('A field cannot have both a filter control and a default filter');
    }
  }

  const lg = isRecord(body.layouts) ? body.layouts.lg : undefined;
  if (!Array.isArray(lg) || !lg.every(isLayoutItem)) {
    throw invalidRequest('"layouts.lg" is missing or invalid');
  }
  const placed = new Set(lg.map((item) => item.i));
  if (lg.length !== widgetIds.length || widgetIds.some((widgetId) => !placed.has(widgetId))) {
    throw invalidRequest('Every widget needs exactly one layout item');
  }

  return body as unknown as DashboardConfig;
}
