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
    /**
     * A click selects the value, replacing any selection on its field, and clicking the only
     * selected value again clears it. With `additive`, as for a Ctrl- or Cmd-click, the value joins
     * the widget's own selection on the field or leaves it. A selection made in another widget, or
     * by the host, is replaced as by a click, so a widget never takes over another's selection.
     */
    toggle(field: DimensionField, value: Scalar, sourceWidgetId: string, additive = false) {
      const current = filters.find((filter) => filter.field === field);
      const own = current?.sourceWidgetId === sourceWidgetId ? current.values : undefined;
      let values = [value];
      if (additive && own) {
        values = own.includes(value)
          ? own.filter((selected) => selected !== value)
          : [...own, value];
      } else if (own?.length === 1 && own[0] === value) {
        values = [];
      }
      const selection: ActiveFilter = { field, values, sourceWidgetId };
      if (!current) {
        set([...filters, selection]);
        return;
      }
      set(
        values.length === 0
          ? filters.filter((filter) => filter !== current)
          : filters.map((filter) => (filter === current ? selection : filter)),
      );
    },
    /**
     * Sets the selection on `field` to `values`, made by `sourceWidgetId`, replacing any selection
     * on it, as a filter control does. No values removes the selection.
     */
    select(field: DimensionField, values: Scalar[], sourceWidgetId: string) {
      const current = filters.find((filter) => filter.field === field);
      const selection: ActiveFilter = { field, values, sourceWidgetId };
      if (values.length === 0) {
        if (current) set(filters.filter((filter) => filter !== current));
      } else if (!current) set([...filters, selection]);
      else set(filters.map((filter) => (filter === current ? selection : filter)));
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

/** Whether clicks on the widget filter the others. Bar, pie and map widgets do unless told otherwise. */
export const emitsFilters = (widget: WidgetConfig) =>
  widget.crossFilter?.emit ?? ['bar', 'pie', 'map'].includes(widget.type);

/** The field a click on this widget filters by, or `undefined` when the widget does not emit. */
export function emittedField(widget: WidgetConfig): DimensionField | undefined {
  return emitsFilters(widget) ? widget.query.dimensions?.[0] : undefined;
}
