import { useSyncExternalStore } from 'react';
import { emittedField } from '../../core/filter-store';
import type { DimensionField, Scalar, WidgetConfig } from '../../core/types';
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

export function useSelection(widget: WidgetConfig): Selection | undefined {
  const { filterStore } = useDashKit();
  const activeFilters = useActiveFilters();
  const field = emittedField(widget);
  if (!field) return undefined;
  return {
    field,
    values: activeFilters.find((filter) => filter.sourceWidgetId === widget.id)?.values,
    toggle: (value, additive) => filterStore.toggle(field, value, widget.id, additive),
  };
}
