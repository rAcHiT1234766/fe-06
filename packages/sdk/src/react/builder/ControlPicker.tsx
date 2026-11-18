import { useId } from 'react';
import type { FieldCatalog } from '../../core/query-client';
import type { DimensionField, FilterControl } from '../../core/types';

interface ControlPickerProps {
  dimensions: FieldCatalog['dimensions'];
  controls: FilterControl[];
  onToggle: (field: DimensionField) => void;
}

/** Chooses the fields the dashboard offers as filter controls above its grid. */
export function ControlPicker({ dimensions, controls, onToggle }: ControlPickerProps) {
  const labelId = useId();
  return (
    <div className="dk-palette" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="dk-palette-label">
        Filters above the dashboard
      </span>
      {dimensions.map(({ name, label }) => (
        <label key={name} className="dk-check">
          <input
            type="checkbox"
            checked={controls.some((control) => control.field === name)}
            onChange={() => onToggle(name)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
