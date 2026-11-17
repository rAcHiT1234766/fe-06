import react from '@vitejs/plugin-react';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

// The host app provides these; bundling them would load a second copy of React.
const externalPackages = Object.keys(pkg.peerDependencies);

export default defineConfig({
  plugins: [react(), dts({ bundleTypes: true, include: ['src'] })],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rolldownOptions: {
      external: (id) => externalPackages.some((name) => id === name || id.startsWith(`${name}/`)),
    },
  },
});
