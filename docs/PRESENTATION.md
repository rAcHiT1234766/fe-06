# Presentation: ten minutes

Slide by slide, with speaker notes, following the timing in section 19.4 of the implementation
guide. Every number comes from [TEST_REPORT.md](TEST_REPORT.md), [PERFORMANCE.md](PERFORMANCE.md)
or the code. The live demo follows [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

| Slide | Time       | Title                                |
| ----- | ---------- | ------------------------------------ |
| 1     | 0:00–0:15  | DashKit                              |
| 2     | 0:15–1:00  | The problem                          |
| 3     | 1:00–4:30  | Live demo                            |
| 4     | 4:30–5:30  | Three layers, one config             |
| 5     | 5:30–6:30  | One query path, and who decides      |
| 6     | 6:30–7:15  | Hard problem 1: one app, two worlds  |
| 7     | 7:15–8:00  | Hard problem 2: 549 ms to 257 ms     |
| 8     | 8:00–9:00  | Results                              |
| 9     | 9:00–9:45  | What is missing, and what comes next |
| 10    | 9:45–10:00 | Thank you                            |

---

## 1. DashKit (0:00–0:15)

**On the slide:** "DashKit: analytics dashboards that live inside your product." The screenshot
`docs/images/demo.png`. Your name.

**Say:** "I built DashKit, an SDK that puts analytics dashboards inside another company's
product."

## 2. The problem (0:15–1:00)

**On the slide:**

- SaaS products want analytics inside the product, not in a separate BI tool.
- Each customer expects their own brand.
- Each user may see only their own data.
- Customers want to adjust their dashboards themselves.
- One sentence: _DashKit is an SDK that puts dashboards in your product, in your customer's brand,
  showing each user only what they may see, and editable by the people allowed to edit._

**Say:** "Products like a CRM or a logistics platform get asked for dashboards all the time.
Building them from scratch is slow, and an embedded BI tool looks foreign and often leaks data
between customers. DashKit does four things: it takes the host's brand, it enforces each user's
permissions on the server, clicking one chart filters the rest, and editors can rearrange and save
their dashboards. It installs from npm into a React app, or with one script tag into any page."

## 3. Live demo (1:00–4:30)

**On the slide:** the demo, plain HTML and Storybook addresses, and "Backup: recording".

**Say:** follow shots 1 to 9 of [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Leave Storybook and the numbers
to the slides. If the API is still waking up, go to slide 4 and come back.

## 4. Three layers, one config (4:30–5:30)

**On the slide:** the SDK layers diagram from [ARCHITECTURE.md](ARCHITECTURE.md):

- **core**: types, the query client, the filter store, themes, layouts. No React.
- **react**: the provider, the dashboard, five widgets, the builder.
- **element**: `<dashkit-dashboard>`, a thin wrapper that renders the same React tree in a shadow
  root.

And: one `DashboardConfig` JSON document. The viewer renders it, the builder edits it, the API
stores it.

**Say:** "Dependencies point one way: the element wraps React, and React sits on a core with no
React in it, so the logic is tested without a browser. Both install paths are the same code; the
script-tag build just bundles React in. A dashboard is one JSON document, which keeps the viewer,
the builder and the API in agreement: there is no second format to drift."

## 5. One query path, and who decides (5:30–6:30)

**On the slide:** the data path and trust boundaries diagrams from ARCHITECTURE.md.

- Every widget declares a query. One query client sends them all: it attaches the token, sends
  identical queries once, and caches results.
- The host's backend signs a 15-minute token: tenant, role, regions and, if it chooses, the
  measures the user may query. The SDK keeps it in memory.
- The API verifies it on every request and applies the user's scope before anything else.
  Filters can only narrow what the user sees.

**Say:** "The browser never decides what a user may see. The host's backend knows who is signed
in, so it signs the token. The API checks the signature on every request and filters rows by the
token's regions before the query runs, so a filter from the browser can only narrow the result.
That is why, in the demo, Ravi's network tab never contains another region, why Kofi's GDP
queries come back 403 rather than being hidden by the page, and why Ravi's save was refused even
with a valid token. The demo's sign-in route is for the demo only; the README shows
how a real backend mints the token."

## 6. Hard problem 1: one app, two worlds (6:30–7:15)

**On the slide:**

- The same React tree must look identical in a React app and inside a shadow root on any page.
- A shadow root stops the host's selectors, but not inheritance, and it ignores `@font-face`.
- Fixes: styles travel inside the tree as one `<style>`; the root resets inherited properties with
  `all: initial`; theme fonts load at page level; the element waits for a token before its first
  request.
- Proof: a test adds hostile CSS to the page (Comic Sans everywhere, red buttons, uppercase text),
  and the dashboard's pixels do not change.

**Say:** "The risk the guide flagged on day one was Shadow DOM. Selectors stop at the shadow
boundary, but inherited properties like `text-transform` do not, so the root resets them. Fonts
declared inside a shadow root are ignored, so the host loads them. And the element is defined
before the page's next script sets `getToken`, so the first request went out with no token and
showed 'Session invalid' until the element learned to wait. A pixel comparison now proves the
host's CSS cannot reach the dashboard."

## 7. Hard problem 2: 549 ms to 257 ms (7:15–8:00)

**On the slide:**

- Target: a click to every chart updated within 300 ms.
- First measurement: median **549 ms**. With animation off: 42 ms.
- The results arrived, and the table and KPI were drawn, within 60 ms of the click. The rest was
  ECharts' default animations, including a 500 ms pie update and a one-second line redraw.
- Fix: 200 ms transitions, set on every series as well as on the chart. None with reduced motion.
- Now: median **257 ms**.

**Say:** "I measured instead of guessing. The SDK records User Timing marks, from the click to the
moment the last chart reports it has finished. The first run missed badly, yet the results were
back, and the table and KPI drawn, within 60 ms: the time went on ECharts' default animations, and
a series' own defaults override the chart's. Setting a short transition on every series brought the median to
257 ms."

## 8. Results (8:00–9:00)

**On the slide:**

| Check                                    | Result                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Unit, component and type tests           | 347 passed, the component tests on React 19 and 18                                                                       |
| End-to-end tests                         | 51 passed: 9 user flows in Chromium, Firefox and WebKit; 11 axe accessibility checks and 13 Storybook checks in Chromium |
| Permission matrix                        | No out-of-scope row for any demo user, and no query on a measure outside the user's scope                                |
| Installed from the packed tarball        | Types check on React 18 and 19                                                                                           |
| npm build, as a host bundles it          | 215.6 kB gzipped (target 300)                                                                                            |
| Script-tag build                         | 282.7 kB gzipped (target 500)                                                                                            |
| Mount to first chart                     | median 155 ms (target 1.5 s)                                                                                             |
| Cross-filter, click to every chart drawn | median 257 ms (target 300 ms)                                                                                            |
| Identical queries from 10 widgets        | 5 requests for 5 distinct queries                                                                                        |

**Say:** "All of this runs in CI on every push, apart from the performance run, which depends on
the machine. Two targets are missed on a CPU slowed four times: a cross-filter takes 534 ms there,
and resizing drops a few frames. Both are in the performance report with the reason."

## 9. What is missing, and what comes next (9:00–9:45)

**On the slide:**

- Built after the must-haves: column-level scope, the stretch item that completes the security
  model, and in the builder undo and redo, and moving and resizing widgets from the keyboard.
- Not built (stretch items): multi-select.
- The demo API keeps dashboards in memory and signs its own demo tokens.
- Next: persistent storage, and cross-filtering within 300 ms on slow devices.

**Say:** "Everything the brief marked as must-have is built and tested, and so are column-level
scope, the stretch item that completes the security model, undo and redo in the builder, and a
keyboard way to move and resize widgets. Selecting several values in one chart is not, and the
demo API is a stand-in: a real deployment would store dashboards in a database and let the host's
backend sign tokens."

## 10. Thank you (9:45–10:00)

**On the slide:** the GitHub repository, the demo and the Storybook addresses.

**Say:** "Thank you. The README runs everything locally in a few minutes, and Storybook has the
integrator docs."
