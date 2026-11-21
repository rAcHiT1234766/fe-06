import { act, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardConfig } from '../core/types';
import { registerMap } from '../map';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { Dashboard } from './Dashboard';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas, so the chart is left out and the click handler it would be
// given is kept, to click countries as ECharts reports them.
const chart = vi.hoisted(() => ({
  onItemClick: undefined as ((dataIndex: number, isAdditive: boolean) => void) | undefined,
}));
vi.mock('./hooks/use-echart', () => ({
  useEChart: (_option: unknown, _theme: unknown, onItemClick?: typeof chart.onItemClick) => {
    chart.onItemClick = onItemClick;
    return { current: null };
  },
}));

setupMockApi();

const config: DashboardConfig = {
  id: 'mapped',
  schemaVersion: 1,
  title: 'Mapped',
  widgets: [
    {
      id: 'by-country',
      type: 'map',
      title: 'Population by country',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['country'],
        filters: [{ field: 'year', op: 'eq', value: 2024 }],
      },
    },
  ],
  layouts: { lg: [{ i: 'by-country', x: 0, y: 0, w: 12, h: 6 }] },
};

const countriesIn = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.firstChild?.textContent);

describe('Map widget', () => {
  it('shows a table until its map is registered, then a map that filters by the country clicked', async () => {
    const onFilterChange = vi.fn();
    render(
      <DashKitProvider
        apiUrl={API_URL}
        token={await demoToken('ravi')}
        onFilterChange={onFilterChange}
      >
        <Dashboard config={config} />
      </DashKitProvider>,
    );
    const table = await screen.findByRole('table', { name: 'Population by country' });
    // Ravi sees South Asia and East Asia & Pacific only, India among them.
    await waitFor(() => expect(countriesIn(table)).toContain('India'));
    expect(screen.queryByRole('img', { name: 'Population by country chart' })).toBeNull();

    act(() => registerMap('world', { type: 'FeatureCollection', features: [] }));
    expect(screen.getByRole('img', { name: 'Population by country chart' })).toBeTruthy();
    const countries = countriesIn(
      screen.getByRole('table', { name: 'Population by country', hidden: true }),
    );

    // ECharts lists countries with no row after those with one; a click on them selects nothing.
    act(() => chart.onItemClick?.(countries.length + 2, false));
    expect(onFilterChange).not.toHaveBeenCalled();

    act(() => chart.onItemClick?.(countries.indexOf('India'), false));
    expect(onFilterChange).toHaveBeenLastCalledWith([
      { field: 'country', values: ['India'], sourceWidgetId: 'by-country' },
    ]);
  });
});
