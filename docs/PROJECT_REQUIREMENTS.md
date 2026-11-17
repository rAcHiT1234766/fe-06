# DashKit — Project Requirements

> **What this file is:** the complete statement of *what* must be built and how it will be judged.
> **What it is not:** build instructions. Those are in `IMPLEMENTATION_GUIDE.md`.
> **Rule of precedence:** if the two files disagree, this file wins on *what*, the guide wins on *how*.

---

## Table of contents

1. [Project snapshot](#1-project-snapshot)
2. [The product in plain words](#2-the-product-in-plain-words)
3. [Who uses it](#3-who-uses-it)
4. [Glossary](#4-glossary)
5. [Scope](#5-scope)
6. [Functional requirements](#6-functional-requirements)
7. [Non-functional requirements](#7-non-functional-requirements)
8. [Data requirements](#8-data-requirements)
9. [Technology requirements](#9-technology-requirements)
10. [Submission deliverables](#10-submission-deliverables)
11. [The demo script the project must support](#11-the-demo-script-the-project-must-support)
12. [Definition of done](#12-definition-of-done)
13. [Priorities, risks and assumptions](#13-priorities-risks-and-assumptions)

---

## 1. Project snapshot

| Field | Value |
|---|---|
| Project ID | B4-FE-01 (Project 1 of 2) |
| Title | DashKit: Embeddable White-Label Analytics Builder SDK with Theming, Permission-Aware Queries, and Cross-Filtering |
| Track | Frontend Development |
| Batch start | 16 November 2026 |
| Deadline | 16 February 2027 |
| Estimated effort | 14 working days |
| Required tools | TypeScript, React, Web Components, D3 or ECharts, Vite, Storybook, a small mock data API |
| Dataset | World Bank Global Development Indicators (open API, <https://data.worldbank.org/>) |

---

## 2. The product in plain words

**DashKit is a library, not an application.**

A software company (the *host*) installs DashKit and gets analytics dashboards inside its own product. Those dashboards must:

1. **Look like the host's product**: its colours, fonts, corner radii, logo, and light or dark mode.
2. **Show each signed-in user only the data that user is allowed to see**, enforced on every single query.
3. **Be interactive**: clicking part of one chart filters the other charts on the page.
4. **Be editable**: a power user can arrange, resize and configure the charts with drag and drop.

**The problem it solves:** product teams need analytics, but building it in-house is expensive. An embedded dashboard that does not match the brand looks bolted on, and one that leaks another customer's data is a security incident. DashKit removes both problems.

---

## 3. Who uses it

| Persona | Who they are | What they need from DashKit |
|---|---|---|
| **Integrator** | A developer at the host company | Install in minutes via npm or one script tag; clear TypeScript types; good docs; no CSS conflicts with their app |
| **Builder** | A power user or admin inside the host product | Create and rearrange dashboards without writing code |
| **Viewer** | An ordinary end user of the host product | Fast, readable charts that work on a phone and only show their own data |
| **Evaluator** | The internship reviewer | A working demo, clean repo, architecture diagram, test evidence, and a clear presentation |

---

## 4. Glossary

| Term | Meaning in this project |
|---|---|
| **SDK** | The installable library (`@dashkit/sdk`) that host apps import |
| **Host app** | The customer's product that embeds DashKit |
| **White-label** | The dashboard carries the host's branding, with no visible DashKit identity |
| **Tenant** | One customer organisation. Tenants must never see each other's data or dashboards |
| **Access scope** | The set of things a user may access (for example, which regions) |
| **Row-level security (RLS)** | Filtering data rows per user on the server, so forbidden rows never leave the API |
| **Embed token** | A signed, short-lived token carrying the user's tenant, role and scopes |
| **Widget** | One visual block on a dashboard: bar, line, pie, table or KPI |
| **Cross-filtering** | Selecting a value in one widget filters the other linked widgets |
| **Builder mode** | Edit mode where widgets can be dragged, resized, added, removed and configured |
| **Dashboard config** | The JSON document that fully describes one dashboard |

---

## 5. Scope

### 5.1 What must be built (four pieces)

| # | Piece | Purpose |
|---|---|---|
| 1 | **The SDK** (`@dashkit/sdk`) | The actual product. React components plus a Web Component |
| 2 | **Mock data API** | Serves World Bank data, issues demo tokens, enforces permissions, stores dashboards |
| 3 | **Demo host app** | A fictional customer product that embeds the SDK and proves every feature |
| 4 | **Storybook site** | Interactive documentation for every component and concept |

### 5.2 Out of scope

- A real production backend, database, or real user management.
- Real SQL generation or connecting to arbitrary customer databases.
- Billing, multi-language UI, PDF/CSV export, scheduled reports, alerts.
- Real-time streaming data.
- Actually publishing to the public npm registry (proving installability with `npm pack` is sufficient).

Items in this list may be mentioned as "next steps" in the final presentation.

---

## 6. Functional requirements

Each requirement has an ID so tests, commits and docs can reference it.
**Priority:** `M` = must have, `S` = should have, `C` = could have (stretch).

### Milestone 1 — Embeddable SDK architecture

> *Brief: "Architect an embeddable white-label analytics SDK that client applications can import via npm or script tag."*

| ID | Requirement | Pri |
|---|---|---|
| FR-1.1 | The SDK installs as an npm package and exposes React components (`DashKitProvider`, `Dashboard`, `DashboardBuilder`) | M |
| FR-1.2 | The SDK is also usable with **one script tag** and no build step, exposing the custom element `<dashkit-dashboard>` | M |
| FR-1.3 | Both entry points are built from the same source code | M |
| FR-1.4 | The script-tag build is self-contained (bundles its own React and charts); the npm build treats React as a peer dependency | M |
| FR-1.5 | Styles are isolated: host CSS cannot break the dashboard and the dashboard cannot restyle the host | M |
| FR-1.6 | Several dashboards can exist on one page without sharing state | M |
| FR-1.7 | The element exposes attributes, properties, methods and events (see Implementation Guide §9) | M |
| FR-1.8 | An imperative API (`DashKit.mount(element, options)`) exists for non-React hosts | S |

**Acceptance:** a plain `.html` file with only a `<script>` tag and a `<dashkit-dashboard>` element renders a working dashboard; a separate React app renders the same dashboard after installing the package tarball.

### Milestone 2 — White-label theming

> *Brief: "Support full white-label theming (custom color palettes, dark/light modes, custom fonts, border radii, and logo branding)."*

| ID | Requirement | Pri |
|---|---|---|
| FR-2.1 | A typed theme object controls: brand colours, surface/background/text/border colours, a chart colour palette, font families, base font size, border radius, and logo (URL + alt text) | M |
| FR-2.2 | Light and dark modes, plus `auto` which follows the operating system setting | M |
| FR-2.3 | The mode can be switched at runtime without a page reload or losing dashboard state | M |
| FR-2.4 | **Charts follow the theme too**: series colours, axis and label colours, tooltip, font | M |
| FR-2.5 | A partial theme is valid; missing values fall back to sensible defaults | M |
| FR-2.6 | No hardcoded colour, font or radius exists in any component | M |
| FR-2.7 | At least three complete demo brand themes ship with the demo app | M |
| FR-2.8 | Development-time warning when a text/background pair fails WCAG AA contrast | S |
| FR-2.9 | Hosts can override individual tokens with plain CSS variables | S |

**Acceptance:** switching between three brands in the demo changes every visible surface, including all charts, with no leftover default colours.

### Milestone 3 — Permission-aware queries

> *Brief: "Implement permission-aware queries where each visualization respects tenant access scopes and row-level security tokens."*

| ID | Requirement | Pri |
|---|---|---|
| FR-3.1 | The host supplies an embed token (or an async `getToken` callback). The SDK never creates tokens itself | M |
| FR-3.2 | **Every** data request from every widget carries the token | M |
| FR-3.3 | The API verifies the token's signature and expiry on every request | M |
| FR-3.4 | **Row-level security is enforced on the server.** Rows outside the user's scope are never sent to the browser | M |
| FR-3.5 | Tenant identity comes only from the verified token, never from request parameters | M |
| FR-3.6 | Saved dashboards are tenant-isolated: tenant A cannot read or overwrite tenant B's dashboards | M |
| FR-3.7 | Roles: `viewer` can view; `editor` can also use builder mode and save | M |
| FR-3.8 | Expired or invalid tokens produce a clear, themed error state, and the SDK retries once via `getToken` | M |
| FR-3.9 | User-supplied filters can only narrow results; they can never widen access beyond the scope | M |
| FR-3.10 | Cached results are keyed by user scope, so one user's cache can never serve another | M |
| FR-3.11 | Column-level scope: a token may restrict which measures a user can query | C |

**Acceptance:** the same dashboard opened by two demo users shows different data; inspecting the network tab shows no out-of-scope rows; an automated test proves it for every demo user.

### Milestone 4 — Cross-filtering

> *Brief: "Build interactive cross-filtering: clicking a segment on a bar chart dynamically updates linked pie, line, and table components."*

| ID | Requirement | Pri |
|---|---|---|
| FR-4.1 | Clicking a bar-chart segment applies a filter that updates linked pie, line and table widgets | M |
| FR-4.2 | Clicking the same segment again removes the filter | M |
| FR-4.3 | The source chart keeps all its segments visible and **highlights** the selected one instead of filtering itself | M |
| FR-4.4 | Active filters are shown as removable chips, with a "Clear all" control | M |
| FR-4.5 | Pie slices, line points and table rows can also act as filter sources | S |
| FR-4.6 | Widgets show the previous data while new data loads (no blank flash) | M |
| FR-4.7 | Stale responses are discarded if a newer filter was applied in the meantime | M |
| FR-4.8 | Each widget can opt in or out of emitting and listening | S |
| FR-4.9 | The host is notified of filter changes through an event and can set filters programmatically | S |
| FR-4.10 | Multi-select with Ctrl/Cmd-click | C |
| FR-4.11 | Cross-filtering never bypasses permissions (FR-3.9 still holds) | M |

**Acceptance:** an end-to-end test clicks a bar and asserts that the pie, line and table all change, then clicks again and asserts they return to the original state.

### Milestone 5 — Drag-and-drop dashboard builder

> *Brief: "Provide a drag-and-drop dashboard builder mode allowing power users to arrange, resize, and configure analytics widgets."*

| ID | Requirement | Pri |
|---|---|---|
| FR-5.1 | A toggle switches between view mode and builder mode (editors only) | M |
| FR-5.2 | Widgets can be dragged to a new position on a grid | M |
| FR-5.3 | Widgets can be resized, with minimum sizes per widget type | M |
| FR-5.4 | Widgets can be added from a palette and removed | M |
| FR-5.5 | A configuration panel edits: title, chart type, measure, aggregation, grouping dimension, sort, row limit, cross-filter behaviour | M |
| FR-5.6 | Changes preview live | M |
| FR-5.7 | Save persists the dashboard config; reloading restores it exactly | M |
| FR-5.8 | Cancel discards unsaved changes; leaving with unsaved changes warns the user | S |
| FR-5.9 | Duplicate widget | S |
| FR-5.10 | Undo / redo | C |
| FR-5.11 | Keyboard alternative for moving and resizing widgets | C |

**Acceptance:** starting from an empty dashboard, a user builds a four-widget dashboard, saves, reloads the page and sees the identical layout and configuration.

### Milestone 6 — Types, Storybook, responsive layout

> *Brief: "Publish comprehensive TypeScript type definitions, interactive Storybook documentation, and responsive mobile layout support."*

| ID | Requirement | Pri |
|---|---|---|
| FR-6.1 | The package ships `.d.ts` files; every public API is typed; no `any` in the public surface | M |
| FR-6.2 | Public types include JSDoc comments that show in editor tooltips | M |
| FR-6.3 | The custom element is typed for TypeScript and JSX users | S |
| FR-6.4 | Storybook has a story for every widget in every state (loading, empty, error, populated) | M |
| FR-6.5 | Storybook has interactive pages for theming, cross-filtering, permissions (switch user) and the builder | M |
| FR-6.6 | Storybook has written docs pages: Getting started, Theming, Security model, API reference | M |
| FR-6.7 | Layout responds to the **width of the container**, not the browser window | M |
| FR-6.8 | Below tablet width the dashboard is a single readable column; tables scroll horizontally | M |
| FR-6.9 | Touch targets are at least 44×44 px; charts are tappable | M |
| FR-6.10 | Builder mode is desktop-first; on small screens it degrades to view mode with a notice | S |

**Acceptance:** Storybook builds as a static site; the demo is usable at 360 px width.

---

## 7. Non-functional requirements

Targets below are goals set for this project. Report the actual measured numbers in the final submission, even where a target is missed.

### 7.1 Performance

| ID | Metric | Target |
|---|---|---|
| NFR-P1 | npm build (React external), gzipped | ≤ 300 kB |
| NFR-P2 | Script-tag build (everything bundled), gzipped | ≤ 500 kB |
| NFR-P3 | Time from mount to first chart painted (local API) | ≤ 1.5 s |
| NFR-P4 | Cross-filter click to all widgets updated (local API) | ≤ 300 ms |
| NFR-P5 | Dragging and resizing in the builder | No visible jank with 12 widgets |
| NFR-P6 | Identical queries from different widgets | Deduplicated into one request |

### 7.2 Security

| ID | Requirement |
|---|---|
| NFR-S1 | No secret (signing key) ever ships in the SDK or demo frontend |
| NFR-S2 | Tokens are held in memory only, never written to `localStorage` |
| NFR-S3 | The query API accepts only whitelisted fields, operators and aggregations |
| NFR-S4 | The API returns uniform error shapes and never leaks which forbidden rows exist |
| NFR-S5 | The README states clearly that the mock auth is for demonstration, and describes how a real host would mint tokens |

### 7.3 Accessibility

| ID | Requirement |
|---|---|
| NFR-A1 | All controls reachable and operable by keyboard, with visible focus |
| NFR-A2 | Every chart has an accessible name and a text/table alternative of its data |
| NFR-A3 | Default themes meet WCAG AA contrast |
| NFR-A4 | Meaning is never carried by colour alone (selection also changes opacity/outline) |
| NFR-A5 | `prefers-reduced-motion` disables chart and layout animation |

### 7.4 Compatibility and quality

| ID | Requirement |
|---|---|
| NFR-C1 | Works in the latest two versions of Chrome, Edge, Firefox and Safari |
| NFR-C2 | Works with React 18 and 19 as a peer dependency |
| NFR-C3 | TypeScript `strict` mode, zero type errors, zero lint errors |
| NFR-C4 | Clean teardown: removing the element releases charts, observers and listeners |
| NFR-C5 | Unit, component, security and end-to-end tests run in CI on every push |
| NFR-C6 | Conventional, small commits that tell the story of the build |

---

## 8. Data requirements

### 8.1 Source

World Bank Open Data. Data is fetched **once by a script** and committed as a JSON file, so the demo never depends on the live API.

### 8.2 Indicators to include

| Field name in DashKit | World Bank indicator code | Meaning | Default aggregation |
|---|---|---|---|
| `gdp` | `NY.GDP.MKTP.CD` | GDP, current US$ | sum |
| `gdpPerCapita` | `NY.GDP.PCAP.CD` | GDP per capita, current US$ | avg |
| `population` | `SP.POP.TOTL` | Total population | sum |
| `lifeExpectancy` | `SP.DYN.LE00.IN` | Life expectancy at birth, years | avg |
| `internetUsers` | `IT.NET.USER.ZS` | Individuals using the internet, % of population | avg |
| `unemployment` | `SL.UEM.TOTL.ZS` | Unemployment, % of labour force | avg |
| `electricityAccess` | `EG.ELC.ACCS.ZS` | Access to electricity, % of population | avg |

> Confirm each code still resolves when running the fetch script. If one has been retired, substitute a similar indicator and record the change in `docs/DECISIONS.md`.

### 8.3 Shape

- **Years:** 2000 to the latest year with reasonable coverage.
- **Countries:** real countries only. The World Bank API also returns aggregates such as "World" and "High income"; these must be removed.
- **One row per country per year**, with one column per indicator. Missing values are `null`, never `0`.
- **Dimensions:** `country`, `region`, `incomeLevel`, `year`.
- **Region and income-level names and codes come from the API response**, not from a hardcoded list, because the World Bank revises its groupings.

### 8.4 Demo tenants and users

These three users make the white-label and permission features visible in one demo.

| User | Tenant | Role | Row scope | Brand theme |
|---|---|---|---|---|
| Asha | Acme Global | editor | All regions | Indigo, light, rounded, sans-serif |
| Ravi | AsiaInsights | viewer | South Asia + East Asia & Pacific | Teal, dark, medium radius |
| Elena | EuroStat Co | editor | Europe & Central Asia only | Deep red, light, square corners, serif headings |

---

## 9. Technology requirements

| Area | Required by brief | Chosen | Reason |
|---|---|---|---|
| Language | TypeScript | TypeScript, `strict` | Mandatory; types are a deliverable |
| UI | React | React | Mandatory |
| Embedding | Web Components | Custom Element + Shadow DOM | Works in any framework; gives style isolation |
| Charts | D3 or ECharts | **ECharts** | Built-in click events, theming and resize; far less code than D3 for standard charts |
| Build | Vite | Vite library mode | Mandatory |
| Docs | Storybook | Storybook | Mandatory |
| Backend | A small mock data API | Node + TypeScript HTTP server | Smallest thing that can verify tokens and filter rows |
| Drag and drop | — | react-grid-layout | Purpose-built for draggable, resizable dashboard grids |
| State | — | A small per-dashboard store | Keeps multiple dashboards independent |
| Tests | — | Vitest, Testing Library, Playwright | Unit, component and end-to-end coverage |

---

## 10. Submission deliverables

| # | Deliverable (from the brief) | What "complete" looks like |
|---|---|---|
| D1 | Working demo, deployed or screen-recorded | Public URL for the demo app and Storybook, **and** a 3–5 minute screen recording as backup |
| D2 | GitHub repository with clean commits, README and setup instructions | Conventional commits; README lets a stranger run everything in under five minutes |
| D3 | Architecture diagram and data or API documentation | `docs/ARCHITECTURE.md` with diagrams; `docs/API.md` covering SDK API, HTTP API and data model |
| D4 | Test results and performance numbers | `docs/TEST_REPORT.md` and `docs/PERFORMANCE.md` with real measured output |
| D5 | 10-minute final presentation | Slides covering problem, design, challenges, results, next steps |
| D6 | Individual reflection | A written reflection on what was learned and what was personally owned |

---

## 11. The demo script the project must support

The finished product must be able to run this exact sequence live. Treat it as the final acceptance test.

1. Open a plain HTML page. Show the single `<script>` tag and the `<dashkit-dashboard>` element. The dashboard renders.
2. Open the React demo app. Same dashboard, installed through npm.
3. Switch brand from Acme to AsiaInsights to EuroStat. Colours, fonts, corners, logo and charts all change. Toggle dark mode.
4. Sign in as Asha: all regions visible. Sign in as Ravi: only two regions. Open the network tab and show that no other regions arrive.
5. Tamper with the token. The dashboard shows a clean "session invalid" state.
6. Click a bar. The pie, line and table update; a filter chip appears. Click again to clear.
7. As Asha, enter builder mode. Drag a widget, resize another, add a new pie chart, configure it, save. Reload: it persists.
8. As Ravi (viewer), show that the edit button is absent and a direct save request is rejected.
9. Shrink the window to phone width. The layout collapses to one column.
10. Open Storybook: show a widget's states, the theming playground and the types in the docs.
11. Show the test run and the performance numbers.

---

## 12. Definition of done

The project is finished only when **all** of these are true:

- [ ] Every `M` requirement in section 6 is implemented and has at least one automated test.
- [ ] The demo script in section 11 runs start to finish without errors.
- [ ] `install`, `build`, `lint`, `typecheck` and `test` all pass from a fresh clone.
- [ ] The package installs from a tarball into a separate project and its types resolve.
- [ ] The script-tag build works in a plain HTML file.
- [ ] The permission test suite proves no out-of-scope row is returned for any demo user.
- [ ] Storybook builds and is deployed.
- [ ] The demo app and API are deployed, and a backup recording exists.
- [ ] `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/TEST_REPORT.md`, `docs/PERFORMANCE.md` exist and match the code.
- [ ] Presentation and reflection are written.

---

## 13. Priorities, risks and assumptions

### 13.1 If time runs short

| Never cut | Cut first |
|---|---|
| Server-side row-level security (FR-3.4) | Undo/redo (FR-5.10) |
| Bar → pie/line/table cross-filter (FR-4.1) | Multi-select (FR-4.10) |
| Both install paths (FR-1.1, FR-1.2) | Column-level scope (FR-3.11) |
| Themed charts (FR-2.4) | Keyboard drag alternative (FR-5.11) |
| Save and reload in the builder (FR-5.7) | Contrast warnings (FR-2.8) |

### 13.2 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Web Component + Shadow DOM integration problems appear late | High | Prove a React component mounting in a shadow root on day 1 |
| Third-party CSS (grid library) does not apply inside Shadow DOM | High | Inject all styles into the shadow root; test in the plain HTML page early |
| Custom fonts do not load inside Shadow DOM | Medium | Load `@font-face` at document level; document this for integrators |
| Builder consumes more time than planned | High | Build the minimum (drag, resize, add, remove, save) before any stretch item |
| Bundle size exceeds target | Medium | Import only the ECharts modules actually used; measure after every phase |
| Live World Bank API is slow or changes | Medium | Commit a local snapshot of the data |
| Library APIs differ from tutorials | Medium | Read the installed version's own documentation before using it |

### 13.3 Assumptions

- The mock API stands in for a real host backend. Its signing key is a demo secret.
- "Import via npm" is satisfied by a correctly packaged, installable tarball.
- One dataset (World Bank indicators) is enough to demonstrate every feature.
- The builder is a desktop feature; mobile support means viewing.
