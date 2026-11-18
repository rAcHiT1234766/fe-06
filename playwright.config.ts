import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: isCI,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  // One API serves every browser, and the builder test rebuilds a saved dashboard, so two
  // browsers running it at once would change each other's data. Tests therefore run one at a time.
  workers: 1,
  // NFR-C1: Chrome and Edge share Chromium's engine, and WebKit is Safari's.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @dashkit/mock-api start',
      // Any answer means the API is up; /meta answers 401 without a token.
      url: 'http://localhost:4000/meta',
      reuseExistingServer: !isCI,
    },
    {
      // The demo imports the SDK's built files, so they must exist before it starts.
      command: 'pnpm --filter @dashkit/sdk build && pnpm --filter @dashkit/demo dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
