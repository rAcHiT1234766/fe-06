import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Serves the mock API's service worker script, and copies it into the static Storybook build.
  plugins: [react(), msw({ mode: 'worker-only' })],
});
