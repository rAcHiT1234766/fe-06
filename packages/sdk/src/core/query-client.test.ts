import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { QueryClient } from './query-client';
import type { Query } from './types';

const server = setupMockApi();
const sentRequests: Request[] = [];
server.events.on('request:start', ({ request }) => sentRequests.push(request.clone()));

afterEach(() => {
  sentRequests.length = 0;
  vi.useRealTimers();
});

function clientWithRenewal(token: string | undefined, getToken: () => Promise<string>) {
  const client = new QueryClient({ apiUrl: API_URL, token });
  client.setGetToken(getToken);
  return client;
}

const queriesSent = () => sentRequests.filter((request) => request.url.endsWith('/query'));

const populationByRegion: Query = {
  dataset: 'wdi',
  measures: [{ field: 'population', agg: 'sum' }],
  dimensions: ['region'],
  filters: [{ field: 'year', op: 'eq', value: 2024 }],
};

describe('QueryClient', () => {
  it('FR-3.2 sends the embed token with every query', async () => {
    const token = await demoToken('ravi');
    const client = new QueryClient({ apiUrl: API_URL, token });
    const result = await client.run(populationByRegion);

    expect(result.rows).toHaveLength(2);
    expect(queriesSent().map((request) => request.headers.get('Authorization'))).toEqual([
      `Bearer ${token}`,
    ]);
  });

  it('NFR-P6 sends one request for identical queries made at the same time', async () => {
    const client = new QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    const sameQueryReordered: Query = {
      filters: [{ value: 2024, op: 'eq', field: 'year' }],
      dimensions: ['region'],
      measures: [{ agg: 'sum', field: 'population' }],
      dataset: 'wdi',
    };
    const [first, second] = await Promise.all([
      client.run(populationByRegion),
      client.run(sameQueryReordered),
    ]);

    expect(second).toBe(first);
    expect(queriesSent()).toHaveLength(1);
  });

  it('answers a repeated query from the cache', async () => {
    const client = new QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    await client.run(populationByRegion);
    await client.run(populationByRegion);
    expect(queriesSent()).toHaveLength(1);
  });

  it('FR-3.10 empties the cache when a renewed token arrives', async () => {
    const getToken = vi.fn(() => demoToken('ravi'));
    const client = clientWithRenewal(await demoToken('asha'), getToken);
    expect((await client.run(populationByRegion)).rows).toHaveLength(7);

    server.use(
      http.post(`${API_URL}/query`, () => new HttpResponse(null, { status: 401 }), { once: true }),
    );
    await client.run({ ...populationByRegion, dimensions: ['incomeLevel'] });
    expect((await client.run(populationByRegion)).rows).toHaveLength(2);
    expect(getToken).toHaveBeenCalledOnce();
  });

  it('loads a dashboard of the signed-in tenant', async () => {
    const client = new QueryClient({ apiUrl: API_URL, token: await demoToken('elena') });
    expect(await client.loadDashboard('overview')).toMatchObject({
      id: 'overview',
      schemaVersion: 1,
    });
    await expect(client.loadDashboard('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('FR-5.1 reads the role from the token, fetching a token first if there is none', async () => {
    const asha = new QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    const ravi = new QueryClient({ apiUrl: API_URL, token: await demoToken('ravi') });
    expect(await asha.loadRole()).toBe('editor');
    expect(await ravi.loadRole()).toBe('viewer');

    const getToken = vi.fn(() => demoToken('elena'));
    expect(await clientWithRenewal(undefined, getToken).loadRole()).toBe('editor');
    expect(getToken).toHaveBeenCalledOnce();

    expect(await new QueryClient({ apiUrl: API_URL, token: 'not-a-token' }).loadRole()).toBe(
      undefined,
    );
    expect(await new QueryClient({ apiUrl: API_URL }).loadRole()).toBe(undefined);
  });

  it('FR-3.1 asks getToken for the first token when none was given', async () => {
    const getToken = vi.fn(() => demoToken('elena'));
    const client = clientWithRenewal(undefined, getToken);
    expect((await client.run(populationByRegion)).rows).toEqual([
      { region: 'Europe & Central Asia', population: expect.any(Number) as number },
    ]);
    expect(getToken).toHaveBeenCalledOnce();
  });

  it('FR-3.8 renews an expired token once and retries the query', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const expiredToken = await demoToken('ravi');
    vi.setSystemTime(Date.now() + 16 * 60_000);
    const getToken = vi.fn(() => demoToken('ravi'));
    const client = clientWithRenewal(expiredToken, getToken);

    expect((await client.run(populationByRegion)).rows).toHaveLength(2);
    expect(getToken).toHaveBeenCalledOnce();
    expect(queriesSent()).toHaveLength(2);
  });

  it('FR-3.8 renews once for several queries that fail together', async () => {
    const getToken = vi.fn(() => demoToken('asha'));
    const client = clientWithRenewal('not-a-token', getToken);
    await Promise.all([
      client.run(populationByRegion),
      client.run({ ...populationByRegion, dimensions: ['incomeLevel'] }),
    ]);
    expect(getToken).toHaveBeenCalledOnce();
  });

  it('FR-3.8 reports UNAUTHENTICATED when the renewed token is rejected too', async () => {
    const getToken = vi.fn(() => Promise.resolve('still-not-a-token'));
    const client = clientWithRenewal('not-a-token', getToken);
    await expect(client.run(populationByRegion)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Invalid token',
    });
    expect(getToken).toHaveBeenCalledOnce();
  });

  it('reports UNAUTHENTICATED without a token or a way to get one', async () => {
    const client = new QueryClient({ apiUrl: API_URL });
    await expect(client.run(populationByRegion)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(queriesSent()).toHaveLength(0);
  });

  it('passes on API errors with their code and keeps them out of the cache', async () => {
    const client = new QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    const badQuery = { ...populationByRegion, dimensions: ['planet'] } as unknown as Query;
    await expect(client.run(badQuery)).rejects.toMatchObject({ code: 'INVALID_QUERY' });
    await expect(client.run(badQuery)).rejects.toMatchObject({ code: 'INVALID_QUERY' });
    expect(queriesSent()).toHaveLength(2);
  });

  it('reports NETWORK when the API cannot be reached', async () => {
    server.use(http.post(`${API_URL}/query`, () => HttpResponse.error()));
    const client = new QueryClient({ apiUrl: API_URL, token: 'any' });
    await expect(client.run(populationByRegion)).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('FR-4.7 lets one caller abort without cancelling the shared request', async () => {
    const client = new QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    const controller = new AbortController();
    const abandoned = client.run(populationByRegion, controller.signal);
    const kept = client.run(populationByRegion);
    controller.abort();

    await expect(abandoned).rejects.toMatchObject({ name: 'AbortError' });
    expect((await kept).rows).toHaveLength(7);
    expect(queriesSent()).toHaveLength(1);
  });
});
