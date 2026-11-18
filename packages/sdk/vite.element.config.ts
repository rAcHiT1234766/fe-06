import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Publishes src/element-types.ts, which holds declarations only, as the types of the element entry.
function elementTypes(): Plugin {
  return {
    name: 'dashkit-element-types',
    generateBundle() {
      const source = readFileSync(new URL('./src/element-types.ts', import.meta.url), 'utf8');
      this.emitFile({ type: 'asset', fileName: 'element.d.ts', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), elementTypes()],
  // Library mode leaves `process.env.NODE_ENV` in React's code, and a plain web page has no `process`.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/element.ts',
      formats: ['iife'],
      name: 'DashKit',
      fileName: () => 'dashkit.js',
    },
  },
});
