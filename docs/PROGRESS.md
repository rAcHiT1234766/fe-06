# Progress

## Phase 3 — Cross-filtering: complete (17 November 2026)

Phases 0 to 3 are committed. Phase 4 (dashboard builder) has not started; it begins once the
Phase 3 report is approved.

### Check results

| Check                  | Result                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm lint`            | pass, zero warnings                                                                                       |
| `pnpm typecheck`       | pass in every package                                                                                     |
| `pnpm test`            | 16 files, 170 tests passed                                                                                |
| `pnpm test:e2e`        | 2 tests passed in Chromium                                                                                |
| `pnpm build`           | pass                                                                                                      |
| `pnpm build-storybook` | pass                                                                                                      |
| `pnpm size` (gzipped)  | npm `dist/index.js` 8.6 kB; as bundled by a host 187.7 kB (target 300); `dashkit.js` 66.2 kB (target 500) |

Each Phase 3 commit was checked from its own fresh clone: frozen-lockfile install, lint, typecheck,
test, build and build-storybook passed at every commit, and `test:e2e` passed at every commit that
has it.

The guide's "done when" checks: the end-to-end test clicks the top bar of "Population by region",
sees the pie, line and countries table change to that region, clicks again and sees them restored;
the FR-4.11 component test shows that a filter on a region outside Ravi's scope returns zero rows in
every widget.

### Agreed in the Phase 3 review

- Component tests keep running in happy-dom instead of jsdom.
- Hosts set filters with the `filters` prop on `DashKitProvider`. Still to add, early in Phase 4: a
  test for a host that keeps the filters in its own state and passes them back from
  `onFilterChange`.

### Known gaps

- The end-to-end tests run in Chromium only; Firefox and WebKit (NFR-C1) come with the Phase 6
  test pass.
- Multi-select (FR-4.10, a stretch item) is not implemented.
- In narrow containers (below about 1000 px) pie labels crowd; container breakpoints arrive in Phase 5.
- The demo app builds into one 798 kB chunk (265 kB gzipped) and Vite warns about its size. This is
  the demo only; the SDK's own sizes are in the table above.
- The zip export in the project root is not part of the project and must not be committed.
