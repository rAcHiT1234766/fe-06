import { demoBrands } from '@dashkit/mock-engine/brands';
import { demoUsers } from '@dashkit/mock-engine/users';
import type { ActiveFilter, DashboardConfig, DashKitTheme, ThemeInput } from '../src';
import { QueryClient } from '../src/core/query-client';

// Storybook runs without a server: the mock API answers these addresses inside the browser.
export const API_URL = 'http://dashkit-api.test';
export const LOADING_API_URL = 'http://never-answers.test';
export const OFFLINE_API_URL = 'http://unreachable.test';

/**
 * Gets a demo user's embed token from the mock API, as a host's backend would mint one, and the
 * saved dashboard that user's customer starts with. The signing secret lives in the mock API only.
 */
export async function signIn(userId: string) {
  const response = await fetch(`${API_URL}/auth/demo-token`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  const { token } = (await response.json()) as { token: string };
  const dashboard: DashboardConfig = await new QueryClient({
    apiUrl: API_URL,
    token,
  }).loadDashboard('overview');
  return { token, dashboard };
}

/** The theme for a brand and colour mode from the toolbar. `brand` keeps the brand's own mode. */
export function themeFor(brandId: string, mode: string): ThemeInput {
  const brand = demoBrands[brandId] ?? {};
  return mode === 'brand' ? brand : { ...brand, mode: mode as DashKitTheme['mode'] };
}

/** One line per demo user for the toolbar, from the users the mock API knows. */
export const demoUserItems = Object.entries(demoUsers).map(
  ([userId, { tenantId, role, scopes }]) => {
    const customer = demoBrands[tenantId]?.brand?.name ?? tenantId;
    const regions =
      scopes.regions === '*' ? 'every region' : `regions ${scopes.regions.join(', ')}`;
    const measures = Array.isArray(scopes.measures)
      ? `, ${scopes.measures.length} measures only`
      : '';
    const name = userId.charAt(0).toUpperCase() + userId.slice(1);
    return { value: userId, title: name, right: `${role} at ${customer}, ${regions}${measures}` };
  },
);

/** Args of stories that play the host: they set the filters and receive every change. */
export interface HostArgs {
  filters?: ActiveFilter[];
  onFilterChange?: (filters: ActiveFilter[]) => void;
}

// Storybook shows these in the Controls table; it cannot read descriptions from an interface.
export const hostArgTypes = {
  filters: {
    description:
      'The `filters` the host passes to `DashKitProvider`. Editing them here applies them at once.',
  },
  onFilterChange: {
    description:
      'The `onFilterChange` callback. The provider calls it after every change, whether from a click or from the host.',
  },
};
