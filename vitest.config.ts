import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    // `pnpm test:coverage` measures the SDK, the query engine and the API server. Test helpers,
    // type-only files and the entry files that only re-export are left out.
    coverage: {
      provider: 'v8',
      include: [
        'packages/sdk/src/**/*.{ts,tsx}',
        'packages/mock-engine/src/**/*.ts',
        'apps/mock-api/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.test-d.ts',
        'packages/sdk/src/testing/**',
        'packages/sdk/src/element-types.ts',
        'packages/sdk/src/index.ts',
        'packages/sdk/src/core/types.ts',
      ],
      reporter: ['text', 'text-summary', 'json-summary'],
    },
  },
});
