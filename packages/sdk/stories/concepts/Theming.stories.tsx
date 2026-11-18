import { demoBrands } from '@dashkit/mock-engine/brands';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dashboard, DashKitProvider, type DashboardConfig, type ThemeInput } from '../../src';
import { findLowContrastPairs } from '../../src/core/theme/contrast';
import { createTheme, resolveTheme } from '../../src/core/theme/create-theme';
import { defaultTheme } from '../../src/core/theme/defaults';
import { ThemeRoot } from '../../src/react/ThemeRoot';
import { WidgetFrame } from '../../src/react/widgets/WidgetFrame';
import { API_URL } from '../support';

const meta = {
  title: 'Concepts/Theming',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

interface PlaygroundArgs {
  mode: 'light' | 'dark' | 'auto';
  lightPrimary: string;
  darkPrimary: string;
  radius: number;
  fontFamily: string;
  baseFontSize: number;
  brandName: string;
}

function playgroundTheme(args: PlaygroundArgs): ThemeInput {
  return {
    mode: args.mode,
    light: { primary: args.lightPrimary },
    dark: { primary: args.darkPrimary },
    shape: { radius: args.radius },
    typography: { fontFamily: args.fontFamily, baseFontSize: args.baseFontSize },
    brand: { name: args.brandName },
  };
}

/**
 * Change the controls to theme the dashboard; the theme object below is what a host would pass.
 * Colours that leave text below the WCAG AA contrast of 4.5:1 are listed, as the SDK warns in the
 * console during development. Brand and Mode in the toolbar do not apply here.
 */
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    mode: 'light',
    lightPrimary: defaultTheme.light.primary,
    darkPrimary: defaultTheme.dark.primary,
    radius: defaultTheme.shape.radius,
    fontFamily: defaultTheme.typography.fontFamily,
    baseFontSize: defaultTheme.typography.baseFontSize,
    brandName: 'Your product',
  },
  argTypes: {
    mode: {
      description: "`mode`. `auto` follows the operating system's light or dark setting.",
      control: 'inline-radio',
      options: ['light', 'dark', 'auto'],
    },
    lightPrimary: {
      description: '`light.primary`: buttons and focus outlines in light mode.',
      control: 'color',
    },
    darkPrimary: {
      description: '`dark.primary`: the same in dark mode, where it usually needs to be lighter.',
      control: 'color',
    },
    radius: {
      description: '`shape.radius`, in px.',
      control: { type: 'range', min: 0, max: 24, step: 1 },
    },
    fontFamily: {
      description: '`typography.fontFamily`. The page must load any web font it names.',
    },
    baseFontSize: {
      description: '`typography.baseFontSize`, in px.',
      control: { type: 'range', min: 12, max: 20, step: 1 },
    },
    brandName: { description: "`brand.name`, shown in the dashboard's header." },
  },
  render: (args, { loaded }) => {
    const theme = playgroundTheme(args);
    const lowContrast = (['light', 'dark'] as const).flatMap((mode) =>
      findLowContrastPairs(resolveTheme(createTheme({ ...theme, mode }), false).colors).map(
        (pair) => `${mode}: ${pair}`,
      ),
    );
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <DashKitProvider apiUrl={API_URL} token={loaded.token as string} theme={theme}>
          <Dashboard dashboardId="overview" />
        </DashKitProvider>
        <p role="status" style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
          {lowContrast.length === 0
            ? 'Every text colour meets the WCAG AA contrast of 4.5:1 in both modes.'
            : `Below the WCAG AA contrast of 4.5:1: ${lowContrast.join('; ')}.`}
        </p>
        <pre style={{ margin: 0 }}>{`const theme = ${JSON.stringify(theme, null, 2)};`}</pre>
      </div>
    );
  },
};

/**
 * The same widgets under each demo brand in light and dark mode. Surfaces, text, fonts, corner
 * radius and chart colours all come from the brand's theme.
 */
export const BrandsAndModes: StoryObj = {
  name: 'Brands and modes',
  render: (_args, { loaded }) => {
    const { widgets } = loaded.dashboard as DashboardConfig;
    const shown = widgets.filter((widget) => ['kpi', 'bar', 'pie'].includes(widget.type));
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {Object.entries(demoBrands).flatMap(([brandId, brand]) =>
          (['light', 'dark'] as const).map((mode) => (
            <DashKitProvider
              key={`${brandId}-${mode}`}
              apiUrl={API_URL}
              token={loaded.token as string}
              theme={{ ...brand, mode }}
            >
              <ThemeRoot>
                <div style={{ display: 'grid', gap: 12, padding: 16 }}>
                  <strong>{`${brand.brand?.name} · ${mode}`}</strong>
                  <div style={{ display: 'flex', gap: 16, height: 260 }}>
                    {shown.map((widget) => (
                      <div key={widget.id} style={{ flex: widget.type === 'kpi' ? 1 : 2 }}>
                        <WidgetFrame widget={widget} />
                      </div>
                    ))}
                  </div>
                </div>
              </ThemeRoot>
            </DashKitProvider>
          )),
        )}
      </div>
    );
  },
};
