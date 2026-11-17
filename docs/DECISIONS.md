# Decisions

Each entry says what was chosen and why. Entries marked "agreed" were confirmed before work started.

## Phase 0 — Foundation

- **This folder is the repository root; the requirements and the guide live in `docs/`** (agreed).
  Keeps the layout from the guide without creating an extra nesting level.
- **`DeepPartial` treats arrays as single values** (agreed).
  A deep merge would otherwise mix a brand's chart palette with the default one position by position and leave default colours behind.
- **`pnpm size` reports the npm build twice: as emitted, and as a host app would bundle it** (agreed).
  `dist/index.js` leaves its dependencies external, so only the host-bundled number (minified, React excluded) is compared with the 300 kB target.
- **TypeScript 6.0.3 rather than 7.0.2.**
  typescript-eslint supports TypeScript below 6.1, and api-extractor, which bundles the `.d.ts`, ships with 6.0.3.
- **typescript-eslint 8.72.2 rather than 8.73.0.**
  8.73.0 was less than a day old, and pnpm's minimum-release-age policy holds back packages that new as a supply-chain precaution.
- **Only esbuild may run an install script (`allowBuilds` in `pnpm-workspace.yaml`).**
  pnpm blocks dependency scripts by default; esbuild's only verifies its platform binary.
- **unplugin-dts instead of vite-plugin-dts.**
  The vite-plugin-dts README now points to unplugin-dts, its successor from the same author; `bundleTypes` produces the single `dist/index.d.ts`.
- **The npm build's externals are read from `peerDependencies`.**
  Anything the host installs itself must never be bundled, and reading the list keeps the build and `package.json` in sync.
- **The `./styles.css` export is added when the package first ships CSS.**
  An export that points at a missing file breaks the import for integrators.
- **The Shadow DOM spike registers `<dashkit-dashboard>` from the real script-tag entry, `src/element.tsx`.**
  This exercises the actual IIFE build, bundled React and inline CSS; the real element replaces the spike.
- **Node 24 in `engines` and CI, and TypeScript scripts run with plain `node` (no `tsx`).**
  Node 24 is the installed LTS and strips types natively, so `erasableSyntaxOnly` is on to keep all code runnable that way.
- **ESLint uses typescript-eslint's `recommendedTypeChecked` plus the React hooks rules.**
  Type-aware rules catch unhandled promises, which matter for the query client; the stricter presets mostly add style noise.
- **Type contract tests (`*.test-d.ts`) run in Vitest's typecheck mode.**
  `expectTypeOf` assertions only mean something when the compiler checks them, and this reports them as ordinary tests.
- **Storybook uses its own small Vite config, and its telemetry is off.**
  The package's `vite.config.ts` is a library build with declaration bundling that Storybook does not need; usage data should not be sent from developer machines or CI.
- **Prettier is configured for editors, with no `format` script.**
  None of the required scripts needs it; `.prettierignore` keeps the supplied documents and the lockfile untouched.
