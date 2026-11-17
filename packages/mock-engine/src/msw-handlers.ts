import { http } from 'msw';
import { createApi } from './api.ts';
import { createRandomSecret } from './auth.ts';

/**
 * Serves the demo API inside the browser (Storybook) or a test process, with no server running.
 * Each call creates a separate API with its own secret and its own saved dashboards.
 */
export function createMockApiHandlers(apiUrl: string) {
  const api = createApi(createRandomSecret());
  return [http.all(`${apiUrl}/*`, ({ request }) => api.handle(request))];
}
