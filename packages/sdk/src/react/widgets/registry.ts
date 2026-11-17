import type { ComponentType } from 'react';
import type { WidgetType } from '../../core/types';
import { BarView, KpiView, LineView, PieView, TableView, type WidgetViewProps } from './views';

interface WidgetDefinition {
  view: ComponentType<WidgetViewProps>;
  /** The smallest size, in grid columns and rows, at which the widget stays readable. */
  minSize: { minW: number; minH: number };
}

/** Everything the dashboard and the builder need to know about each widget type. */
export const widgetRegistry: Record<WidgetType, WidgetDefinition> = {
  bar: { view: BarView, minSize: { minW: 4, minH: 3 } },
  line: { view: LineView, minSize: { minW: 4, minH: 3 } },
  pie: { view: PieView, minSize: { minW: 4, minH: 3 } },
  table: { view: TableView, minSize: { minW: 4, minH: 4 } },
  kpi: { view: KpiView, minSize: { minW: 2, minH: 2 } },
};
