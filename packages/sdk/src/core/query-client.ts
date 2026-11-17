import type { DashboardConfig, DashKitError, Query, QueryResult } from './types';

class RequestError extends Error implements DashKitError {
  readonly code: DashKitError['code'];

  constructor(code: DashKitError['code'], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RequestError';
    this.code = code;
  }
}

interface QueryClientOptions {
  apiUrl: string;
  token?: string | undefined;
}

type GetToken = () => Promise<string>;

// Sorted object keys let queries that differ only in key order share one cache entry.
const cacheKey = (query: Query) =>
  JSON.stringify(query, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
      : value,
  );

async function toRequestError(response: Response): Promise<RequestError> {
  const body = (await response.json().catch(() => null)) as {
    error?: Partial<DashKitError>;
  } | null;
  return new RequestError(
    body?.error?.code ?? 'UNKNOWN',
    body?.error?.message ?? `The data API answered with status ${response.status}`,
  );
}

// One request can be shared by several widgets and its result is cached for later, so a caller
// that aborts only stops waiting for it; the request itself carries on.
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise;
  const aborted = new Promise<never>((_resolve, reject) => {
    const abort = () => reject(signal.reason as Error);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
  return Promise.race([promise, aborted]);
}

/**
 * The single path from a dashboard to the data API. It attaches the embed token to every request,
 * renews the token once after a 401, shares identical queries that are in flight, and caches
 * results until the token changes. Every rejection is a DashKitError, except the abort reason when
 * the caller's signal fires.
 */
export class QueryClient {
  readonly #apiUrl: string;
  #getToken: GetToken | undefined;
  #token: string | undefined;
  #tokenRenewal: Promise<string> | undefined;
  readonly #results = new Map<string, Promise<QueryResult>>();

  constructor({ apiUrl, token }: QueryClientOptions) {
    this.#apiUrl = apiUrl.replace(/\/$/, '');
    this.#token = token;
  }

  // Hosts often pass a new getToken function on every render, so it can be swapped without
  // rebuilding the client and losing its cache.
  setGetToken(getToken: GetToken | undefined) {
    this.#getToken = getToken;
  }

  run(query: Query, signal?: AbortSignal): Promise<QueryResult> {
    const key = cacheKey(query);
    let result = this.#results.get(key);
    if (!result) {
      const request = this.#request<QueryResult>('/query', {
        method: 'POST',
        body: JSON.stringify(query),
      });
      request.catch(() => {
        if (this.#results.get(key) === request) this.#results.delete(key);
      });
      this.#results.set(key, request);
      result = request;
    }
    return untilAborted(result, signal);
  }

  loadDashboard(id: string, signal?: AbortSignal): Promise<DashboardConfig> {
    const path = `/dashboards/${encodeURIComponent(id)}`;
    return untilAborted(this.#request<DashboardConfig>(path, { method: 'GET' }), signal);
  }

  async #request<T>(path: string, init: RequestInit): Promise<T> {
    let response = await this.#send(path, init, this.#token ?? (await this.#renewToken()));
    if (response.status === 401 && this.#getToken) {
      response = await this.#send(path, init, await this.#renewToken());
    }
    if (!response.ok) throw await toRequestError(response);
    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new RequestError('UNKNOWN', 'The data API sent a response that is not JSON', { cause });
    }
  }

  async #send(path: string, init: RequestInit, token: string): Promise<Response> {
    try {
      return await fetch(`${this.#apiUrl}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch (cause) {
      throw new RequestError('NETWORK', 'The data API could not be reached', { cause });
    }
  }

  // When several widgets get a 401 at once they share one renewal, so the host's getToken runs once.
  #renewToken(): Promise<string> {
    const getToken = this.#getToken;
    if (!getToken) {
      return Promise.reject(new RequestError('UNAUTHENTICATED', 'No embed token was provided'));
    }
    this.#tokenRenewal ??= getToken()
      .then(
        (token) => {
          // Results cached under the old token may belong to a different user.
          if (token !== this.#token) this.#results.clear();
          this.#token = token;
          return token;
        },
        (cause: unknown) => {
          throw new RequestError('UNAUTHENTICATED', 'Could not get a new embed token', { cause });
        },
      )
      .finally(() => {
        this.#tokenRenewal = undefined;
      });
    return this.#tokenRenewal;
  }
}
