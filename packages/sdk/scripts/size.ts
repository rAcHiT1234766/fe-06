import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const gzippedKb = (code: string | Uint8Array) => gzipSync(code, { level: 9 }).length / 1024;

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

const sizes = [
  { build: 'npm, dist/index.js only', kb: gzippedKb(readFileSync('dist/index.js')) },
  // NFR-P1 and NFR-P2.
  { build: 'npm, as bundled by a host', kb: gzippedKb(hostCode), targetKb: 300 },
  {
    build: 'script tag, dist/dashkit.js',
    kb: gzippedKb(readFileSync('dist/dashkit.js')),
    targetKb: 500,
  },
];

console.table(
  sizes.map(({ build, kb, targetKb }) => ({
    build,
    gzipped: `${kb.toFixed(1)} kB`,
    target: targetKb === undefined ? '' : `${targetKb} kB`,
  })),
);

const tooLarge = sizes.filter(({ kb, targetKb }) => targetKb !== undefined && kb > targetKb);
for (const { build, kb, targetKb } of tooLarge) {
  console.error(`${build} is ${kb.toFixed(1)} kB gzipped, over its ${targetKb} kB target.`);
}
if (tooLarge.length > 0) process.exitCode = 1;
