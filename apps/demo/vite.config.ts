import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The mock API only accepts browser requests from this origin, so another free port would fail
  // with CORS errors; failing at startup is clearer.
  server: { port: 5173, strictPort: true },
  // In this workspace the SDK has its own React for tests and stories. A real install would not,
  // but here both copies would load and break hooks unless they are merged into one.
  resolve: { dedupe: ['react', 'react-dom'] },
});
