import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '../core/query-client';
import type { DashboardConfig } from '../core/types';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { Dashboard } from './Dashboard';
import { DashboardBuilder } from './DashboardBuilder';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

setupMockApi();

afterEach(() => vi.restoreAllMocks());

interface Download {
  name: string;
  blob: Blob;
}

/** Catches each download, its file name and contents, instead of letting the browser save it. */
function catchDownloads() {
  const downloads: Download[] = [];
  const blobs = new Map<string, Blob>();
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    const url = `blob:${API_URL}/${blobs.size}`;
    blobs.set(url, blob as Blob);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.getAttribute('href') ?? '');
    if (blob) downloads.push({ name: this.download, blob });
  });
  return downloads;
}

// Browsers drop a byte order mark when reading text and the test DOM does not, so it goes first.
const linesOf = async ({ blob }: Download) =>
  (await blob.text())
    .replace(/^\uFEFF/, '')
    .split('\r\n')
    .slice(0, -1);

const countries: DashboardConfig = {
  id: 'countries',
  schemaVersion: 1,
  title: 'Countries',
  widgets: [
    {
      id: 'countries',
      type: 'table',
      title: 'Countries by population',
      options: { pageSize: 5 },
      query: {
        dataset: 'wdi',
        measures: [{ field: 'population', agg: 'sum' }],
        dimensions: ['country'],
        filters: [{ field: 'year', op: 'eq', value: 2024 }],
      },
    },
  ],
  layouts: { lg: [{ i: 'countries', x: 0, y: 0, w: 12, h: 6 }] },
};

describe('CSV export', () => {
  it('downloads a widget’s rows as a CSV file, only ever inside the user’s scope', async () => {
    const downloads = catchDownloads();
    render(
      <DashKitProvider apiUrl={API_URL} token={await demoToken('ravi')} allowExport>
        <Dashboard dashboardId="overview" />
      </DashKitProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Download Population by region as CSV' }),
    );

    expect(downloads.map(({ name }) => name)).toEqual(['population-by-region.csv']);
    const [heading, ...rows] = await linesOf(downloads[0]!);
    expect(heading).toBe('Region,Population');
    expect(rows.map((row) => row.split(',')[0]).toSorted()).toEqual([
      'East Asia & Pacific',
      'South Asia',
    ]);
    // Values stay unformatted, so a spreadsheet can add them up.
    for (const row of rows) expect(row.split(',')[1]).toMatch(/^\d+$/);
    // A byte order mark tells spreadsheet apps that the file is UTF-8.
    const start = new Uint8Array(await downloads[0]!.blob.arrayBuffer()).slice(0, 3);
    expect([...start]).toEqual([0xef, 0xbb, 0xbf]);
    expect(downloads[0]!.blob.type).toBe('text/csv;charset=utf-8');
  });

  it('downloads only the rows the active filters leave', async () => {
    const downloads = catchDownloads();
    render(
      <DashKitProvider
        apiUrl={API_URL}
        token={await demoToken('asha')}
        filters={[{ field: 'region', values: ['South Asia'], sourceWidgetId: 'host' }]}
        allowExport
      >
        <Dashboard dashboardId="overview" />
      </DashKitProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Download Countries as CSV' }));

    const [heading, ...rows] = await linesOf(downloads[0]!);
    expect(heading).toBe(
      'Country,Region,GDP per capita (US$),Life expectancy (years),Internet users (%)',
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((row) => row.split(',')[1]))).toEqual(new Set(['South Asia']));
  });

  it('downloads every row of a paged table, not only the page on screen', async () => {
    const downloads = catchDownloads();
    const token = await demoToken('ravi');
    render(
      <DashKitProvider apiUrl={API_URL} token={token} allowExport>
        <Dashboard config={countries} />
      </DashKitProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Download Countries by population as CSV' }),
    );

    const expected = await new QueryClient({ apiUrl: API_URL, token }).run(
      countries.widgets[0]!.query,
    );
    expect(expected.rows.length).toBeGreaterThan(5);
    const [, ...rows] = await linesOf(downloads[0]!);
    expect(rows).toHaveLength(expected.rows.length);
  });

  it('offers no download unless the host allows it, and none while editing', async () => {
    const token = await demoToken('asha');
    const { unmount } = render(
      <DashKitProvider apiUrl={API_URL} token={token}>
        <Dashboard dashboardId="overview" />
      </DashKitProvider>,
    );
    await screen.findByRole('table', { name: 'Countries' });
    expect(screen.queryAllByRole('button', { name: /as CSV$/ })).toEqual([]);
    unmount();

    render(
      <DashKitProvider apiUrl={API_URL} token={token} allowExport>
        <DashboardBuilder dashboardId="overview" />
      </DashKitProvider>,
    );
    await screen.findByRole('table', { name: 'Countries' });
    expect(await screen.findAllByRole('button', { name: /as CSV$/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Edit dashboard' }));
    expect(screen.queryAllByRole('button', { name: /as CSV$/ })).toEqual([]);
  });
});
