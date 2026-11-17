import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Dashboard, type ActiveFilter } from '../src';

interface HostArgs {
  /** Filters the host passes to `DashKitProvider`. Editing them here applies them at once. */
  filters: ActiveFilter[];
  /** The provider calls it after every change, whether from a click or from the host. */
  onFilterChange: (filters: ActiveFilter[]) => void;
}

/**
 * Click a bar or a pie slice to filter every other widget, and click it again to remove the
 * filter. The clicked chart keeps all its items and highlights the selection. Keyboard users press
 * Tab to reach a chart's data table, which then covers the chart, and press Enter on a value.
 *
 * The Actions panel lists every change the host's `onFilterChange` receives, and the `filters`
 * control sets filters the way a host would.
 */
const meta = {
  title: 'Cross-filtering',
  // The preview's DashKitProvider receives these args, as a host would pass them.
  args: { filters: [], onFilterChange: fn() },
  render: () => <Dashboard dashboardId="overview" />,
} satisfies Meta<HostArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClickToFilter: Story = {};

/** The host passes a filter on high-income countries, so the dashboard opens already filtered. */
export const SetByHost: Story = {
  args: { filters: [{ field: 'incomeLevel', values: ['High income'], sourceWidgetId: 'host' }] },
};

/**
 * Signed in as Ravi, who may see South Asia and East Asia & Pacific only. The host's filter on
 * Europe & Central Asia reaches the API, which removes the rows Ravi may not see before it applies
 * any filter, so every widget is empty.
 */
export const PermissionsStillApply: Story = {
  args: {
    filters: [{ field: 'region', values: ['Europe & Central Asia'], sourceWidgetId: 'host' }],
  },
  parameters: { user: 'ravi' },
};
