import { afterEach, describe, expect, it, vi } from 'vitest';
import { toBlendableColor } from './blendable-color';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toBlendableColor', () => {
  it('keeps a colour ECharts can read', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    for (const readable of ['#4f46e5', 'rgba(79, 70, 229, 0.5)', 'hsl(243, 75%, 59%)', 'white']) {
      expect(toBlendableColor(readable)).toBe(readable);
    }
    expect(getContext).not.toHaveBeenCalled();
  });

  it('reads any other colour back from a pixel the browser draws in it', () => {
    const drawn: string[] = [];
    const context = {
      set fillStyle(value: string) {
        drawn.push(value);
      },
      fillRect: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray([79, 70, 229, 128]) }),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    expect(toBlendableColor('oklch(51% 0.23 277 / 50%)')).toBe('rgba(79,70,229,0.5)');
    // ECharts does not read the newer way of writing rgb() either.
    toBlendableColor('rgb(79 70 229)');
    expect(drawn).toEqual(['oklch(51% 0.23 277 / 50%)', 'rgb(79 70 229)']);
  });

  it('returns the colour as it was where nothing can be drawn', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(toBlendableColor('oklch(51% 0.23 277)')).toBe('oklch(51% 0.23 277)');
  });
});
