// Installs the packed SDK the way an integrator would and type-checks code that uses it. Run after
// `pnpm build`. It packs @dashkit/sdk, checks what the tarball holds, checks that the published
// types never fall back to `any`, then installs the tarball with npm into a new project for each
// supported React version and runs TypeScript over a React app and a plain script that use it.
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sdkDir = new URL('../packages/sdk/', import.meta.url);
const typescriptVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    devDependencies: Record<string, string>;
  }
).devDependencies.typescript!;

const run = (command: string, cwd: string | URL) =>
  execSync(command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const failures: string[] = [];
const check = (isOk: boolean, failure: string) => {
  if (!isOk) failures.push(failure);
};

const workDir = mkdtempSync(join(tmpdir(), 'dashkit-package-'));

// What the tarball holds.
const packed = JSON.parse(run(`pnpm pack --json --pack-destination "${workDir}"`, sdkDir)) as {
  files: { path: string }[];
};
const tarball = readdirSync(workDir).find((name) => name.endsWith('.tgz'))!;
const packedFiles = packed.files.map(({ path }) => path).sort();
const expectedFiles = [
  'README.md',
  'dist/chunks/maps.js',
  'dist/dashkit.js',
  'dist/element.d.ts',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/map.d.ts',
  'dist/map.js',
  'package.json',
];
check(
  JSON.stringify(packedFiles) === JSON.stringify(expectedFiles),
  `The tarball holds ${packedFiles.join(', ')}; expected ${expectedFiles.join(', ')}.`,
);

// FR-6.1: no `any` in the published types. Comments may use the word.
for (const file of ['index.d.ts', 'map.d.ts', 'element.d.ts']) {
  const code = readFileSync(new URL(`dist/${file}`, sdkDir), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const anys = code.split('\n').filter((line) => /\bany\b/.test(line));
  check(anys.length === 0, `dist/${file} uses any:\n${anys.join('\n')}`);
}

// FR-1.4: the npm build leaves React and the chart library to the host's installs, and the
// script-tag build carries its own. React's production builds link to react.dev/errors, and
// ECharts names its internal state `__ec_inner_`, so either string shows that library is bundled.
const manifest = JSON.parse(readFileSync(new URL('package.json', sdkDir), 'utf8')) as {
  peerDependencies: Record<string, string>;
  dependencies: Record<string, string>;
};
check(
  ['react', 'react-dom'].every((name) => name in manifest.peerDependencies),
  'react and react-dom must be peer dependencies of @dashkit/sdk.',
);
const npmBuild = readFileSync(new URL('dist/index.js', sdkDir), 'utf8');
check(
  /from "react"/.test(npmBuild) && /from "echarts\/core"/.test(npmBuild),
  'dist/index.js must import React and ECharts from the host project.',
);
check(
  !npmBuild.includes('react.dev/errors') && !npmBuild.includes('__ec_inner_'),
  'dist/index.js must not bundle React or ECharts.',
);
// The map's chart code comes with the map entry only, so a host that shows no map leaves it out.
const mapBuild = readFileSync(new URL('dist/map.js', sdkDir), 'utf8');
check(
  !/\bMapChart\b/.test(npmBuild) && /\bMapChart\b.*from "echarts\/charts"/.test(mapBuild),
  'dist/map.js, and not dist/index.js, must import the map chart from the host project.',
);
const scriptBuild = readFileSync(new URL('dist/dashkit.js', sdkDir), 'utf8');
check(
  scriptBuild.startsWith('var DashKit=(function'),
  'dist/dashkit.js must be a classic script that defines window.DashKit.',
);
check(
  scriptBuild.includes('react.dev/errors') && scriptBuild.includes('__ec_inner_'),
  'dist/dashkit.js must bundle React and ECharts.',
);

// Code an integrator would write. Wrong usage must be rejected, so it is marked as expected errors.
const app = `
import { useEffect, useRef } from 'react';
import {
  Dashboard,
  DashboardBuilder,
  DashKitProvider,
  type ActiveFilter,
  type DashboardConfig,
  type DashKitError,
  type DashKitOptions,
  type ThemeInput,
} from '@dashkit/sdk';
import type { DashKitElement } from '@dashkit/sdk/element';
import '@dashkit/sdk/element';
import { registerMap, type MapGeoJson } from '@dashkit/sdk/map';

const theme: ThemeInput = { mode: 'auto', light: { primary: '#4f46e5' }, shape: { radius: 12 } };
const getToken = async () => 'token-from-my-backend';
const onSave = (config: DashboardConfig) => console.log(config.updatedAt);
const world: MapGeoJson = { type: 'FeatureCollection', features: [] };
registerMap('world', world);
// @ts-expect-error borders are a FeatureCollection
registerMap('world', { type: 'Feature', features: [] });

export const options: DashKitOptions = {
  apiUrl: 'https://api.example.com',
  getToken,
  dashboardId: 'overview',
  theme,
  onFilterChange: (filters: ActiveFilter[]) => console.log(filters.map(({ field }) => field)),
  onSave,
  onError: (error: DashKitError) => console.log(error.code),
};

export const app = (
  <DashKitProvider apiUrl="https://api.example.com" getToken={getToken} theme={theme}>
    <Dashboard dashboardId="overview" />
    <DashboardBuilder dashboardId="overview" mode="edit" onSave={onSave} />
  </DashKitProvider>
);

export function Embedded() {
  const ref = useRef<DashKitElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.theme = theme;
    element.getToken = getToken;
    const onFilters = (event: CustomEvent<ActiveFilter[]>) => console.log(event.detail.length);
    element.addEventListener('dashkit:filterchange', onFilters);
    return () => element.removeEventListener('dashkit:filterchange', onFilters);
  }, []);
  return <dashkit-dashboard ref={ref} api-url="https://api.example.com" dashboard-id="overview" />;
}

// @ts-expect-error apiUrl is required
export const missingApi: DashKitOptions = { token: 't' };
// @ts-expect-error mode is view or edit
export const badMode: DashKitOptions = { apiUrl: 'x', mode: 'admin' };
// @ts-expect-error a dashboard takes an id or a config, not both
export const both = <Dashboard dashboardId="a" config={options as unknown as DashboardConfig} />;
// @ts-expect-error the element's mode is view or edit
export const badElement = <dashkit-dashboard mode="print" />;
`;

const plainScript = `
import '@dashkit/sdk/element';

const element = document.querySelector('dashkit-dashboard');
element?.addEventListener('dashkit:error', (event) => console.log(event.detail.code));
element?.setFilters([{ field: 'region', values: ['South Asia'], sourceWidgetId: 'host' }]);
// @ts-expect-error filters are on dimensions only
element?.setFilters([{ field: 'gdp', values: [1], sourceWidgetId: 'host' }]);

const handle = window.DashKit?.mount(document.body, {
  apiUrl: 'https://api.example.com',
  dashboardId: 'overview',
  getToken: async () => 'token-from-my-backend',
});
handle?.update({ mode: 'edit' });
handle?.unmount();
window.DashKit?.registerMap('world', { type: 'FeatureCollection', features: [] });
`;

const strictest = {
  target: 'ES2022',
  module: 'ESNext',
  moduleResolution: 'bundler',
  jsx: 'react-jsx',
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  strict: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
  skipLibCheck: false,
  noEmit: true,
};
const defaults = {
  ...strictest,
  exactOptionalPropertyTypes: false,
  noUncheckedIndexedAccess: false,
};

for (const react of ['18', '19']) {
  const project = join(workDir, `react-${react}`);
  mkdirSync(join(project, 'src'), { recursive: true });
  writeFileSync(
    join(project, 'package.json'),
    JSON.stringify({
      name: `dashkit-consumer-react-${react}`,
      private: true,
      type: 'module',
      dependencies: {
        '@dashkit/sdk': `file:../${tarball}`,
        react: `^${react}`,
        'react-dom': `^${react}`,
        '@types/react': `^${react}`,
        '@types/react-dom': `^${react}`,
        typescript: typescriptVersion,
      },
    }),
  );
  writeFileSync(join(project, 'src', 'app.tsx'), app);
  writeFileSync(join(project, 'src', 'plain.ts'), plainScript);

  try {
    run('npm install --no-audit --no-fund --loglevel=error', project);
  } catch (error) {
    failures.push(`npm install with React ${react} failed:\n${String(error)}`);
    continue;
  }

  for (const [name, compilerOptions] of Object.entries({ strictest, defaults })) {
    writeFileSync(
      join(project, `tsconfig.${name}.json`),
      JSON.stringify({ compilerOptions, include: ['src'] }),
    );
    try {
      run(`node node_modules/typescript/bin/tsc -p tsconfig.${name}.json`, project);
      console.log(`React ${react}, ${name} TypeScript settings: types check.`);
    } catch (error) {
      const { stdout } = error as { stdout: string };
      failures.push(`React ${react}, ${name} TypeScript settings:\n${stdout}`);
    }
  }

  // The exports map leads each entry to a file that exists.
  const resolved = run(
    `node --input-type=module -e "for (const entry of ['@dashkit/sdk', '@dashkit/sdk/map', '@dashkit/sdk/element']) console.log(import.meta.resolve(entry))"`,
    project,
  );
  check(
    /dist\/index\.js\s+\S*dist\/map\.js\s+\S*dist\/dashkit\.js/.test(resolved),
    `With React ${react}, the entries resolve to:\n${resolved}`,
  );
}

if (failures.length === 0) {
  console.log(`The packed SDK (${packedFiles.length} files) installs and type-checks.`);
  rmSync(workDir, { recursive: true, force: true });
} else {
  console.error(failures.join('\n\n'));
  console.error(`\nThe projects are kept in ${workDir}.`);
  process.exitCode = 1;
}
