import type { ActiveFilter, Query } from './types';

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
