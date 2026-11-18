# Progress

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
