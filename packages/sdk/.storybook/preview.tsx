import { demoBrands } from '@dashkit/mock-engine/brands';
import { createMockApiHandlers } from '@dashkit/mock-engine/msw';
import type { Preview } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { DashKitProvider, type ActiveFilter, type DashKitProviderProps } from '../src';
import {
  API_URL,
  demoUserItems,
  LOADING_API_URL,
  OFFLINE_API_URL,
  signIn,
  themeFor,
} from '../stories/support';

const worker = setupWorker(
  ...createMockApiHandlers(API_URL),
  http.all(`${LOADING_API_URL}/*`, () => delay('infinite')),
  http.all(`${OFFLINE_API_URL}/*`, () => HttpResponse.error()),
);

// Stories that play the host set the filters through their args and receive every change.
function hostProps({
  filters,
  onFilterChange,
}: Record<string, unknown>): Pick<DashKitProviderProps, 'filters' | 'onFilterChange'> {
  return {
    ...(Array.isArray(filters) && { filters: filters as ActiveFilter[] }),
    ...(typeof onFilterChange === 'function' && {
      onFilterChange: onFilterChange as (filters: ActiveFilter[]) => void,
    }),
  };
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    options: {
      storySort: {
        order: [
          'Introduction',
          'Getting started',
          'Concepts',
          ['Theming', 'Security model', 'Cross-filtering', 'Dashboard config'],
          'Widgets',
          ['Bar chart', 'Line chart', 'Pie chart', 'Table', 'KPI'],
          'Dashboard',
          'Builder',
          'Embedding',
          'API reference',
        ],
      },
    },
  },
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
    user: {
      description: 'Signed-in user. Each one gets their own embed token from the mock API.',
      toolbar: { title: 'User', icon: 'user', dynamicTitle: true, items: demoUserItems },
    },
  },
  initialGlobals: { brand: 'default', mode: 'brand', user: 'asha' },
  async beforeAll() {
    await worker.start({
      serviceWorker: { url: 'mockServiceWorker.js' },
      quiet: true,
      onUnhandledFrame: 'bypass',
    });
  },
  // Loaders run again on every change of the toolbar, so switching user signs in again.
  loaders: [({ globals }) => signIn(globals.user as string)],
  decorators: [
    (Story, { args, globals, parameters, loaded }) => (
      <DashKitProvider
        apiUrl={(parameters.apiUrl as string | undefined) ?? API_URL}
        token={(parameters.token as string | undefined) ?? (loaded.token as string)}
        theme={themeFor(globals.brand as string, globals.mode as string)}
        {...hostProps(args)}
      >
        <Story />
      </DashKitProvider>
    ),
  ],
};

export default preview;
