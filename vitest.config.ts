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
      // The core and the query engine hold the logic that every widget and every permission rests
      // on, so a drop in their coverage fails the run; each is held at the whole percentages
      // measured when the gate was added. Interface code is measured but not gated: its tests
      // check what a user sees and does, not which lines ran.
      thresholds: {
        'packages/sdk/src/core/**': { statements: 97, branches: 93, functions: 97, lines: 99 },
        'packages/mock-engine/src/**': { statements: 95, branches: 93, functions: 100, lines: 97 },
      },
    },
  },
});
