import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActiveFilter, DashboardConfig, WidgetConfig } from '../core/types';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { Dashboard } from './Dashboard';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

setupMockApi();

const inYear = (id: string, title: string): WidgetConfig => ({
  id,
  type: 'table',
  title,
  query: {
    dataset: 'wdi',
    measures: [{ field: 'population', agg: 'sum' }],
    dimensions: ['year'],
    filters: [{ field: 'year', op: 'eq', value: 2024 }],
  },
});

const config: DashboardConfig = {
  id: 'controlled',
  schemaVersion: 1,
  title: 'Controlled',
  filterControls: [{ field: 'region' }, { field: 'year', label: 'In the year' }],
  widgets: [
    {
      id: 'regions',
      type: 'bar',
      title: 'Population by region',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['region'],
      },
    },
    { ...inYear('shown-year', 'Population in the year shown') },
    { ...inYear('fixed-year', 'Population in 2024'), crossFilter: { listen: false } },
  ],
  layouts: {
    lg: [
      { i: 'regions', x: 0, y: 0, w: 12, h: 4 },
      { i: 'shown-year', x: 0, y: 4, w: 6, h: 4 },
      { i: 'fixed-year', x: 6, y: 4, w: 6, h: 4 },
    ],
  },
};

async function renderControlled(filters?: ActiveFilter[]) {
  const onFilterChange = vi.fn();
  render(
    <DashKitProvider
      apiUrl={API_URL}
      token={await demoToken('ravi')}
      onFilterChange={onFilterChange}
      {...(filters ? { filters } : {})}
    >
      <Dashboard config={config} />
    </DashKitProvider>,
  );
  const controls = within(await screen.findByRole('group', { name: 'Filters' }));
  return { controls, onFilterChange };
}

const optionsOf = (select: HTMLSelectElement) => [...select.options].map(({ text }) => text);
const shown = (select: HTMLSelectElement) => select.selectedOptions[0]?.text;

function choose(select: HTMLSelectElement, text: string) {
  const option = [...select.options].find((candidate) => candidate.text === text);
  if (!option) throw new Error(`No option "${text}"`);
  fireEvent.change(select, { target: { value: option.value } });
}

const firstColumn = (title: string) =>
  within(screen.getByRole('table', { name: title }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.firstChild?.textContent);

const regionsInChart = () => firstColumn('Population by region');

describe('Filter controls', () => {
  it('lists a field’s values within the user’s scope, and filters the dashboard by the choice', async () => {
    const { controls, onFilterChange } = await renderControlled();
    const region = controls.getByLabelText<HTMLSelectElement>('Region');
    await waitFor(() =>
      expect(optionsOf(region)).toEqual(['All', 'East Asia & Pacific', 'South Asia']),
    );

    choose(region, 'South Asia');
    expect(shown(region)).toBe('South Asia');
    expect(onFilterChange).toHaveBeenLastCalledWith([
      { field: 'region', values: ['South Asia'], sourceWidgetId: 'filter-control' },
    ]);
    expect(screen.getByText('Region: South Asia')).toBeTruthy();
    await waitFor(() => expect(regionsInChart()).toEqual(['South Asia']));

    choose(region, 'All');
    expect(onFilterChange).toHaveBeenLastCalledWith([]);
    await waitFor(() => expect(regionsInChart()).toHaveLength(2));
  });

  it('shows a value clicked in a chart, and a count when several are selected', async () => {
    const { controls } = await renderControlled();
    const region = controls.getByLabelText<HTMLSelectElement>('Region');
    fireEvent.click(await screen.findByRole('button', { name: 'Filter by East Asia & Pacific' }));
    expect(shown(region)).toBe('East Asia & Pacific');
    fireEvent.click(screen.getByRole('button', { name: 'Filter by South Asia' }), {
      ctrlKey: true,
    });
    expect(shown(region)).toBe('2 selected');
  });

  it('labels a control as the config says, and lists years from the latest', async () => {
    const { controls } = await renderControlled([
      { field: 'year', values: [2010], sourceWidgetId: 'host' },
    ]);
    const year = controls.getByLabelText<HTMLSelectElement>('In the year');
    expect(shown(year)).toBe('2010');
    await waitFor(() => expect(optionsOf(year).slice(0, 3)).toEqual(['All', '2024', '2023']));
    expect(optionsOf(year)).toHaveLength(26);
    expect(shown(year)).toBe('2010');
  });

  it('moves widgets that show one year to the year chosen, unless they ignore cross-filters', async () => {
    const { controls } = await renderControlled();
    await waitFor(() => expect(firstColumn('Population in the year shown')).toEqual(['2024']));
    const year = controls.getByLabelText<HTMLSelectElement>('In the year');
    await waitFor(() => expect(optionsOf(year)).toContain('2010'));
    choose(year, '2010');
    await waitFor(() => expect(firstColumn('Population in the year shown')).toEqual(['2010']));
    expect(firstColumn('Population in 2024')).toEqual(['2024']);
  });
});
