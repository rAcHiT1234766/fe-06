import type { ColorTokens, DashKitTheme, ThemeInput } from '../types';
import { defaultTheme } from './defaults';

// A theme with `auto` settled to the colours actually shown.
export interface ResolvedTheme {
  mode: 'light' | 'dark';
  colors: ColorTokens;
  typography: DashKitTheme['typography'];
  shape: DashKitTheme['shape'];
  brand: DashKitTheme['brand'];
}

// Every section is flat (the chart palette is replaced as a whole), so one level of spreading is a
// complete deep merge.
export function createTheme(input: ThemeInput = {}): DashKitTheme {
  return {
    mode: input.mode ?? defaultTheme.mode,
    light: { ...defaultTheme.light, ...input.light },
    dark: { ...defaultTheme.dark, ...input.dark },
    typography: { ...defaultTheme.typography, ...input.typography },
    shape: { ...defaultTheme.shape, ...input.shape },
    brand: { ...defaultTheme.brand, ...input.brand },
  };
}

export function resolveTheme(theme: DashKitTheme, systemPrefersDark: boolean): ResolvedTheme {
  const mode = theme.mode === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : theme.mode;
  const { typography, shape, brand } = theme;
  return { mode, colors: theme[mode], typography, shape, brand };
}

const toKebabCase = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

// Chart colours are left out: charts draw on a canvas and take them from the theme object instead.
export function toCssVars({
  mode,
  colors,
  typography,
  shape,
}: ResolvedTheme): Record<string, string> {
  const vars: Record<string, string> = {
    '--dk-color-scheme': mode,
    '--dk-font-family': typography.fontFamily,
    '--dk-font-family-heading': typography.headingFontFamily,
    '--dk-font-size-base': `${typography.baseFontSize}px`,
    '--dk-radius': `${shape.radius}px`,
  };
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === 'string') vars[`--dk-color-${toKebabCase(name)}`] = value;
  }
  return vars;
}
