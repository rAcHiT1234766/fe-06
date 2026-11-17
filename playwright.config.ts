import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: isCI,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
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
