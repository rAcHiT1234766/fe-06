import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The plain HTML example loads the SDK's script-tag build from one URL, as any page would. Vite
// cannot bundle a classic script, so this serves the built file during development and copies it
// into the build.
function elementScript(): Plugin {
  // Read when it is asked for, not when the config loads: the tests load this config too, before
  // the SDK has been built.
  const read = () => readFileSync(createRequire(import.meta.url).resolve('@dashkit/sdk/element'));
  return {
    name: 'dashkit-element-script',
    configureServer(server) {
      server.middlewares.use('/dashkit.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(read());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'dashkit.js', source: read() });
    },
  };
}

// The deployed demo is built with this set to the deployed API's address. Both pages read it: the
// app through import.meta.env, the plain HTML page through %VITE_DASHKIT_API_URL%.
process.env.VITE_DASHKIT_API_URL ??= 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), elementScript()],
  // The mock API only accepts browser requests from this origin, so another free port would fail
  // with CORS errors; failing at startup is clearer.
  server: { port: 5173, strictPort: true },
  // In this workspace the SDK has its own React for tests and stories. A real install would not,
  // but here both copies would load and break hooks unless they are merged into one.
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', plainHtml: 'plain-html/index.html' },
    },
  },
});
