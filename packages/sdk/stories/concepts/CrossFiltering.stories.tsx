import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Dashboard, type DashboardConfig } from '../../src';
import { hostArgTypes, type HostArgs } from '../support';

/**
 * Click a bar or a pie slice to filter every other widget, and click it again to remove the
 * filter. The clicked chart keeps all its items and highlights the selection. Keyboard users press
 * Tab to reach a chart's data table, which then covers the chart, and press Enter on a value.
 *
 * The Actions panel lists every change the host's `onFilterChange` receives, and the `filters`
 * control sets filters the way a host would.
 */
const meta = {
  title: 'Concepts/Cross-filtering',
  // The preview's DashKitProvider receives these args, as a host would pass them.
  args: { filters: [], onFilterChange: fn() },
  argTypes: hostArgTypes,
  render: () => <Dashboard dashboardId="overview" />,
} satisfies Meta<HostArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a bar or a slice. */
export const ClickToFilter: Story = { name: 'Click to filter' };

/** The host passes a filter on high-income countries, so the dashboard opens already filtered. */
export const SetByHost: Story = {
  name: 'Set by the host',
  args: { filters: [{ field: 'incomeLevel', values: ['High income'], sourceWidgetId: 'host' }] },
};

/**
 * Signed in as Ravi, who may see South Asia and East Asia & Pacific only. The host's filter on
 * Europe & Central Asia reaches the API, which removes the rows Ravi may not see before it applies
 * any filter, so every widget is empty.
 */
export const PermissionsStillApply: Story = {
  name: 'Permissions still apply',
  args: {
    filters: [{ field: 'region', values: ['Europe & Central Asia'], sourceWidgetId: 'host' }],
  },
  globals: { user: 'ravi' },
};

const inLatestYear = [{ field: 'year' as const, op: 'eq' as const, value: 2024 }];

const drillDownDashboard: DashboardConfig = {
  id: 'drill-down',
  schemaVersion: 1,
  title: 'Population',
  description: 'Click a region to see its countries.',
  widgets: [
    {
      id: 'by-region',
      type: 'bar',
      title: 'Population by region',
      options: { orientation: 'horizontal' },
      drillDown: 'country',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['region'],
        filters: inLatestYear,
        orderBy: [{ field: 'population', direction: 'desc' }],
      },
    },
    {
      id: 'by-income',
      type: 'pie',
      title: 'Population by income level',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['incomeLevel'],
        filters: inLatestYear,
      },
    },
  ],
  layouts: {
    lg: [
      { i: 'by-region', x: 0, y: 0, w: 7, h: 5 },
      { i: 'by-income', x: 7, y: 0, w: 5, h: 5 },
    ],
  },
};

/**
 * "Population by region" has `drillDown: 'country'`. Click a region: the chart shows that region's
 * countries, the pie is filtered to the region as by any click, and "All regions" above the chart
 * leads back. Keyboard users press Enter on a region in the chart's data table, and the focus moves
 * to "All regions".
 */
export const DrillDown: Story = {
  name: 'Drill down',
  render: () => <Dashboard config={drillDownDashboard} />,
};
