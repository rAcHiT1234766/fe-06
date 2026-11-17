import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { MockApi } from '@dashkit/mock-engine';

function corsHeaders(origin: string | undefined, allowedOrigins: string[]): Record<string, string> {
  if (!origin || !allowedOrigins.includes(origin)) return { Vary: 'Origin' };
  return {
    Vary: 'Origin',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

async function toFetchRequest(req: IncomingMessage): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value);
  }
  let body: string | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = Buffer.concat(chunks).toString();
  }
  return new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, {
    method: req.method ?? 'GET',
    headers,
    body,
  });
}

async function respond(
  api: MockApi,
  allowedOrigins: string[],
  req: IncomingMessage,
  res: ServerResponse,
) {
  const cors = corsHeaders(req.headers.origin, allowedOrigins);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors).end();
    return;
  }
  const response = await api.handle(await toFetchRequest(req));
  res.writeHead(response.status, { ...Object.fromEntries(response.headers), ...cors });
  res.end(await response.text());
}

/** Serves the shared demo API over HTTP, allowing browser calls only from the listed origins. */
export function createMockApiServer(api: MockApi, allowedOrigins: string[]) {
  return createServer((req, res) => {
    respond(api, allowedOrigins, req, res).catch((error: unknown) => {
      console.error(error);
      res.destroy();
    });
  });
}
