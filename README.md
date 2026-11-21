# DashKit

DashKit is an SDK that puts analytics dashboards inside another company's product: themed with that
product's brand, showing each signed-in user only the data they may see, filtering across charts
when one is clicked, and editable by the people allowed to edit.

![The demo app: a dark bar of demo controls above a fictional host product in the Acme Global brand, with its logo, navigation and signed-in user, showing DashKit's World development overview dashboard on its Analytics page: a total population figure, population by region as bars, GDP by income level as a pie, average life expectancy since 2000 as a line, and a table of countries.](docs/images/demo.png)

## Live links

The demo, Storybook and a recorded walkthrough are not deployed yet. Until they are, the
[next section](#run-it-locally) runs all of them on your machine in a few minutes.

## Run it locally

You need [Node.js](https://nodejs.org) 24 or later and [pnpm](https://pnpm.io) 12
(`npm install --global pnpm@12`). Ports 4000 and 5173 must be free.

```sh
git clone <this repository's URL> dashkit
cd dashkit
pnpm install
pnpm dev
```

`pnpm dev` builds the SDK once, then starts the demo data API on http://localhost:4000 and the demo
app on **http://localhost:5173**. The app plays a host product: a fictional business app with its
own navigation, styled from the customer's brand like the dashboard it embeds, which is on its
**Analytics** page. The dark **Demo** bar above it holds the controls. Open the app and try:

- **Signed in as**: switch between Asha (Acme Global, editor, every region), Ravi (AsiaInsights,
  viewer, South Asia and East Asia & Pacific) and Elena (EuroStat Co, editor, Europe & Central
  Asia). Each gets their own token, their own dashboards and only their own regions' rows. Kofi
  (Acme Global, editor, every region) may not query GDP: the API refuses the two widgets that need
  it, and his builder never offers it.
- **Click a bar or a pie slice** to filter the other widgets; click it again, or use the chip above
  the grid, to clear it. Keyboard users press Tab to reach a chart's data table and Enter on a
  value.
- **Dashboard**: switch to the Population explorer, with lists above the grid that filter by
  region, income level or year, a chart of regions that drills down to countries when clicked, and
  a map of the world's countries, where a click on a country filters the rest. Editors also create
  and delete dashboards here.
- **Edit dashboard** (Asha or Elena): drag widgets by their handle, resize them from the corner,
  add widgets, change their settings, and save. Reload the page to see the saved version.
- **Brand** and **Mode**: three customer brands, each in light, dark or following the system. The
  host product follows them too.
- **Home**, **Orders** and **Settings** stand for the host product's own pages; leaving Analytics
  and coming back mounts the dashboard afresh.
- **Tamper with token**: changes one character of the token, and the API refuses it.
- **http://localhost:5173/plain-html/**: the same dashboard on a page with no framework, from one
  script tag and the `<dashkit-dashboard>` element.

For Storybook, with every widget in every state and the integrator docs, run `pnpm storybook` and
open http://localhost:6006. It needs no server: its data API runs inside the browser.

Saved dashboards live in the demo API's memory, so restarting `pnpm dev` resets them.

## Features

- **Two ways to embed, one codebase.** React apps install `@dashkit/sdk` and render
  `<Dashboard>`; any other page loads `dashkit.js` and writes `<dashkit-dashboard>`, which renders
  in a shadow root so the page's CSS cannot reach it.
- **White-label theming.** Colours for light and dark mode, fonts, corner radius, logo and chart
  palette, with a contrast warning while developing.
- **Row-level security.** The data API applies each user's scope, from a token signed by the host's
  backend, before anything else. Filters can only narrow what a user sees.
- **Cross-filtering.** Clicking a bar or slice filters every other widget, and Ctrl- or Cmd-click
  selects several. A chart can drill down, from a region to its countries, and lists above the grid
  filter by a region, a year or any other field. The host can set the filters and hears about every
  change.
- **A dashboard builder** for editors: drag or use the keyboard to move and resize, add,
  configure, undo, save. Viewers never see it, and the API refuses their writes anyway.
- **Several dashboards** per tenant, with a picker to switch between them and, for editors, to
  create and delete them.
- **CSV export**, when the host allows it: each widget downloads the rows it shows, only ever
  inside the user's scope.
- **Responsive to its container**, from a 360 px phone to a wide screen, with 44 px touch targets
  on touch screens.
- **Six widget types** (bar, line, pie, table, KPI and map) on ECharts, each with loading, empty
  and error states, and a data table behind every chart for keyboard and screen-reader users. Maps
  draw borders the host registers, so the SDK carries no geography; the demo's come from Natural
  Earth.
- **Typed for TypeScript and JSX**, React 18 and 19.

## Quick start

### In a React app

```sh
npm install @dashkit/sdk
```

```tsx
import { Dashboard, DashKitProvider } from '@dashkit/sdk';

// Your backend signs the embed token for the signed-in user.
const getToken = () => fetch('/api/dashkit-token').then((response) => response.text());

export function Analytics() {
  return (
    <DashKitProvider
      apiUrl="https://analytics.example.com"
      getToken={getToken}
      theme={{ mode: 'auto', light: { primary: '#4f46e5' } }}
    >
      <Dashboard dashboardId="overview" />
    </DashKitProvider>
  );
}
```

### In any page

```html
<dashkit-dashboard
  api-url="https://analytics.example.com"
  dashboard-id="overview"
></dashkit-dashboard>
<script src="dashkit.js"></script>
<script>
  const dashboard = document.querySelector('dashkit-dashboard');
  dashboard.getToken = () => fetch('/api/dashkit-token').then((response) => response.text());
  dashboard.addEventListener('dashkit:filterchange', (event) => console.log(event.detail));
</script>
```

`dashkit.js` is in the package at `dist/dashkit.js`, with React bundled in. The full SDK and HTTP
reference is in [docs/API.md](docs/API.md).

## Security model, and what is only for the demo

The browser never decides what a user may see. The host's backend, which knows who is signed in,
signs a short-lived **embed token** with a secret that only it and the data API know. The SDK holds
the token in memory, sends it with every request, and asks the host for a new one when it expires.
The API verifies every request and takes the user's tenant, role and regions from the token alone.

**The demo's sign-in is not real authentication.** The demo API has a `POST /auth/demo-token`
route that hands a token to anyone who names a demo user, so that the demo runs without a host
backend. A real deployment has no such route. Instead, the host's backend mints the token, for
example in Node with [jose](https://github.com/panva/jose):

```ts
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.DASHKIT_TOKEN_SECRET);

// Behind your own session check: `user` is the signed-in user of your product.
export async function mintDashKitToken(user: {
  id: string;
  companyId: string;
  canEdit: boolean;
  // World Bank region codes, such as ['SAS', 'EAS'], or '*' for every region.
  regions: string[] | '*';
}) {
  return new SignJWT({
    tenantId: user.companyId,
    role: user.canEdit ? 'editor' : 'viewer',
    scopes: { regions: user.regions },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}
```

Other demo shortcuts: the API keeps dashboards in memory; without `DASHKIT_TOKEN_SECRET` it signs
with a random secret, so tokens end when it restarts; and in Storybook the whole API runs inside the
browser. The Storybook page **Concepts › Security model** has the full token flow and what the API
enforces, rows and measures alike.

## Project structure

```text
packages/sdk            the SDK: src/core (no React), src/react, src/element; Storybook; unit and component tests
packages/mock-engine    the data API as a library: tokens, queries, dashboards, the World Bank snapshot
packages/react18-check  runs the SDK's component tests again on React 18
apps/mock-api           the API as a Node server on port 4000
apps/demo               the demo host product, and a plain HTML page using the script tag
e2e, perf               Playwright end-to-end tests and performance measurements
scripts                 the World Bank data fetch, and the installed-package check
docs                    requirements, guide, architecture, API, decisions, test and performance reports
```

## Architecture

The SDK has three layers, and dependencies point one way: the custom element wraps the React layer,
which is built on a core with no React in it. Every widget declares a query, and one query client
sends them all, attaching the token, sharing identical requests and caching results. The data API
is one function that runs as a Node server for the demo and inside the browser for Storybook and
the tests. A dashboard is one JSON document that the viewer renders, the builder edits and the API
stores.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) has the diagrams: the system, the data path,
cross-filtering, trust boundaries, the theme pipeline and the element's lifecycle, with the
decisions behind them. Every decision made along the way is in [docs/DECISIONS.md](docs/DECISIONS.md).

## Tests and performance

| Check                                    | Result                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Unit, component and type tests (Vitest)  | 526 passed, the component tests on both React 19 and React 18                                                                  |
| End-to-end tests (Playwright)            | 108 passed: 26 user flows in Chromium, Firefox and WebKit, and 15 axe accessibility checks and 15 Storybook checks in Chromium |
| Coverage, SDK core and query engine      | 99.6% and 97.8% of lines; CI fails if either drops below its gate                                                              |
| Installed package                        | Installs and type-checks in fresh projects on React 18 and 19                                                                  |
| Bundle, npm build as a host bundles it   | 222.7 kB gzipped, or 246.2 kB with the map entry (target 300 kB)                                                               |
| Bundle, script tag                       | 313.9 kB gzipped (target 500 kB)                                                                                               |
| Mount to first chart                     | median 155 ms (target 1.5 s)                                                                                                   |
| Cross-filter, click to every chart drawn | median 257 ms (target 300 ms)                                                                                                  |

```sh
pnpm lint && pnpm typecheck && pnpm test   # static checks, unit and component tests
pnpm test:e2e                              # end to end; first: pnpm exec playwright install chromium firefox webkit
pnpm perf                                  # performance measurements
```

Details, including the two targets missed on a CPU slowed four times, are in
[docs/TEST_REPORT.md](docs/TEST_REPORT.md) and [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Roadmap

- Deploy the API, the demo and Storybook, and run Lighthouse on the deployed demo.
- Keep cross-filtering within 300 ms on slow devices.
