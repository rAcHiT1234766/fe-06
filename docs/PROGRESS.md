# Progress

## Phase 5 — Embedding and responsive: complete (18 November 2026)

Phases 0 to 5 are committed. Phase 6 (quality and documentation) has not started; it begins once
the Phase 5 report is approved.

### Check results

| Check                  | Result                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`            | pass, zero warnings                                                                                                                                      |
| `pnpm typecheck`       | pass in every package                                                                                                                                    |
| `pnpm test`            | 24 files, 253 tests passed                                                                                                                               |
| `pnpm test:e2e`        | 9 tests passed in Chromium                                                                                                                               |
| `pnpm build`           | pass                                                                                                                                                     |
| `pnpm build-storybook` | pass                                                                                                                                                     |
| `pnpm size` (gzipped)  | npm `dist/index.js` 16.0 kB; as bundled by a host 214.0 kB (target 300); `dashkit.js` 281.1 kB (target 500)                                              |
| Installability         | `pnpm pack` tarball installed into an empty project outside the workspace; strict typecheck with `skipLibCheck` off passed, and wrong usage was rejected |

Each Phase 5 commit was checked from its own fresh clone with a frozen-lockfile install, lint,
typecheck, test, build, build-storybook and `test:e2e`. Everything passed except `pnpm test` at
`24f5ac5` and `a936e8b`: the demo's Vite config read the SDK's built script as it loaded, and in a
fresh clone the tests run before anything is built. `f5b9bc9` reads it only when it is served, and
from there every check passes again.

The guide's "done when" checks are end-to-end tests:

- `apps/demo/plain-html/index.html` holds only the script tag, the element and a few lines of
  JavaScript. The test screenshots the dashboard, adds hostile host styles (Comic Sans on every
  element, red buttons, lime table borders, uppercase text, extra margins, hidden SVG), and the
  next screenshot has the same size and no differing pixels beyond anti-aliasing noise. The host
  page's own heading does change. With the same comparison, a style injected inside the shadow
  root changed about 3,400 pixels (one button colour) to 39,000 (a font).
- At 360 px on a touch phone the demo's page never scrolls sideways, the widgets share one
  column, the table scrolls within its widget, every control in the dashboard is at least 44 px
  square, and a tap on a bar filters the dashboard. An editor sees the dashboard with "Editing
  needs a wider screen." instead of the builder.

The same page also shows filter changes from inside the element, and `DashKit.mount()` adds a
second dashboard with its own filters and removes it again.

### Known gaps

- The element is not yet typed for TypeScript and JSX users (FR-6.3, a should item). It needs an
  addition to the public types, so it waits for the Phase 6 types pass and approval.
- Fonts declared with `@font-face` inside a shadow root are ignored, so a theme's web fonts must be
  loaded by the host page. This is to be written up in the Phase 6 integrator docs.
- At `sm` (600 to 899 px) the demo's widgets each take a whole row, because their shares of the
  row round below the two-column minimum.
- The plain HTML page names the API at `http://localhost:4000`; the deployed copy needs the
  deployed URL (Phase 7).
- Undo and redo (FR-5.10) and a keyboard way to move and resize widgets (FR-5.11) are stretch
  items and not implemented. Until then, moving and resizing need a pointer.
- Storybook has no page for the element yet; it, the signed-in-user toolbar switch (FR-6.5) and
  the written docs pages (FR-6.6) come with the Phase 6 Storybook pass.
- The end-to-end tests run in Chromium only; Firefox and WebKit (NFR-C1) come with the Phase 6
  test pass.
- Unsaved changes are detected by identity, so an edit undone by hand still asks for
  confirmation on leaving.
- Multi-select (FR-4.10, a stretch item) is not implemented.
- Some unit test files print `AbortError`, `Network error` and `ENOTFOUND api.test` lines when a
  test ends with requests still in flight: the test DOM shuts down, or the request reaches the
  network after the file's mock server has closed. Nothing fails.
- The demo app builds into one 895 kB chunk (292 kB gzipped) and Vite warns about its size. This
  is the demo only; the SDK's own sizes are in the table above.
- The zip export in the project root is not part of the project and must not be committed.
