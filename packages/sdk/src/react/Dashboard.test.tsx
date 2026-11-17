import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DashboardConfig, MeasureField, ThemeInput } from '../core/types';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { Dashboard, type DashboardProps } from './Dashboard';
import { DashKitProvider, type DashKitProviderProps } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

const server = setupMockApi();
let queriesSent = 0;
server.events.on('request:start', ({ request }) => {
  if (request.url.endsWith('/query')) queriesSent++;
});

afterEach(() => {
  queriesSent = 0;
  vi.restoreAllMocks();
});

type ProviderProps = Omit<DashKitProviderProps, 'apiUrl' | 'children'>;

function renderDashboard(
  providerProps: ProviderProps,
  dashboardProps: DashboardProps = { dashboardId: 'overview' },
) {
  const tree = (props: ProviderProps) => (
    <DashKitProvider apiUrl={API_URL} {...props}>
      <Dashboard {...dashboardProps} />
    </DashKitProvider>
  );
  const view = render(tree(providerProps));
  return { ...view, rerender: (props: ProviderProps) => view.rerender(tree(props)) };
}

const themeRule = (container: HTMLElement) => container.querySelector('style')?.textContent ?? '';

const regionsInChart = async (title: string) => {
  const table = await screen.findByRole('table', { name: title });
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.firstChild?.textContent);
};

describe('Dashboard', () => {
  it('FR-1.1 renders the saved dashboard with all five widget types on real data', async () => {
    renderDashboard({ token: await demoToken('asha') });

    expect(await screen.findByRole('heading', { name: 'World development overview' })).toBeTruthy();
    const kpi = within(await screen.findByRole('region', { name: 'Total population' }));
    expect((await kpi.findByText(/^\d+(\.\d)?B$/)).textContent).toMatch(/B$/);
    for (const title of [
      'Population by region',
      'GDP by income level',
      'Average life expectancy',
    ]) {
      expect(await screen.findByRole('img', { name: `${title} chart` })).toBeTruthy();
    }
    expect(await screen.findByRole('region', { name: 'Countries table' })).toBeTruthy();
    expect(await regionsInChart('Population by region')).toHaveLength(7);
  });

  it('NFR-A2 gives every chart an accessible name and its data as a table', async () => {
    renderDashboard({ token: await demoToken('ravi') });
    const table = await screen.findByRole('table', { name: 'Average life expectancy' });
    expect(within(table).getByRole('columnheader', { name: 'Year' })).toBeTruthy();
    expect(within(table).getAllByRole('row')).toHaveLength(26);
  });

  it('FR-3.4 shows each user only the rows their token allows', async () => {
    renderDashboard({ token: await demoToken('ravi') });
    expect((await regionsInChart('Population by region')).toSorted()).toEqual([
      'East Asia & Pacific',
      'South Asia',
    ]);
  });

  it('FR-3.10 never shows the previous user’s data after the token changes', async () => {
    const view = renderDashboard({ token: await demoToken('ravi') });
    await screen.findByRole('table', { name: 'Population by region' });

    view.rerender({ token: await demoToken('elena') });
    expect(screen.queryByRole('table', { name: 'Population by region' })).toBeNull();
    expect(await regionsInChart('Population by region')).toEqual(['Europe & Central Asia']);
  });

  it('FR-3.8 shows a themed "session invalid" state for a tampered token', async () => {
    const token = await demoToken('ravi');
    renderDashboard({ token: `${token.slice(0, -2)}xx` });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Session invalid');
    expect(alert.className).toContain('dk-error');
  });

  it('FR-3.8 recovers through getToken when the token is rejected', async () => {
    renderDashboard({ token: 'not-a-token', getToken: () => demoToken('elena') });
    expect(await regionsInChart('Population by region')).toEqual(['Europe & Central Asia']);
  });

  it('shows loading, empty and error states per widget', async () => {
    const config: DashboardConfig = {
      id: 'states',
      schemaVersion: 1,
      title: 'Widget states',
      widgets: [
        {
          id: 'empty',
          type: 'table',
          title: 'Before 2000',
          query: {
            dataset: 'wdi',
            measures: [{ field: 'population' }],
            filters: [{ field: 'year', op: 'eq', value: 1990 }],
          },
        },
        {
          id: 'invalid',
          type: 'kpi',
          title: 'Unknown measure',
          query: { dataset: 'wdi', measures: [{ field: 'revenue' as MeasureField }] },
        },
      ],
      layouts: {
        lg: [
          { i: 'empty', x: 0, y: 0, w: 6, h: 4 },
          { i: 'invalid', x: 6, y: 0, w: 6, h: 4 },
        ],
      },
    };
    renderDashboard({ token: await demoToken('asha') }, { config });

    const empty = within(screen.getByRole('region', { name: 'Before 2000' }));
    const invalid = within(screen.getByRole('region', { name: 'Unknown measure' }));
    expect(empty.getByRole('status').textContent).toBe('Loading');
    expect(await empty.findByText('No data for this selection')).toBeTruthy();
    expect((await invalid.findByRole('alert')).textContent).toContain('Invalid widget settings');
  });

  it('FR-2.3 switches mode without reloading data or remounting widgets', async () => {
    const token = await demoToken('asha');
    const view = renderDashboard({ token, theme: { mode: 'light' } });
    const table = await screen.findByRole('region', { name: 'Countries table' });
    const queriesBefore = queriesSent;
    expect(themeRule(view.container)).toContain('--dk-color-scheme: light;');

    view.rerender({ token, theme: { mode: 'dark' } });
    expect(themeRule(view.container)).toContain('--dk-color-scheme: dark;');
    expect(screen.getByRole('region', { name: 'Countries table' })).toBe(table);
    expect(queriesSent).toBe(queriesBefore);
  });

  it('FR-2.2 follows the operating system setting in auto mode', async () => {
    const listeners = new Set<() => void>();
    let prefersDark = true;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (media: string) =>
        ({
          media,
          get matches() {
            return prefersDark && media.includes('dark');
          },
          addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
        }) as unknown as MediaQueryList,
    );

    const view = renderDashboard({ token: await demoToken('asha'), theme: { mode: 'auto' } });
    expect(themeRule(view.container)).toContain('--dk-color-scheme: dark;');

    prefersDark = false;
    act(() => listeners.forEach((listener) => listener()));
    expect(themeRule(view.container)).toContain('--dk-color-scheme: light;');
  });

  it('FR-2.9 sets theme variables in a rule the host can override', async () => {
    const theme: ThemeInput = { mode: 'light', light: { primary: '#123456' } };
    const view = renderDashboard({ token: await demoToken('asha'), theme });
    expect(themeRule(view.container)).toMatch(
      /:where\(\.dk-root\[data-dk-theme="[^"]+"\]\) \{[^}]*--dk-color-primary: #123456;/,
    );
  });

  it('FR-2.8 warns during development when theme text has too little contrast', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderDashboard({
      token: await demoToken('asha'),
      theme: { mode: 'light', light: { textMuted: '#bbbbbb' } },
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('textMuted on surface'));
  });
});
