import type {
  Aggregation,
  DimensionField,
  MeasureField,
  Query,
  WidgetConfig,
  WidgetType,
} from '../types';
import type { FieldCatalog } from '../query-client';
import { withYearRule } from './edit-dashboard';

type SortOrder = NonNullable<Query['orderBy']>[number];

const withQuery = (widget: WidgetConfig, query: Query): WidgetConfig => ({ ...widget, query });

// Sorting names its field, so it has to follow a measure or dimension that is swapped.
function renameSortField(query: Query, from: string | undefined, to: string): Query {
  if (!query.orderBy) return query;
  return {
    ...query,
    orderBy: query.orderBy.map((order) => (order.field === from ? { ...order, field: to } : order)),
  };
}

/**
 * Switches a widget to another type and keeps what the new type can use: title, measures,
 * grouping, filters, sorting and cross-filter settings. Options belong to one type, so they go.
 */
export function changeWidgetType(
  widget: WidgetConfig,
  type: WidgetType,
  starterQuery: Query,
  latestYear: number | undefined,
): WidgetConfig {
  if (type === widget.type) return widget;
  const query: Query = { ...widget.query };
  if (type === 'kpi') {
    // A KPI shows one number: the first measure, not grouped.
    query.measures = query.measures.slice(0, 1);
    delete query.dimensions;
    delete query.orderBy;
    delete query.limit;
  } else {
    const dimensions = query.dimensions?.length
      ? query.dimensions
      : (starterQuery.dimensions ?? []);
    // Only a table can show more than one grouping.
    query.dimensions = type === 'table' ? dimensions : dimensions.slice(0, 1);
    const fields = new Set<string>([
      ...query.dimensions,
      ...query.measures.map(({ field, alias }) => alias ?? field),
    ]);
    const orderBy = query.orderBy?.filter(({ field }) => fields.has(field));
    if (orderBy?.length) query.orderBy = orderBy;
    else delete query.orderBy;
  }
  const changed: WidgetConfig = { ...widget, type, query: withYearRule(query, latestYear) };
  delete changed.options;
  return changed;
}

/** Shows another measure, with that measure's usual aggregation. */
export function setMeasure(widget: WidgetConfig, field: MeasureField, agg: Aggregation) {
  const [first, ...others] = widget.query.measures;
  const query = { ...widget.query, measures: [{ field, agg }, ...others] };
  return withQuery(widget, renameSortField(query, first?.alias ?? first?.field, field));
}

/**
 * Fits a new widget to the measures the signed-in user may query, as the API's `/meta` lists them.
 * A starter whose measure is outside the user's column scope would only be refused, so it switches
 * to the first measure they may use and takes a title that names it.
 */
export function fitToCatalog(
  widget: WidgetConfig,
  catalog: Pick<FieldCatalog, 'dimensions' | 'measures'>,
): WidgetConfig {
  const [first] = widget.query.measures;
  const [replacement] = catalog.measures;
  if (!first || !replacement || catalog.measures.some(({ name }) => name === first.field)) {
    return widget;
  }
  const [dimension] = widget.query.dimensions ?? [];
  const grouping = catalog.dimensions.find(({ name }) => name === dimension)?.label;
  const title = grouping ? `${replacement.label} by ${grouping.toLowerCase()}` : replacement.label;
  return { ...setMeasure(widget, replacement.name, replacement.defaultAgg), title };
}

export function setAggregation(widget: WidgetConfig, agg: Aggregation) {
  const [first, ...others] = widget.query.measures;
  if (!first) return widget;
  return withQuery(widget, { ...widget.query, measures: [{ ...first, agg }, ...others] });
}

/** Groups by another dimension. Grouping by year shows every year; see {@link withYearRule}. */
export function setDimension(
  widget: WidgetConfig,
  dimension: DimensionField,
  latestYear: number | undefined,
) {
  const [first, ...others] = widget.query.dimensions ?? [];
  const dimensions = [dimension, ...others.filter((other) => other !== dimension)];
  const query = renameSortField({ ...widget.query, dimensions }, first, dimension);
  return withQuery(widget, withYearRule(query, latestYear));
}

export function setSortOrder(widget: WidgetConfig, order: SortOrder | undefined) {
  const query = { ...widget.query };
  if (order) query.orderBy = [order];
  else delete query.orderBy;
  return withQuery(widget, query);
}

/** Sets how many rows a table shows at a time; with none it shows every row, scrolling. */
export function setPageSize(widget: WidgetConfig, pageSize: number | undefined): WidgetConfig {
  const options = { ...widget.options };
  if (pageSize) options.pageSize = pageSize;
  else delete options.pageSize;
  const changed: WidgetConfig = { ...widget, options };
  if (Object.keys(options).length === 0) delete changed.options;
  return changed;
}

export function setRowLimit(widget: WidgetConfig, limit: number | undefined) {
  const query = { ...widget.query };
  if (limit) query.limit = limit;
  else delete query.limit;
  return withQuery(widget, query);
}
