import type { ComponentType } from 'react';
import type { WidgetConfig, WidgetType } from '../../core/types';
import { BarView, KpiView, LineView, PieView, TableView, type WidgetViewProps } from './views';

/** A setting the config panel offers, besides the title and the type that every widget has. */
export type ConfigField =
  'measure' | 'aggregation' | 'dimension' | 'sort' | 'limit' | 'orientation' | 'emit' | 'listen';

const groupedFields: ConfigField[] = ['measure', 'aggregation', 'dimension', 'sort', 'limit'];

interface WidgetDefinition {
  label: string;
  view: ComponentType<WidgetViewProps>;
  defaultSize: { w: number; h: number };
  /** The smallest size, in grid columns and rows, at which the widget stays readable. */
  minSize: { minW: number; minH: number };
  /** What a widget added from the palette shows until it is configured. */
  starter: Pick<WidgetConfig, 'title' | 'query' | 'options'>;
  configFields: ConfigField[];
}

/** Everything the dashboard, the palette and the config panel need to know about each widget type. */
export const widgetRegistry: Record<WidgetType, WidgetDefinition> = {
  bar: {
    label: 'Bar chart',
    view: BarView,
    defaultSize: { w: 6, h: 4 },
    minSize: { minW: 4, minH: 3 },
    starter: {
      title: 'GDP per capita by region',
      // Region names are too long to sit side by side under vertical bars.
      options: { orientation: 'horizontal' },
      query: {
        dataset: 'wdi',
        measures: [{ field: 'gdpPerCapita', agg: 'avg' }],
        dimensions: ['region'],
        orderBy: [{ field: 'gdpPerCapita', direction: 'desc' }],
      },
    },
    configFields: [...groupedFields, 'orientation', 'emit', 'listen'],
  },
  line: {
    label: 'Line chart',
    view: LineView,
    defaultSize: { w: 6, h: 4 },
    minSize: { minW: 4, minH: 3 },
    starter: {
      title: 'Internet users over time',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'internetUsers', agg: 'avg' }],
        dimensions: ['year'],
        orderBy: [{ field: 'year', direction: 'asc' }],
      },
    },
    configFields: [...groupedFields, 'emit', 'listen'],
  },
  pie: {
    label: 'Pie chart',
    view: PieView,
    defaultSize: { w: 4, h: 4 },
    minSize: { minW: 4, minH: 3 },
    starter: {
      title: 'Population by income level',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['incomeLevel'],
      },
    },
    configFields: [...groupedFields, 'emit', 'listen'],
  },
  table: {
    label: 'Table',
    view: TableView,
    defaultSize: { w: 6, h: 5 },
    minSize: { minW: 4, minH: 4 },
    starter: {
      title: 'Life expectancy by country',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'lifeExpectancy', agg: 'avg' }],
        dimensions: ['country'],
        orderBy: [{ field: 'lifeExpectancy', direction: 'desc' }],
      },
    },
    configFields: [...groupedFields, 'emit', 'listen'],
  },
  kpi: {
    label: 'KPI',
    view: KpiView,
    defaultSize: { w: 3, h: 3 },
    minSize: { minW: 2, minH: 2 },
    starter: {
      title: 'Total GDP',
      query: { dataset: 'wdi', measures: [{ field: 'gdp', agg: 'sum' }] },
    },
    // A single number has nothing to click, group or sort.
    configFields: ['measure', 'aggregation', 'listen'],
  },
};
