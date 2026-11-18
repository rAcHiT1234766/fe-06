import type { ColorTokens } from '../types';

const AA_NORMAL_TEXT = 4.5;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// WCAG 2 relative luminance. Theme colours may be any CSS colour, but only hex values can be
// checked without a browser, so other formats are skipped rather than guessed at.
function relativeLuminance(color: string): number | undefined {
  const hex = HEX_COLOR.exec(color)?.[1];
  if (!hex) return undefined;
  const digits = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map((start) => {
    const channel = parseInt(digits.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number | undefined {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  if (first === undefined || second === undefined) return undefined;
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

type ColorName = Exclude<keyof ColorTokens, 'chart'>;

const TEXT_PAIRS: [ColorName, ColorName][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'surface'],
  ['primaryContrast', 'primary'],
  // The builder's "Saved" and "Unsaved changes" sit on the background; error titles on a widget.
  ['success', 'background'],
  ['warning', 'background'],
  ['danger', 'surface'],
];

export function findLowContrastPairs(colors: ColorTokens): string[] {
  return TEXT_PAIRS.filter(([text, background]) => {
    const ratio = contrastRatio(colors[text], colors[background]);
    return ratio !== undefined && ratio < AA_NORMAL_TEXT;
  }).map(([text, background]) => `${text} on ${background}`);
}
