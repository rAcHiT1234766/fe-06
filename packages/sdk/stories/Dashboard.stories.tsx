import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dashboard } from '../src';

const meta = {
  title: 'Dashboard',
  component: Dashboard,
  args: { dashboardId: 'overview' },
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed in as Asha, an Acme Global editor who may see every region. */
export const Overview: Story = {};

/**
 * Signed in as Ravi, who may only see South Asia and East Asia & Pacific. The API removes every
 * other row before it applies any filter, so every widget shows only those two regions.
 */
export const RowLevelSecurity: Story = { parameters: { user: 'ravi' } };

/** A token that fails verification gets a message in the dashboard's theme. */
export const SessionInvalid: Story = { parameters: { token: 'not-a-token' } };
