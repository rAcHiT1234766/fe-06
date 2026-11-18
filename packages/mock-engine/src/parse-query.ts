import type { Aggregation, DimensionField, MeasureField, Scalar } from '@dashkit/sdk';
import {
  aggregations,
  filterOperators,
  isDimensionField,
  isMeasureField,
  measures,
} from './schema.ts';
import { invalidRequest, isOneOf, isRecord } from './validation.ts';

export const MAX_ROWS = 1000;

type FilterField = DimensionField | MeasureField;

export type ParsedFilter =
  | { field: FilterField; op: 'eq' | 'neq'; value: Scalar }
  | { field: FilterField; op: 'in' | 'notIn'; value: Scalar[] }
  | { field: FilterField; op: 'gt' | 'gte' | 'lt' | 'lte'; value: number }
  | { field: FilterField; op: 'between'; value: [number, number] };

/** A query that passed the whitelist, with every default filled in. */
export interface ParsedQuery {
  measures: { field: MeasureField; agg: Aggregation; name: string }[];
  dimensions: DimensionField[];
  filters: ParsedFilter[];
  orderBy: { field: string; direction: 'asc' | 'desc' }[];
  limit: number;
}

const isScalar = (value: unknown): value is Scalar =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

const listOf = (value: unknown, key: string): unknown[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw invalidRequest(`"${key}" must be an array`);
  return value;
};

// Result column names become object keys in every row, so they are restricted to plain identifiers.
const COLUMN_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

function parseMeasure(item: unknown): ParsedQuery['measures'][number] {
  if (!isRecord(item) || !isMeasureField(item.field)) {
    throw invalidRequest(`Unknown measure ${JSON.stringify(isRecord(item) ? item.field : item)}`);
  }
  const agg = item.agg ?? measures[item.field].defaultAgg;
  if (!isOneOf(aggregations, agg)) {
    throw invalidRequest(`Unknown aggregation ${JSON.stringify(agg)}`);
  }
  const name = item.alias ?? item.field;
  if (typeof name !== 'string' || !COLUMN_NAME.test(name)) {
    throw invalidRequest(`Invalid alias ${JSON.stringify(name)}`);
  }
  return { field: item.field, agg, name };
}

function parseFilter(item: unknown): ParsedFilter {
  if (!isRecord(item)) throw invalidRequest('Each filter must be an object');
  const { field, op, value } = item;
  if (!isDimensionField(field) && !isMeasureField(field)) {
    throw invalidRequest(`Unknown filter field ${JSON.stringify(field)}`);
  }
  if (!isOneOf(filterOperators, op)) {
    throw invalidRequest(`Unknown filter operator ${JSON.stringify(op)}`);
  }

  if ((op === 'eq' || op === 'neq') && isScalar(value)) return { field, op, value };
  if ((op === 'in' || op === 'notIn') && Array.isArray(value) && value.every(isScalar)) {
    return { field, op, value };
  }
  if (op === 'between' && Array.isArray(value) && value.length === 2) {
    const [min, max] = value as unknown[];
    if (typeof min === 'number' && typeof max === 'number') return { field, op, value: [min, max] };
  }
  if ((op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') && typeof value === 'number') {
    return { field, op, value };
  }
  throw invalidRequest(`Invalid value for "${op}" filter on "${field}"`);
}

function parseOrderBy(item: unknown, columnNames: string[]): ParsedQuery['orderBy'][number] {
  if (!isRecord(item) || typeof item.field !== 'string' || !columnNames.includes(item.field)) {
    throw invalidRequest('"orderBy" may only use the query\'s dimensions and measures');
  }
  if (item.direction !== 'asc' && item.direction !== 'desc') {
    throw invalidRequest('"orderBy" direction must be "asc" or "desc"');
  }
  return { field: item.field, direction: item.direction };
}

function parseLimit(value: unknown): number {
  if (value === undefined) return MAX_ROWS;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_ROWS) {
    throw invalidRequest(`"limit" must be a whole number from 1 to ${MAX_ROWS}`);
  }
  return value;
}

/** Turns an untrusted request body into a query. Unknown keys are ignored; unknown values are rejected. */
export function parseQuery(body: unknown): ParsedQuery {
  if (!isRecord(body) || body.dataset !== 'wdi') {
    throw invalidRequest('Expected a query on the "wdi" dataset');
  }

  const measureList = listOf(body.measures, 'measures').map(parseMeasure);
  if (measureList.length === 0) throw invalidRequest('A query needs at least one measure');

  const dimensions = listOf(body.dimensions, 'dimensions').map((field) => {
    if (!isDimensionField(field)) {
      throw invalidRequest(`Unknown dimension ${JSON.stringify(field)}`);
    }
    return field;
  });

  const columnNames = [...dimensions, ...measureList.map((measure) => measure.name)];
  if (new Set(columnNames).size !== columnNames.length) {
    throw invalidRequest('Dimensions and measure names must be unique');
  }

  return {
    measures: measureList,
    dimensions,
    filters: listOf(body.filters, 'filters').map(parseFilter),
    orderBy: listOf(body.orderBy, 'orderBy').map((item) => parseOrderBy(item, columnNames)),
    limit: parseLimit(body.limit),
  };
}
