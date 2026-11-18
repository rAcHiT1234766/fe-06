import { formatValue } from '../core/format';
import { useDashKit } from './context';
import { FIELD_NAMES, formatFor } from './field-names';
import { useActiveFilters } from './hooks/use-cross-filter';

export function FilterBar() {
  const { filterStore } = useDashKit();
  const filters = useActiveFilters();
  if (filters.length === 0) return null;
  return (
    <div className="dk-filter-bar" role="group" aria-label="Active filters">
      <ul className="dk-chips">
        {filters.map(({ field, values }) => {
          const label = `${FIELD_NAMES[field].label}: ${values.map((value) => formatValue(value, formatFor(field))).join(', ')}`;
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
