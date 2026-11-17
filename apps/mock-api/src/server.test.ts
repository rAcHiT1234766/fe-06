import type { AddressInfo } from 'node:net';
import { createApi, createRandomSecret } from '@dashkit/mock-engine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMockApiServer } from './server.ts';

const ALLOWED_ORIGIN = 'http://demo.test';
const server = createMockApiServer(createApi(createRandomSecret()), [ALLOWED_ORIGIN]);
let baseUrl = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe('mock API HTTP server', () => {
  it('allows browser calls from a listed origin', async () => {
    const response = await fetch(`${baseUrl}/health`, { headers: { Origin: ALLOWED_ORIGIN } });
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
  });

  it('gives other origins no CORS permission', async () => {
    const response = await fetch(`${baseUrl}/health`, { headers: { Origin: 'http://evil.test' } });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers preflight requests for the Authorization header', async () => {
    const response = await fetch(`${baseUrl}/query`, {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN, 'Access-Control-Request-Headers': 'authorization' },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });

  it('FR-3.2 passes the token and JSON body through to the API', async () => {
    const tokenResponse = await fetch(`${baseUrl}/auth/demo-token`, {
      method: 'POST',
      body: JSON.stringify({ userId: 'elena' }),
    });
    const { token } = (await tokenResponse.json()) as { token: string };
    const response = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset: 'wdi',
        measures: [{ field: 'population' }],
        dimensions: ['region'],
      }),
    });
    expect(response.status).toBe(200);
    expect(((await response.json()) as { rows: unknown[] }).rows).toEqual([
      { region: 'Europe & Central Asia', population: expect.any(Number) as number },
    ]);
  });
});
