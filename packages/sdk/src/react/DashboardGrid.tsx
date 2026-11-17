import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout';
import type { LayoutItem, WidgetConfig } from '../core/types';
import { useDashKit } from './context';
import { widgetRegistry } from './widgets/registry';
import { WidgetFrame } from './widgets/WidgetFrame';

interface DashboardGridProps {
  widgets: WidgetConfig[];
  layout: LayoutItem[];
  isEditing?: boolean;
  /** Called when a drag or resize ends, not on every movement. */
  onLayoutChange?: (layout: LayoutItem[]) => void;
}

// The grid adds working flags such as `moved`, which do not belong in a saved dashboard.
const toLayoutItems = (layout: Layout): LayoutItem[] =>
  layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));

/**
 * Pairs each layout item with its widget, in reading order so that keyboard and screen reader order
 * match the screen, and adds the widget type's minimum size so a resize stops there.
 */
export function placeWidgets(layout: LayoutItem[], widgets: WidgetConfig[]) {
  return layout
    .toSorted((a, b) => a.y - b.y || a.x - b.x)
    .flatMap((item) => {
      const widget = widgets.find(({ id }) => id === item.i);
      if (!widget) return [];
      return [{ widget, item: { ...item, ...widgetRegistry[widget.type].minSize } }];
    });
}

export function DashboardGrid({
  widgets,
  layout,
  isEditing = false,
  onLayoutChange,
}: DashboardGridProps) {
  const { typography } = useDashKit().theme;
  const { width, containerRef } = useContainerWidth();
  const placed = placeWidgets(layout, widgets);
  const saveLayout = (next: Layout) => onLayoutChange?.(toLayoutItems(next));
  // The gap matches the --dk-space-4 spacing, which follows the brand's base font size.
  const gap = typography.baseFontSize;

  return (
    <div ref={containerRef} className="dk-grid">
      <GridLayout
        width={width}
        layout={placed.map(({ item }) => item)}
        gridConfig={{ cols: 12, rowHeight: 72, margin: [gap, gap], containerPadding: [0, 0] }}
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
                  // There is no keyboard way to move a widget, so screen readers skip the handle.
                  <span className="dk-drag-handle" title="Drag to move" aria-hidden="true" />
                )
              }
            />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
