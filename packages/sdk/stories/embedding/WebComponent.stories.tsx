// Defines <dashkit-dashboard>, as `import '@dashkit/sdk/element'` or the script tag does in a host.
import '../../src/element';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef } from 'react';
import { fn } from 'storybook/test';
import type {
  ActiveFilter,
  DashboardConfig,
  DashKitElement,
  DashKitError,
  ThemeInput,
} from '../../src';
import { API_URL, themeFor } from '../support';

interface ElementArgs {
  dashboardId: string;
  mode: 'view' | 'edit';
  colorScheme: 'theme' | 'light' | 'dark' | 'auto';
  onReady: () => void;
  onFilterChange: (filters: ActiveFilter[]) => void;
  onSave: (config: DashboardConfig) => void;
  onError: (error: DashKitError) => void;
}

interface LiveElementProps extends ElementArgs {
  token: string;
  theme: ThemeInput;
}

function LiveElement({
  token,
  theme,
  onReady,
  onFilterChange,
  onSave,
  onError,
  ...attributes
}: LiveElementProps) {
  const ref = useRef<DashKitElement>(null);
  // Objects reach the element as properties, the way a host page sets them.
  useEffect(() => {
    if (ref.current) ref.current.theme = theme;
  }, [theme]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const ready = () => onReady();
    const filterChange = (event: CustomEvent<ActiveFilter[]>) => onFilterChange(event.detail);
    const save = (event: CustomEvent<DashboardConfig>) => onSave(event.detail);
    const error = (event: CustomEvent<DashKitError>) => onError(event.detail);
    element.addEventListener('dashkit:ready', ready);
    element.addEventListener('dashkit:filterchange', filterChange);
    element.addEventListener('dashkit:save', save);
    element.addEventListener('dashkit:error', error);
    return () => {
      element.removeEventListener('dashkit:ready', ready);
      element.removeEventListener('dashkit:filterchange', filterChange);
      element.removeEventListener('dashkit:save', save);
      element.removeEventListener('dashkit:error', error);
    };
  }, [onReady, onFilterChange, onSave, onError]);
  return (
    <dashkit-dashboard
      ref={ref}
      api-url={API_URL}
      token={token}
      dashboard-id={attributes.dashboardId}
      mode={attributes.mode}
      color-scheme={attributes.colorScheme === 'theme' ? undefined : attributes.colorScheme}
    />
  );
}

/** The markup a page would use for the current controls. */
function pageSource({ dashboardId, mode, colorScheme }: ElementArgs) {
  const attributes = [
    'api-url="https://analytics.example.com"',
    `dashboard-id="${dashboardId}"`,
    ...(mode === 'edit' ? ['mode="edit"'] : []),
    ...(colorScheme !== 'theme' ? [`color-scheme="${colorScheme}"`] : []),
  ];
  return `<dashkit-dashboard
  ${attributes.join('\n  ')}
></dashkit-dashboard>
<script src="dashkit.js"></script>
<script>
  const dashboard = document.querySelector('dashkit-dashboard');
  // Your backend mints the embed token for the signed-in user.
  dashboard.getToken = () => fetch('/api/dashkit-token').then((response) => response.text());
  dashboard.theme = { mode: 'auto', light: { primary: '#4f46e5' } };
  dashboard.addEventListener('dashkit:filterchange', (event) => console.log(event.detail));
</script>`;
}

/**
 * `<dashkit-dashboard>`, the custom element for pages without React, live in the story. The
 * controls change its attributes; the toolbar's brand and mode reach it as its `theme` property,
 * and its signed-in user as its `token` attribute. Its four events appear in the Actions panel.
 *
 * The dashboard renders in a shadow root, so the page's CSS does not reach it.
 */
const meta = {
  title: 'Embedding/Web Component',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        language: 'html',
        transform: (_code: string, { args }: { args: ElementArgs }) => pageSource(args),
      },
    },
  },
  args: {
    dashboardId: 'overview',
    mode: 'view',
    colorScheme: 'theme',
    onReady: fn(),
    onFilterChange: fn(),
    onSave: fn(),
    onError: fn(),
  },
  argTypes: {
    dashboardId: { description: 'The `dashboard-id` attribute: the saved dashboard to show.' },
    mode: {
      description: 'The `mode` attribute. `edit` opens the builder when the user is an editor.',
      control: 'inline-radio',
      options: ['view', 'edit'],
    },
    colorScheme: {
      description:
        "The `color-scheme` attribute, which overrides the theme's mode. `theme` leaves it out.",
      control: 'inline-radio',
      options: ['theme', 'light', 'dark', 'auto'],
    },
    onReady: { description: 'Listens for `dashkit:ready`.' },
    onFilterChange: { description: 'Listens for `dashkit:filterchange`; receives `event.detail`.' },
    onSave: { description: 'Listens for `dashkit:save`; receives `event.detail`.' },
    onError: { description: 'Listens for `dashkit:error`; receives `event.detail`.' },
  },
  render: (args, { loaded, globals }) => (
    <LiveElement
      {...args}
      token={loaded.token as string}
      theme={themeFor(globals.brand as string, globals.mode as string)}
    />
  ),
} satisfies Meta<ElementArgs>;

export default meta;

export const WebComponent: StoryObj<typeof meta> = { name: 'Web Component' };
