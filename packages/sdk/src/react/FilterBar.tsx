import { formatValue } from '../core/format';
import type { DimensionField } from '../core/types';
import { useDashKit } from './context';
import { useActiveFilters } from './hooks/use-cross-filter';

const FIELD_LABELS: Record<DimensionField, string> = {
  country: 'Country',
  region: 'Region',
  incomeLevel: 'Income level',
  year: 'Year',
};

export function FilterBar() {
  const { filterStore } = useDashKit();
  const filters = useActiveFilters();
  if (filters.length === 0) return null;
  return (
    <div className="dk-filter-bar" role="group" aria-label="Active filters">
      <ul className="dk-chips">
        {filters.map(({ field, values }) => {
          const format = field === 'year' ? 'year' : undefined;
          const label = `${FIELD_LABELS[field]}: ${values.map((value) => formatValue(value, format)).join(', ')}`;
          return (
            <li key={field} className="dk-chip">
              <span>{label}</span>
              <button
                type="button"
                className="dk-chip-remove"
                aria-label={`Remove filter ${label}`}
                onClick={() => filterStore.remove(field)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="dk-text-button" onClick={() => filterStore.clearAll()}>
        Clear all
      </button>
    </div>
  );
}
