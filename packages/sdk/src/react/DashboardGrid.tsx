import { useContext, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout';
import { COLUMNS, layoutFor } from '../core/config/layout';
import type { DashboardConfig, LayoutItem, WidgetConfig } from '../core/types';
import { arrangeByKey, isArrowKey, type ArrowKey } from './arrange-by-key';
import { BreakpointContext } from './breakpoint-context';
import { useDashKit } from './context';
import { widgetRegistry } from './widgets/registry';
import { WidgetFrame } from './widgets/WidgetFrame';

interface DashboardGridProps {
  widgets: WidgetConfig[];
  layouts: DashboardConfig['layouts'];
  /** Editing always works on the twelve-column `lg` layout, which is the one that is saved. */
  isEditing?: boolean;
  /**
   * Called when a drag or resize ends, not on every movement, with the new `lg` layout. A move or
   * resize from the keyboard also gives a `group` naming the widget and which of the two it was, so
   * a run of key presses can be undone as one.
   */
  onLayoutChange?: (layout: LayoutItem[], group?: string) => void;
  /** The builder's buttons for one widget, shown next to its drag handle. */
  actionsFor?: (widget: WidgetConfig) => ReactNode;
}

// The grid adds working flags such as `moved`, which do not belong in a saved dashboard.
const toLayoutItems = (layout: Layout): LayoutItem[] =>
  layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));

const KEY_HINT = 'Arrow keys move it; Shift and the arrow keys resize it.';

const LIMITS: Record<ArrowKey, [move: string, resize: string]> = {
  ArrowLeft: ['move further left', 'get any narrower'],
  ArrowRight: ['move further right', 'get any wider'],
  ArrowUp: ['move further up', 'get any shorter'],
  ArrowDown: ['move further down', 'get any taller'],
};

/**
 * Pairs each layout item with its widget, in reading order so that keyboard and screen reader order
 * match the screen. On the twelve-column grid, where widgets are resized, each item gets the larger
 * of its widget type's minimum size and its own, so a resize stops there. Narrower grids are never
 * edited and have fewer columns than some of those minimums, so they get none.
 */
export function placeWidgets(layout: LayoutItem[], widgets: WidgetConfig[], withMinSizes = true) {
  return layout
    .toSorted((a, b) => a.y - b.y || a.x - b.x)
    .flatMap(({ minW = 0, minH = 0, ...position }) => {
      const widget = widgets.find(({ id }) => id === position.i);
      if (!widget) return [];
      if (!withMinSizes) return [{ widget, item: position }];
      const typeMinimum = widgetRegistry[widget.type].minSize;
      const item = {
        ...position,
        minW: Math.max(typeMinimum.minW, minW),
        minH: Math.max(typeMinimum.minH, minH),
      };
      return [{ widget, item }];
    });
}

export function DashboardGrid({
  widgets,
  layouts,
  isEditing = false,
  onLayoutChange,
  actionsFor,
}: DashboardGridProps) {
  const { typography } = useDashKit().theme;
  const { width, containerRef } = useContainerWidth();
  const containerBreakpoint = useContext(BreakpointContext);
  const breakpoint = isEditing ? 'lg' : containerBreakpoint;
  const placed = placeWidgets(layoutFor(layouts, breakpoint), widgets, breakpoint === 'lg');
  const saveLayout = (next: Layout) => onLayoutChange?.(toLayoutItems(next));
  // The gap matches the --dk-space-4 spacing, which follows the brand's base font size.
  const gap = typography.baseFontSize;

  const hintId = useId();
  // Read by screen readers after each key press, since a widget moving is otherwise silent.
  const [keyNote, setKeyNote] = useState('');

  const arrangeWithKey = (event: KeyboardEvent, { id, title }: WidgetConfig) => {
    if (!isArrowKey(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
    // Otherwise the arrow keys would scroll the page as well.
    event.preventDefault();
    const isResizing = event.shiftKey;
    const items = placed.map(({ item }) => item);
    const next = arrangeByKey(items, id, event.key, isResizing, COLUMNS.lg);
    const [moveLimit, resizeLimit] = LIMITS[event.key];
    if (!next) {
      setKeyNote(`${title} cannot ${isResizing ? resizeLimit : moveLimit}.`);
      return;
    }
    const { x, y, w, h } = next.find(({ i }) => i === id)!;
    setKeyNote(
      isResizing
        ? `${title}: ${w} of ${COLUMNS.lg} columns wide, ${h} rows high.`
        : `${title}: column ${x + 1} of ${COLUMNS.lg}, row ${y + 1}.`,
    );
    onLayoutChange?.(toLayoutItems(next), `${id} ${isResizing ? 'resize' : 'move'}`);
  };

  return (
    // The container stays even when empty: the width hook measures it once, when it mounts.
    <div ref={containerRef} className="dk-grid">
      {placed.length === 0 && (
        <p className="dk-state">
          {isEditing ? 'Add a widget to start.' : 'This dashboard has no widgets yet.'}
        </p>
      )}
      {isEditing && (
        <>
          <p id={hintId} className="dk-visually-hidden">
            {KEY_HINT}
          </p>
          <p className="dk-visually-hidden" role="status">
            {keyNote}
          </p>
        </>
      )}
      <GridLayout
        width={width}
        layout={placed.map(({ item }) => item)}
        gridConfig={{
          cols: COLUMNS[breakpoint],
          rowHeight: 72,
          margin: [gap, gap],
          containerPadding: [0, 0],
        }}
        dragConfig={{ enabled: isEditing, handle: '.dk-drag-handle' }}
        resizeConfig={{ enabled: isEditing }}
        onDragStop={saveLayout}
        onResizeStop={saveLayout}
      >
        {placed.map(({ widget }) => (
          <div key={widget.id} className="dk-grid-cell">
            <WidgetFrame
              widget={widget}
              actions={
                isEditing && (
                  <div className="dk-widget-actions">
                    {actionsFor?.(widget)}
                    <button
                      type="button"
                      className="dk-drag-handle"
                      aria-label={`Move or resize ${widget.title}`}
                      aria-describedby={hintId}
                      title="Drag to move"
                      data-dk-hint={KEY_HINT}
                      onKeyDown={(event) => arrangeWithKey(event, widget)}
                    />
                  </div>
                )
              }
            />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
