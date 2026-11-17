import react from '@vitejs/plugin-react';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

// The host's package manager installs these (React as a peer, ECharts as a dependency). Bundling
// them here would make the host ship a second copy.
const externalPackages = [...Object.keys(pkg.peerDependencies), ...Object.keys(pkg.dependencies)];

export default defineConfig({
  plugins: [react(), dts({ bundleTypes: true, include: ['src'] })],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rolldownOptions: {
      external: (id) => externalPackages.some((name) => id === name || id.startsWith(`${name}/`)),
    },
  },
});
