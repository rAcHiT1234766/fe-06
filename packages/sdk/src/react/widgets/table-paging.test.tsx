import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActiveFilter, DashboardConfig } from '../../core/types';
import { API_URL, demoToken, setupMockApi } from '../../testing/mock-api';
import { Dashboard } from '../Dashboard';
import { DashKitProvider } from '../DashKitProvider';

// The test DOM cannot draw on a canvas; this file has tables only.
vi.mock('../hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

setupMockApi();

// The seven World Bank regions, three to a page.
function regionsTable(pageSize: number): DashboardConfig {
  return {
    id: 'paged',
    schemaVersion: 1,
    title: 'Paged',
    widgets: [
      {
        id: 'regions',
        type: 'table',
        title: 'Regions',
        query: {
          dataset: 'wdi',
          measures: [{ field: 'population', agg: 'sum' }],
          dimensions: ['region'],
          filters: [{ field: 'year', op: 'eq', value: 2024 }],
          orderBy: [{ field: 'region', direction: 'asc' }],
        },
        options: { pageSize },
      },
    ],
    layouts: { lg: [{ i: 'regions', x: 0, y: 0, w: 12, h: 5 }] },
  };
}

async function renderTable(pageSize: number, filters?: ActiveFilter[]) {
  const token = await demoToken('asha');
  const tree = (activeFilters?: ActiveFilter[]) => (
    <DashKitProvider
      apiUrl={API_URL}
      token={token}
      {...(activeFilters && { filters: activeFilters })}
    >
      <Dashboard config={regionsTable(pageSize)} />
    </DashKitProvider>
  );
  const view = render(tree(filters));
  await screen.findByRole('table', { name: 'Regions' });
  return { rerender: (next: ActiveFilter[]) => view.rerender(tree(next)) };
}

const regionsShown = () =>
  within(screen.getByRole('table', { name: 'Regions' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.firstChild?.textContent);

const pager = () => screen.getByRole('navigation', { name: 'Pages of Regions' });
const status = () => within(pager()).getByRole('status').textContent;
const button = (name: 'Previous' | 'Next') => within(pager()).getByRole('button', { name });

describe('table pages', () => {
  it('shows a page at a time, and moves between pages', async () => {
    await renderTable(3);
    expect(regionsShown()).toEqual([
      'East Asia & Pacific',
      'Europe & Central Asia',
      'Latin America & Caribbean',
    ]);
    expect(status()).toBe('Rows 1–3 of 7');
    expect(button('Previous').getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(button('Next'));
    expect(status()).toBe('Rows 4–6 of 7');
    fireEvent.click(button('Next'));
    expect(status()).toBe('Rows 7–7 of 7');
    expect(regionsShown()).toEqual(['Sub-Saharan Africa']);
    // At the end Next stays focusable, so the focus is not lost, but does nothing.
    expect(button('Next').hasAttribute('disabled')).toBe(false);
    expect(button('Next').getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button('Next'));
    expect(status()).toBe('Rows 7–7 of 7');

    fireEvent.click(button('Previous'));
    expect(status()).toBe('Rows 4–6 of 7');
  });

  it('starts again on the first page when a filter changes the rows', async () => {
    const view = await renderTable(3);
    fireEvent.click(button('Next'));
    fireEvent.click(button('Next'));
    expect(status()).toBe('Rows 7–7 of 7');

    view.rerender([
      {
        field: 'region',
        values: ['South Asia', 'North America', 'Europe & Central Asia', 'East Asia & Pacific'],
        sourceWidgetId: 'host',
      },
    ]);
    expect(await within(pager()).findByText('Rows 1–3 of 4')).toBeTruthy();
    expect(regionsShown()).toEqual([
      'East Asia & Pacific',
      'Europe & Central Asia',
      'North America',
    ]);
  });

  it('shows no pager when every row fits on one page', async () => {
    await renderTable(7);
    expect(regionsShown()).toHaveLength(7);
    expect(screen.queryByRole('navigation', { name: 'Pages of Regions' })).toBeNull();
  });
});
