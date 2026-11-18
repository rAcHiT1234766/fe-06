# Test report

Every result on this page comes from runs on 18 November 2026 at commit `9637048`, the last change
to code, on the machine described in [PERFORMANCE.md](PERFORMANCE.md) (Windows 11, Intel Core
i5-1135G7, 16 GB). Each commit since Phase 7 was also checked from its own fresh clone;
[PROGRESS.md](PROGRESS.md) has those results. Performance numbers are on that page.

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

| Check                 | Command                | Result                                                                                                                   |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Lint                  | `pnpm lint`            | Pass, no warnings                                                                                                        |
| Types                 | `pnpm typecheck`       | Pass in every package                                                                                                    |
| Unit, component, type | `pnpm test:coverage`   | 37 files, 410 tests passed, no type errors; coverage above every gate                                                    |
| End to end            | `pnpm test:e2e`        | 78 passed, 54 skipped (the accessibility and Storybook checks run in Chromium only), in 3.9 minutes                      |
| Build                 | `pnpm build`           | Pass                                                                                                                     |
| Storybook             | `pnpm build-storybook` | Pass; the API reference generator found JSDoc on all 33 public exports and their members                                 |
| Bundle size           | `pnpm size`            | 217.6 kB gzipped as a host bundles the npm build (target 300); 284.6 kB for `dashkit.js` (target 500)                    |
| Installed package     | `pnpm check:package`   | Each build carries the libraries it should, and the packed SDK installs into four fresh projects and type-checks in each |

CI runs all of these on every push, the end-to-end tests in all three browsers.

## Unit, component and type tests

`pnpm test` runs four Vitest projects, and `pnpm test:coverage`, which CI runs, runs them while
measuring coverage:

```text
 Test Files  37 passed (37)
      Tests  410 passed (410)
 Type Errors  no errors
   Duration  61.11s (tests 54%, environment 25%, setup 9%, import 9%, typecheck 1%, worker 1%, transform 1%)
```

| Project                | Area                                                                                                                                                                                                            |   Tests |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------: |
| `sdk`                  | Core: query client 17, widget edits 14, filter store 13, layouts 12, theme 11, dashboard edits 10, number formats 9, config schema 7, undo history 5, render timing 5, query merging 4, no hard-coded colours 1 |     108 |
| `sdk`                  | Chart options 11, keyboard arrangement 7, ECharts theme 1                                                                                                                                                       |      19 |
| `sdk`                  | Components on React 19: builder 26, element 14, dashboard 13, cross-filtering 13, ECharts hook 9, responsive 7, `DashKit.mount()` 5, table paging 3                                                             |      90 |
| `sdk`                  | Type tests: the public API 9, core types 4                                                                                                                                                                      |      13 |
| `sdk on React 18`      | The same 90 component tests, against React 18.3.1                                                                                                                                                               |      90 |
| `@dashkit/mock-engine` | Permission matrix 38, query execution 28, API routes 20                                                                                                                                                         |      86 |
| `@dashkit/mock-api`    | The HTTP server: CORS for listed and other origins, preflight, and passing the token and body through                                                                                                           |       4 |
| **Total**              |                                                                                                                                                                                                                 | **410** |

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
- **Types.** `expectTypeOf` tests check that the public types accept correct use and reject wrong
  use, such as passing both `dashboardId` and `config`, or reading the wrong `detail` type from a
  `dashkit:*` event.

Some files print `AbortError`, `Network error` and `ENOTFOUND api.test` lines (9 in this run)
when a test ends with requests still in flight. They are noise from the test DOM shutting down;
no test fails because of them.

## Coverage

V8 records which statements, branches and functions run during the tests. The SDK's core and the
query engine are gated: a drop below the whole percentages first measured fails the run, and CI.
The interface code is measured but not gated, since its tests check what a user sees and does
rather than which lines ran.

| Area                                        | Statements | Branches | Functions |  Lines | Gate               |
| ------------------------------------------- | ---------: | -------: | --------: | -----: | ------------------ |
| SDK core, `packages/sdk/src/core`           |     97.98% |   95.08% |    97.86% | 99.44% | 97 / 93 / 97 / 99  |
| Query engine, `packages/mock-engine/src`    |     95.61% |   93.63% |      100% | 97.19% | 95 / 93 / 100 / 97 |
| Everything measured, the interface code too |     96.03% |   91.04% |    96.63% | 97.67% | none               |

## The installed package

`pnpm check:package` packs the SDK as npm would, installs the tarball into empty projects outside
the workspace, and type-checks a small host app with `skipLibCheck` off. Each project also has
lines marked `@ts-expect-error` that must fail, so the check proves wrong use is rejected too. It
also checks that the package holds exactly the six expected files and that no type contains `any`.

It then checks what each build carries (FR-1.4). The npm build must list `react` and `react-dom` as
peer dependencies and import React and ECharts rather than contain them. `dashkit.js` must be a
classic script that defines `window.DashKit` and contains both libraries. Of the SDK's dependencies,
only React's production code links to `react.dev/errors` and only ECharts names its internal state
`__ec_inner_`, so the check looks for those strings.

```text
React 18, strictest TypeScript settings: types check.
React 18, defaults TypeScript settings: types check.
React 19, strictest TypeScript settings: types check.
React 19, defaults TypeScript settings: types check.
The packed SDK (6 files) installs and type-checks.
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
| 13 accessibility checks (below)                                                                                   |   pass   | skipped | skipped |
| 14 Storybook checks, FR-6.4 to FR-6.6 (below)                                                                     |   pass   | skipped | skipped |

```text
  54 skipped
  78 passed (3.9m)
```

### Accessibility

axe checks each view against WCAG 2.0, 2.1 and 2.2 at levels A and AA, with animation off, and a
test fails on any violation rated serious or critical. Every check passed:

- the starter dashboard for each of the three brands, in light and in dark mode (6 checks);
- the demo's host product with its sidebar, in every brand and mode, and one of its own pages
  (2 checks);
- the dashboard with an active cross-filter;
- the "Session invalid" state after the token is tampered with;
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

- each of the five widgets' Default, Loading, Empty and Error stories shows that state (FR-6.4; 5
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
  comparison is the hostile-CSS test of the element.
- **Performance is measured, not gated.** `pnpm perf` takes several minutes and depends on the
  machine, so it runs by hand; CI gates only the bundle sizes. Two targets are missed on a CPU
  slowed four times; see [PERFORMANCE.md](PERFORMANCE.md).
- **Not yet tested on the deployed demo**, including Lighthouse, until it is deployed.

## Running the tests

```sh
pnpm install
pnpm exec playwright install chromium firefox webkit   # once, for the end-to-end tests
pnpm lint && pnpm typecheck && pnpm test                # or pnpm test:coverage, as CI runs it
pnpm test:e2e                                          # builds the SDK, starts the demo API and app
pnpm build && pnpm size && pnpm check:package
pnpm perf                                              # performance, about 90 s after its builds
```
