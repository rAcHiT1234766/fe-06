import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));

// The demo app imports the npm build, and its plain HTML page loads the script-tag build; both live
// in dist/. This rebuilds each one when the source changes. Neither may empty dist/ first, or each
// rebuild would delete the other's output.
await build({ root, build: { watch: {}, emptyOutDir: false } });
await build({
  root,
  configFile: fileURLToPath(new URL('../vite.element.config.ts', import.meta.url)),
  build: { watch: {} },
});
