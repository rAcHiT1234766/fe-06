import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Library mode leaves `process.env.NODE_ENV` in React's code, and a plain web page has no `process`.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/element.tsx',
      formats: ['iife'],
      name: 'DashKit',
      fileName: () => 'dashkit.js',
    },
  },
});
