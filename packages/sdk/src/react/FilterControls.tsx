import { useEffect, useId, useState } from 'react';
import { formatValue } from '../core/format';
import type { QueryClient } from '../core/query-client';
import type { DimensionField, FilterControl, MeasureField, Scalar } from '../core/types';
import { loadFieldCatalog } from './builder/loaders';
import { useDashKit } from './context';
import { FIELD_NAMES, formatFor } from './field-names';
import { useActiveFilters } from './hooks/use-cross-filter';
import { useClientValue } from './hooks/use-client-value';

/** The source of selections made in a filter control, as `onFilterChange` reports them. */
export const FILTER_CONTROL_SOURCE = 'filter-control';

/**
 * The field's values within the user's scope. Any measure the user may query will do for grouping,
 * so the first one is counted; a control on a field whose rows hold no values offers none.
 */
async function loadValues(
  client: QueryClient,
  field: DimensionField,
  measure: MeasureField,
  signal: AbortSignal,
): Promise<Scalar[]> {
  const { rows } = await client.run(
    {
      dataset: 'wdi',
      measures: [{ field: measure, agg: 'count' }],
      dimensions: [field],
      // The latest year is the one most often wanted.
      orderBy: [{ field, direction: field === 'year' ? 'desc' : 'asc' }],
    },
    signal,
  );
  return rows.map((row) => row[field] ?? null).filter((value) => value !== null);
}

function useFieldValues(field: DimensionField, measure: MeasureField | undefined) {
  const { client } = useDashKit();
  const [loaded, setLoaded] = useState<{ client: QueryClient; key: string; values: Scalar[] }>();
  const key = `${field} ${measure}`;
  useEffect(() => {
    if (!measure) return;
    const controller = new AbortController();
    loadValues(client, field, measure, controller.signal).then(
      (values) => {
        if (!controller.signal.aborted) setLoaded({ client, key, values });
      },
      // A control that cannot list its values still offers "All", and the widgets show the error.
      () => undefined,
    );
    return () => controller.abort();
  }, [client, field, measure, key]);
  return loaded?.client === client && loaded.key === key ? loaded.values : [];
}

const SEVERAL = 'several';

function FilterSelect({
  control,
  measure,
}: {
  control: FilterControl;
  measure: MeasureField | undefined;
}) {
  const id = useId();
  const { filterStore } = useDashKit();
  const { field } = control;
  const selected = useActiveFilters().find((filter) => filter.field === field)?.values ?? [];
  const values = useFieldValues(field, measure);
  // A value chosen elsewhere, such as by the host, is shown even before or without the list.
  const options = [...values, ...selected.filter((value) => !values.includes(value))];
  const current =
    selected.length === 0
      ? ''
      : selected.length === 1
        ? String(options.indexOf(selected[0] ?? null))
        : SEVERAL;
  return (
    <div className="dk-field">
      <label htmlFor={id} className="dk-field-label">
        {control.label ?? FIELD_NAMES[field].label}
      </label>
      <select
        id={id}
        className="dk-input"
        value={current}
        onChange={(event) => {
          const { value } = event.currentTarget;
          const chosen = value === '' ? [] : [options[Number(value)] ?? null];
          filterStore.select(field, chosen, FILTER_CONTROL_SOURCE);
        }}
      >
        <option value="">All</option>
        {selected.length > 1 && (
          <option value={SEVERAL} disabled>
            {selected.length} selected
          </option>
        )}
        {options.map((value, index) => (
          <option key={String(value)} value={index}>
            {formatValue(value, formatFor(field))}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The dashboard's filter controls, in a row above the grid. */
export function FilterControls({ controls }: { controls: FilterControl[] }) {
  const catalog = useClientValue(loadFieldCatalog);
  const measure = catalog.value?.measures[0]?.name;
  return (
    <div className="dk-filter-controls" role="group" aria-label="Filters">
      {controls.map((control) => (
        <FilterSelect key={control.field} control={control} measure={measure} />
      ))}
    </div>
  );
}
