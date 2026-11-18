import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

// Runs the SDK's component and element tests a second time, with React 18 (NFR-C2). The SDK's own
// packages resolve React 19, so every import that leads to React is pointed at this package's
// copies, which pnpm installed against React 18.
const packageDir = (name: string) =>
  realpathSync(new URL(`./node_modules/${name}`, import.meta.url));
const sameAsHere = ['react', 'react-dom', '@testing-library/react', 'react-grid-layout'].map(
  (name) => ({
    find: new RegExp(`^${name.replace('/', '\\/')}(/.*)?$`),
    replacement: `${packageDir(name)}$1`,
  }),
);

const sdk = fileURLToPath(new URL('../sdk/', import.meta.url));

export default defineProject({
  resolve: { alias: sameAsHere },
  test: {
    name: 'sdk on React 18',
    dir: `${sdk}src`,
    include: ['**/*.test.tsx', 'element/*.test.ts'],
    environment: 'happy-dom',
    environmentOptions: {
      // The mock API answers through MSW without CORS headers, which only the HTTP server adds.
      happyDOM: { settings: { fetch: { disableSameOriginPolicy: true } } },
    },
    setupFiles: ['./react-version.ts', `${sdk}vitest.setup.ts`],
  },
});
