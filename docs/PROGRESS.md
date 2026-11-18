# Progress

## Phase 6 — Quality and documentation: complete (18 November 2026)

Phases 0 to 6 are committed. Phase 7 (ship) has not started; it begins once the Phase 6 report is
approved.

### Check results

| Check                  | Result                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`            | pass, zero warnings                                                                                                            |
| `pnpm typecheck`       | pass in every package                                                                                                          |
| `pnpm test`            | 33 files, 345 tests passed: 189 in the SDK, the same 76 component tests again on React 18, 76 in the mock engine, 4 in the API |
| `pnpm test:e2e`        | 38 passed in Chromium, Firefox and WebKit, including 11 axe checks in Chromium; 22 skipped (axe outside Chromium)              |
| `pnpm build`           | pass                                                                                                                           |
| `pnpm build-storybook` | pass; JSDoc found on all 33 public exports and their members                                                                   |
| `pnpm size` (gzipped)  | npm `dist/index.js` 16.7 kB; as bundled by a host 214.6 kB (target 300); `dashkit.js` 281.7 kB (target 500)                    |
| `pnpm check:package`   | the packed SDK installs and type-checks in four fresh projects: React 18 and 19, strictest and default TypeScript settings     |

[TEST_REPORT.md](TEST_REPORT.md) has the full output and [PERFORMANCE.md](PERFORMANCE.md) the
measurements.

The guide's "done when" check, that a stranger can run the demo from the README alone, was done on
a fresh clone of `8a34cb0`, following only the README:

- `pnpm install` and `pnpm dev`: the dashboard showed 52 s after `git clone` started, with pnpm's
  package store already warm; a machine without it downloads every package first. Signed in as
  Ravi, the table showed only South Asia and East Asia & Pacific. The plain HTML page showed all
  five widgets in the element's shadow root, with no page errors.
- `pnpm storybook`: all 59 entries listed, the dashboard story rendered, and so did the generated
  API reference.

The first attempt, on `465ee60`, found a bug: under `pnpm dev` the plain HTML page failed with a
500, because the SDK's watcher emptied `dist/` and rebuilt only the npm build. `8a34cb0` fixes it;
see DECISIONS.md. The end-to-end tests start the demo without that watcher, which is why they
passed.

Each Phase 6 commit was checked from its own fresh clone with a frozen-lockfile install, lint,
typecheck, test, build, build-storybook and `test:e2e`. Lint, typecheck, build, build-storybook
and `test:e2e` passed at every commit. `pnpm test` passed at `8940aa2`, `315bae3` and from
`6f2f035` on, and failed at the eight other commits from `d799336` to `c8a69ea`, in builder tests
only:

- Most failures were tests running past Vitest's 5-second limit. Adding the React 18 run doubled
  the component tests running at once; `6f2f035` raised the limit to 15 seconds.
- At `854dfaf` and `c8a69ea` the save test also found the focus on the page body instead of on
  Edit dashboard. The builder moved the focus in a passive effect, which runs a moment after the
  page updates, and on a busy machine the test looked in between. Users met the same gap.
  `b96a270` moves the focus in a layout effect, in the same update; see DECISIONS.md.

`ba35b11`, `465ee60`, `8a34cb0` and `b96a270` passed every check, with all 345 tests each time.

### Known gaps

- Column-level scope (FR-3.11, a stretch item) is not implemented. A token's `scopes.measures` is
  accepted but the API does not enforce it; its JSDoc and the security docs say so.
- Multi-select (FR-4.10), undo and redo (FR-5.10) and a keyboard way to move and resize widgets
  (FR-5.11) are stretch items and not implemented. Until then, moving and resizing need a pointer.
- Two performance targets are missed on a CPU slowed four times, though met at full speed:
  applying a cross-filter takes a median 534 ms and clearing it 464 ms, against 300 ms (NFR-P4),
  and while resizing 9 of 219 frames took over 50 ms, the worst 267 ms (NFR-P5). PERFORMANCE.md
  says why.
- Lighthouse has not been run; it needs the deployed demo (Phase 7). The README's live links wait
  for the same, and the plain HTML page names the API at `http://localhost:4000`.
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
