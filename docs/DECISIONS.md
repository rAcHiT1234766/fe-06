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
  It is a stretch item and no demo user needs it. (Since built: see "After Phase 7".)

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
  It is a stretch item. (Since built: see "After Phase 7".)

## Phase 4 — Dashboard builder

- **The builder is its own component, `DashboardBuilder`; `Dashboard` stays view-only.**
  `DashboardBuilder` takes the same props as `Dashboard` plus `mode` and `onSave` from `DashKitOptions`. Hosts that never edit keep using `Dashboard` unchanged.
- **Edit controls follow the role in the token; the API still checks every write.**
  The SDK cannot verify a token's signature, so the role it reads only decides which controls to show. A viewer gets no Edit, Save, palette, drag or resize controls even with `mode: 'edit'`, and the API answers a viewer's `PUT` with 403.
- **A draft remembers the saved config it started from.**
  The builder edits a copy and writes nothing until Save. If the loaded config changes underneath, after a reload or a change of user, the draft is dropped instead of being shown on top of another user's dashboard. The same applies to the copy kept after a save.
- **Unsaved changes are any edit since the draft started, compared by identity.**
  An edit that is undone by hand still counts. Comparing content would need a comparison that ignores key order and layout order, for little gain. Undo, built later, gives back the very config the draft started from, so undoing every edit does clear it.
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
  Both are stretch items. Until FR-5.11 exists the drag handle is hidden from screen readers, since it does nothing without a pointer. (Since built: see "After Phase 7".)

## Phase 5 — Embedding and responsive

- **`<dashkit-dashboard>` renders `DashboardBuilder`.**
  `mode="edit"` therefore opens the builder for an editor, while a viewer sees the dashboard only, as with the React component. The element is a thin layer over the provider: attributes and properties become props, and its four events are the provider's callbacks dispatched with `bubbles` and `composed`.
- **The SDK's styles travel with the React tree, not as an adopted stylesheet.**
  The dashboard already renders its stylesheet, including the grid's own rules, in a `<style>` inside its root, so the same text reaches the shadow root without a second mechanism. The element adds only `:host` rules. A page with many dashboards parses the stylesheet once per dashboard, which is small next to the charts.
- **The dashboard root resets inherited properties with `all: initial`.**
  A shadow root stops selectors but not inheritance, so a host's `text-transform`, `letter-spacing` or `line-height` on `body` would still reach the dashboard. The reset applies in the npm build too, so both builds look the same on the same page. Custom properties are not affected by `all`, so theme variables still work.
- **The element waits for a token or `getToken` before loading anything.**
  The script defines the element as soon as it runs, which is usually before the page's next script sets `getToken`. Without the wait, the first request went out without a token and the dashboard showed "Session invalid". The API always needs a token, so there is nothing to show before one exists.
- **`refresh()` renders a new provider and keeps the filters.**
  A new provider brings a new query client, so every cached result is gone, and the filters the user had are passed in again. Each rendered dashboard announces `dashkit:ready` once, when it first shows its content or its error, so a refresh, or adding a removed element back, announces it again.
- **`dashkit:filterchange` also reports filters set by the page.**
  The provider reports every change to the filter store, whoever made it, so a page that calls `setFilters` hears the result like any other change.
- **Moving the element does not tear it down; removing it does.**
  Moving an element disconnects and reconnects it at once, so the element unmounts its React root only if it is still disconnected a microtask later.
- **`onError` is now called, with the existing error codes.**
  `DashKitOptions.onError` was declared but nothing called it. The provider now passes it every request that fails for good, after any token renewal, and any config from a newer schema. A 401 that `getToken` recovers from is not reported, and neither are requests abandoned because the widget went away. No error code was added.
- **`DashKit.mount()` adds a `<dashkit-dashboard>` to the container.**
  It takes `DashKitOptions` and returns a handle with `element`, `update`, `setFilters`, `clearFilters`, `refresh` and `unmount`. Building on the element gives it the same isolation, teardown and token handling without a second code path. It is a property of the `DashKit` global from the script build; npm users render the React components.
- **The element is not yet typed for TypeScript and JSX users (FR-6.3, a should item).**
  Typing it means exporting the element's class type and a `HTMLElementTagNameMap` entry from the npm entry, which adds to the public types, so it waits for the Phase 6 types pass and approval.
- **Breakpoints follow the dashboard's own width.**
  The dashboard measures its root with a `ResizeObserver` before the first paint, so a narrow container never flashes the wide layout. A width of zero, as in a hidden tab, keeps the last real width, and a width not yet measured counts as `lg`.
- **Smaller layouts are derived from `lg` unless the dashboard provides them.**
  `deriveLayout` scales each widget's left and right edges into the smaller grid, keeps at least two columns at `md` and `sm`, flows widgets in reading order, and widens the last widget in each row to fill it. At `xs` everything is one column, and widgets taller than three rows get one more row. A config may still supply its own `md`, `sm` or `xs` layout, which is used as given.
- **Editing always works on the `lg` layout and needs an `md` container.**
  Dragging on a derived layout would produce a layout that is never saved. Below `md` an editor sees the dashboard and a short notice; a draft is kept, the leave warning still applies, and the builder returns when there is room.
- **Touch targets grow only for coarse pointers.**
  With `any-pointer: coarse`, every button, select and input inside the dashboard is at least 44 px square. Mouse users keep the compact controls. These rules sit in a stylesheet loaded last, because a media query does not raise specificity over each control's own size.
- **Charts adapt to the breakpoint, not to their own width.**
  Option builders stay pure functions of the data and the widget, plus an `isCompact` flag that is set at `xs`. There, long category names beside horizontal bars are cut to 110 px; the full names stay in the tooltip and the chart's data table.
- **Widgets are size containers; the dashboard root is not.**
  A widget's size is set by the grid, so `container-type: inline-size` is safe there and lets its content adapt to the widget. On the root it would collapse a dashboard placed in a container that sizes to its content, such as a flex row.
- **The plain HTML example lives in the demo app.**
  The mock API accepts browser requests only from the demo's origin, and the demo's Vite server serves the script build at `/dashkit.js` and copies it into its own build. The page names the API at `http://localhost:4000` and signs in as Asha, like the demo.
- **The hostile-CSS test compares pixels with a small tolerance.**
  Screenshots taken at another scroll position differ by one or two levels on the widgets' rounded corners. A channel difference of up to 8 counts as equal; a leaked font changed about 39,000 pixels and one leaked button colour about 3,400, so the test still fails on any real leak.
- **The mock engine has a version, `0.0.0`.**
  `pnpm pack` rewrites every workspace range in the SDK's manifest, including dev dependencies, and needs a version to write. The engine stays private.

## Phase 6 — Quality and documentation

- **The component tests run a second time on React 18, from `packages/react18-check`.**
  A Vitest project points at the SDK's own test files and aliases `react`, `react-dom` and their subpaths to React 18 copies installed in that package, so the same 76 tests run against both peer versions without a second copy of the tests. A setup file fails the run if React 18 is not the one loaded.
- **End-to-end tests run one at a time, in Chromium, Firefox and WebKit.**
  The tests share one demo API, and the builder test replaces a tenant's dashboard, so tests in parallel could see each other's saves. The whole suite takes under two minutes.
- **The axe accessibility checks run in Chromium only.**
  axe's rules read the DOM and computed styles, which do not differ between the engines for these views, and the same views pass the functional tests in all three browsers. Only violations rated serious or critical fail a test.
- **The element's types ship as `dist/element.d.ts`, written by hand in `src/element-types.ts`** (agreed).
  They add `<dashkit-dashboard>` to `HTMLElementTagNameMap`, give each `dashkit:*` event its `detail` type, add the tag to JSX, and type `window.DashKit`. The npm build's type bundler copies every global declaration it sees into `index.d.ts`, so the build's tsconfig leaves this file out and the element build copies it as it is. `TAG_NAME` is typed as `string`, so the SDK's own code never depends on the global tag map.
- **`pnpm check:package` installs the packed SDK into four fresh projects.**
  React 18 and 19, each with the strictest TypeScript settings and with the defaults, and `skipLibCheck` off. Each project has lines marked `@ts-expect-error` that must fail, and the check also refuses an `any` anywhere in the shipped types. CI runs it after the size check.
- **Charts animate for 200 ms, and not at all with reduced motion.**
  The first cross-filter measurement missed its 300 ms target (median 549 ms) because of ECharts' default animations. The durations are set on every series as well as on the chart, because a series' own defaults win over the chart's.
- **The SDK records User Timing entries.**
  `dashkit:mount`, `dashkit:first-chart`, `dashkit:filter-change` and `dashkit:cross-filter` are the measurements the performance tests read, and a host can read them too. Nothing is recorded when the Performance API is missing.
- **Performance is measured by hand, not in CI.**
  `pnpm perf` builds the SDK and the demo, takes several minutes, and depends on the machine. CI gates the bundle sizes only. The results, with the machine and browser, are in `PERFORMANCE.md`.
- **The bundle breakdown came from the bundle's source map, read with Node's own `SourceMap`.**
  A one-off script attributed every byte of `dashkit.js` to the package it came from, without adding a visualiser package to the project.
- **Component tests may take 15 seconds.**
  With the React 18 run, twice as many component tests run in parallel, and one builder test that takes about a second alone timed out at Vitest's default of 5 seconds in a full run.
- **The API reference is generated from the public types, and every public property needs JSDoc.**
  `scripts/api-reference.ts` walks the exports of both entries with the TypeScript compiler and writes the Storybook page before Storybook starts or builds. It fails when an export, a property or a method has no JSDoc, so CI enforces the editor tooltips too. Its output is not committed.
- **Accepted but unused options are documented as such, not removed.**
  `pageSize`, a layout item's `minW` and `minH`, the `success` and `warning` colours, and a token's `scopes.measures` are part of the public types from the guide, but nothing applies them yet. Their JSDoc now says so; removing them would change a public contract.
- **Storybook has a signed-in user in its toolbar.**
  The story loader signs in as the chosen user through the in-browser API, and Storybook runs loaders again when a toolbar value changes. Stories that need one user pin it with story-level `globals`, which also disables that toolbar control for them.
- **Every widget has the same six stories, from one shared module.**
  Default, Loading, Empty, Error, Selected and Dark. Line and table widgets need `crossFilter.emit` to hold a selection, so their Selected stories set it. A KPI cannot be selected, so its Selected story shows it narrowed by a selection in another widget.
- **`pnpm dev` watches both SDK builds, and neither empties `dist/`.**
  The demo app imports the npm build and its plain HTML page loads `dashkit.js`, both from `dist/`. A plain `vite build --watch` emptied the folder and rebuilt only `index.js`, so the plain HTML page failed under `pnpm dev`; the end-to-end tests start the demo without the watcher and never saw it. `scripts/dev.ts` runs both watchers in one process. `src/element.ts` also leaves `tsconfig.build.json`: the type plugin wrote and then deleted its own `dist/element.d.ts`, which removed the element build's copy whenever the two builds overlapped.
- **Focus moves in layout effects.**
  After a save or a cancel, Save and Cancel disappear and the focus goes to Edit dashboard. A passive effect did this a moment after the page updated, leaving the focus on the page body in between; checking each commit from a fresh clone, the save test caught that gap twice on a busy machine. A layout effect moves the focus in the same update.
- **Line coverage is not measured.**
  Measuring it needs a coverage provider such as `@vitest/coverage-v8`, a dependency the guide does not name, so it waits for approval. (Since added: see "After Phase 7".)

## Phase 7 — Ship

- **The API, the demo app and Storybook deploy to Render from one Blueprint** (agreed).
  `render.yaml` describes all three, so one action creates them, and the free plan needs no card. A free API sleeps after about 15 minutes without requests and takes up to a minute to wake; `DEPLOYMENT.md` says to open `/health` before presenting. The demo API keeps dashboards in memory, so a restart restores the starter dashboard.
- **The API runs its TypeScript directly on Node 24.**
  Node strips the types itself, as it does locally, so the service has no build step and runs the same files the tests run.
- **Each service installs a pinned pnpm with npm before installing the project.**
  The repository pins pnpm 12 in `package.json`, and a hosting build image may have another version or none. Installing that exact version makes the lockfile mean the same thing there as locally.
- **The token secret is generated by Render and never set by hand.**
  `generateValue` gives the API its own random secret, which no one needs to see: the API both signs the demo tokens and verifies them. The two values that link the services, the demo's address for CORS and the API's address for the demo, are asked for when the Blueprint is created, because Render shows a service's address only once it exists.
- **The demo takes the API's address from `VITE_DASHKIT_API_URL` at build time, for both of its pages.**
  `vite.config.ts` gives it the local default, the React app reads it through `import.meta.env`, and the plain HTML page gets it through Vite's `%VITE_DASHKIT_API_URL%` replacement in the element's `api-url`. The page's token request reads the address back from the element, so the page names it once. Changing it needs a new build, which is how a static site works.
- **The deployment was rehearsed locally before any account existed.**
  Each build and start command ran from a fresh clone, and the results were served as static files on separate origins, so CORS, the token flow and every demo step ran as they will online. Render's own build image could not be tried without an account; `DEPLOYMENT.md` lists the likely failures and their fixes.
- **The demo script is also the acceptance test.**
  Every shot in `DEMO_SCRIPT.md` has an "Expect" column, and the whole script, the step 8 console snippet included, was run against the production builds. Step 8 needs a hand-made request because the demo deliberately has no save button for a viewer.
- **Every `M` requirement now has a test that names it.**
  Mapping the requirements to the tests found five without one. FR-1.3 is now an element test that renders `<dashkit-dashboard>` and the React builder side by side and compares their markup. FR-1.4 is part of `check:package`, which looks in each build for strings only React or ECharts contain. FR-6.4 to FR-6.6 are a Storybook end-to-end spec that runs against the static build, as deployed, in Chromium only, because the widgets themselves are tested in all three browsers.
- **The presentation's two hard problems are the ones recorded here.**
  Styling inside a shadow root (Phase 5) and the cross-filter latency (Phase 6) each had a measured failure, a cause found and a test that now guards the fix, so the slides can show real numbers rather than a story.

## After Phase 7 — Finishing the public options

- **Coverage is measured with `@vitest/coverage-v8`** (agreed).
  It is Vitest's own provider, pinned to Vitest's version as Vitest requires, and a development dependency only. V8 records coverage while the code runs, so nothing in the code is rewritten to measure it.
- **Only the SDK's core and the query engine are gated, each at the whole percentages first measured.**
  They hold the logic every widget and every permission rests on, and their tests are written against inputs and outputs, where a missed branch is a missed case. Interface code is measured and reported but not gated, because its tests check what a user sees and does rather than which lines ran. CI runs `pnpm test:coverage` in place of `pnpm test`.
- **At tablet width, widgets that share a row at `lg` stay side by side, the widest giving up columns.**
  The four-column `sm` grid stays: dashboards may already provide `sm` layouts in four columns. Only neighbours from the same `lg` row are narrowed, so a widget from the next row never squeezes the row above.
- **Tablet dashboards shorten horizontal bar labels, as phones did.**
  At half of a tablet's width, long region names took nearly all of the bar chart's width. The full names stay in the tooltip and the data table.
- **A layout item's `minW` and `minH` can raise its widget type's minimum, never lower it.**
  A dashboard author can stop a widget being made too small for its content, but cannot let a chart shrink below the room its axes need. The grid does not report minimum sizes back after a drag or resize, so `arrangeWidgets` carries each item's own over, and a duplicated widget keeps the one it copied.
- **Tables page on the client, over the rows the query returned.**
  A query returns at most 1,000 rows and the API has no offset, so paging in the browser needs no request and no API change. `pageSize` must be 1 to 1,000; the builder and the API both refuse anything else, and the API now checks layout minimums against the builder's ranges too.
- **The page is stored with the result it belongs to.**
  A new result, as after a filter, then shows its first page in the same render, with no effect resetting it a frame later and no state set during render.
- **Pager buttons use `aria-disabled`, not `disabled`.**
  A disabled button loses the focus, so pressing Next on the last page would leave a keyboard user on the page body.
- **The demo's own dashboard keeps its table unpaged.**
  The cross-filter test and the demo script read every row of it; a Paged story in Storybook shows the feature, and the end-to-end tests page through it.
- **The status colours are used as text, so the contrast check covers them.**
  "Saved" and "Unsaved changes" sit on the background, and error titles on a widget's surface, so success and warning are checked on the background and danger on the surface. Each status has an icon and words, so the colour is never the only signal.
- **The demo plays a fictional host product.**
  DashKit is for analytics inside someone else's product, and a bare toolbar above a dashboard never showed that. The product has a top bar with the customer's logo and the signed-in user, navigation to four pages, and the dashboard on Analytics. Home, Orders and Settings say they belong to the host and show no figures, so the demo invents no data.
- **The demo's controls sit in their own bar, the same in every brand.**
  Switching user, brand and mode is the presenter's business, not the product's; a bar that never takes the brand cannot be mistaken for part of it. The labels are unchanged, so the tests and the demo script still find them.
- **The host styles itself from the brand it gives the dashboard.**
  Switching brand then restyles the whole product, as a white-label customer would see it. Text uses only the colour pairs the theme's contrast check covers, so every brand that passes the check passes in the product too.
- **Below 1,500 px the navigation shares the top bar; above, it is a sidebar.**
  The dashboard measures its own width. At 1280 px, the size the demo script records at, a sidebar would leave it under 1,200 px and switch it to eight columns, so the sidebar waits for a screen wide enough to keep twelve.
- **The page lives in the address.**
  Back and Forward work, a page can be opened by its link, and after a move the focus goes to the new page's heading, so a screen reader starts there as after a page load.
- **Column-level scope refuses the whole query, as the guide's `assertMeasuresAllowed` does.**
  Dropping the forbidden measure and answering the rest would show a widget that looks complete but is not, and the message names the measure so the widget can say why. A filter on a forbidden measure is refused too: "GDP above a trillion", narrowed step by step, would reveal every country's GDP.
- **A new demo user, Kofi, shows it, rather than a narrower scope for an existing one.**
  He shares Acme Global's dashboard with Asha, so the same dashboard shows both scopes, and the tests and demo steps for Asha, Ravi and Elena are unchanged.
- **The builder follows `/meta`, and a new widget fits it.**
  Two widget starters use a GDP measure; for a user without it, they switch to the first measure `/meta` lists and take a title naming it, so a new widget never starts out refused. A widget already on a forbidden measure says "Not available to you" in its settings rather than quietly showing another measure as selected.
- **Saving a dashboard that uses measures the editor may not query is allowed.**
  A config holds no data, and every query is checked when it runs, so other users of the dashboard keep their widgets.
- **Undo keeps whole versions of the draft, not a way to reverse each kind of edit.**
  Configs are never changed in place, so each version shares everything it did not change with the one before and costs little to keep. Undoing to the start gives back the very config editing began from, so "Unsaved changes" clears and leaving the page asks nothing. The last 100 steps are kept, and Save or Cancel ends the history.
- **A run of edits to one setting is one step.**
  Typing a title would otherwise take one undo per letter. `changedSetting` names the one setting an edit changed, and edits to the same setting of the same widget merge until another edit or an undo comes between. A drag that ends where it began is not an edit at all.
- **The undo shortcuts work while the focus is in the dashboard, and not in a text field.**
  Ctrl+Z undoes and Ctrl+Y or Ctrl+Shift+Z redoes, with Cmd on a Mac. A text field keeps Ctrl+Z for its own typing, as everywhere else on the page, and the host page's shortcuts are untouched elsewhere. The toolbar buttons use `aria-disabled`, so the focus stays on them at the end of the history, and a visually hidden status says what was undone and how many steps are left.
- **The drag handle is also the keyboard handle.**
  It is a button named "Move or resize" and the widget's title. With the focus on it, the arrow keys move the widget a column or row and Shift with the arrow keys resizes it, within the same minimums as a resize by pointer. The keys do not also scroll the page.
- **A key press uses the grid's own move, as at the end of a drag.**
  Widgets in the way make room and the layout is compacted upwards, so the keyboard never makes a layout the pointer could not. Compaction means one row down often floats straight back, and a step into two neighbours can move one of them and leave the widget where it was, so a press goes on until the widget itself has moved that way. When it cannot, the builder says so.
- **What a key press did is said, and the keys are shown.**
  A visually hidden status gives the new column and row, or the new size, or why nothing moved. While the handle has keyboard focus it shows which keys to use, so sighted keyboard users learn them too; a pointer user never sees the hint.
- **A run of key presses is one undo step**, one for moving and one for resizing, as a typed title is.
- **Nothing puts the focus back after a move.**
  A move can put the widget's element after others in the page. Code to return the focus to the handle was written, and removed when the end-to-end test passed without it in Chromium, Firefox and WebKit; the test still checks that the focus stays.
- **Screen readers in browse mode keep the arrow keys for reading.**
  A screen reader user switches to focus mode, as for any control that takes arrow keys; the handle's description names the keys. A menu of move and resize commands would avoid the switch, at the cost of many more controls on every widget.
- **Ctrl-click, or Cmd-click on a Mac, adds a value to the selection or takes it out.**
  A plain click still replaces the selection, and clicking the only selected value still clears it. Cmd is the Mac's key because Ctrl-click there opens the context menu. Taking out the last value removes the filter, as a second plain click does.
- **A widget adds only to its own selection.**
  A Ctrl-click on a field another widget, or the host, has selected starts a new selection, as a plain click does. Adding to it would make the clicked widget the selection's owner, so the other widget would switch from highlighting the values to being filtered by them.
- **In a data table, Ctrl+Enter or Cmd+Enter adds the value.**
  Keyboard users filter through each chart's data table, so they need the same choice. Browsers disagree on Ctrl+Enter: Chromium and WebKit do not click the button, and Firefox clicks it without saying Ctrl was held, so the button handles the key itself and stops the browser's own click.

## After Phase 7 — Beyond the requirements

The author asked for five features the requirements do not list. Each is recorded here.

- **CSV export goes beyond the brief** (agreed).
  Section 5.2 of the requirements lists PDF and CSV export as out of scope; it was built at the author's request. It is off unless the host sets `allowExport`, because some products must not let data leave them, and a host that upgrades should not find a new button it did not ask for.
- **The file holds what the widget holds, and nothing is fetched for it.**
  It is the widget's current result: after the cross-filters, inside the user's scope, every page of a paged table, and no more than the query's `limit`. Since no new request is made, the API's scope protects the file as it protects the screen.
- **Values are raw; the headings are the column labels.**
  Numbers are written unformatted, so the world's population in 2024, "8.1B" on the KPI, is 8117484624 in the file and a spreadsheet can calculate with it. A missing value stays empty rather than becoming 0, as on screen.
- **Text that would run as a formula is written as text.**
  A spreadsheet runs a cell starting with `=`, `+`, `-`, `@`, a tab or a carriage return, so text cells that do get a leading apostrophe. Numbers are left alone, since a negative number is no formula. No country or region name starts that way, but a host's own labels could.
- **UTF-8 with a byte order mark.**
  Without it, Excel reads the file in the system's code page and garbles names such as Côte d'Ivoire and Curaçao.
- **The download link is made beside the button.**
  Inside a shadow root it stays inside, so the script-tag build downloads the same way and a host's handler for link clicks never sees it. Its address is released after 40 seconds, since the browser reads the file after the click returns.
- **No download while editing.**
  The header then holds the editor's controls, and the data belongs to an unsaved draft.
- **`allow-export="false"` counts as absent.**
  It is a boolean attribute, but React 18 writes `false` on a custom element as the text "false", which would otherwise turn the downloads on.
- **Drill-down is a widget's own selection, seen one level down.**
  `drillDown` names a field. A click selects the value as for any cross-filter, so the other widgets filter by it, and the clicked widget, which never filters by its own selection, shows `drillDown` within it instead of highlighting it. Nothing new is stored, undone or reported: the host's `onFilterChange` hears the selection, and the chip's ×, **Clear all** and the **All regions** link all lead back.
- **One level, to any other field.**
  The data's only hierarchy is region to country, so `drillDown` names one field rather than a path. Income level to country, or region to year, work the same way.
- **The drilled query swaps one field and keeps the rest.**
  It groups by `drillDown` in place of the clicked field, keeps to the selected values, and sorts by the new field where it sorted by the old one. Measures, filters such as the year, and the row limit stay.
- **Only the widget's own selection drills it.**
  A selection made by the host or another widget filters it as usual, so a host that sets a region does not change what the charts show.
- **The drilled level has nothing to click.**
  Its rows are countries, not values of the widget's selection field. Selecting a country there would need a second selection in the same widget.
- **Filter buttons follow the rows on screen, not the selection.**
  While the countries load, the regions and their buttons stay, so the button that was pressed keeps the focus until the rows change. The component test caught the first version, which dropped the buttons with the selection and the focus with them.
- **The focus follows keyboard users, never pointer users.**
  After drilling in from a button in the widget, the focus moves to **All regions**; after leaving with Enter or Space, which give a click with no pointer and a `detail` of 0, it moves to the value drilled into, in the data table. A click on the canvas leaves the focus where it was, and so does a mouse click on **All regions**, since the data table it would focus covers the chart.
- **Offered for bar, pie and table widgets.**
  Their clicks pick one value. A line usually runs over years and a KPI has nothing to click; changing a widget to either drops `drillDown`, as grouping by the drill-down field itself does.
- **A filter control writes the same selections as a click.**
  A list above the grid sets the selection on its field in the filter store, from the source `filter-control`. Chips, **Clear all**, the host's `onFilterChange` and the API's permission checks all apply unchanged, a click on a chart shows in the list, and a host that sets a region sees it chosen there.
- **A field with a control is a setting of the dashboard.**
  Every widget of the overview shows 2024, so a Year list that only narrowed them would empty all of them for any other year. A selection on a field with a control therefore replaces each listening widget's own filters on that field, and choosing 2010 shows 2010. On fields without a control a selection still narrows, so a click never turns a widget about one region into one about another. A widget that must keep its own filter sets `crossFilter.listen: false`.
- **No control on a field with a default filter.**
  Default filters narrow every widget, including those that ignore cross-filters, so **All** in a control on the same field would still show only what the default lets through. The builder does not offer the field, and both the builder and the API refuse such a dashboard.
- **The list shows what is selected, even before its values arrive.**
  A value set by the host or a click is shown at once, and several selected values show as "2 selected", so the list never claims **All** while the widgets are filtered.
- **One native `<select>` per control.**
  It is labelled, works with the keyboard and screen readers on every platform, and needs no dependency. The values come from one grouped query per field, so the API's row scope decides them: Ravi's Region list offers his two regions only.
- **The host keeps the dashboard shown; the picker only proposes.**
  `DashboardPicker` takes `value` and `onChange`, as a form control does, so a host can keep the id in its URL or its own state, put the picker anywhere, or leave it out and switch dashboards its own way. The element keeps the id in its `dashboard-id` attribute and reports `dashkit:dashboardchange`; `mount()` takes the new id into its options, so a later `update()` does not switch back.
- **No switch while there are unsaved changes.**
  A builder under the same provider tells a small registry while its draft differs from the saved dashboard, and the picker disables itself and says why. Asking with `window.confirm` would block the page and look like the browser rather than the host's product, and switching silently would lose the edits.
- **A switch clears the cross-filters.**
  A selection names the widget it came from, and another dashboard may have a widget with the same id, which would then take it for its own selection and drill down. The host hears the cleared filters through `onFilterChange`.
- **A new dashboard's id comes from its title.**
  "Sales in Asia" becomes `sales-in-asia`, or `sales-in-asia-2` if that is taken, using the same rules as CSV file names, so ids stay readable in URLs. The list is read again just before the id is chosen, because `PUT` replaces a dashboard that already has the id.
- **Deleting asks first, and the last dashboard stays.**
  The question names the dashboard, the focus starts on **Keep**, and after a deletion the picker shows the first remaining dashboard. With only one left there is no **Delete dashboard**, so a host always has something to show.
- **A second starter dashboard.**
  Every tenant now also starts with the Population explorer, which shows filter controls and drill-down without any editing. It uses population and life expectancy only, which every demo user may query, so Kofi, who may not query GDP, sees all of it.
