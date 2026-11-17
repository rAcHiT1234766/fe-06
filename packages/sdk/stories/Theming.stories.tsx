import { demoBrands } from '@dashkit/mock-engine/brands';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashKitProvider, type DashboardConfig } from '../src';
import { ThemeRoot } from '../src/react/ThemeRoot';
import { WidgetFrame } from '../src/react/widgets/WidgetFrame';
import { API_URL } from './mock-api';

const meta = {
  title: 'Theming',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

/**
 * The same widgets under each demo brand in light and dark mode. Surfaces, text, fonts, corner
 * radius and chart colours all come from the brand's theme.
 */
export const BrandsAndModes: StoryObj = {
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
