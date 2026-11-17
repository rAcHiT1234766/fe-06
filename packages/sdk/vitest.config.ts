import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'sdk',
    environment: 'happy-dom',
    environmentOptions: {
      // The mock API answers through MSW without CORS headers, which only the HTTP server adds.
      happyDOM: { settings: { fetch: { disableSameOriginPolicy: true } } },
    },
    setupFiles: ['./vitest.setup.ts'],
    typecheck: { enabled: true, include: ['src/**/*.test-d.ts'] },
  },
});
