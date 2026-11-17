import { demoBrands } from '@dashkit/mock-engine/brands';
import { describe, expect, it } from 'vitest';
import { findLowContrastPairs } from './contrast';
import { createTheme, resolveTheme, toCssVars } from './create-theme';
import { defaultTheme } from './defaults';

describe('theme', () => {
  it('FR-2.5 fills every missing value from the defaults', () => {
    expect(createTheme()).toEqual(defaultTheme);

    const theme = createTheme({ light: { primary: 'rebeccapurple' }, shape: { radius: 0 } });
    expect(theme.light).toEqual({ ...defaultTheme.light, primary: 'rebeccapurple' });
    expect(theme.dark).toEqual(defaultTheme.dark);
    expect(theme.shape.radius).toBe(0);
    expect(theme.typography).toEqual(defaultTheme.typography);
  });

  it('FR-2.5 replaces the chart palette as a whole', () => {
    const palette = ['#111111', '#222222'];
    expect(createTheme({ dark: { chart: palette } }).dark.chart).toEqual(palette);
  });

  it('FR-2.2 resolves auto mode from the system setting', () => {
    const theme = createTheme({ mode: 'auto' });
    expect(resolveTheme(theme, true)).toMatchObject({ mode: 'dark', colors: theme.dark });
    expect(resolveTheme(theme, false)).toMatchObject({ mode: 'light', colors: theme.light });
    expect(resolveTheme(createTheme({ mode: 'light' }), true).mode).toBe('light');
  });

  it('FR-2.1 turns colours, fonts and radius into --dk- variables', () => {
    const vars = toCssVars(
      resolveTheme(
        createTheme({
          mode: 'dark',
          dark: { surfaceRaised: '#123456' },
          typography: { headingFontFamily: 'Georgia, serif', baseFontSize: 16 },
          shape: { radius: 4 },
        }),
        false,
      ),
    );
    expect(vars).toMatchObject({
      '--dk-color-scheme': 'dark',
      '--dk-color-surface-raised': '#123456',
      '--dk-color-primary-contrast': defaultTheme.dark.primaryContrast,
      '--dk-font-family-heading': 'Georgia, serif',
      '--dk-font-size-base': '16px',
      '--dk-radius': '4px',
    });
    expect(Object.keys(vars).every((name) => name.startsWith('--dk-'))).toBe(true);
  });

  it.each(Object.entries({ default: {}, ...demoBrands }))(
    'NFR-A3 the %s theme meets WCAG AA contrast in both modes',
    (_name, input) => {
      const theme = createTheme(input);
      expect(findLowContrastPairs(theme.light)).toEqual([]);
      expect(findLowContrastPairs(theme.dark)).toEqual([]);
    },
  );

  it('FR-2.7 ships three demo brands that set every colour in both modes, fonts and a logo', () => {
    expect(Object.keys(demoBrands)).toEqual(['acme', 'asiainsights', 'eurostat']);
    for (const brand of Object.values(demoBrands)) {
      expect(Object.keys(brand.light ?? {}).sort()).toEqual(Object.keys(defaultTheme.light).sort());
      expect(Object.keys(brand.dark ?? {}).sort()).toEqual(Object.keys(defaultTheme.dark).sort());
      expect(brand.typography?.fontFamily).toBeTypeOf('string');
      expect(brand.typography?.headingFontFamily).toBeTypeOf('string');
      expect(brand.brand?.name).toBeTypeOf('string');
      expect(brand.brand?.logoUrl).toBeTypeOf('string');
    }
  });

  it('FR-2.8 reports text that fails AA contrast', () => {
    const colors = { ...defaultTheme.light, textMuted: '#bbbbbb', primary: '#777777' };
    expect(findLowContrastPairs(colors)).toEqual([
      'textMuted on surface',
      'primaryContrast on primary',
    ]);
    expect(
      findLowContrastPairs({ ...colors, textMuted: 'gray', primary: 'hsl(0 0% 47%)' }),
    ).toEqual([]);
  });
});
