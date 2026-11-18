import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActiveFilter, DashboardConfig } from '../core/types';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { Dashboard } from './Dashboard';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

setupMockApi();

const inLatestYear = [{ field: 'year' as const, op: 'eq' as const, value: 2024 }];

const config: DashboardConfig = {
  id: 'drilling',
  schemaVersion: 1,
  title: 'Drilling',
  widgets: [
    {
      id: 'regions',
      type: 'bar',
      title: 'Population by region',
      drillDown: 'country',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['region'],
        filters: inLatestYear,
      },
    },
    {
      id: 'incomes',
      type: 'table',
      title: 'Income levels',
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['incomeLevel'],
        filters: inLatestYear,
      },
    },
  ],
  layouts: {
    lg: [
      { i: 'regions', x: 0, y: 0, w: 6, h: 4 },
      { i: 'incomes', x: 6, y: 0, w: 6, h: 4 },
    ],
  },
};

const SOUTH_ASIA = ['Bangladesh', 'Bhutan', 'India', 'Maldives', 'Nepal', 'Sri Lanka'];

async function renderDrilling(filters?: ActiveFilter[]) {
  render(
    <DashKitProvider
      apiUrl={API_URL}
      token={await demoToken('ravi')}
      {...(filters ? { filters } : {})}
    >
      <Dashboard config={config} />
    </DashKitProvider>,
  );
}

/** The first column of the data table behind the region chart, once it shows `expected`. */
async function chartRows(expected: string[]) {
  await waitFor(() => {
    const table = screen.getByRole('table', { name: 'Population by region' });
    const firsts = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.firstChild?.textContent ?? '');
    expect(firsts.toSorted()).toEqual(expected);
  });
}

describe('Drill-down', () => {
  it('shows the countries of a region clicked, filters the other widgets, and goes back', async () => {
    await renderDrilling();
    await chartRows(['East Asia & Pacific', 'South Asia']);
    fireEvent.click(await screen.findByRole('button', { name: 'Filter by South Asia' }));

    const path = await screen.findByRole('navigation', {
      name: 'Drill-down in Population by region',
    });
    expect(within(path).getByText('South Asia').getAttribute('aria-current')).toBe('location');
    await chartRows(SOUTH_ASIA);
    // The countries are not a selection of their own, so they offer nothing to click.
    const chart = screen.getByRole('table', { name: 'Population by region' });
    expect(within(chart).queryAllByRole('button')).toEqual([]);
    // The other widgets are filtered by the region, as by any click.
    expect(screen.getByText('Region: South Asia')).toBeTruthy();

    fireEvent.click(within(path).getByRole('button', { name: 'All regions' }));
    await chartRows(['East Asia & Pacific', 'South Asia']);
    expect(screen.queryByRole('navigation', { name: /^Drill-down/ })).toBeNull();
    expect(screen.queryByText('Region: South Asia')).toBeNull();
  });

  it('moves the focus to the way back after drilling in from the keyboard, and back again', async () => {
    await renderDrilling();
    const southAsia = await screen.findByRole('button', { name: 'Filter by South Asia' });
    southAsia.focus();
    fireEvent.click(southAsia);

    await chartRows(SOUTH_ASIA);
    const back = screen.getByRole('button', { name: 'All regions' });
    await waitFor(() => expect(document.activeElement).toBe(back));

    // A click from the keyboard has no pointer, so its detail is 0, as here.
    fireEvent.click(back);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Filter by South Asia' }),
      ),
    );
  });

  it('drills into every value of the widget’s selection, such as one the host set', async () => {
    const both = ['East Asia & Pacific', 'South Asia'];
    await renderDrilling([{ field: 'region', values: both, sourceWidgetId: 'regions' }]);
    expect(
      await screen.findByText('East Asia & Pacific, South Asia', { selector: '[aria-current]' }),
    ).toBeTruthy();
    await waitFor(() => {
      const table = screen.getByRole('table', { name: 'Population by region' });
      const countries = within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.firstChild?.textContent);
      expect(countries).toEqual(expect.arrayContaining([...SOUTH_ASIA, 'China', 'Japan']));
    });
  });

  it('does not drill on a selection made by another widget or by the host', async () => {
    await renderDrilling([{ field: 'region', values: ['South Asia'], sourceWidgetId: 'host' }]);
    // Filtered by the host, the chart shows the one region, still as a region.
    await chartRows(['South Asia']);
    expect(screen.queryByRole('navigation', { name: /^Drill-down/ })).toBeNull();
  });
});
