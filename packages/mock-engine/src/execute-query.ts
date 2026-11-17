import type { Aggregation, QueryResult, Scalar, TokenClaims } from '@dashkit/sdk';
import { parseQuery, type ParsedFilter, type ParsedQuery } from './parse-query.ts';
import { dimensions, measures, type DataRow } from './schema.ts';

type ResultRow = QueryResult['rows'][number];

const isInScope = (row: DataRow, regions: TokenClaims['scopes']['regions']) =>
  regions === '*' || regions.includes(row.regionCode);

function matchesFilter(row: DataRow, filter: ParsedFilter): boolean {
  const value = row[filter.field];
  switch (filter.op) {
    case 'eq':
      return value === filter.value;
    case 'neq':
      return value !== filter.value;
    case 'in':
      return filter.value.includes(value);
    case 'notIn':
      return !filter.value.includes(value);
    case 'gt':
      return typeof value === 'number' && value > filter.value;
    case 'gte':
      return typeof value === 'number' && value >= filter.value;
    case 'lt':
      return typeof value === 'number' && value < filter.value;
    case 'lte':
      return typeof value === 'number' && value <= filter.value;
    case 'between':
      return typeof value === 'number' && value >= filter.value[0] && value <= filter.value[1];
  }
}

function groupRows(rows: DataRow[], groupBy: ParsedQuery['dimensions']): DataRow[][] {
  const groups = new Map<string, DataRow[]>();
  for (const row of rows) {
    const key = JSON.stringify(groupBy.map((field) => row[field]));
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()];
}

// Missing values are skipped rather than treated as zero, so a gap in the data never drags a
// sum or average down. A group with no values at all aggregates to null.
function aggregate(values: (number | null)[], agg: Aggregation): number | null {
  const present = values.filter((value) => value !== null);
  if (agg === 'count') return present.length;
  if (present.length === 0) return null;
  switch (agg) {
    case 'sum':
      return present.reduce((total, value) => total + value, 0);
    case 'avg':
      return present.reduce((total, value) => total + value, 0) / present.length;
    case 'min':
      return Math.min(...present);
    case 'max':
      return Math.max(...present);
  }
}

function summariseGroup(group: DataRow[], query: ParsedQuery): ResultRow {
  const [first] = group as [DataRow];
  const result: ResultRow = {};
  for (const field of query.dimensions) result[field] = first[field];
  for (const { field, agg, name } of query.measures) {
    result[name] = aggregate(
      group.map((row) => row[field]),
      agg,
    );
  }
  return result;
}

function compareNullsLast(a: Scalar | undefined, b: Scalar | undefined, direction: 'asc' | 'desc') {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const order =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return direction === 'asc' ? order : -order;
}

function sortRows(rows: ResultRow[], orderBy: ParsedQuery['orderBy']): ResultRow[] {
  return rows.toSorted((a, b) => {
    for (const { field, direction } of orderBy) {
      const order = compareNullsLast(a[field], b[field], direction);
      if (order !== 0) return order;
    }
    return 0;
  });
}

function describeColumns(query: ParsedQuery): QueryResult['columns'] {
  return [
    ...query.dimensions.map((name) => ({ name, role: 'dimension' as const, ...dimensions[name] })),
    ...query.measures.map(({ field, agg, name }) => {
      const { label, format } = measures[field];
      return agg === 'count'
        ? { name, role: 'measure' as const, label: `${label}, count`, format: 'number' as const }
        : { name, role: 'measure' as const, label, format };
    }),
  ];
}

/**
 * Validates and runs a query for one user. The user's row scope is applied before any of the
 * query's own filters, so a filter can narrow what the user sees but never widen it.
 */
export function executeQuery(
  rows: DataRow[],
  requestBody: unknown,
  claims: TokenClaims,
): QueryResult {
  const started = performance.now();
  const query = parseQuery(requestBody);

  const scoped = rows.filter((row) => isInScope(row, claims.scopes.regions));
  const filtered = scoped.filter((row) =>
    query.filters.every((filter) => matchesFilter(row, filter)),
  );
  const summarised = groupRows(filtered, query.dimensions).map((group) =>
    summariseGroup(group, query),
  );
  const sorted = sortRows(summarised, query.orderBy);
  const limited = sorted.slice(0, query.limit);

  return {
    columns: describeColumns(query),
    rows: limited,
    meta: {
      rowCount: limited.length,
      truncated: sorted.length > limited.length,
      durationMs: Math.round(performance.now() - started),
    },
  };
}
