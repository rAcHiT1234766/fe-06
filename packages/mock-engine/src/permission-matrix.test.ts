import type { QueryResult } from '@dashkit/sdk';
import { describe, expect, it } from 'vitest';
import { createApi } from './api.ts';
import { createRandomSecret } from './auth.ts';
import { createStarterDashboard } from './dashboards.ts';
import { snapshotRows } from './snapshot.ts';
import { demoUsers } from './users.ts';

const api = createApi(createRandomSecret());
const latestYear = Math.max(...snapshotRows.map((row) => row.year));

const regionCodeByName = new Map(snapshotRows.map((row) => [row.region, row.regionCode]));
const regionCodeByCountry = new Map(snapshotRows.map((row) => [row.country, row.regionCode]));
const allRegionNames = [...regionCodeByName.keys()];

async function post(path: string, body: object, token?: string) {
  const headers = new Headers(token ? { Authorization: `Bearer ${token}` } : {});
  const response = await api.handle(
    new Request(`http://api.test${path}`, { method: 'POST', headers, body: JSON.stringify(body) }),
  );
  return { status: response.status, body: (await response.json()) as unknown };
}

async function signIn(userId: string) {
  return ((await post('/auth/demo-token', { userId })).body as { token: string }).token;
}

async function query(token: string, body: object) {
  const response = await post('/query', { dataset: 'wdi', ...body }, token);
  expect(response.status).toBe(200);
  return (response.body as QueryResult).rows;
}

function scopeOf(userId: string) {
  const regions = demoUsers[userId]?.scopes.regions ?? [];
  return (regionCode: string | undefined) =>
    regions === '*' || (regionCode !== undefined && regions.includes(regionCode));
}

const fixedQueries = {
  ...Object.fromEntries(
    createStarterDashboard(latestYear).widgets.map((widget) => [widget.id, widget.query]),
  ),
  'every country and year': {
    measures: [{ field: 'gdp' }, { field: 'unemployment' }],
    dimensions: ['country', 'region', 'year'],
    limit: 1000,
  },
  'income levels per region': {
    measures: [{ field: 'internetUsers', agg: 'max' }],
    dimensions: ['region', 'incomeLevel'],
  },
  'a filter naming every region': {
    measures: [{ field: 'population' }],
    dimensions: ['region'],
    filters: [{ field: 'region', op: 'in', value: allRegionNames }],
  },
};

describe.each([
  ['asha', 7],
  ['ravi', 2],
  ['elena', 1],
])('permission matrix for %s', (userId, expectedRegionCount) => {
  const inScope = scopeOf(userId);
  const scopedRows = snapshotRows.filter((row) => inScope(row.regionCode));

  it.each(Object.entries(fixedQueries))(
    'FR-3.4 returns no out-of-scope row for "%s"',
    async (_name, body) => {
      const rows = await query(await signIn(userId), body);
      for (const { region, country } of rows) {
        if (typeof region === 'string') {
          expect(inScope(regionCodeByName.get(region))).toBe(true);
        }
        if (typeof country === 'string') {
          expect(inScope(regionCodeByCountry.get(country))).toBe(true);
        }
      }
    },
  );

  it(`FR-3.4 shows exactly ${expectedRegionCount} region(s)`, async () => {
    const rows = await query(await signIn(userId), {
      measures: [{ field: 'population' }],
      dimensions: ['region'],
    });
    expect(rows).toHaveLength(expectedRegionCount);
    expect(new Set(rows.map((row) => row.region))).toEqual(
      new Set(scopedRows.map((row) => row.region)),
    );
  });

  it('FR-3.4 computes yearly totals from in-scope rows only', async () => {
    const rows = await query(await signIn(userId), {
      measures: [{ field: 'population', agg: 'sum' }],
      dimensions: ['year'],
    });
    for (const row of rows) {
      const expected = scopedRows
        .filter((dataRow) => dataRow.year === row.year)
        .reduce((total, dataRow) => total + (dataRow.population ?? 0), 0);
      expect(row.population).toBe(expected);
    }
  });
});

it.each(['ravi', 'elena'])(
  'FR-3.9 returns zero rows with status 200 when %s filters on forbidden regions',
  async (userId) => {
    const inScope = scopeOf(userId);
    const forbidden = allRegionNames.filter((name) => !inScope(regionCodeByName.get(name)));
    const response = await post(
      '/query',
      {
        dataset: 'wdi',
        measures: [{ field: 'population' }],
        filters: [{ field: 'region', op: 'in', value: forbidden }],
      },
      await signIn(userId),
    );
    expect(response.status).toBe(200);
    expect((response.body as QueryResult).rows).toEqual([]);
  },
);
