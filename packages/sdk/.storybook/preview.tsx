import { demoBrands } from '@dashkit/mock-engine/brands';
import { createMockApiHandlers } from '@dashkit/mock-engine/msw';
import type { Preview } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { DashKitProvider, type DashKitTheme, type ThemeInput } from '../src';
import { QueryClient } from '../src/core/query-client';
import { API_URL, LOADING_API_URL, OFFLINE_API_URL } from '../stories/mock-api';

const worker = setupWorker(
  ...createMockApiHandlers(API_URL),
  http.all(`${LOADING_API_URL}/*`, () => delay('infinite')),
  http.all(`${OFFLINE_API_URL}/*`, () => HttpResponse.error()),
);

async function signIn(userId: string) {
  const response = await fetch(`${API_URL}/auth/demo-token`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  const { token } = (await response.json()) as { token: string };
  const dashboard = await new QueryClient({ apiUrl: API_URL, token }).loadDashboard('overview');
  return { token, dashboard };
}

function themeFor(brandId: string, mode: string): ThemeInput {
  const brand = demoBrands[brandId] ?? {};
  return mode === 'brand' ? brand : { ...brand, mode: mode as DashKitTheme['mode'] };
}

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  globalTypes: {
    brand: {
      description: 'Brand theme',
      toolbar: {
        title: 'Brand',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'default', title: 'DashKit default' },
          ...Object.entries(demoBrands).map(([value, brand]) => ({
            value,
            title: brand.brand?.name ?? value,
          })),
        ],
      },
    },
    mode: {
      description: 'Colour mode',
      toolbar: {
        title: 'Mode',
        icon: 'contrast',
        dynamicTitle: true,
        items: [
          { value: 'brand', title: 'Brand default' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'auto', title: 'Follow system' },
        ],
      },
    },
  },
  initialGlobals: { brand: 'default', mode: 'brand' },
  async beforeAll() {
    await worker.start({
      serviceWorker: { url: 'mockServiceWorker.js' },
      quiet: true,
      onUnhandledFrame: 'bypass',
    });
  },
  loaders: [({ parameters }) => signIn((parameters.user as string | undefined) ?? 'asha')],
  decorators: [
    (Story, { globals, parameters, loaded }) => (
      <DashKitProvider
        apiUrl={(parameters.apiUrl as string | undefined) ?? API_URL}
        token={(parameters.token as string | undefined) ?? (loaded.token as string)}
        theme={themeFor(globals.brand as string, globals.mode as string)}
      >
        <Story />
      </DashKitProvider>
    ),
  ],
};

export default preview;
