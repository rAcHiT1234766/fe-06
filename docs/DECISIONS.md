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

## Phase 4 — Dashboard builder

- **The builder is its own component, `DashboardBuilder`; `Dashboard` stays view-only.**
  `DashboardBuilder` takes the same props as `Dashboard` plus `mode` and `onSave` from `DashKitOptions`. Hosts that never edit keep using `Dashboard` unchanged.
- **Edit controls follow the role in the token; the API still checks every write.**
  The SDK cannot verify a token's signature, so the role it reads only decides which controls to show. A viewer gets no Edit, Save, palette, drag or resize controls even with `mode: 'edit'`, and the API answers a viewer's `PUT` with 403.
- **A draft remembers the saved config it started from.**
  The builder edits a copy and writes nothing until Save. If the loaded config changes underneath, after a reload or a change of user, the draft is dropped instead of being shown on top of another user's dashboard. The same applies to the copy kept after a save.
- **Unsaved changes are any edit since the draft started, compared by identity.**
  An edit that is undone by hand still counts. Comparing content would need a comparison that ignores key order and layout order, for little gain.
- **Only the `lg` layout is stored.**
  The builder edits the 12-column layout; the smaller layouts of Phase 5 are derived from it. Layout changes are recorded when a drag or resize ends.
- **The SDK's own grid styles replace the grid library's stylesheet.**
  The rules are scoped under `.dk-grid` and use the theme's tokens, and the SDK ships one stylesheet string that also works inside the Phase 5 shadow root. The library's rule that hides resize handles while resizing is off had to be restated; without it viewers saw a resize corner on every widget, which the builder end-to-end test caught.
- **The widget registry differs slightly from the guide's sketch.**
  Each type has a `label`, `view`, `defaultSize`, `minSize`, a `starter` (the guide's `defaultConfig`, as a plain object since edits never change it) and `configFields`. The cross-filter setting is split into `emit` and `listen`, because a KPI can follow filters but has nothing to click. Minimum sizes are applied when the grid renders and are not stored.
- **New widgets are added at the left edge below everything else, with ids such as `bar-1`.**
  The id is the first free one for its type. A duplicate keeps the original's size and is titled "(copy)".
- **New widgets show the latest year, unless they are grouped by year.**
  The data has 25 years, so a widget without a year filter would add up values such as population across all of them. The latest year comes from a one-row query, asked only while the builder is open, so `/meta` stays as it is. Grouping by year shows every year, and changing the grouping or type applies the same rule.
- **The config panel edits the first measure and the first grouping.**
  A table's further measures and groupings stay as they are. A new measure starts with its usual aggregation from `/meta`, and sorting follows a measure or grouping that is swapped.
- **Changing the type keeps what the new type can use.**
  Title, measures, grouping, filters, sorting and cross-filter settings stay where they fit. A KPI keeps only its first measure and drops grouping, sorting and limit; a chart keeps one grouping; a widget without a grouping takes the new type's starter grouping. Options such as bar direction belong to one type and are dropped.
- **The panel sits beside the grid and is not modal.**
  The grid stays usable, so every change can be watched on the widget. In a container too narrow for both, the panel moves below the grid. It opens with the focus on the title, closes with Escape or its close button, and gives the focus back to the button that opened it.
- **Builder controls are plain elements with `dk-` classes.**
  The guide's file tree lists `Button`, `Select` and `Chip` components; the builder's buttons, selects and checkboxes needed nothing beyond their native behaviour and shared classes.
- **Save checks the draft first and lists every problem at once.**
  The checks mirror the API's (ids, one place on the grid per widget, measures, row limits) and add one of the SDK's own: every widget needs a title, since the title names the widget's region for screen readers. If the API refuses a save anyway, its message is shown and the draft is kept.
- **After a save the builder shows the config the API returned, and `onSave` receives it.**
  It includes `updatedAt` and `updatedBy`, so the host sees exactly what was stored.
- **Leaving the page with unsaved changes asks for confirmation; Cancel does not.**
  FR-5.8 asks Cancel to discard the draft, so it does so at once. Browsers show their own wording for the leave warning.
- **`migrate()` refuses configs from a newer schema with the code `UNKNOWN`.**
  Version 1 is the only schema, so `migrate()` passes it through unchanged. `DashKitError` has no code for an invalid config, and adding one would change a public type.
- **The builder end-to-end test uses Elena's tenant.**
  It empties and rebuilds her dashboard, and no other test reads it.
- **Undo and redo (FR-5.10) and a keyboard way to move and resize widgets (FR-5.11) are not implemented.**
  Both are stretch items. Until FR-5.11 exists the drag handle is hidden from screen readers, since it does nothing without a pointer.
