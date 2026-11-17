import type { WidgetConfig } from '../../core/types';
import { CrossIcon, DuplicateIcon, SettingsIcon } from './icons';

interface WidgetActionsProps {
  widget: WidgetConfig;
  /** The id of the settings panel, open for this widget when `isConfiguring`. */
  panelId: string;
  isConfiguring: boolean;
  /** Takes focus when it appears, so a widget just added is scrolled into view and announced. */
  isNew: boolean;
  onConfigure: (button: HTMLButtonElement) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function WidgetActions({
  widget,
  panelId,
  isConfiguring,
  isNew,
  onConfigure,
  onDuplicate,
  onRemove,
}: WidgetActionsProps) {
  return (
    <>
      <button
        type="button"
        className="dk-icon-button"
        aria-label={`Configure ${widget.title}`}
        title="Configure"
        aria-expanded={isConfiguring}
        aria-controls={isConfiguring ? panelId : undefined}
        autoFocus={isNew}
        onClick={(event) => onConfigure(event.currentTarget)}
      >
        <SettingsIcon />
      </button>
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
        <CrossIcon />
      </button>
    </>
  );
}
