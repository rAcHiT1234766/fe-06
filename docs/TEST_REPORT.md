# Test report

Every result on this page comes from runs on 21 November 2026 on a fresh clone of commit
`3787e16`, the last commit before this report, on the machine described in [PERFORMANCE.md](PERFORMANCE.md) (Windows 11, Intel Core i5-1135G7, 16 GB).
[PROGRESS.md](PROGRESS.md) has the results of each commit before it. Performance numbers are on
that page. Since then, `1498753` added two unit tests for the API's bare address: 528 pass, with
coverage above every gate, as PROGRESS.md records.

| Tool       | Version                                                   |
| ---------- | --------------------------------------------------------- |
| Node, pnpm | 24.22.1, 12.21.0                                          |
| TypeScript | 6.0.3                                                     |
| Vitest     | 5.1.0, with happy-dom for components                      |
| React      | 19.3.1, and 18.3.1 for the second component run           |
| Playwright | 1.65.1: Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2 |
| axe        | @axe-core/playwright 4.14.0 (axe-core 4.14.1)             |
| Storybook  | 10.6.7                                                    |

## Summary

| Check                 | Command                | Result                                                                                                                             |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Lint                  | `pnpm lint`            | Pass, no warnings                                                                                                                  |
| Types                 | `pnpm typecheck`       | Pass in every package                                                                                                              |
| Unit, component, type | `pnpm test:coverage`   | 54 files, 526 tests passed, no type errors; coverage above every gate                                                              |
| End to end            | `pnpm test:e2e`        | 108 passed, 60 skipped (the accessibility and Storybook checks run in Chromium only), in 6.1 minutes                               |
| Build                 | `pnpm build`           | Pass                                                                                                                               |
| Storybook             | `pnpm build-storybook` | Pass; the API reference generator found JSDoc on all 39 public exports and their members                                           |
| Bundle size           | `pnpm size`            | 222.7 kB gzipped as a host bundles the npm build, 246.2 kB with the map entry (target 300); 313.9 kB for `dashkit.js` (target 500) |
| Installed package     | `pnpm check:package`   | Each build carries the libraries it should, and the packed SDK installs into four fresh projects and type-checks in each           |

CI runs all of these on every push, the end-to-end tests in all three browsers.

## Unit, component and type tests

`pnpm test` runs four Vitest projects, and `pnpm test:coverage`, which CI runs, runs them while
measuring coverage:

```text
 Test Files  54 passed (54)
      Tests  526 passed (526)
 Type Errors  no errors
   Duration  82.16s (tests 44%, environment 22%, import 19%, setup 9%, transform 3%, typecheck 1%, worker 1%)
```

| Project                | Area                                                                                                                                                                                                                                                                                                                     |   Tests |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------: |
| `sdk`                  | Core: query client 19, widget edits 17, filter store 14, layouts 12, dashboard edits 11, theme 11, config schema 10, number formats 9, drill-down queries 8, CSV files 7, undo history 5, render timing 5, query merging 5, dashboard comparison 4, ids from titles 3, unsaved-draft registry 1, no hard-coded colours 1 |     142 |
| `sdk`                  | Chart options 18, keyboard arrangement 7, colours for map classes 3, map registration 1, ECharts theme 1                                                                                                                                                                                                                 |      30 |
| `sdk`                  | Components on React 19: builder 30, element 17, dashboard 13, cross-filtering 13, ECharts hook 10, `DashKit.mount()` 7, responsive 7, dashboard picker 6, CSV export 4, drill-down 4, filter controls 4, table paging 3, map widget 2                                                                                    |     120 |
| `sdk`                  | Type tests: the public API 11, core types 4                                                                                                                                                                                                                                                                              |      15 |
| `sdk on React 18`      | The same 120 component tests, against React 18.3.1                                                                                                                                                                                                                                                                       |     120 |
| `@dashkit/mock-engine` | Permission matrix 38, API routes 29, query execution 28                                                                                                                                                                                                                                                                  |      95 |
| `@dashkit/mock-api`    | The HTTP server: CORS for listed and other origins, preflight, and passing the token and body through                                                                                                                                                                                                                    |       4 |
| **Total**              |                                                                                                                                                                                                                                                                                                                          | **526** |

What they cover, against the plan in the implementation guide:

- **Query engine and security.** `executeQuery` and the query parser, with every operator,
  aggregation, missing values, sorting and limits. The permission matrix signs in as each demo
  user and runs fixed queries: no row outside the token's regions comes back, totals come from
  in-scope rows only, and a filter naming forbidden regions returns no rows rather than an error.
  The API route tests refuse a missing token, a token with one character changed, one whose claims
  were rewritten, one signed with another key and one past its 15 minutes; they check that a
  `tenantId` in the request is ignored, that tenants' dashboards stay apart, that viewers get 403
  on save, and that every error has the same shape. Column-level scope is tested the same way: a
  query that shows or filters on a measure outside the token's list is refused, `/meta` lists only
  the allowed measures, and exactly the starter widgets that use GDP are refused for Kofi.
- **Core logic without React.** `mergeQuery`, the filter store with its multi-select, `createTheme`
  and the contrast check, `deriveLayout`, config migration and validation, every builder edit, the
  undo history, and the query client's caching, request sharing, token renewal after a 401 and
  error mapping. The keyboard arrangement is tested the same way, over hand-made layouts.
- **Every chart option builder**, as pure functions, since the test DOM has no canvas.
- **Components** through the real query engine over MSW: each widget's loading, empty, error and
  populated states, table paging, the filter bar and its chips, cross-filtering between widgets
  with one value or several, the config panel, role-based controls and measures, saving and
  cancelling, undo and redo, moving and resizing from the keyboard, unsaved-change warnings,
  container breakpoints, and the custom element's attributes, properties, events and lifecycle. One test
  renders the element and the React component side by side and requires the same markup, which
  shows that both entry points come from the same code (FR-1.3).
- **Beyond the requirements.** CSV files as a spreadsheet reads them, formula-like text included;
  the drilled-down query and the widget that shows it, with where the focus goes; filter controls
  and the replacement of a widget's own filter on their field; the picker's switching, creating and
  deleting, and its wait while a builder has unsaved changes; and the map's colour classes, its
  borders arriving after the data, and clicks on countries with no data. The API refuses a map
  grouped by anything but country.
- **The known gaps closed.** The content comparison behind "Unsaved changes", with order and
  `undefined` properties that mean nothing; an edit reversed by hand, and a widget moved and moved
  back, leaving nothing to save; a chart drawn once when a resize with the mouse ends; and the
  press on a resize corner cancelled, so the browser does not scroll the page during the drag; and
  the warning for a map whose borders never arrive, which names the map entry.
- **Types.** `expectTypeOf` tests check that the public types accept correct use and reject wrong
  use, such as passing both `dashboardId` and `config`, or reading the wrong `detail` type from a
  `dashkit:*` event, and that `registerMap` comes from the map entry and not the main one.

One line, `TypeError: Network error`, comes from the test that makes the API unreachable on
purpose. Each test file waits for the test DOM's requests before closing the mock API, so no other
request is left to fail.

## Coverage

V8 records which statements, branches and functions run during the tests. The SDK's core and the
query engine are gated: a drop below the whole percentages first measured fails the run, and CI.
The interface code is measured but not gated, since its tests check what a user sees and does
rather than which lines ran.

| Area                                        | Statements | Branches | Functions |  Lines | Gate               |
| ------------------------------------------- | ---------: | -------: | --------: | -----: | ------------------ |
| SDK core, `packages/sdk/src/core`           |     98.45% |   95.26% |    98.44% | 99.56% | 97 / 93 / 97 / 99  |
| Query engine, `packages/mock-engine/src`    |     96.23% |   94.58% |      100% | 97.78% | 95 / 93 / 100 / 97 |
| Everything measured, the interface code too |     96.91% |   92.00% |    97.47% | 98.27% | none               |

## The installed package

`pnpm check:package` packs the SDK as npm would, installs the tarball into empty projects outside
the workspace, and type-checks a small host app with `skipLibCheck` off. Each project also has
lines marked `@ts-expect-error` that must fail, so the check proves wrong use is rejected too. It
also checks that the package holds exactly the nine expected files and that no type contains `any`.

It then checks what each build carries (FR-1.4). The npm build must list `react` and `react-dom` as
peer dependencies and import React and ECharts rather than contain them. `dashkit.js` must be a
classic script that defines `window.DashKit` and contains both libraries. Only `dist/map.js` may
import ECharts' map chart, so a host that shows no map leaves it out. Of the SDK's dependencies,
only React's production code links to `react.dev/errors` and only ECharts names its internal state
`__ec_inner_`, so the check looks for those strings.

```text
React 18, strictest TypeScript settings: types check.
React 18, defaults TypeScript settings: types check.
React 19, strictest TypeScript settings: types check.
React 19, defaults TypeScript settings: types check.
The packed SDK (9 files) installs and type-checks.
```

## End-to-end tests

Playwright runs the demo app against the demo API, one test at a time, in each browser. It also
builds Storybook and serves the static files, as they are deployed, for the Storybook checks.

| Test                                                                                                              | Chromium | Firefox | WebKit  |
| ----------------------------------------------------------------------------------------------------------------- | :------: | :-----: | :-----: |
| FR-4.1 FR-4.2 a bar click filters the pie, line and table, and a second click restores them                       |   pass   |  pass   |  pass   |
| NFR-A1 keyboard users filter through a chart's data table, which shows while it has focus                         |   pass   |  pass   |  pass   |
| FR-4.10 Ctrl-click, or Cmd-click on a Mac, adds a bar to the selection and takes it out again                     |   pass   |  pass   |  pass   |
| FR-3.11 a user without GDP sees those widgets refused, the API refuses them too, and the builder never offers GDP |   pass   |  pass   |  pass   |
| FR-5.1 to FR-5.7 an editor builds a dashboard from empty, saves it, and a reload shows it unchanged               |   pass   |  pass   |  pass   |
| FR-5.10 an editor undoes a resize and a removal from the keyboard, and redoes them                                |   pass   |  pass   |  pass   |
| FR-5.11 an editor moves and resizes a widget from the keyboard, and the focus stays on its handle                 |   pass   |  pass   |  pass   |
| NFR-P5 a chart resized with the mouse is stretched during the drag and drawn again at the end                     |   pass   |  pass   |  pass   |
| NFR-P5 holding a resize corner near the bottom of the window does not scroll the page                             |   pass   |  pass   |  pass   |
| FR-5.1 a viewer sees no edit controls, and the API refuses their save                                             |   pass   |  pass   |  pass   |
| FR-1.2 FR-1.5 one script tag shows the dashboard, and hostile host CSS changes nothing                            |   pass   |  pass   |  pass   |
| FR-1.7 the page hears about filter changes inside the element                                                     |   pass   |  pass   |  pass   |
| FR-1.6 FR-1.8 `DashKit.mount()` adds a second dashboard that keeps its own filters                                |   pass   |  pass   |  pass   |
| FR-6.8 FR-6.9 the dashboard is usable on a 360 px phone                                                           |   pass   |  pass   |  pass   |
| FR-6.10 an editor on a phone sees the dashboard and a notice instead of the builder                               |   pass   |  pass   |  pass   |
| The demo's host product: at 1280 px the navigation shares the top bar and the dashboard keeps twelve columns      |   pass   |  pass   |  pass   |
| The demo's host product: on a wide screen the navigation is a sidebar and the dashboard keeps twelve columns      |   pass   |  pass   |  pass   |
| The demo's host product moves between its own pages and the one with the dashboard                                |   pass   |  pass   |  pass   |
| The demo's host product takes the brand and mode it gives the dashboard, and names the user                       |   pass   |  pass   |  pass   |
| CSV export: a user downloads a widget's data, only ever inside their scope                                        |   pass   |  pass   |  pass   |
| CSV export: the script-tag element downloads from inside its shadow root                                          |   pass   |  pass   |  pass   |
| Drill-down: a click shows a region's countries, and keyboard users keep their place                               |   pass   |  pass   |  pass   |
| Filter controls: a list above the grid filters every widget, and shows chart clicks                               |   pass   |  pass   |  pass   |
| Dashboard picker: switch, create and delete dashboards                                                            |   pass   |  pass   |  pass   |
| Map: a click on a country filters the dashboard by it                                                             |   pass   |  pass   |  pass   |
| NFR-A1 Map: keyboard users filter by a country from the map's data table                                          |   pass   |  pass   |  pass   |
| 15 accessibility checks (below)                                                                                   |   pass   | skipped | skipped |
| 15 Storybook checks, FR-6.4 to FR-6.6 (below)                                                                     |   pass   | skipped | skipped |

```text
  60 skipped
  108 passed (6.1m)
```

### Accessibility

axe checks each view against WCAG 2.0, 2.1 and 2.2 at levels A and AA, with animation off, and a
test fails on any violation rated serious or critical. Every check passed:

- the starter dashboard for each of the three brands, in light and in dark mode (6 checks);
- the demo's host product with its sidebar, in every brand and mode, and one of its own pages
  (2 checks);
- the dashboard with an active cross-filter;
- the "Session invalid" state after the token is tampered with;
- the Population explorer, with its filter lists, its map and its region chart drilled into South
  Asia, in every brand and mode;
- the dashboard picker while it asks before deleting a dashboard;
- the builder with a widget's settings panel open;
- the plain HTML page, checked inside the element's shadow root;
- the phone layout at 360 × 780.

The checks run in Chromium only: axe's rules do not depend on the browser engine, and the same
views pass the functional tests in Firefox and WebKit.

Keyboard use is tested separately: the cross-filter tests above filter with Tab, Enter and
Ctrl+Enter only, the builder tests undo with Ctrl+Z and move and resize a widget with the arrow
keys, and the builder's component tests check where the focus goes after each action.

## Storybook

`pnpm build-storybook` builds every story and docs page. The end-to-end run then serves the
static build and checks, in Chromium, failing on any uncaught page error:

- each of the six widgets' Default, Loading, Empty and Error stories shows that state (FR-6.4; 6
  checks), and the paged table story moves between pages;
- the theming playground applies its radius control, the cross-filtering page filters from a
  chart's data table, switching the toolbar's user from Asha to Ravi cuts the regions from seven to
  two, and the builder stories show editing to an editor but not to a viewer (FR-6.5; 4 checks);
- the Getting started, Theming, Security model and API reference pages render (FR-6.6; 4 checks).

In Phase 6, each of the 59 entries (46 stories and 13 docs pages) was also opened once in Chromium
against the Storybook dev server: none raised a page error or showed Storybook's error screen. That
check was a one-off script, not part of CI.

## What is not covered

- **Charts are not compared pixel by pixel.** Chart options are unit-tested, and the end-to-end
  tests check what the charts do (filtering, highlighting) rather than how they look. The one pixel
  comparison is the hostile-CSS test of the element. The map is clicked once, where its tooltip
  names India.
- **Performance is measured, not gated.** `pnpm perf` takes several minutes and depends on the
  machine, so it runs by hand; CI gates only the bundle sizes. Two targets are missed on a CPU
  slowed four times; see [PERFORMANCE.md](PERFORMANCE.md).
- **The deployed services are checked by script, not by these suites.** The unit and end-to-end
  tests run on local builds. On 22 November 2026, after the first deploy, the deployed-site checks
  (12) and the demo script (25 checks) passed against the services on Render, and Lighthouse
  scored the demo app; [PROGRESS.md](PROGRESS.md) and [PERFORMANCE.md](PERFORMANCE.md) have the
  results.

## Running the tests

```sh
pnpm install
pnpm exec playwright install chromium firefox webkit   # once, for the end-to-end tests
pnpm lint && pnpm typecheck && pnpm test                # or pnpm test:coverage, as CI runs it
pnpm test:e2e                                          # builds the SDK, starts the demo API and app
pnpm build && pnpm size && pnpm check:package
pnpm perf                                              # performance, about 90 s after its builds
```
