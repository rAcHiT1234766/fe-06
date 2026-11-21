import react from '@vitejs/plugin-react';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

// The host's package manager installs these (React as a peer, ECharts as a dependency). Bundling
// them here would make the host ship a second copy.
const externalPackages = [...Object.keys(pkg.peerDependencies), ...Object.keys(pkg.dependencies)];

export default defineConfig({
  plugins: [react(), dts({ bundleTypes: true, tsconfigPath: './tsconfig.build.json' })],
  build: {
    // The map is an entry of its own, so a host that shows no map leaves its chart code out.
    lib: {
      entry: { index: 'src/index.ts', map: 'src/map.ts' },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      external: (id) => externalPackages.some((name) => id === name || id.startsWith(`${name}/`)),
      // Code both entries use, such as which maps are registered, is one shared file, so both see
      // the same state. Without a hash in its name, a published version's files stay the same.
      output: { chunkFileNames: 'chunks/[name].js' },
    },
  },
});
