# Decisions

Each entry says what was chosen and why. Entries marked "agreed" were confirmed before work started;
"agreed after review" means confirmed in the phase review.

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

## Phase 1 — Data and permissions

- **All seven indicator codes from the requirements are used unchanged.**
  Each one still resolved on 17 November 2026, so no substitute was needed.
- **The snapshot covers 2000–2024: a year is kept only if every indicator has values for at least half the countries.**
  2025 is barely published yet (life expectancy and electricity access 0%, internet users 5%); the rule lives in the fetch script so a later refresh moves the cut-off by itself.
- **Region and income-level names are trimmed, and rows also store the region's code.**
  The API returns some names with trailing spaces; tokens scope by code (`SAS`, `EAS`, `ECS`), which stays stable when names change, and the code is not queryable.
- **The snapshot's type comes from `data/wdi.d.json.ts` instead of being inferred.**
  Inferring a type for the 1.6 MB file cost 3.8 s and 65,000 types in every program that imports it; the declaration costs 0.06 s.
- **The API is written once as a fetch-style `handle(Request) → Response`.**
  The Node server and the MSW handlers both call it, so the browser mock behaves identically to the server by construction rather than by keeping two copies in step.
- **The signing secret is always passed in; the server falls back to a random secret, and MSW always uses one.**
  No secret value appears anywhere in the source, and a restart only forces clients to fetch a new token.
- **mock-engine imports SDK types through a TypeScript `paths` entry, type-only.**
  The SDK dev-depends on mock-engine for its MSW handlers; a package dependency the other way would be circular.
- **Code that Node runs directly writes `.ts` in relative imports; the SDK, built by Vite, does not.**
  Node's type stripping needs real file names, and it lets the server and scripts run without `tsx`.
- **A query returns at most 1000 rows, which is also the default.**
  It bounds the work per request; `meta.truncated` tells the caller when rows were cut off.
- **Missing values never match comparison filters, sort last in both directions, and are skipped by `count`.**
  A missing figure is unknown, not zero, so it must not pass `gt 0` or count as a reported value.
- **Request bodies ignore unknown keys but reject unknown values.**
  A stray `tenantId` in a body is harmless and simply unused, while an unknown field, operator or aggregation is an error.
- **Saved dashboards are stored exactly as sent, after a structural check; the server adds `updatedAt` and `updatedBy`.**
  Storing the document unchanged is what makes "reload restores it exactly" hold.
- **Response shapes the guide leaves open:** `/auth/demo-token` returns `{ token }`, `/dashboards` returns `{ id, title }` summaries, and `/meta` returns `{ dimensions, measures, aggregations }`.
  These are the smallest shapes the demo and the builder need.
- **Aborting a query stops that caller waiting but does not cancel the network request.**
  The request may be shared with other widgets and its result is cached, so discarding the stale answer is enough for FR-4.7.
- **Several 401s at the same moment share one token renewal.**
  The host's `getToken` then runs once per expiry instead of once per widget.
- **Column-level scope (FR-3.11) is not implemented.**
  It is a stretch item and no demo user needs it.

## Phase 2 — Widgets and theming

- **The demo brands live in mock-engine, as the theme input a host would pass.**
  A brand belongs to the host, not the SDK; the demo app, Storybook and the tests share the same three.
- **A new token gets a new query client.**
  A different user then always starts with an empty cache, and the data hooks drop any result an earlier client fetched.
- **`getToken` reaches the query client through `setGetToken`, and the public `setToken` is gone.**
  Hosts often pass a new function on every render; swapping it keeps the client and its cache, and a new token already means a new client.
- **CSS ships as strings in a `<style>` element; theme variables sit in a zero-specificity `:where()` rule.**
  The same strings can go into a host page or a shadow root, and host CSS can still override any variable.
- **Chart colours are not CSS variables.**
  Charts draw on a canvas, so they get an ECharts theme built from the same resolved theme and switched with `setTheme` on the same chart.
- **Charts take data arrays directly; `DatasetComponent` and `AriaComponent` are not registered.**
  An accessible name plus a visually hidden data table covers NFR-A2 and keeps both modules out of the bundle.
- **Pie slices are labelled directly and the legend is opt-in; the starter dashboard's region chart is horizontal.**
  Direct labels need no colour matching, and region names are too long to sit under vertical bars.
- **Widgets fill their container (`height: 100%`).**
  The same widget then works in a grid cell and in a story without size props.
- **The contrast check reads hex colours only.**
  Colours in other formats are skipped rather than guessed at; the defaults and the demo brands are all hex.
- **Numbers are formatted with a pinned `en-US` locale.**
  A multi-language UI is out of scope, and a fixed locale keeps tables, charts and tests the same on every machine.
- **`DashboardProps` takes either `dashboardId` or `config`, never both.**
  A union type turns the ambiguous case into a compile error.
- **Component tests run in happy-dom instead of jsdom** (agreed after review).
  Under jsdom, typed arrays come from another realm and jose rejected the signing key. Neither the requirements nor the guide name a test DOM.
- **The npm build leaves ECharts external as well as the peers.**
  The host's package manager installs dependencies, so bundling ECharts would make the host ship a second copy.
- **The demo runs on port 5173 with `strictPort`.**
  The mock API accepts browser requests only from that origin, so failing at startup is clearer than CORS errors on another port.
- **The FR-2.6 test reads source files from disk.**
  Vitest hands CSS imports to tests as empty strings even with `?raw`, so the earlier version passed without checking any CSS.
- **Some guide items wait for the phase that uses them.**
  The filter store and chart click handlers (Phase 3); Button, Select, Chip, EmptyState and the registry's default sizes and config fields (Phase 4); `status` and `isFetching` from `useWidgetData`. Nothing reads them yet.

## Phase 3 — Cross-filtering

- **Hosts set filters with a `filters` prop on `DashKitProvider`** (agreed after review).
  FR-4.9 and step 7 of the guide ask for filters from the host, but `DashKitOptions` defines only `onFilterChange`. Passing a new array replaces the active filters; clicks still change them and are reported to `onFilterChange`. The Phase 5 element's `setFilters()` can pass its filters through the same prop.
- **Each `DashKitProvider` holds one filter store.**
  Two dashboards on one page each get their own provider, so their filters never mix.
- **The store keeps an array of filters, and `filtersFor(filters, widget)` is a separate function.**
  React reads the store with `useSyncExternalStore`, which needs a snapshot that changes only when the filters do, and `filtersFor` needs the widget's `listen` setting as well as its id. The guide sketches a record keyed by field with `filtersFor(widgetId)` on the store; the store is internal and not exported.
- **Bar and pie widgets emit by default; line and table widgets only with `crossFilter.emit: true`.**
  A widget emits on its first dimension. For the starter line chart that is the year, and the other widgets already show 2024 only, so a year filter would mostly empty them.
- **Keyboard users filter through each chart's data table.**
  Its values become toggle buttons with `aria-pressed`, and the table covers the chart while focus is inside it. The canvas has no focusable items, and the table already carries the same numbers for screen readers.
- **The selection keeps full opacity and gets a 2 px outline in the theme's text colour; other items drop to 35% opacity.**
  The text colour contrasts with the surface in every brand and mode, so the outline shows on any series colour, and the selection never rests on colour alone (NFR-A4).
- **Default filters are added to each widget's own query when the dashboard renders.**
  They then also narrow widgets with `listen: false`, and they never become chips.
- **`useWidgetData` now returns `isFetching`, compared by the query client's cache key; `status` is still left out.**
  Queries are rebuilt on every filter change, and comparing their content keeps a widget whose query did not change, such as the source chart, from being marked busy. Nothing needs `status` yet.
- **The progress bar appears only after 150 ms.**
  Answers from the cache, as when a filter is removed, arrive at once and would otherwise make it flash.
- **The end-to-end tests run in Chromium only for now.**
  The cross-filter flow does not depend on the browser; Firefox and WebKit projects for NFR-C1 belong with the Phase 6 test pass.
- **The end-to-end test clicks the bar chart signed in as Ravi.**
  With only two regions each bar fills half the chart's height, so a click at a fixed position always lands on the top bar without measuring the chart's layout.
- **Multi-select (FR-4.10) is not implemented.**
  It is a stretch item.
