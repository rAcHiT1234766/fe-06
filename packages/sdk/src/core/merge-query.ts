import type { ActiveFilter, DashboardConfig, Query, WidgetConfig } from './types';

/**
 * The query a widget actually runs: its own query narrowed by the active cross-filters. Each filter
 * becomes an `in` condition, and the API applies the user's row scope before any of them.
 */
export function mergeQuery(query: Query, filters: ActiveFilter[]): Query {
  if (filters.length === 0) return query;
  return {
    ...query,
    filters: [
      ...(query.filters ?? []),
      ...filters.map(({ field, values }) => ({ field, op: 'in' as const, value: values })),
    ],
  };
}

// Default filters are part of the dashboard rather than a user's choice: they narrow every widget,
// including widgets that ignore cross-filters, and never appear as removable chips.
export function applyDefaultFilters({ widgets, defaultFilters = [] }: DashboardConfig) {
  if (defaultFilters.length === 0) return widgets;
  return widgets.map((widget): WidgetConfig => ({
    ...widget,
    query: { ...widget.query, filters: [...(widget.query.filters ?? []), ...defaultFilters] },
  }));
}
