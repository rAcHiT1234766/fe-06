import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const gzippedKb = (code: string | Uint8Array) =>
  `${(gzipSync(code, { level: 9 }).length / 1024).toFixed(1)} kB`;

// dist/index.js leaves its dependencies external, so on its own it understates what a host ships.
// Bundle it the way a host app would: minified, with every dependency included except React.
const hostBundle = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    rolldownOptions: {
      input: 'dist/index.js',
      external: [/^react($|\/)/, /^react-dom($|\/)/],
      preserveEntrySignatures: 'strict',
    },
  },
});
if (!('output' in hostBundle)) throw new Error('Expected a single bundle output');
const hostCode = hostBundle.output
  .map((file) => (file.type === 'chunk' ? file.code : file.source))
  .join('');

console.table([
  { build: 'npm, dist/index.js only', gzipped: gzippedKb(readFileSync('dist/index.js')) },
  { build: 'npm, as bundled by a host', gzipped: gzippedKb(hostCode), target: '300 kB' },
  {
    build: 'script tag, dist/dashkit.js',
    gzipped: gzippedKb(readFileSync('dist/dashkit.js')),
    target: '500 kB',
  },
]);
