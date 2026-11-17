import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'sdk',
    typecheck: { enabled: true, include: ['src/**/*.test-d.ts'] },
  },
});
