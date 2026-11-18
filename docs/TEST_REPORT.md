# Test report

Every result on this page comes from runs on 18 November 2026, on the code at commit `ba35b11`,
on the machine described in [PERFORMANCE.md](PERFORMANCE.md) (Windows 11, Intel Core i5-1135G7,
16 GB). Performance numbers are on that page.

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

| Check                 | Command                | Result                                                                                                |
| --------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Lint                  | `pnpm lint`            | Pass, no warnings                                                                                     |
| Types                 | `pnpm typecheck`       | Pass in every package                                                                                 |
| Unit, component, type | `pnpm test`            | 33 files, 345 tests passed, no type errors                                                            |
| End to end            | `pnpm test:e2e`        | 38 passed, 22 skipped (the accessibility checks run in Chromium only), in 1.9 minutes                 |
| Build                 | `pnpm build`           | Pass                                                                                                  |
| Storybook             | `pnpm build-storybook` | Pass; the API reference generator found JSDoc on all 33 public exports and their members              |
| Bundle size           | `pnpm size`            | 214.6 kB gzipped as a host bundles the npm build (target 300); 281.7 kB for `dashkit.js` (target 500) |
| Installed package     | `pnpm check:package`   | The packed SDK installs into four fresh projects and type-checks in each                              |

CI runs all of these on every push, the end-to-end tests in all three browsers.

## Unit, component and type tests

`pnpm test` runs four Vitest projects:

```text
 Test Files  33 passed (33)
      Tests  345 passed (345)
 Type Errors  no errors
   Duration  40.28s (tests 53%, environment 26%, import 10%, setup 9%, typecheck 1%, transform 1%)
```

| Project                | Area                                                                                                                                                                                          |   Tests |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------: |
| `sdk`                  | Core: query client 17, filter store 10, layouts 10, theme 10, widget edits 9, number formats 9, dashboard edits 7, config schema 6, render timing 5, query merging 4, no hard-coded colours 1 |      88 |
| `sdk`                  | Chart options 11, ECharts theme 1                                                                                                                                                             |      12 |
| `sdk`                  | Components on React 19: builder 19, dashboard 13, element 13, cross-filtering 12, ECharts hook 8, responsive 6, `DashKit.mount()` 5                                                           |      76 |
| `sdk`                  | Type tests: the public API 9, core types 4                                                                                                                                                    |      13 |
| `sdk on React 18`      | The same 76 component tests, against React 18.3.1                                                                                                                                             |      76 |
| `@dashkit/mock-engine` | Permission matrix 32, query execution 28, API routes 16                                                                                                                                       |      76 |
| `@dashkit/mock-api`    | The HTTP server: CORS for listed and other origins, preflight, and passing the token and body through                                                                                         |       4 |
| **Total**              |                                                                                                                                                                                               | **345** |

What they cover, against the plan in the implementation guide:

- **Query engine and security.** `executeQuery` and the query parser, with every operator,
  aggregation, missing values, sorting and limits. The permission matrix signs in as each demo
  user and runs fixed queries: no row outside the token's regions comes back, totals come from
  in-scope rows only, and a filter naming forbidden regions returns no rows rather than an error.
  The API route tests refuse a missing token, a token with one character changed, one whose claims
  were rewritten, one signed with another key and one past its 15 minutes; they check that a
  `tenantId` in the request is ignored, that tenants' dashboards stay apart, that viewers get 403
  on save, and that every error has the same shape.
- **Core logic without React.** `mergeQuery`, the filter store, `createTheme` and the contrast
  check, `deriveLayout`, config migration and validation, every builder edit, and the query
  client's caching, request sharing, token renewal after a 401 and error mapping.
- **Every chart option builder**, as pure functions, since the test DOM has no canvas.
- **Components** through the real query engine over MSW: each widget's loading, empty, error and
  populated states, the filter bar and its chips, cross-filtering between widgets, the config
  panel, role-based controls, saving and cancelling, unsaved-change warnings, container
  breakpoints, and the custom element's attributes, properties, events and lifecycle.
- **Types.** `expectTypeOf` tests check that the public types accept correct use and reject wrong
  use, such as passing both `dashboardId` and `config`, or reading the wrong `detail` type from a
  `dashkit:*` event.

Some files print `AbortError`, `Network error` and `ENOTFOUND api.test` lines (15 in this run)
when a test ends with requests still in flight. They are noise from the test DOM shutting down;
no test fails because of them.

## The installed package

`pnpm check:package` packs the SDK as npm would, installs the tarball into empty projects outside
the workspace, and type-checks a small host app with `skipLibCheck` off. Each project also has
lines marked `@ts-expect-error` that must fail, so the check proves wrong use is rejected too. It
also checks that the package holds exactly the six expected files and that no type contains `any`.

```text
React 18, strictest TypeScript settings: types check.
React 18, defaults TypeScript settings: types check.
React 19, strictest TypeScript settings: types check.
React 19, defaults TypeScript settings: types check.
The packed SDK (6 files) installs and type-checks.
```

## End-to-end tests

Playwright runs the demo app against the demo API, one test at a time, in each browser.

| Test                                                                                                | Chromium | Firefox | WebKit  |
| --------------------------------------------------------------------------------------------------- | :------: | :-----: | :-----: |
| FR-4.1 FR-4.2 a bar click filters the pie, line and table, and a second click restores them         |   pass   |  pass   |  pass   |
| NFR-A1 keyboard users filter through a chart's data table, which shows while it has focus           |   pass   |  pass   |  pass   |
| FR-5.1 to FR-5.7 an editor builds a dashboard from empty, saves it, and a reload shows it unchanged |   pass   |  pass   |  pass   |
| FR-5.1 a viewer sees no edit controls, and the API refuses their save                               |   pass   |  pass   |  pass   |
| FR-1.2 FR-1.5 one script tag shows the dashboard, and hostile host CSS changes nothing              |   pass   |  pass   |  pass   |
| FR-1.7 the page hears about filter changes inside the element                                       |   pass   |  pass   |  pass   |
| FR-1.6 FR-1.8 `DashKit.mount()` adds a second dashboard that keeps its own filters                  |   pass   |  pass   |  pass   |
| FR-6.8 FR-6.9 the dashboard is usable on a 360 px phone                                             |   pass   |  pass   |  pass   |
| FR-6.10 an editor on a phone sees the dashboard and a notice instead of the builder                 |   pass   |  pass   |  pass   |
| 11 accessibility checks (below)                                                                     |   pass   | skipped | skipped |

```text
  22 skipped
  38 passed (1.9m)
```

### Accessibility

axe checks each view against WCAG 2.0, 2.1 and 2.2 at levels A and AA, with animation off, and a
test fails on any violation rated serious or critical. Every check passed:

- the starter dashboard for each of the three brands, in light and in dark mode (6 checks);
- the dashboard with an active cross-filter;
- the "Session invalid" state after the token is tampered with;
- the builder with a widget's settings panel open;
- the plain HTML page, checked inside the element's shadow root;
- the phone layout at 360 × 780.

The checks run in Chromium only: axe's rules do not depend on the browser engine, and the same
views pass the functional tests in Firefox and WebKit.

Keyboard use is tested separately: the cross-filter test above filters with Tab and Enter only,
and the builder's tests check where the focus goes after each action.

## Storybook

`pnpm build-storybook` builds every story and docs page. Separately, each of the 59 entries (46
stories and 13 docs pages) was opened in Chromium against the Storybook dev server: none raised a
page error or showed Storybook's error screen. The only failed requests were the ones the Error and
"Session invalid" stories make on purpose. This check was a one-off script, not part of CI.

## What is not covered

- **Line coverage is not measured.** The guide asks for high coverage in `core` and `mock-engine`;
  measuring it needs a coverage provider such as `@vitest/coverage-v8`, which the project does not
  have yet.
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
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e                                          # builds the SDK, starts the demo API and app
pnpm build && pnpm size && pnpm check:package
pnpm perf                                              # performance, about 90 s after its builds
```
