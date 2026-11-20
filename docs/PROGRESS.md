# Progress

## After Phase 7 — Beyond the requirements (18 to 21 November 2026)

Five features the requirements do not ask for were added at the author's request: CSV export,
drill-down from a region to its countries, filter lists above the grid, several dashboards with a
picker, and a map widget. [DECISIONS.md](DECISIONS.md) and [LEARNING_LOG.md](LEARNING_LOG.md)
record each under "After Phase 7 — Beyond the requirements". What remains still needs the author's
accounts or the author in person: pushing to GitHub, deploying to Render, recording the backup
video, presenting and answering the reflection.

### Commits

| Commit    | Change                                                                    |
| --------- | ------------------------------------------------------------------------- |
| `d669eb9` | A widget's data downloads as a CSV file, when the host allows it          |
| `0b60937` | A click on a region drills down to its countries                          |
| `217c644` | Filter lists above the grid filter every widget                           |
| `2c4e9ce` | A picker switches, creates and deletes dashboards                         |
| `570ce15` | A map widget shows a measure by country                                   |
| `44c80cb` | The performance test starts each drag at the same height in the window    |
| `c278550` | axe checks the Population explorer, drilled down, and the picker          |
| `cbb62eb` | The drag test's comment on why the page scrolls; it named the wrong cause |
| `f9edd8c` | That comment corrected: Chrome's autoscroll moves the page, not the grid  |

### Check results

| Check                  | Result                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`         | pass from a fresh clone, frozen lockfile                                                                                                                                                                              |
| `pnpm lint`            | pass, zero warnings                                                                                                                                                                                                   |
| `pnpm typecheck`       | pass in every package                                                                                                                                                                                                 |
| `pnpm test:coverage`   | 53 files, 512 tests passed: 297 in the SDK, the same 116 component tests again on React 18, 95 in the mock engine, 4 in the API. Lines covered: 99.6% of the SDK core and 97.8% of the query engine, above both gates |
| `pnpm test:e2e`        | 102 passed: 24 user flows in Chromium, Firefox and WebKit, and 15 axe checks and 15 Storybook checks in Chromium; 60 skipped (the same 30 outside Chromium)                                                           |
| `pnpm build`           | pass                                                                                                                                                                                                                  |
| `pnpm build-storybook` | pass; JSDoc found on all 39 public exports and their members                                                                                                                                                          |
| `pnpm size` (gzipped)  | npm `dist/index.js` 25.4 kB; as bundled by a host 245.8 kB (target 300); `dashkit.js` 313.4 kB (target 500)                                                                                                           |
| `pnpm check:package`   | each build carries the libraries it should; the packed SDK installs and type-checks on React 18 and 19, strictest and default settings                                                                                |
| `pnpm perf`            | no slowdown from the five features: from fresh clones of `9637048` and `c278550`, mount medians of 149 and 165 ms and cross-filter medians of 251 and 256 ms; [PERFORMANCE.md](PERFORMANCE.md) has the table          |

These ran on a fresh clone of `c278550`, the last change to code apart from the drag test's
comment. [TEST_REPORT.md](TEST_REPORT.md) has the output.

### Each commit

Before each of `d669eb9` to `570ce15` was committed, the working repository passed Prettier, lint,
typecheck, the unit tests with coverage, build, size, build-storybook, `check:package` and the full
`test:e2e`, with the ports checked free first. `570ce15` and `c278550` were checked from fresh
clones: a frozen-lockfile install, lint, typecheck, the unit tests with coverage, build,
build-storybook, size, `check:package`, `test:e2e` and `perf`, and every check passed. The last row
below is from that clone.

| Commit    | Unit tests                   | End to end, passed |
| --------- | ---------------------------- | ------------------ |
| `d669eb9` | 429, under the coverage gate | 84                 |
| `0b60937` | 451, under the coverage gate | 87                 |
| `217c644` | 471, under the coverage gate | 90                 |
| `2c4e9ce` | 496, under the coverage gate | 93                 |
| `570ce15` | 512, under the coverage gate | 100                |
| `c278550` | 512, under the coverage gate | 102                |

`44c80cb`, `cbb62eb` and `f9edd8c` change only the performance test, which `pnpm perf` ran at
`c278550`.

The first performance run at `570ce15` reported resizing much slower than before. It was the test:
the filter lists and the picker put the grid 96 pixels lower, so the resize drag reached the
bottom of the window, where Chrome scrolls the page while the button is held. The test now starts
each drag at the same height; [PERFORMANCE.md](PERFORMANCE.md) has the measurements.

The demo script was run again at `cbb62eb`: all eleven steps against production builds of the API,
the demo and Storybook, served as the Blueprint deploys them, passed 25 of 25 checks with no page
errors.

### Known gaps

These replace the list in the section below.

- Two performance targets are missed on a CPU slowed four times, though met at full speed: a
  cross-filter (NFR-P4; median 549 ms in the last run) and smooth resizing (NFR-P5; 9 of 197
  frames over 50 ms). Mounting on a slowed CPU met its 1.5 s in the last run (median 1226 ms) but
  missed it on 18 November, so it is close to the line.
- In Chrome, holding a resize corner near the bottom of the window scrolls the page, and the widget
  grows with the scroll, far past the pointer. It was the same before these features.
- Nothing has been tested on the deployed services yet, Lighthouse included, and Render's build
  image has not been tried.
- A free Render API sleeps after about 15 minutes idle and keeps dashboards in memory, so a saved
  dashboard, or one created with the picker, lasts until the service restarts.
- The map's chart code is in every build, whether or not a host shows a map;
  [DECISIONS.md](DECISIONS.md) has the sizes.
- The end-to-end map test clicks India at a fixed point of the 1280-pixel window, so a change to
  the map's layout would move it.
- Screen readers in browse mode keep the arrow keys for reading, so a screen reader user switches
  to focus mode to move a widget from its handle.
- An edit reversed by hand, rather than with Undo, still counts as unsaved, since changes are
  detected by identity.
- Some unit test files print `AbortError`, `Network error` and `ENOTFOUND api.test` lines when a
  test ends with requests still in flight (15 in the last run). Nothing fails.
- The demo app builds into one 1,000.6 kB chunk (326.9 kB gzipped) and Vite warns about its size;
  it also loads the 164 kB map borders. This is the demo only; the SDK's own sizes are in the table
  above.
- The zip export in the project root is not part of the project and must not be committed.

## After Phase 7 — Finishing the public options (18 November 2026)

After Phase 7 the options that the public types offered but the SDK did not yet apply were
finished, test coverage was measured and gated, the demo became a host product with the dashboard
inside it, and all four stretch items were built. [DECISIONS.md](DECISIONS.md) and
[LEARNING_LOG.md](LEARNING_LOG.md) record each under "After Phase 7". What remains still needs the
author's accounts or the author in person: pushing to GitHub, deploying to Render, recording the
backup video, presenting and answering the reflection.

### Commits

| Commit    | Change                                                               |
| --------- | -------------------------------------------------------------------- |
| `03e8927` | Test coverage measured with `@vitest/coverage-v8`                    |
| `9e316a8` | At tablet width, widgets that share a row stay side by side          |
| `76f98c0` | A layout item's own `minW` and `minH` apply                          |
| `e74291d` | Tables split into pages with `options.pageSize`                      |
| `48a82b2` | The builder's save status in the theme's success and warning colours |
| `2a58fcf` | CI fails on a drop in coverage of the SDK core and the query engine  |
| `011b777` | The demo plays a host product around the dashboard                   |
| `4e94399` | The decisions and sizes since Phase 7 recorded (documentation only)  |
| `2710a7b` | Column-level scope enforced (FR-3.11, stretch)                       |
| `b777000` | Undo and redo in the builder (FR-5.10, stretch)                      |
| `d2df657` | Moving and resizing widgets from the keyboard (FR-5.11, stretch)     |
| `9637048` | Several values selected with Ctrl- or Cmd-click (FR-4.10, stretch)   |

### Check results

| Check                  | Result                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`         | pass from a fresh clone, frozen lockfile                                                                                                                                                                             |
| `pnpm lint`            | pass, zero warnings                                                                                                                                                                                                  |
| `pnpm typecheck`       | pass in every package                                                                                                                                                                                                |
| `pnpm test:coverage`   | 37 files, 410 tests passed: 230 in the SDK, the same 90 component tests again on React 18, 86 in the mock engine, 4 in the API. Lines covered: 99.4% of the SDK core and 97.2% of the query engine, above both gates |
| `pnpm test:e2e`        | 78 passed: 17 user flows in Chromium, Firefox and WebKit, and 13 axe checks and 14 Storybook checks in Chromium; 54 skipped (the same 27 outside Chromium)                                                           |
| `pnpm build`           | pass                                                                                                                                                                                                                 |
| `pnpm build-storybook` | pass; JSDoc found on all 33 public exports and their members                                                                                                                                                         |
| `pnpm size` (gzipped)  | npm `dist/index.js` 20.1 kB; as bundled by a host 217.6 kB (target 300); `dashkit.js` 284.6 kB (target 500)                                                                                                          |
| `pnpm check:package`   | each build carries the libraries it should; the packed SDK installs and type-checks on React 18 and 19, strictest and default settings                                                                               |
| `pnpm perf`            | no slowdown since Phase 7: from fresh clones of `a0f0817` and `9637048`, mount medians of 243 and 207 ms and cross-filter medians of 259 and 266 ms; [PERFORMANCE.md](PERFORMANCE.md) has the table                  |

These ran at `9637048`, the last change to code. [TEST_REPORT.md](TEST_REPORT.md) has the output.

### Each commit

Each commit from `03e8927` to `9637048` was checked from its own fresh clone with a
frozen-lockfile install, lint, typecheck, the unit tests, build, build-storybook and `test:e2e`.
`4e94399`, which changes only documentation, was checked with its install and Prettier. Every
commit passed every check.

| Commits                | Unit tests                   | End to end, passed     |
| ---------------------- | ---------------------------- | ---------------------- |
| `03e8927` to `2a58fcf` | 347, 351, 359, 371, 372, 372 | 51, 51, 51, 52, 52, 52 |
| `011b777`              | 372, under the coverage gate | 66                     |
| `2710a7b`              | 382, under the coverage gate | 69                     |
| `b777000`              | 394, under the coverage gate | 72                     |
| `d2df657`              | 403, under the coverage gate | 75                     |
| `9637048`              | 410, under the coverage gate | 78                     |

The end-to-end run for `2a58fcf` reused a development server already running on the machine, so
it did not test that commit's own build. That commit changes only the coverage settings and CI,
and its application code is the same as `48a82b2`'s, which passed on servers of its own. Every
run from `011b777` on started its own servers, with the ports checked free first.

The demo script was run again at `9637048`, since the demo now plays a host product: all eleven
steps against production builds of the API, the demo and Storybook, served as the Blueprint
deploys them, passed 25 of 25 checks with no page errors.

The definition of done in the Phase 7 section below still holds, with larger counts: the
permission suite now has 38 tests, and 14 end-to-end checks run against the Storybook build. The
steps after deployment listed there still apply.

### Known gaps

These replace the list in the Phase 7 section.

- Two performance targets are missed on a CPU slowed four times, though met at full speed: a
  cross-filter (NFR-P4) and smooth resizing (NFR-P5). In the re-run, on a slower day, mounting on
  a slowed CPU missed its 1.5 s too, at `a0f0817` as at `9637048` (2001 and 2150 ms). Runs inside
  the working repository came out slower and erratic; PERFORMANCE.md says how to measure.
- Nothing has been tested on the deployed services yet, Lighthouse included, and Render's build
  image has not been tried.
- A free Render API sleeps after about 15 minutes idle and keeps dashboards in memory, so a saved
  dashboard lasts until the service restarts.
- Screen readers in browse mode keep the arrow keys for reading, so a screen reader user switches
  to focus mode to move a widget from its handle.
- An edit reversed by hand, rather than with Undo, still counts as unsaved, since changes are
  detected by identity.
- Some unit test files print `AbortError`, `Network error` and `ENOTFOUND api.test` lines when a
  test ends with requests still in flight (9 in the last run). Nothing fails.
- The demo app builds into one 910 kB chunk (297 kB gzipped) and Vite warns about its size. This
  is the demo only; the SDK's own sizes are in the table above.
- The zip export in the project root is not part of the project and must not be committed.

## Phase 7 — Ship: ready to deploy (18 November 2026)

Phases 0 to 7 are committed. What remains needs the author's accounts or the author in person:
pushing to GitHub, deploying to Render, recording the backup video, presenting and answering the
reflection. [DEPLOYMENT.md](DEPLOYMENT.md), [DEMO_SCRIPT.md](DEMO_SCRIPT.md),
[PRESENTATION.md](PRESENTATION.md) and [REFLECTION.md](REFLECTION.md) are ready for those steps.

### Check results

| Check                  | Result                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`         | pass from a fresh clone, frozen lockfile                                                                                                                  |
| `pnpm lint`            | pass, zero warnings                                                                                                                                       |
| `pnpm typecheck`       | pass in every package                                                                                                                                     |
| `pnpm test`            | 33 files, 347 tests passed: 190 in the SDK, the same 77 component tests again on React 18, 76 in the mock engine, 4 in the API                            |
| `pnpm test:e2e`        | 51 passed: 9 user flows in Chromium, Firefox and WebKit, and 11 axe checks and 13 Storybook checks in Chromium; 48 skipped (the same 24 outside Chromium) |
| `pnpm build`           | pass                                                                                                                                                      |
| `pnpm build-storybook` | pass; JSDoc found on all 33 public exports and their members                                                                                              |
| `pnpm size` (gzipped)  | npm `dist/index.js` 16.7 kB; as bundled by a host 214.6 kB (target 300); `dashkit.js` 281.7 kB (target 500)                                               |
| `pnpm check:package`   | each build carries the libraries it should; the packed SDK installs and type-checks on React 18 and 19, strictest and default settings                    |

All but the end-to-end tests ran on a fresh clone of `fdc8e2d`; the end-to-end tests ran on a fresh
clone of `6988833`, which adds only documentation. [TEST_REPORT.md](TEST_REPORT.md) has the
output.

The deployment was rehearsed before any account existed. From a fresh clone, each service's build
and start command in `render.yaml` ran as written, apart from the global pnpm install, and the
results were served on separate origins, with the demo built to call the API at its own address.
Twelve checks of the services passed: the health check, CORS for the demo's origin and refusal for
others, the dashboard, the demo calling the configured API and no other, the plain HTML page,
row-level security for Ravi, a viewer's refused save, Storybook's entries, a story and the API
reference, and no page errors. Then every step of the demo script ran against those builds, the step 8 snippet
included: 25 of 25 checks, with no page errors. Render's own build image could not be tried
without an account.

### Definition of done

| Item                                                                                        | Status                                 | Evidence                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every `M` requirement in section 6 is implemented and has at least one automated test       | Done                                   | All 46 are named by a test or check. FR-5.2 is covered by the builder test named "FR-5.1 to FR-5.7", which drags a widget. FR-6.2 is enforced by `scripts/api-reference.ts`, which fails `build-storybook` when a public export or member has no JSDoc. FR-1.3, FR-1.4 and FR-6.4 to FR-6.6 had no test until `1a46377` and `da796fc`. |
| The demo script runs start to finish without errors                                         | Done locally; to repeat once deployed  | All eleven steps against production builds served as the Blueprint deploys them: 25 of 25 checks, no page errors.                                                                                                                                                                                                                      |
| `install`, `build`, `lint`, `typecheck` and `test` pass from a fresh clone                  | Done                                   | A fresh clone of `fdc8e2d`: every check passed, with 347 tests. Each Phase 7 commit was also checked from its own clone, below.                                                                                                                                                                                                        |
| The package installs from a tarball into a separate project and its types resolve           | Done                                   | `pnpm check:package`: four fresh projects, React 18 and 19, strictest and default TypeScript settings, `skipLibCheck` off.                                                                                                                                                                                                             |
| The script-tag build works in a plain HTML file                                             | Done                                   | `e2e/plain-html.spec.ts` in Chromium, Firefox and WebKit: the dashboard from one script tag, untouched by hostile CSS, its events, and a second dashboard from `DashKit.mount()`. An axe check covers the page in Chromium.                                                                                                            |
| The permission test suite proves no out-of-scope row is returned for any demo user          | Done                                   | `packages/mock-engine/src/permission-matrix.test.ts`: 32 tests over every demo user.                                                                                                                                                                                                                                                   |
| Storybook builds and is deployed                                                            | Builds; not deployed                   | `pnpm build-storybook` passes, and 13 end-to-end checks run against the static build. Deploying needs the author's Render account: `dashkit-storybook` in `render.yaml`.                                                                                                                                                               |
| The demo app and API are deployed, and a backup recording exists                            | Not done                               | Needs the author's GitHub and Render accounts and a screen recording. `render.yaml`, `DEPLOYMENT.md` and `DEMO_SCRIPT.md` are ready.                                                                                                                                                                                                   |
| `README.md`, `ARCHITECTURE.md`, `API.md`, `TEST_REPORT.md`, `PERFORMANCE.md` match the code | Done; live links wait for deployment   | All five exist. `TEST_REPORT.md` reports the runs above; the API reference is generated from the types on every Storybook build. The README's live links say "not deployed yet".                                                                                                                                                       |
| Presentation and reflection are written                                                     | Presentation done; reflection to write | `PRESENTATION.md` has ten slides with speaker notes. `REFLECTION.md` holds the four prompts; the answers are the author's.                                                                                                                                                                                                             |

### Each Phase 7 commit

Each commit from `ab8f936` to `6988833` was checked from its own fresh clone with a
frozen-lockfile install, lint, typecheck, test, build, build-storybook and `test:e2e`. All eight
passed every check. `pnpm test` ran 345 tests up to `9bbf1c7` and 347 from `1a46377`, which adds
the FR-1.3 test on both React versions; the end-to-end run grew from 38 to 51 passed at `da796fc`,
which adds the Storybook checks. The commits after `6988833` change only documentation, and each
passed Prettier's check.

### After deployment

1. Put the three addresses in the README's live links and in the demo script's table of addresses.
2. Run the demo script on the deployed demo, and Lighthouse on the demo app.
3. Record the backup video from the demo script.
4. Look at the Mermaid diagrams in `ARCHITECTURE.md` on GitHub; they have not been seen rendered.

### Known gaps

- Column-level scope (FR-3.11, a stretch item) is not implemented. A token's `scopes.measures` is
  accepted but the API does not enforce it; its JSDoc and the security docs say so.
- Multi-select (FR-4.10), undo and redo (FR-5.10) and a keyboard way to move and resize widgets
  (FR-5.11) are stretch items and not implemented. Until then, moving and resizing need a pointer.
- Two performance targets are missed on a CPU slowed four times, though met at full speed:
  applying a cross-filter takes a median 534 ms and clearing it 464 ms, against 300 ms (NFR-P4),
  and while resizing 9 of 219 frames took over 50 ms, the worst 267 ms (NFR-P5). PERFORMANCE.md
  says why.
- Nothing has been tested on the deployed services yet, Lighthouse included, and Render's build
  image has not been tried.
- A free Render API sleeps after about 15 minutes idle and keeps dashboards in memory, so a saved
  dashboard lasts until the service restarts.
- Line coverage is not measured. It needs a coverage provider such as `@vitest/coverage-v8`, a
  dependency the guide does not name.
- `pageSize`, a layout item's `minW` and `minH`, and the `success` and `warning` colours are in the
  public types but not applied yet; their JSDoc says so.
- At `sm` (600 to 899 px) the demo's widgets each take a whole row, because their shares of the
  row round below the two-column minimum.
- Unsaved changes are detected by identity, so an edit undone by hand still asks for
  confirmation on leaving.
- Some unit test files print `AbortError`, `Network error` and `ENOTFOUND api.test` lines when a
  test ends with requests still in flight. Nothing fails.
- The demo app builds into one 895 kB chunk (292 kB gzipped) and Vite warns about its size. This
  is the demo only; the SDK's own sizes are in the table above.
- The zip export in the project root is not part of the project and must not be committed.
