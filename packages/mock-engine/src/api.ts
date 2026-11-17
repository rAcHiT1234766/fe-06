import type { DashboardConfig, TokenClaims } from '@dashkit/sdk';
import { signDemoToken, verifyToken } from './auth.ts';
import { createStarterDashboard, parseDashboardConfig } from './dashboards.ts';
import { ApiError } from './errors.ts';
import { executeQuery } from './execute-query.ts';
import { aggregations, dimensions, measures } from './schema.ts';
import { snapshotRows } from './snapshot.ts';
import { demoUsers } from './users.ts';
import { invalidRequest, isRecord } from './validation.ts';

/** The demo data API as a single fetch-style handler, shared by the Node server and MSW. */
export interface MockApi {
  handle(request: Request): Promise<Response>;
}

const meta = {
  dimensions: Object.entries(dimensions).map(([name, field]) => ({ name, ...field })),
  measures: Object.entries(measures).map(([name, { label, format, defaultAgg }]) => ({
    name,
    label,
    format,
    defaultAgg,
  })),
  aggregations,
};

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Not found');

async function readJson(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw invalidRequest('The request body must be JSON');
  }
}

/** Creates an API with its own in-memory dashboards, every tenant starting with the same overview. */
export function createApi(tokenSecret: string): MockApi {
  // Keyed by tenant as well as id, so one tenant's id can never reach another tenant's dashboard.
  const dashboards = new Map<string, DashboardConfig>();
  const storeKey = (tenantId: string, id: string) => `${tenantId}/${id}`;

  const latestYear = Math.max(...snapshotRows.map((row) => row.year));
  for (const { tenantId } of Object.values(demoUsers)) {
    const starter = createStarterDashboard(latestYear);
    dashboards.set(storeKey(tenantId, starter.id), starter);
  }

  async function handleDashboard(request: Request, id: string, claims: TokenClaims) {
    const key = storeKey(claims.tenantId, id);
    if (request.method === 'GET') {
      const dashboard = dashboards.get(key);
      if (!dashboard) throw notFound();
      return Response.json(dashboard);
    }
    if (request.method !== 'PUT' && request.method !== 'DELETE') throw notFound();
    if (claims.role !== 'editor') {
      throw new ApiError(403, 'FORBIDDEN', 'Only editors can change dashboards');
    }

    if (request.method === 'DELETE') {
      if (!dashboards.delete(key)) throw notFound();
      return new Response(null, { status: 204 });
    }
    const saved: DashboardConfig = {
      ...parseDashboardConfig(await readJson(request), id),
      updatedAt: new Date().toISOString(),
      updatedBy: claims.sub,
    };
    dashboards.set(key, saved);
    return Response.json(saved);
  }

  async function route(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const { method } = request;

    if (method === 'GET' && pathname === '/health') return Response.json({ status: 'ok' });
    if (method === 'POST' && pathname === '/auth/demo-token') {
      const body = await readJson(request);
      const token = await signDemoToken(isRecord(body) ? body.userId : undefined, tokenSecret);
      return Response.json({ token });
    }

    const claims = await verifyToken(request.headers.get('Authorization'), tokenSecret);

    if (method === 'GET' && pathname === '/meta') return Response.json(meta);
    if (method === 'POST' && pathname === '/query') {
      return Response.json(executeQuery(snapshotRows, await readJson(request), claims));
    }
    if (method === 'GET' && pathname === '/dashboards') {
      const own = [...dashboards].filter(([key]) => key.startsWith(`${claims.tenantId}/`));
      return Response.json(own.map(([, { id, title }]) => ({ id, title })));
    }
    const dashboardId = /^\/dashboards\/([\w-]+)$/.exec(pathname)?.[1];
    if (dashboardId) return handleDashboard(request, dashboardId, claims);
    throw notFound();
  }

  return {
    async handle(request) {
      try {
        return await route(request);
      } catch (error) {
        if (error instanceof ApiError) {
          return Response.json(
            { error: { code: error.code, message: error.message } },
            { status: error.status },
          );
        }
        console.error(error);
        return Response.json(
          { error: { code: 'UNKNOWN', message: 'Internal error' } },
          { status: 500 },
        );
      }
    },
  };
}
