# Progress

## Phase 4 — Dashboard builder: complete (17 November 2026)

Phases 0 to 4 are committed. Phase 5 (embedding and responsive) has not started; it begins once
the Phase 4 report is approved.

### Check results

| Check                  | Result                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm lint`            | pass, zero warnings                                                                                        |
| `pnpm typecheck`       | pass in every package                                                                                      |
| `pnpm test`            | 20 files, 216 tests passed                                                                                 |
| `pnpm test:e2e`        | 4 tests passed in Chromium                                                                                 |
| `pnpm build`           | pass                                                                                                       |
| `pnpm build-storybook` | pass                                                                                                       |
| `pnpm size` (gzipped)  | npm `dist/index.js` 14.9 kB; as bundled by a host 213.0 kB (target 300); `dashkit.js` 66.2 kB (target 500) |

Each Phase 4 commit was checked from its own fresh clone: frozen-lockfile install, lint, typecheck,
test, build, build-storybook and `test:e2e` passed at every commit.

The guide's "done when" check is the builder end-to-end test. Signed in as Elena, an editor, it
empties the dashboard, saves it and sees it empty after a reload. It then adds a bar chart, a line
chart, a table and a KPI, drags the line chart beside the bar chart, resizes the table to full
width, changes the KPI's measure and title, the bar chart's grouping and direction and the table's
row limit, and saves. After a reload every widget shows the same title, data, position and size.
Signed in as Ravi, a viewer, it finds no Edit, Save, drag or resize controls, and a `PUT` with his
token gets 403 FORBIDDEN.

### Agreed in the Phase 3 review: done

- A test covers a host that keeps the filters in its own state and passes a new `onFilterChange`
  each render. It found that filter changes made while the provider was swapping callbacks were
  not reported; the provider now subscribes once and calls the latest callback.

### Known gaps

- Undo and redo (FR-5.10) and a keyboard way to move and resize widgets (FR-5.11) are stretch
  items and not implemented. Until then, moving and resizing need a pointer.
- On small screens the builder should fall back to view mode with a notice (FR-6.10); container
  breakpoints arrive in Phase 5. In narrow containers the settings panel moves below the grid.
- Storybook has builder, cross-filtering and theming pages. A signed-in-user toolbar switch for
  the permissions page (FR-6.5) and the written docs pages (FR-6.6) come with the Phase 6
  Storybook pass.
- The end-to-end tests run in Chromium only; Firefox and WebKit (NFR-C1) come with the Phase 6
  test pass.
- Unsaved changes are detected by identity, so an edit undone by hand still asks for
  confirmation on leaving.
- Multi-select (FR-4.10, a stretch item) is not implemented.
- In narrow containers (below about 1000 px) pie labels crowd; container breakpoints arrive in Phase 5.
- The demo app builds into one 892 kB chunk (291 kB gzipped) and Vite warns about its size. This
  is the demo only; the SDK's own sizes are in the table above.
- The zip export in the project root is not part of the project and must not be committed.
