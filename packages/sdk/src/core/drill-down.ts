import { emittedField } from './filter-store';
import type { ActiveFilter, DimensionField, Query, WidgetConfig, WidgetType } from './types';

/** The widget types the builder offers drill-down for: those whose clicks pick one value. */
export const DRILLABLE_TYPES: readonly WidgetType[] = ['bar', 'pie', 'table'];

/**
 * The widget's own selection when it drills down into it, or `undefined` while it shows its top
 * level. A widget drills down only when it has `drillDown`, emits cross-filters, and `drillDown`
 * names a field other than the one it is clicked on.
 */
export function drilledInto(
  widget: WidgetConfig,
  filters: ActiveFilter[],
): ActiveFilter | undefined {
  const field = emittedField(widget);
  if (!widget.drillDown || !field || widget.drillDown === field) return undefined;
  return filters.find((filter) => filter.sourceWidgetId === widget.id && filter.field === field);
}

/**
 * The query a widget runs while drilled into `selection`: grouped by `drillDown` in place of the
 * selection's field, and kept to the selected values. A sort on the replaced field sorts by the
 * new one, so regions sorted by name give countries sorted by name.
 */
export function drilledQuery(
  query: Query,
  { field, values }: ActiveFilter,
  drillDown: DimensionField,
): Query {
  const dimensions = (query.dimensions ?? []).map((dimension) =>
    dimension === field ? drillDown : dimension,
  );
  return {
    ...query,
    dimensions: [...new Set(dimensions)],
    filters: [...(query.filters ?? []), { field, op: 'in', value: values }],
    ...(query.orderBy && {
      orderBy: query.orderBy.map((order) =>
        order.field === field ? { ...order, field: drillDown } : order,
      ),
    }),
  };
}

/** The query a widget runs for its own data, before the other widgets' cross-filters. */
export function ownQuery(widget: WidgetConfig, filters: ActiveFilter[]): Query {
  const selection = drilledInto(widget, filters);
  return selection && widget.drillDown
    ? drilledQuery(widget.query, selection, widget.drillDown)
    : widget.query;
}
