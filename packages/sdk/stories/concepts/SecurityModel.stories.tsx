import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dashboard } from '../../src';

/** The same dashboard, as the API lets different tokens see it. */
const meta = {
  title: 'Concepts/Security model',
  render: () => <Dashboard dashboardId="overview" />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Signed in as Ravi, who may see South Asia and East Asia & Pacific only. The API removes every
 * other row before it applies any filter, so every widget, the KPI's total included, covers those
 * two regions alone.
 */
export const RowLevelSecurity: Story = { name: 'Row-level security', globals: { user: 'ravi' } };

/**
 * Signed in as Kofi, who may see every region but no GDP measure. The API refuses the two widgets
 * that need one, naming the measure, and shows the others in full.
 */
export const ColumnLevelSecurity: Story = {
  name: 'Column-level security',
  globals: { user: 'kofi' },
};

/**
 * A token that fails verification. The API answers 401, the SDK has no `getToken` to ask for a new
 * one, and the dashboard says the session is not valid, in its own theme.
 */
export const SessionInvalid: Story = {
  name: 'Session invalid',
  parameters: { token: 'not-a-token' },
};
