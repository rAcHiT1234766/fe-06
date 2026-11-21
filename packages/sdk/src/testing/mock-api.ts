import { createMockApiHandlers } from '@dashkit/mock-engine/msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

export const API_URL = 'http://api.test';

interface HappyDomWindow {
  happyDOM?: { waitUntilComplete(): Promise<void> };
}

// Runs the real query engine behind MSW for the calling test file; handlers a test adds are reset.
export function setupMockApi() {
  const server = setupServer(...createMockApiHandlers(API_URL));
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(async () => {
    // A component that unmounts stops waiting for its requests, but they carry on. One still on its
    // way when the server closes goes to the real network, which has no api.test, and one still
    // open when the test DOM closes is aborted; both print an error. So the file waits for them.
    await (window as HappyDomWindow).happyDOM?.waitUntilComplete();
    server.close();
  });
  return server;
}

export async function demoToken(userId: string) {
  const response = await fetch(`${API_URL}/auth/demo-token`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  return ((await response.json()) as { token: string }).token;
}
