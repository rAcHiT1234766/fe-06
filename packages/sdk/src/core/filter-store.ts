import type { ActiveFilter, DimensionField, Scalar, WidgetConfig } from './types';

/**
 * Cross-filter state for one dashboard. Widgets never talk to each other: a click writes here, and
 * every listening widget reads from here.
 */
export function createFilterStore(initialFilters: ActiveFilter[] = []) {
  let filters = initialFilters;
  const listeners = new Set<() => void>();

  function set(nextFilters: ActiveFilter[]) {
    if (nextFilters === filters) return;
    filters = nextFilters;
    for (const listener of listeners) listener();
  }

  return {
    getFilters: () => filters,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set,
    // Clicking the selected value again clears the filter; clicking another value replaces it.
    toggle(field: DimensionField, value: Scalar, sourceWidgetId: string) {
      const current = filters.find((filter) => filter.field === field);
      const selection: ActiveFilter = { field, values: [value], sourceWidgetId };
      if (!current) {
        set([...filters, selection]);
        return;
      }
      const isSameSelection =
        current.sourceWidgetId === sourceWidgetId &&
        current.values.length === 1 &&
        current.values[0] === value;
      set(
        isSameSelection
          ? filters.filter((filter) => filter !== current)
          : filters.map((filter) => (filter === current ? selection : filter)),
      );
    },
    remove(field: DimensionField) {
      set(filters.filter((filter) => filter.field !== field));
    },
    clearAll() {
      set([]);
    },
  };
}

export type FilterStore = ReturnType<typeof createFilterStore>;

/** The filters a widget is narrowed by: none if it does not listen, and never its own selection. */
export function filtersFor(filters: ActiveFilter[], widget: WidgetConfig): ActiveFilter[] {
  if (widget.crossFilter?.listen === false) return [];
  return filters.filter((filter) => filter.sourceWidgetId !== widget.id);
}

/** The field a click on this widget filters by, or `undefined` when the widget does not emit. */
export function emittedField(widget: WidgetConfig): DimensionField | undefined {
  const emits = widget.crossFilter?.emit ?? (widget.type === 'bar' || widget.type === 'pie');
  return emits ? widget.query.dimensions?.[0] : undefined;
}
