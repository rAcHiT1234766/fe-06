import { demoUsers } from '@dashkit/mock-engine/users';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Dashboard, DashKitProvider } from '../src';
import { API_URL, hostArgTypes, signIn, themeFor, type HostArgs } from './support';

interface DashboardStoryArgs extends HostArgs {
  dashboardId: string;
}

/**
 * The saved "World development overview" dashboard, as a host shows it with `<Dashboard>`. The
 * toolbar changes the brand, the colour mode and the signed-in user; each user gets their own
 * embed token, and with it only their own customer's dashboard and regions.
 */
const meta = {
  title: 'Dashboard',
  args: { dashboardId: 'overview', onFilterChange: fn() },
  argTypes: {
    dashboardId: {
      description: 'The saved dashboard to show. Every demo customer starts with `overview`.',
    },
    ...hostArgTypes,
  },
  render: ({ dashboardId }) => <Dashboard dashboardId={dashboardId} />,
} satisfies Meta<DashboardStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The dashboard as every user first sees it. */
export const ViewMode: Story = { name: 'View mode' };

/**
 * Two cross-filters are active: South Asia, selected in "Population by region", and lower middle
 * income, selected in "GDP by income level". The chips above the grid name them, and each chip
 * removes its own. The `filters` control sets them as a host would.
 */
export const WithFilters: Story = {
  name: 'With filters',
  args: {
    filters: [
      { field: 'region', values: ['South Asia'], sourceWidgetId: 'population-by-region' },
      { field: 'incomeLevel', values: ['Lower middle income'], sourceWidgetId: 'gdp-by-income' },
    ],
  },
};

/**
 * In a container 360 px wide, the grid uses its `xs` layout: one column, with the widgets in
 * reading order. The breakpoints follow the container's width, not the window's.
 */
export const PhoneWidth: Story = {
  name: 'Phone width',
  decorators: [
    (Story) => (
      <div
        style={{ width: 360, marginInline: 'auto', boxShadow: '0 0 0 1px rgb(128 128 128 / 50%)' }}
      >
        <Story />
      </div>
    ),
  ],
};

/**
 * Three customers on one page, each with its own provider and token: Acme Global signed in as
 * Asha, AsiaInsights as Ravi, and EuroStat Co as Elena. Each dashboard wears its customer's brand
 * and shows only its user's regions. The Mode toolbar applies here; Brand and User do not.
 */
export const ThreeBrands: Story = {
  name: 'Three brands',
  loaders: [
    async () => ({
      customers: await Promise.all(
        Object.entries(demoUsers).map(async ([userId, { tenantId }]) => ({
          userId,
          tenantId,
          ...(await signIn(userId)),
        })),
      ),
    }),
  ],
  render: ({ dashboardId }, { loaded, globals }) => (
    <div style={{ display: 'grid' }}>
      {(loaded.customers as { userId: string; tenantId: string; token: string }[]).map(
        ({ userId, tenantId, token }) => (
          <DashKitProvider
            key={userId}
            apiUrl={API_URL}
            token={token}
            theme={themeFor(tenantId, globals.mode as string)}
          >
            <Dashboard dashboardId={dashboardId} />
          </DashKitProvider>
        ),
      )}
    </div>
  ),
};
