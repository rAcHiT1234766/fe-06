import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '../core/query-client';
import type { ActiveFilter, DashboardConfig, WidgetConfig } from '../core/types';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { Dashboard } from './Dashboard';
import { DashKitProvider, type DashKitProviderProps } from './DashKitProvider';

// The test DOM cannot draw on a canvas, so clicks go through each chart's data table instead, which
// is also how keyboard users filter.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

const server = setupMockApi();

type HostProps = Omit<DashKitProviderProps, 'apiUrl' | 'token' | 'children'>;

async function renderOverview(
  userId: string,
  hostProps: HostProps = {},
  editConfig: (config: DashboardConfig) => DashboardConfig = (config) => config,
) {
  const token = await demoToken(userId);
  const config = editConfig(
    await new QueryClient({ apiUrl: API_URL, token }).loadDashboard('overview'),
  );
  const tree = (props: HostProps) => (
    <DashKitProvider apiUrl={API_URL} token={token} {...props}>
      <Dashboard config={config} />
    </DashKitProvider>
  );
  const view = render(tree(hostProps));
  return { rerender: (props: HostProps) => view.rerender(tree(props)) };
}

const changeWidget =
  (id: string, change: Partial<WidgetConfig>) =>
  (config: DashboardConfig): DashboardConfig => ({
    ...config,
    widgets: config.widgets.map((widget) => (widget.id === id ? { ...widget, ...change } : widget)),
  });

const CHARTS = ['Population by region', 'GDP by income level', 'Average life expectancy'];

const waitForWidgets = () =>
  Promise.all([...CHARTS, 'Countries'].map((name) => screen.findByRole('table', { name })));

const tableText = (name: string) => screen.getByRole('table', { name }).textContent;

const column = (name: string, index: number) =>
  within(screen.getByRole('table', { name }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.children[index]?.textContent);

const regionsOfCountries = () => [...new Set(column('Countries', 1))];

const filterButton = (table: string, value: string) =>
  within(screen.getByRole('table', { name: table })).getByRole('button', {
    name: `Filter by ${value}`,
  });

const select = (table: string, value: string) => fireEvent.click(filterButton(table, value));

describe('cross-filtering', () => {
  it('FR-4.1 narrows the pie, line, table and KPI to the region selected in the bar chart', async () => {
    await renderOverview('asha');
    await waitForWidgets();
    const before = [...CHARTS, 'Countries'].map(tableText);
    const kpiBefore = screen.getByRole('region', { name: 'Total population' }).textContent;

    select('Population by region', 'South Asia');

    await waitFor(() => expect(regionsOfCountries()).toEqual(['South Asia']));
    expect(tableText('GDP by income level')).not.toBe(before[1]);
    expect(tableText('Average life expectancy')).not.toBe(before[2]);
    expect(screen.getByRole('region', { name: 'Total population' }).textContent).not.toBe(
      kpiBefore,
    );
  });

  it('FR-4.3 keeps every bar in the source chart and marks the selected one', async () => {
    await renderOverview('asha');
    await waitForWidgets();
    select('Population by region', 'South Asia');

    await waitFor(() => expect(regionsOfCountries()).toEqual(['South Asia']));
    expect(column('Population by region', 0)).toHaveLength(7);
    expect(filterButton('Population by region', 'South Asia').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(filterButton('Population by region', 'North America').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('FR-4.2 restores every widget when the selected bar is clicked again', async () => {
    await renderOverview('asha');
    await waitForWidgets();
    const before = [...CHARTS, 'Countries'].map(tableText);

    select('Population by region', 'South Asia');
    await waitFor(() => expect(regionsOfCountries()).toEqual(['South Asia']));
    select('Population by region', 'South Asia');

    await waitFor(() => expect([...CHARTS, 'Countries'].map(tableText)).toEqual(before));
  });

  it('FR-4.6 keeps the previous rows on screen while the filtered rows load', async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(`${API_URL}/query`, async ({ request }) => {
        if ((await request.clone().text()).includes('South Asia')) await held;
      }),
    );
    await renderOverview('asha');
    await waitForWidgets();
    const countriesBefore = tableText('Countries');

    select('Population by region', 'South Asia');
    expect(tableText('Countries')).toBe(countriesBefore);
    expect(
      within(screen.getByRole('region', { name: 'Countries' })).queryByRole('status'),
    ).toBeNull();

    release();
    await waitFor(() => expect(regionsOfCountries()).toEqual(['South Asia']));
  });

  it('FR-4.7 shows the newest selection when the answer to an older one arrives late', async () => {
    let releaseSouthAsia = () => {};
    const held = new Promise<void>((resolve) => (releaseSouthAsia = resolve));
    server.use(
      http.post(`${API_URL}/query`, async ({ request }) => {
        if ((await request.clone().text()).includes('South Asia')) await held;
      }),
    );
    await renderOverview('asha');
    await waitForWidgets();

    select('Population by region', 'South Asia');
    select('Population by region', 'East Asia & Pacific');
    await waitFor(() => expect(regionsOfCountries()).toEqual(['East Asia & Pacific']));

    releaseSouthAsia();
    // Long enough for the late South Asia answers to reach the widgets, had they been kept.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(regionsOfCountries()).toEqual(['East Asia & Pacific']);
  });

  it('FR-4.8 leaves out widgets that do not listen and gives no filter buttons to ones that do not emit', async () => {
    await renderOverview('asha', {}, (config) =>
      changeWidget('countries', { crossFilter: { listen: false } })(
        changeWidget('gdp-by-income', { crossFilter: { emit: false } })(config),
      ),
    );
    await waitForWidgets();
    const countriesBefore = tableText('Countries');
    const incomeBefore = tableText('GDP by income level');
    expect(
      within(screen.getByRole('table', { name: 'GDP by income level' })).queryAllByRole('button'),
    ).toEqual([]);

    select('Population by region', 'South Asia');

    await waitFor(() => expect(tableText('GDP by income level')).not.toBe(incomeBefore));
    expect(tableText('Countries')).toBe(countriesBefore);
  });

  it('FR-4.5 lets table rows act as filter sources', async () => {
    await renderOverview('asha', {}, changeWidget('countries', { crossFilter: { emit: true } }));
    await waitForWidgets();

    select('Countries', 'India');

    await waitFor(() => expect(column('Population by region', 0)).toEqual(['South Asia']));
    expect(filterButton('Countries', 'India').getAttribute('aria-pressed')).toBe('true');
  });

  it('FR-4.9 reports filter changes to the host and applies the filters the host passes', async () => {
    const onFilterChange = vi.fn();
    const view = await renderOverview('asha', { onFilterChange });
    await waitForWidgets();

    select('Population by region', 'South Asia');
    expect(onFilterChange).toHaveBeenLastCalledWith([
      { field: 'region', values: ['South Asia'], sourceWidgetId: 'population-by-region' },
    ]);

    const highIncome: ActiveFilter[] = [
      { field: 'incomeLevel', values: ['High income'], sourceWidgetId: 'host' },
    ];
    view.rerender({ onFilterChange, filters: highIncome });
    await waitFor(() => expect(column('GDP by income level', 0)).toEqual(['High income']));
    expect(onFilterChange).toHaveBeenLastCalledWith(highIncome);
  });

  it('FR-4.11 gets no rows for a cross-filter on a region outside the user’s scope', async () => {
    const sentFilters: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/query'))
        void request
          .clone()
          .text()
          .then((body) => sentFilters.push(body));
    });
    const outsideScope: ActiveFilter[] = [
      { field: 'region', values: ['Europe & Central Asia'], sourceWidgetId: 'host' },
    ];
    await renderOverview('ravi', { filters: outsideScope });

    for (const name of ['Total population', ...CHARTS, 'Countries']) {
      const widget = within(screen.getByRole('region', { name }));
      expect(await widget.findByText('No data for this selection')).toBeTruthy();
    }
    // The browser asked for the region and the API answered with nothing, rather than the SDK
    // leaving the filter out.
    expect(sentFilters).toHaveLength(5);
    expect(sentFilters.every((body) => body.includes('Europe & Central Asia'))).toBe(true);
    server.events.removeAllListeners();
  });

  it('FR-4.4 shows each filter as a removable chip, with a control that clears them all', async () => {
    await renderOverview('asha');
    await waitForWidgets();
    const before = [...CHARTS, 'Countries'].map(tableText);
    expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull();

    select('Population by region', 'South Asia');
    select('GDP by income level', 'Lower middle income');
    const filterBar = within(screen.getByRole('group', { name: 'Active filters' }));
    const chips = () =>
      filterBar.queryAllByRole('listitem').map((chip) => chip.firstChild?.textContent);
    expect(chips()).toEqual(['Region: South Asia', 'Income level: Lower middle income']);

    fireEvent.click(filterBar.getByRole('button', { name: 'Remove filter Region: South Asia' }));
    expect(chips()).toEqual(['Income level: Lower middle income']);
    expect(filterButton('Population by region', 'South Asia').getAttribute('aria-pressed')).toBe(
      'false',
    );

    fireEvent.click(filterBar.getByRole('button', { name: 'Clear all' }));
    expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull();
    await waitFor(() => expect([...CHARTS, 'Countries'].map(tableText)).toEqual(before));
  });

  it('applies the dashboard’s default filters to every widget without showing them as chips', async () => {
    await renderOverview('asha', {}, (config) => ({
      ...config,
      defaultFilters: [{ field: 'region', op: 'eq', value: 'South Asia' }],
    }));
    await waitForWidgets();

    expect(column('Population by region', 0)).toEqual(['South Asia']);
    expect(regionsOfCountries()).toEqual(['South Asia']);
    expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull();
  });
});
