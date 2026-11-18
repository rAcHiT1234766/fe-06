import { defineConfig, devices } from '@playwright/test';

// Measures NFR-P3 to NFR-P6 against a production build of the demo and the local API, for
// docs/PERFORMANCE.md. Run it with `pnpm perf`. Timings on shared CI machines vary too much to
// gate a build on, so CI runs the size check instead.
export default defineConfig({
  testDir: 'perf',
  workers: 1,
  timeout: 300_000,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
  webServer: [
    {
      command: 'pnpm --filter @dashkit/mock-api start',
      url: 'http://localhost:4000/meta',
      reuseExistingServer: true,
    },
    {
      // The demo's usual port, which the API allows as a browser origin.
      command:
        'pnpm --filter @dashkit/sdk build && pnpm --filter @dashkit/demo build && pnpm --filter @dashkit/demo preview --port 5173 --strictPort',
      url: 'http://localhost:5173',
      timeout: 180_000,
    },
  ],
});
