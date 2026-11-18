import { useSyncExternalStore } from 'react';
import { drilledInto } from '../../core/drill-down';
import { emittedField } from '../../core/filter-store';
import type {
  ActiveFilter,
  DimensionField,
  QueryResult,
  Scalar,
  WidgetConfig,
} from '../../core/types';
import { useDashKit } from '../context';

export function useActiveFilters() {
  const { filterStore } = useDashKit();
  return useSyncExternalStore(filterStore.subscribe, filterStore.getFilters);
}

/** What a widget that emits cross-filters needs to show and change its own selection. */
export interface Selection {
  field: DimensionField;
  /** `undefined` while the widget has selected nothing. */
  values: Scalar[] | undefined;
  /** With `additive`, from a Ctrl- or Cmd-click, the value joins the selection or leaves it. */
  toggle: (value: Scalar, additive?: boolean) => void;
}

/**
 * The selection a widget's clicks change, when `result` has the field it is on. A drilled-down
 * widget shows another field, so it has nothing of the selection's to click; until its new rows
 * arrive, the old ones and their buttons stay, keeping the focus where it was.
 */
export function useSelection(widget: WidgetConfig, result: QueryResult): Selection | undefined {
  const { filterStore } = useDashKit();
  const activeFilters = useActiveFilters();
  const field = emittedField(widget);
  if (!field || !result.columns.some(({ name }) => name === field)) return undefined;
  return {
    field,
    values: activeFilters.find((filter) => filter.sourceWidgetId === widget.id)?.values,
    toggle: (value, additive) => filterStore.toggle(field, value, widget.id, additive),
  };
}

/** The selection the widget is drilled into, or `undefined` while it shows its top level. */
export function useDrilledInto(widget: WidgetConfig): ActiveFilter | undefined {
  return drilledInto(widget, useActiveFilters());
}
