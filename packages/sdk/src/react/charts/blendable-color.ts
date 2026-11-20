import { color } from 'echarts/core';

/**
 * The colour in a form ECharts can blend. ECharts reads hex, RGB and HSL colours and names, but not
 * newer notations such as oklch(), which a theme may use; for those the browser draws one pixel in
 * the colour and its channels are read back. Where nothing can be drawn, the colour comes back as it
 * was.
 */
export function toBlendableColor(value: string): string {
  if ((color.parse(value) as number[] | undefined) !== undefined) return value;
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) return value;
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0, alpha = 255] = context.getImageData(0, 0, 1, 1).data;
  return color.stringify([red, green, blue, Math.round((alpha / 255) * 100) / 100], 'rgba');
}
