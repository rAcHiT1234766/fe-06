import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DashboardBuilder, type DashboardConfig } from '../src';

/**
 * Editors arrange widgets by their handle, resize them from the bottom-right corner, add widgets
 * from the palette, and change each one in its settings panel. Every change shows at once, and
 * nothing is stored until Save. The Actions panel shows the config `onSave` receives.
 *
 * Saved dashboards live in the browser's mock API until the page reloads.
 */
const meta = {
  title: 'Builder',
  component: DashboardBuilder,
  args: { dashboardId: 'overview', mode: 'edit', onSave: fn() },
} satisfies Meta<typeof DashboardBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Starting in the builder. Asha, the default user, and Elena are editors; switch to Ravi in the
 * toolbar to see what a viewer gets instead.
 */
export const Editing: Story = {};

const emptyDashboard: DashboardConfig = {
  id: 'new-dashboard',
  schemaVersion: 1,
  title: 'New dashboard',
  widgets: [],
  layouts: { lg: [] },
};

/** A dashboard with no widgets yet. The palette adds them. */
export const Empty: Story = { args: { dashboardId: undefined, config: emptyDashboard } };

/** The settings panel of "Population by region", opened as an editor would open it. */
export const ConfigPanel: Story = {
  name: 'Config panel',
  globals: { user: 'asha' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Configure Population by region' }),
    );
    await expect(await canvas.findByLabelText('Measure')).toBeVisible();
  },
};

/**
 * Signed in as Ravi, a viewer. The story asks for the builder, but a viewer gets the dashboard
 * without any edit controls, and the API would refuse a save from him in any case.
 */
export const Viewer: Story = { globals: { user: 'ravi' } };
