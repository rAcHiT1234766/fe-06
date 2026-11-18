import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'sdk',
    environment: 'happy-dom',
    // A test that renders a whole dashboard takes about a second alone, but several when every
    // project runs at once on a busy machine; the default of 5 s left too little room.
    testTimeout: 15_000,
    environmentOptions: {
      // The mock API answers through MSW without CORS headers, which only the HTTP server adds.
      happyDOM: { settings: { fetch: { disableSameOriginPolicy: true } } },
    },
    setupFiles: ['./vitest.setup.ts'],
    typecheck: { enabled: true, include: ['src/**/*.test-d.ts'] },
  },
});
