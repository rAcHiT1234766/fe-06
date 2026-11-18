# API

DashKit has three surfaces: React components from the npm package, the `<dashkit-dashboard>`
custom element for any page, and the HTTP API that both of them call. This page describes all
three, the data behind them, and the dashboard config format.

Every public type also has a JSDoc comment, so an editor shows the same descriptions on hover. The
full type reference, generated from the source, is the **API reference** page in Storybook
(`pnpm storybook`). Its generator fails the build when a public export or property has no
description.

## Contents

- [React components](#react-components)
- [The custom element](#the-custom-element)
- [Types](#types)
- [HTTP API](#http-api)
- [Data model](#data-model)
- [Dashboard config](#dashboard-config)

## React components

```sh
npm install @dashkit/sdk
```

React and React DOM 18 or 19 are peer dependencies. ECharts and react-grid-layout are ordinary
dependencies, so a host that already uses them shares one copy.

```tsx
import { Dashboard, DashKitProvider } from '@dashkit/sdk';

const getToken = () => fetch('/api/dashkit-token').then((response) => response.text());

export function Analytics() {
  return (
    <DashKitProvider
      apiUrl="https://analytics.example.com"
      getToken={getToken}
      theme={{ mode: 'auto' }}
    >
      <Dashboard dashboardId="overview" />
    </DashKitProvider>
  );
}
```

### `DashKitProvider`

Connects the dashboards inside it to the data API and gives them a theme and a set of
cross-filters. Nothing is shared between providers, so each dashboard on a page gets its own.

| Prop             | Type                                | Description                                                                                                                                 |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrl`         | `string`                            | Required. Base URL of the data API.                                                                                                         |
| `token`          | `string`                            | An embed token minted by your backend. It is kept in memory only.                                                                           |
| `getToken`       | `() => Promise<string>`             | Called on start if there is no `token`, and once after a 401 response to get a fresh token. Widgets that get a 401 together share one call. |
| `theme`          | `ThemeInput`                        | The host's brand. Anything left out comes from the default theme.                                                                           |
| `filters`        | `ActiveFilter[]`                    | Replaces the active cross-filters whenever a new array is passed. Clicks still change them.                                                 |
| `onFilterChange` | `(filters: ActiveFilter[]) => void` | Called with the new filters after every change, whether from a click or from the host.                                                      |
| `onError`        | `(error: DashKitError) => void`     | Called when a request fails for good or a dashboard cannot be read.                                                                         |
| `children`       | `ReactNode`                         | Required. The dashboards and builders that use this connection.                                                                             |

Pass `token`, `getToken`, or both. A new `token` gets a new query client with an empty cache,
because it may belong to another user.

### `Dashboard`

Shows a dashboard, read-only. Its props are either `{ dashboardId: string }`, to load a saved
dashboard from the API, or `{ config: DashboardConfig }`, to show one directly. TypeScript rejects
both at once.

### `DashboardBuilder`

Takes the same props as `Dashboard`, plus:

| Prop     | Type                                | Description                                                               |
| -------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `mode`   | `'view' \| 'edit'`                  | `edit` starts an editor in the builder. Viewers always get the dashboard. |
| `onSave` | `(config: DashboardConfig) => void` | Called after a save with the dashboard as the API stored it.              |

An editor (a token with `role: 'editor'`) gets an **Edit dashboard** button. In the builder they
drag widgets by their handle, resize them from the corner, add widgets from the palette, change
each one in its settings panel, and save or cancel. Editing needs a container at least 900 px wide;
on a narrower one the builder says so and shows the dashboard.

## The custom element

The script-tag build `dist/dashkit.js` bundles React and every dependency. Loading it defines
`<dashkit-dashboard>` and the `DashKit` global. A bundler gets the same with
`import '@dashkit/sdk/element'`, which also adds the element's TypeScript types.

```html
<dashkit-dashboard
  api-url="https://analytics.example.com"
  dashboard-id="overview"
></dashkit-dashboard>
<script src="dashkit.js"></script>
<script>
  const dashboard = document.querySelector('dashkit-dashboard');
  dashboard.getToken = () => fetch('/api/dashkit-token').then((response) => response.text());
  dashboard.theme = { mode: 'auto', light: { primary: '#4f46e5' } };
  dashboard.addEventListener('dashkit:filterchange', (event) => console.log(event.detail));
</script>
```

The dashboard renders in a shadow root, so the page's CSS cannot change it and its CSS cannot
change the page. The element loads nothing until it has an API URL, a dashboard and a token or
`getToken`, so properties may be set after the element is in the page.

| Kind      | Name                   | Type                           | Description                                                                              |
| --------- | ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| Attribute | `api-url`              | string                         | Base URL of the data API.                                                                |
| Attribute | `dashboard-id`         | string                         | The saved dashboard to show, unless `config` supplies one.                               |
| Attribute | `token`                | string                         | An embed token, for pages that do not set `getToken`.                                    |
| Attribute | `mode`                 | `view` \| `edit`               | `edit` opens the builder when the token's role is `editor`.                              |
| Attribute | `color-scheme`         | `light` \| `dark` \| `auto`    | Overrides the theme's `mode`.                                                            |
| Property  | `theme`                | `ThemeInput`                   | The theme, as `DashKitProvider` takes it.                                                |
| Property  | `config`               | `DashboardConfig`              | A dashboard to show directly, in place of `dashboard-id`.                                |
| Property  | `getToken`             | `() => Promise<string>`        | Called on start and once after a 401 response to get a fresh token.                      |
| Method    | `setFilters(filters)`  |                                | Replaces the active cross-filters, as a click on a chart would.                          |
| Method    | `clearFilters()`       |                                | Removes every active cross-filter.                                                       |
| Method    | `refresh()`            |                                | Forgets every cached result and loads the dashboard and its data again, keeping filters. |
| Event     | `dashkit:ready`        | `CustomEvent<undefined>`       | The dashboard first shows its content or its error. Again after `refresh()`.             |
| Event     | `dashkit:filterchange` | `CustomEvent<ActiveFilter[]>`  | The filters changed, by a click or through `setFilters`.                                 |
| Event     | `dashkit:save`         | `CustomEvent<DashboardConfig>` | An editor saved; the detail is the config as stored.                                     |
| Event     | `dashkit:error`        | `CustomEvent<DashKitError>`    | A request failed for good, or the dashboard could not be read.                           |

Every event bubbles and crosses the shadow root, so a listener on the element or on `document`
hears it. With the element entry imported, TypeScript knows each event's `detail` type,
`document.querySelector('dashkit-dashboard')` returns a `DashKitElement`, and JSX accepts the tag.

### `DashKit.mount(container, options)`

For pages that would rather call a function than write the tag. It adds a `<dashkit-dashboard>`
to `container`, applies `options` (a `DashKitOptions`: `apiUrl`, `token` or `getToken`,
`dashboardId` or `config`, `mode`, `theme`, and the `onFilterChange`, `onSave` and `onError`
callbacks), and returns a handle:

| Member                                               | Description                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `element`                                            | The `<dashkit-dashboard>` that was added.                               |
| `update(options)`                                    | Changes some options and keeps the rest.                                |
| `setFilters(filters)`, `clearFilters()`, `refresh()` | As on the element.                                                      |
| `unmount()`                                          | Removes the dashboard and releases its charts, observers and listeners. |

## Types

The npm entry exports these types; the Storybook API reference lists every property.

| Type                                                                        | What it is                                                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DashboardConfig`, `WidgetConfig`, `LayoutItem`                             | A dashboard as JSON; see [Dashboard config](#dashboard-config).                                                             |
| `WidgetType`, `Breakpoint`                                                  | `bar`, `line`, `pie`, `table`, `kpi`; `lg`, `md`, `sm`, `xs`.                                                               |
| `Query`, `Filter`, `QueryResult`                                            | A request for aggregated data and its answer; see [HTTP API](#http-api).                                                    |
| `DimensionField`, `MeasureField`, `Aggregation`, `FilterOperator`, `Scalar` | The vocabulary of a query; see [Data model](#data-model).                                                                   |
| `ActiveFilter`                                                              | A cross-filter: `{ field, values, sourceWidgetId }`.                                                                        |
| `DashKitTheme`, `ThemeInput`, `ColorTokens`, `DeepPartial`                  | A complete theme, the partial one hosts pass, and its colours.                                                              |
| `TokenClaims`                                                               | What a verified embed token says: `sub`, `tenantId`, `role`, `scopes`, `iat`, `exp`.                                        |
| `DashKitError`                                                              | `{ code, message }`, with `code` one of `UNAUTHENTICATED`, `FORBIDDEN`, `INVALID_QUERY`, `NOT_FOUND`, `NETWORK`, `UNKNOWN`. |
| `DashKitOptions`, `DashKitHandle`                                           | The options of `DashKit.mount()` and the handle it returns.                                                                 |
| `DashKitElement`, `DashKitElementAttributes`, `DashKitElementEventMap`      | The custom element, its attributes and its events.                                                                          |
| `DashKitProviderProps`, `DashboardProps`, `DashboardBuilderProps`           | The components' props.                                                                                                      |

## HTTP API

Both install paths call the same API. The demo's is `apps/mock-api`, a Node server on port 4000
(`PORT` changes it); Storybook and the unit tests run the same code inside the browser or the test
process through MSW. Every route except `/health` and `/auth/demo-token` needs
`Authorization: Bearer <token>`.

| Method | Path               | Purpose                                                   | Notes                                                                                                     |
| ------ | ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| GET    | `/health`          | Liveness check                                            | `{ "status": "ok" }`                                                                                      |
| POST   | `/auth/demo-token` | Signs a token for a demo user                             | **Demo only: stands in for the host's backend.** Body `{ "userId": "ravi" }`, answer `{ "token": "..." }` |
| GET    | `/meta`            | The dimensions, measures and aggregations a query may use | Each with its label; measures with their format and default aggregation                                   |
| POST   | `/query`           | Runs a `Query` and returns a `QueryResult`                | The token's row scope is applied before the query's own filters                                           |
| GET    | `/dashboards`      | The caller's tenant's dashboards                          | `[{ "id", "title" }]`                                                                                     |
| GET    | `/dashboards/:id`  | One dashboard config                                      | 404 if it is not in the caller's tenant                                                                   |
| PUT    | `/dashboards/:id`  | Creates or replaces a dashboard                           | Editors only. Checked before it is stored; the API adds `updatedAt` and `updatedBy`                       |
| DELETE | `/dashboards/:id`  | Deletes a dashboard                                       | Editors only. 204 with no body                                                                            |

### Example

Signed in as Ravi, who may see South Asia and East Asia & Pacific only. This is the demo API's
actual answer:

```http
POST /query
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "dataset": "wdi",
  "measures": [{ "field": "population", "agg": "sum" }],
  "dimensions": ["region"],
  "filters": [{ "field": "year", "op": "eq", "value": 2024 }],
  "orderBy": [{ "field": "population", "direction": "desc" }]
}
```

```json
{
  "columns": [
    { "name": "region", "role": "dimension", "label": "Region" },
    { "name": "population", "role": "measure", "label": "Population", "format": "number" }
  ],
  "rows": [
    { "region": "East Asia & Pacific", "population": 2364906569 },
    { "region": "South Asia", "population": 1677384532 }
  ],
  "meta": { "rowCount": 2, "truncated": false, "durationMs": 2 }
}
```

The same query signed in as Asha returns all seven regions.

### Query rules

- `measures` needs at least one entry. `agg` defaults to the measure's default aggregation, and
  `alias` renames the result column.
- `dimensions` group the rows, one result row per combination. Without them, all matching rows
  become one.
- `filters` all apply. `in`, `notIn` and `between` take an array; `between` is `[low, high]`, both
  included. Missing values never match a comparison.
- `orderBy` may name any of the query's own columns: its dimensions, and its measures by alias
  where they have one. Missing values sort last either way. Column names must be unique.
- `limit` is 1 to 1000 and defaults to 1000. `meta.truncated` says whether rows were cut off.
- Unknown keys in the body are ignored; unknown values are refused.

### Errors

Every error has the same shape:

```json
{ "error": { "code": "FORBIDDEN", "message": "Only editors can change dashboards" } }
```

| HTTP | Code              | When                                                                           |
| ---- | ----------------- | ------------------------------------------------------------------------------ |
| 400  | `INVALID_QUERY`   | Unknown field, operator or aggregation; a malformed body; an invalid dashboard |
| 401  | `UNAUTHENTICATED` | Missing, malformed, badly signed or expired token                              |
| 403  | `FORBIDDEN`       | A viewer tries to save or delete a dashboard                                   |
| 404  | `NOT_FOUND`       | Unknown route, or a dashboard that does not exist in the caller's tenant       |
| 500  | `UNKNOWN`         | Anything else; the message is a generic "Internal error"                       |

The SDK adds `NETWORK` for a request that never got an answer. Column-level scope (refusing a
measure outside the token's `scopes.measures`) is a stretch requirement and is not implemented;
the API ignores that claim.

### Server settings

| Variable                  | Default                                       | Purpose                                                               |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `PORT`                    | `4000`                                        | The port to listen on.                                                |
| `DASHKIT_TOKEN_SECRET`    | a random secret for each start                | The HS256 signing secret. Without it, tokens stop working on restart. |
| `DASHKIT_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:6006` | Browser origins allowed to call the API (CORS), comma-separated.      |

## Data model

The data is a snapshot of the World Bank's World Development Indicators, fetched from
`https://api.worldbank.org/v2` by `pnpm data:fetch` and committed as
`packages/mock-engine/data/wdi.json`: 5,425 rows, one per country and year, for 217 countries from
2000 to 2024. A year is kept only if every indicator has values for at least half the countries.
Missing values are `null`, never `0`.

| Dimension     | Label        | Values                                               |
| ------------- | ------------ | ---------------------------------------------------- |
| `country`     | Country      | Country or economy name, as the World Bank writes it |
| `region`      | Region       | One of the World Bank's seven regions                |
| `incomeLevel` | Income level | Low, lower middle, upper middle or high income       |
| `year`        | Year         | 2000 to 2024                                         |

| Measure             | Label                   | Indicator        | Format   | Default aggregation |
| ------------------- | ----------------------- | ---------------- | -------- | ------------------- |
| `gdp`               | GDP (US$)               | `NY.GDP.MKTP.CD` | currency | sum                 |
| `gdpPerCapita`      | GDP per capita (US$)    | `NY.GDP.PCAP.CD` | currency | avg                 |
| `population`        | Population              | `SP.POP.TOTL`    | number   | sum                 |
| `lifeExpectancy`    | Life expectancy (years) | `SP.DYN.LE00.IN` | number   | avg                 |
| `internetUsers`     | Internet users (%)      | `IT.NET.USER.ZS` | percent  | avg                 |
| `unemployment`      | Unemployment (%)        | `SL.UEM.TOTL.ZS` | percent  | avg                 |
| `electricityAccess` | Electricity access (%)  | `EG.ELC.ACCS.ZS` | percent  | avg                 |

Percentages are on the 0 to 100 scale the World Bank publishes. Aggregations are `sum`, `avg`,
`min`, `max` and `count`; all of them skip `null` values, so `count` counts the rows that have a
value. Each row also stores its region's code (`SAS`, `EAS`, `ECS` and so on), which row-level
security matches against the token's `scopes.regions`. It cannot be queried.

The demo has three tenants, each with one user and the same starting dashboard:

| User    | Tenant         | Brand        | Role   | Regions                                        |
| ------- | -------------- | ------------ | ------ | ---------------------------------------------- |
| `asha`  | `acme`         | Acme Global  | editor | all (`'*'`)                                    |
| `ravi`  | `asiainsights` | AsiaInsights | viewer | `SAS`, `EAS` (South Asia, East Asia & Pacific) |
| `elena` | `eurostat`     | EuroStat Co  | editor | `ECS` (Europe & Central Asia)                  |

## Dashboard config

A dashboard is one JSON object, a `DashboardConfig`. The viewer renders it, the builder edits a
copy of it, and the API stores what the builder saves unchanged apart from `updatedAt` and
`updatedBy`. This excerpt is from the dashboard every demo tenant starts with:

<!-- prettier-ignore -->
```jsonc
{
  "id": "overview", // what dashboardId and the dashboard-id attribute refer to
  "schemaVersion": 1, // the format's version; a newer one is refused, not misread
  "title": "World development overview",
  "description": "World Bank indicators for 2024, with life expectancy since 2000.",
  "widgets": [
    {
      "id": "population-by-region", // unique within the dashboard; layout items refer to it
      "type": "bar", // bar, line, pie, table or kpi
      "title": "Population by region",
      "options": { "orientation": "horizontal" },
      "query": {
        "dataset": "wdi",
        "measures": [{ "field": "population", "agg": "sum" }],
        "dimensions": ["region"], // a bar or pie filters the others by its first dimension
        "filters": [{ "field": "year", "op": "eq", "value": 2024 }],
        "orderBy": [{ "field": "population", "direction": "desc" }]
      }
      // no crossFilter: a bar emits and listens by default
    },
    {
      "id": "total-population",
      "type": "kpi", // one number; it listens to cross-filters but never emits
      "title": "Total population",
      "query": {
        "dataset": "wdi",
        "measures": [{ "field": "population", "agg": "sum" }],
        "filters": [{ "field": "year", "op": "eq", "value": 2024 }]
      }
    }
    // … "GDP by income level" (pie), "Average life expectancy" (line), "Countries" (table)
  ],
  "layouts": {
    // 12 columns at lg; x, y, w and h count columns and 72 px rows
    "lg": [
      { "i": "total-population", "x": 0, "y": 0, "w": 3, "h": 3 },
      { "i": "population-by-region", "x": 3, "y": 0, "w": 9, "h": 3 }
      // …
    ]
    // md (8 columns), sm (4) and xs (1) are optional and derived from lg when missing
  }
}
```

| Field                    | Required | Description                                                                                                                                                                                                                                                  |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                     | yes      | Must match the address it is saved under.                                                                                                                                                                                                                    |
| `schemaVersion`          | yes      | `1`. The SDK refuses to show a newer version.                                                                                                                                                                                                                |
| `title`, `description`   | title    | Shown in the dashboard's header. The title may not be empty.                                                                                                                                                                                                 |
| `widgets`                | yes      | Each with a unique `id`, a `type`, a `title`, a `query`, and optionally `description`, `options` and `crossFilter`.                                                                                                                                          |
| `widgets[].options`      | no       | `orientation` and `stacked` for bar charts; `donut` for pies; `showLegend` for bar, line and pie charts, where the legend otherwise shows only for several measures, and never for a pie, whose slices are labelled. `pageSize` is accepted but not applied. |
| `widgets[].crossFilter`  | no       | `emit` (default true for bar and pie, false otherwise) and `listen` (default true).                                                                                                                                                                          |
| `layouts.lg`             | yes      | Exactly one `{ i, x, y, w, h }` item per widget. `minW` and `minH` are accepted; each widget type's own minimum size applies instead.                                                                                                                        |
| `layouts.md`, `sm`, `xs` | no       | Layouts for narrower containers. The builder saves only `lg`.                                                                                                                                                                                                |
| `defaultFilters`         | no       | `Filter`s applied to every widget, including those that ignore cross-filters, and not shown as chips.                                                                                                                                                        |
| `updatedAt`, `updatedBy` | no       | Set by the API on save: an ISO 8601 time and the saver's `sub`.                                                                                                                                                                                              |

The API and the builder check the same rules before a save, and the builder lists every problem at
once instead of sending a config the API would refuse.
