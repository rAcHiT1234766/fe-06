import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build, type Plugin } from 'vite';

const gzippedKb = (code: string | Uint8Array) => gzipSync(code, { level: 9 }).length / 1024;

// dist/index.js leaves its dependencies external, so on its own it understates what a host ships.
// Bundle it the way a host app would: one app that imports every export of the given entries,
// minified, with every dependency included except React.
async function bundledKb(entries: string[]) {
  const app = 'host-app';
  const hostApp: Plugin = {
    name: 'host-app',
    resolveId: (id) => (id === app ? id : undefined),
    load: (id) =>
      id === app
        ? entries.map((entry) => `export * from ${JSON.stringify(resolve(entry))};`).join('\n')
        : undefined,
  };
  const hostBundle = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [hostApp],
    build: {
      write: false,
      rolldownOptions: {
        input: app,
        external: [/^react($|\/)/, /^react-dom($|\/)/],
        preserveEntrySignatures: 'strict',
      },
    },
  });
  if (!('output' in hostBundle)) throw new Error('Expected a single bundle output');
  const code = hostBundle.output
    .map((file) => (file.type === 'chunk' ? file.code : file.source))
    .join('');
  return gzippedKb(code);
}

const sizes = [
  { build: 'npm, dist/index.js only', kb: gzippedKb(readFileSync('dist/index.js')) },
  // NFR-P1 and NFR-P2. A host that shows maps also imports the map entry, whose chart code the
  // first row leaves out; the budget holds for both.
  { build: 'npm, as bundled by a host', kb: await bundledKb(['dist/index.js']), targetKb: 300 },
  {
    build: 'npm, as bundled by a host, with the map',
    kb: await bundledKb(['dist/index.js', 'dist/map.js']),
    targetKb: 300,
  },
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
