import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The plain HTML example loads the SDK's script-tag build from one URL, as any page would. Vite
// cannot bundle a classic script, so this serves the built file during development and copies it
// into the build.
function elementScript(): Plugin {
  const path = createRequire(import.meta.url).resolve('@dashkit/sdk/element');
  return {
    name: 'dashkit-element-script',
    configureServer(server) {
      server.middlewares.use('/dashkit.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(readFileSync(path));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'dashkit.js', source: readFileSync(path) });
    },
  };
}

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
