import { useId } from 'react';
import type { WidgetType } from '../../core/types';
import { widgetRegistry } from '../widgets/registry';

const widgetTypes = Object.keys(widgetRegistry) as WidgetType[];

export function Palette({ onAdd }: { onAdd: (type: WidgetType) => void }) {
  const labelId = useId();
  return (
    <div className="dk-palette" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="dk-palette-label">
        Add a widget
      </span>
      {widgetTypes.map((type) => (
        <button key={type} type="button" className="dk-button" onClick={() => onAdd(type)}>
          {widgetRegistry[type].label}
        </button>
      ))}
    </div>
  );
}
