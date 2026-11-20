import type { DashboardConfig } from '@dashkit/sdk';
import { base64url, decodeJwt } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApi, type MockApi } from './api.ts';
import { createRandomSecret } from './auth.ts';
import { createExplorerDashboard, createStarterDashboard } from './dashboards.ts';
import { demoUsers } from './users.ts';

const BASE_URL = 'http://api.test';

let api: MockApi;

beforeEach(() => {
  api = createApi(createRandomSecret());
});

afterEach(() => {
  vi.useRealTimers();
});

async function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  const body = options.body === undefined ? null : JSON.stringify(options.body);
  const response = await api.handle(new Request(`${BASE_URL}${path}`, { method, headers, body }));
  return {
    status: response.status,
    body: response.status === 204 ? null : ((await response.json()) as unknown),
  };
}

async function tokenFor(userId: string, target = api) {
  const response = await target.handle(
    new Request(`${BASE_URL}/auth/demo-token`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  );
  return ((await response.json()) as { token: string }).token;
}

const populationQuery = { dataset: 'wdi', measures: [{ field: 'population' }] };

const dashboardNamed = (id: string, title: string): DashboardConfig => ({
  ...createStarterDashboard(2024),
  id,
  title,
});

// The starter dashboard with extra fields on its first layout item.
function withFirstItem(fields: Record<string, unknown>) {
  const dashboard = createStarterDashboard(2024);
  const [first, ...rest] = dashboard.layouts.lg;
  return { ...dashboard, layouts: { lg: [{ ...first, ...fields }, ...rest] } };
}

describe('demo API', () => {
  it('serves /health without a token', async () => {
    expect(await call('GET', '/health')).toEqual({ status: 200, body: { status: 'ok' } });
  });

  it('FR-3.1 signs tokens only for known demo users', async () => {
    expect(await tokenFor('ravi')).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(await call('POST', '/auth/demo-token', { body: { userId: 'toString' } })).toMatchObject({
      status: 404,
    });
  });

  it('FR-3.3 rejects a request without a token', async () => {
    expect(await call('POST', '/query', { body: populationQuery })).toEqual({
      status: 401,
      body: { error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token' } },
    });
  });

  it('FR-3.3 rejects a token with one character changed', async () => {
    const token = await tokenFor('ravi');
    const middle = Math.floor(token.length * 0.9);
    const tampered =
      token.slice(0, middle) + (token[middle] === 'A' ? 'B' : 'A') + token.slice(middle + 1);
    expect(await call('POST', '/query', { token: tampered, body: populationQuery })).toMatchObject({
      status: 401,
      body: { error: { code: 'UNAUTHENTICATED' } },
    });
  });

  it('FR-3.3 rejects a token whose claims were rewritten to widen the scope', async () => {
    const token = await tokenFor('ravi');
    const [header, , signature] = token.split('.');
    const claims = decodeJwt(token);
    const widened = base64url.encode(JSON.stringify({ ...claims, scopes: { regions: '*' } }));
    const forged = [header, widened, signature].join('.');
    expect(await call('POST', '/query', { token: forged, body: populationQuery })).toMatchObject({
      status: 401,
    });
  });

  it('FR-3.3 rejects a token signed with a different key', async () => {
    const foreignToken = await tokenFor('asha', createApi(createRandomSecret()));
    expect(
      await call('POST', '/query', { token: foreignToken, body: populationQuery }),
    ).toMatchObject({
      status: 401,
      body: { error: { message: 'Invalid token' } },
    });
  });

  it('FR-3.3 rejects a token after its 15 minutes are up', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const token = await tokenFor('asha');
    vi.setSystemTime(Date.now() + 14 * 60_000);
    expect((await call('POST', '/query', { token, body: populationQuery })).status).toBe(200);
    vi.setSystemTime(Date.now() + 2 * 60_000);
    expect(await call('POST', '/query', { token, body: populationQuery })).toEqual({
      status: 401,
      body: { error: { code: 'UNAUTHENTICATED', message: 'Token expired' } },
    });
  });

  it('FR-3.5 ignores a tenantId in the query string', async () => {
    const elena = await tokenFor('elena');
    await call('PUT', '/dashboards/euro-only', {
      token: elena,
      body: dashboardNamed('euro-only', 'Europe'),
    });

    const ravi = await tokenFor('ravi');
    expect((await call('GET', '/dashboards?tenantId=eurostat', { token: ravi })).body).toEqual([
      { id: 'overview', title: 'World development overview' },
      { id: 'population', title: 'Population explorer' },
    ]);
    expect(
      (await call('GET', '/dashboards/euro-only?tenantId=eurostat', { token: ravi })).status,
    ).toBe(404);
  });

  it('FR-3.6 keeps saved dashboards separate for each tenant', async () => {
    const asha = await tokenFor('asha');
    const elena = await tokenFor('elena');
    await call('PUT', '/dashboards/euro-only', {
      token: elena,
      body: dashboardNamed('euro-only', 'Europe'),
    });
    await call('PUT', '/dashboards/overview', {
      token: asha,
      body: dashboardNamed('overview', 'Renamed by Acme'),
    });

    expect((await call('GET', '/dashboards/euro-only', { token: asha })).status).toBe(404);
    expect((await call('DELETE', '/dashboards/euro-only', { token: asha })).status).toBe(404);
    expect((await call('GET', '/dashboards/overview', { token: elena })).body).toMatchObject({
      title: 'World development overview',
    });
  });

  it('FR-3.7 lets editors save and refuses viewers with 403', async () => {
    const ravi = await tokenFor('ravi');
    const forbidden = {
      status: 403,
      body: { error: { code: 'FORBIDDEN', message: 'Only editors can change dashboards' } },
    };
    expect(
      await call('PUT', '/dashboards/overview', {
        token: ravi,
        body: dashboardNamed('overview', 'x'),
      }),
    ).toEqual(forbidden);
    expect(await call('DELETE', '/dashboards/overview', { token: ravi })).toEqual(forbidden);

    const asha = await tokenFor('asha');
    const edited = dashboardNamed('overview', 'Acme overview');
    const saved = await call('PUT', '/dashboards/overview', { token: asha, body: edited });
    expect(saved).toMatchObject({ status: 200, body: { ...edited, updatedBy: 'asha' } });
    expect((await call('GET', '/dashboards/overview', { token: asha })).body).toEqual(saved.body);
  });

  it('starts each tenant with two dashboards that pass its checks, the second open to every user', async () => {
    const asha = await tokenFor('asha');
    for (const id of ['overview', 'population']) {
      const { body } = await call('GET', `/dashboards/${id}`, { token: asha });
      expect(await call('PUT', `/dashboards/${id}`, { token: asha, body })).toMatchObject({
        status: 200,
        body,
      });
    }
    for (const userId of Object.keys(demoUsers)) {
      const token = await tokenFor(userId);
      for (const { query } of createExplorerDashboard(2024).widgets) {
        expect((await call('POST', '/query', { token, body: query })).status).toBe(200);
      }
    }
  });

  it('stores the dashboard’s filter controls', async () => {
    const asha = await tokenFor('asha');
    const body = {
      ...dashboardNamed('controlled', 'Controlled'),
      filterControls: [{ field: 'region' }, { field: 'incomeLevel', label: 'Income' }],
    };
    const saved = await call('PUT', '/dashboards/controlled', { token: asha, body });
    expect(saved).toMatchObject({ status: 200, body });
  });

  it('stores the field a widget drills down to', async () => {
    const asha = await tokenFor('asha');
    const dashboard = dashboardNamed('drilling', 'Drilling');
    const body = {
      ...dashboard,
      widgets: dashboard.widgets.map((widget) =>
        widget.type === 'bar' ? { ...widget, drillDown: 'country' } : widget,
      ),
    };
    const saved = await call('PUT', '/dashboards/drilling', { token: asha, body });
    expect(saved).toMatchObject({ status: 200, body });
  });

  it.each([
    ['an id that differs from the URL', { ...createStarterDashboard(2024), id: 'other' }],
    [
      'an invalid widget query',
      {
        ...createStarterDashboard(2024),
        widgets: [
          {
            id: 'a',
            type: 'bar',
            title: 'A',
            query: { dataset: 'wdi', measures: [{ field: 'revenue' }] },
          },
        ],
      },
    ],
    ['a widget without a layout item', { ...createStarterDashboard(2024), layouts: { lg: [] } }],
    ['a minimum width that is not a number', withFirstItem({ minW: 'wide' })],
    ['a minimum width wider than the grid', withFirstItem({ minW: 13 })],
    ['a minimum height below one row', withFirstItem({ minH: 0 })],
    [
      'a table page size of no rows',
      (() => {
        const dashboard = createStarterDashboard(2024);
        const widgets = dashboard.widgets.map((widget) =>
          widget.type === 'table' ? { ...widget, options: { pageSize: 0 } } : widget,
        );
        return { ...dashboard, widgets };
      })(),
    ],
    [
      'a filter control on a field that is not a dimension',
      { ...createStarterDashboard(2024), filterControls: [{ field: 'gdp' }] },
    ],
    [
      'two filter controls on one field',
      {
        ...createStarterDashboard(2024),
        filterControls: [{ field: 'region' }, { field: 'region' }],
      },
    ],
    [
      'filter controls that are not a list',
      { ...createStarterDashboard(2024), filterControls: {} },
    ],
    [
      'a filter control on a field with a default filter',
      {
        ...createStarterDashboard(2024),
        filterControls: [{ field: 'year' }],
        defaultFilters: [{ field: 'year', op: 'eq', value: 2024 }],
      },
    ],
    [
      'a drill-down to a field that is not a dimension',
      (() => {
        const dashboard = createStarterDashboard(2024);
        const widgets = dashboard.widgets.map((widget) =>
          widget.type === 'bar' ? { ...widget, drillDown: 'gdp' } : widget,
        );
        return { ...dashboard, widgets };
      })(),
    ],
    [
      'an unknown widget type',
      {
        ...createStarterDashboard(2024),
        widgets: [{ id: 'a', type: 'map', title: 'A', query: populationQuery }],
      },
    ],
  ])('NFR-S3 refuses to save a dashboard with %s', async (_case, body) => {
    const asha = await tokenFor('asha');
    expect(await call('PUT', '/dashboards/overview', { token: asha, body })).toMatchObject({
      status: 400,
      body: { error: { code: 'INVALID_QUERY' } },
    });
  });

  it('NFR-S4 reports every error in the same shape', async () => {
    const asha = await tokenFor('asha');
    const responses = [
      await call('GET', '/meta'),
      await call('GET', '/nowhere', { token: asha }),
      await call('POST', '/query', {
        token: asha,
        body: { dataset: 'wdi', measures: [{ field: 'secret' }] },
      }),
      await api
        .handle(
          new Request(`${BASE_URL}/query`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${asha}` },
            body: '{',
          }),
        )
        .then(async (response) => ({
          status: response.status,
          body: (await response.json()) as unknown,
        })),
    ];
    expect(responses.map((response) => response.status)).toEqual([401, 404, 400, 400]);
    for (const { body } of responses) {
      expect(body).toEqual({
        error: { code: expect.any(String) as string, message: expect.any(String) as string },
      });
    }
  });

  it('lists the queryable fields in /meta', async () => {
    const { body } = await call('GET', '/meta', { token: await tokenFor('ravi') });
    expect(body).toMatchObject({
      dimensions: expect.arrayContaining([
        { name: 'year', label: 'Year', format: 'year' },
      ]) as unknown,
      measures: expect.arrayContaining([
        { name: 'population', label: 'Population', format: 'number', defaultAgg: 'sum' },
      ]) as unknown,
    });
    expect(JSON.stringify(body)).not.toContain('regionCode');
  });
});
