# @dashkit/sdk

Embeddable, white-label analytics dashboards for React apps and plain HTML pages. Each dashboard is
themed with your brand, filters across its charts when a user clicks one, and only ever shows the
rows that the signed-in user's embed token allows.

## In a React app

```sh
npm install @dashkit/sdk
```

```tsx
import { Dashboard, DashKitProvider } from '@dashkit/sdk';

// Your backend signs the embed token. The SDK holds it in memory and never signs anything.
const getToken = () => fetch('/api/dashkit-token').then((response) => response.text());

export function Analytics() {
  return (
    <DashKitProvider
      apiUrl="https://analytics.example.com"
      getToken={getToken}
      theme={{ mode: 'auto', light: { primary: '#4f46e5' }, shape: { radius: 12 } }}
      onFilterChange={(filters) => console.log(filters)}
    >
      <Dashboard dashboardId="overview" />
    </DashKitProvider>
  );
}
```

React 18 and 19 are supported. Use `DashboardBuilder` instead of `Dashboard` to let users with
the `editor` role rearrange and configure widgets.

## In any page

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

`dashkit.js` is in this package at `dist/dashkit.js`, and a bundler loads it with
`import '@dashkit/sdk/element'`, which also brings the element's TypeScript types. The dashboard
renders inside a shadow root, so the page's CSS does not change it. `DashKit.mount(container,
options)` does the same from script.

## Fonts

The theme can name fonts, but the page must load them (for example with `@font-face` or a Google
Fonts link). A shadow root does not load fonts on its own.

## Security

Embed tokens are minted by your backend, which knows the signed-in user. The data API checks each
token and applies the user's tenant and region scope to every query, so the SDK and the page cannot
widen what a user sees.
