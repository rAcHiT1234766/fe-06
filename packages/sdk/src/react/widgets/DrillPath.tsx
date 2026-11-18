import { useLayoutEffect, useRef, type RefObject } from 'react';
import { formatValue } from '../../core/format';
import type { ActiveFilter } from '../../core/types';
import { useDashKit } from '../context';
import { FIELD_NAMES, formatFor } from '../field-names';

type FocusTarget = { to: 'back' } | { to: 'value'; text: string };

/**
 * Drilling in or out replaces a widget's rows, and with them the button that was pressed, so the
 * browser drops the focus to the page. Once the new rows are drawn, this puts it on the way back:
 * the link to the top level after drilling in from inside the widget, and the value drilled into
 * after leaving from the keyboard. Someone who clicked the chart itself had no focus in the widget
 * and gets none, and the focus is moved only if it was dropped, never taken from elsewhere.
 */
export function useDrillFocus(
  widgetRef: RefObject<HTMLElement | null>,
  drilled: ActiveFilter | undefined,
  isDrawn: boolean,
) {
  const target = useRef<FocusTarget | undefined>(undefined);
  const previous = useRef(drilled);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = drilled;
    const widget = widgetRef.current;
    if (!drilled || drilled === before || !widget) return;
    // The rows have not changed yet, so the button that was pressed still has the focus.
    const { activeElement } = widget.getRootNode() as Document | ShadowRoot;
    if (activeElement && widget.contains(activeElement)) target.current = { to: 'back' };
  }, [drilled, widgetRef]);

  useLayoutEffect(() => {
    const widget = widgetRef.current;
    const pending = target.current;
    if (!widget || !pending || !isDrawn) return;
    target.current = undefined;
    const { activeElement, body } = widget.ownerDocument;
    if (activeElement && activeElement !== body) return;
    const next =
      pending.to === 'back'
        ? widget.querySelector<HTMLElement>('.dk-drill-back')
        : [...widget.querySelectorAll<HTMLElement>('.dk-select')].find(
            (button) => button.textContent === pending.text,
          );
    next?.focus();
  });

  return {
    /** Sends the focus to the button of `selection`'s first value once the top level is drawn. */
    returnTo({ field, values }: ActiveFilter) {
      target.current = { to: 'value', text: formatValue(values[0] ?? null, formatFor(field)) };
    },
  };
}

interface DrillPathProps {
  title: string;
  selection: ActiveFilter;
  /** Called before leaving; `isKeyboard` when the link was used from the keyboard. */
  onLeave: (isKeyboard: boolean) => void;
}

/** Where a drilled-down widget is, and the link back to its top level. */
export function DrillPath({ title, selection, onLeave }: DrillPathProps) {
  const { filterStore } = useDashKit();
  const { field, values } = selection;
  return (
    <nav className="dk-drill-path" aria-label={`Drill-down in ${title}`}>
      <button
        type="button"
        className="dk-text-button dk-drill-back"
        onClick={(event) => {
          // A click made with Enter or Space has no pointer position to count, so its detail is 0.
          onLeave(event.detail === 0);
          filterStore.remove(field);
        }}
      >
        {FIELD_NAMES[field].all}
      </button>
      <span aria-hidden="true">›</span>
      <span aria-current="location">
        {values.map((value) => formatValue(value, formatFor(field))).join(', ')}
      </span>
    </nav>
  );
}
