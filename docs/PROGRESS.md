# Progress

## Phase 2 — Widgets and theming: complete (17 November 2026)

Phases 0, 1 and 2 are committed. Phase 3 (cross-filtering) has not started; it begins once the
Phase 2 report is approved.

### Check results

| Check                  | Result                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm lint`            | pass, zero warnings                                                                                       |
| `pnpm typecheck`       | pass in every package                                                                                     |
| `pnpm test`            | 13 files, 142 tests passed                                                                                |
| `pnpm build`           | pass                                                                                                      |
| `pnpm build-storybook` | pass                                                                                                      |
| `pnpm size` (gzipped)  | npm `dist/index.js` 6.8 kB; as bundled by a host 186.2 kB (target 300); `dashkit.js` 66.2 kB (target 500) |

Each Phase 2 commit was checked from its own fresh clone: frozen-lockfile install, lint, typecheck,
test, build and build-storybook all passed at every commit.

### Waiting for a decision

- Component tests run in happy-dom instead of jsdom (see `DECISIONS.md`). happy-dom is not named in
  the guide, so it needs confirming.

### Known gaps

- In narrow containers (below about 1000 px) pie labels crowd; container breakpoints arrive in Phase 5.
- The demo app builds into one 793 kB chunk (263 kB gzipped) and Vite warns about its size. This is
  the demo only; the SDK's own sizes are in the table above.
- The zip export in the project root is not part of the project and must not be committed.
