import type { WidgetConfig } from '../../core/types';
import { DuplicateIcon, RemoveIcon } from './icons';

interface WidgetActionsProps {
  widget: WidgetConfig;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function WidgetActions({ widget, onDuplicate, onRemove }: WidgetActionsProps) {
  return (
    <>
      <button
        type="button"
        className="dk-icon-button"
        aria-label={`Duplicate ${widget.title}`}
        title="Duplicate"
        onClick={onDuplicate}
      >
        <DuplicateIcon />
      </button>
      <button
        type="button"
        className="dk-icon-button"
        aria-label={`Remove ${widget.title}`}
        title="Remove"
        onClick={onRemove}
      >
        <RemoveIcon />
      </button>
    </>
  );
}
