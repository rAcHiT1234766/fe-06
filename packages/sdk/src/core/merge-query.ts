import type { ActiveFilter, DashboardConfig, DimensionField, Query, WidgetConfig } from './types';

/**
 * The query a widget actually runs: its own query narrowed by the active cross-filters. Each filter
 * becomes an `in` condition, and the API applies the user's row scope before any of them.
 *
 * A field in `controlledFields` has a filter control, which makes it a setting of the whole
 * dashboard: a selection on it replaces the widget's own filters on that field, so choosing 2010
 * shows 2010 in a widget that otherwise shows 2024. On other fields both apply.
 */
export function mergeQuery(
  query: Query,
  filters: ActiveFilter[],
  controlledFields: readonly DimensionField[] = [],
): Query {
  if (filters.length === 0) return query;
  // Strings, because a widget may also filter on a measure, which never has a control.
  const replaced = new Set<string>(
    filters.map(({ field }) => field).filter((field) => controlledFields.includes(field)),
  );
  return {
    ...query,
    filters: [
      ...(query.filters ?? []).filter(({ field }) => !replaced.has(field)),
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
