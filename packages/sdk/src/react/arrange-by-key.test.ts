import { describe, expect, it } from 'vitest';
import { arrangeByKey } from './arrange-by-key';

const at = (i: string, x: number, y: number, w: number, h: number, minW = 2, minH = 2) => ({
  i,
  x,
  y,
  w,
  h,
  minW,
  minH,
});

// Positions only, by widget, whatever order the grid returns them in.
const positions = (
  layout: readonly { i: string; x: number; y: number; w: number; h: number }[] = [],
) => Object.fromEntries(layout.map(({ i, x, y, w, h }) => [i, [x, y, w, h]]));

describe('arrangeByKey', () => {
  it('FR-5.11 moves a widget one column at a time, and not past the edge of the grid', () => {
    const layout = [at('a', 0, 0, 4, 3), at('b', 6, 0, 6, 3)];
    expect(positions(arrangeByKey(layout, 'a', 'ArrowRight', false, 12))).toEqual({
      a: [1, 0, 4, 3],
      b: [6, 0, 6, 3],
    });
    expect(arrangeByKey(layout, 'a', 'ArrowLeft', false, 12)).toBeUndefined();
    expect(arrangeByKey(layout, 'b', 'ArrowRight', false, 12)).toBeUndefined();
    expect(arrangeByKey(layout, 'a', 'ArrowUp', false, 12)).toBeUndefined();
  });

  it('FR-5.11 pushes a widget in the way aside, as a drag does', () => {
    const layout = [at('a', 0, 0, 4, 3), at('b', 4, 0, 8, 3)];
    expect(positions(arrangeByKey(layout, 'a', 'ArrowRight', false, 12))).toEqual({
      a: [1, 0, 4, 3],
      b: [4, 3, 8, 3],
    });
  });

  it('FR-5.11 moves down past the widget below, rather than floating back where it was', () => {
    const layout = [at('a', 0, 0, 6, 3), at('c', 0, 3, 12, 4)];
    const down = arrangeByKey(layout, 'a', 'ArrowDown', false, 12);
    expect(positions(down)).toEqual({ a: [0, 4, 6, 3], c: [0, 0, 12, 4] });
    expect(positions(arrangeByKey(down!, 'a', 'ArrowUp', false, 12))).toEqual(positions(layout));
    expect(arrangeByKey(down!, 'a', 'ArrowDown', false, 12)).toBeUndefined();
  });

  it('FR-5.11 keeps going until the widget itself has moved, not only its neighbours', () => {
    // A step up into the two charts moves one of them below the table but leaves the table where
    // it was, because the other chart still holds its place.
    const layout = [
      at('kpi', 0, 0, 3, 3),
      at('bar', 3, 0, 9, 3),
      at('pie', 0, 3, 4, 4),
      at('line', 4, 3, 8, 4),
      at('table', 0, 7, 12, 5),
    ];
    const up = arrangeByKey(layout, 'table', 'ArrowUp', false, 12);
    expect(positions(up)).toEqual({
      kpi: [0, 0, 3, 3],
      bar: [3, 0, 9, 3],
      pie: [0, 8, 4, 4],
      line: [4, 8, 8, 4],
      table: [0, 3, 12, 5],
    });
  });

  it('FR-5.11 resizes by a column or row, within the minimum and the grid', () => {
    const layout = [at('a', 0, 0, 4, 3, 3, 2), at('b', 8, 0, 4, 3)];
    const wider = (key: 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown', from = layout) =>
      positions(arrangeByKey(from, 'a', key, true, 12)).a;
    expect(wider('ArrowRight')).toEqual([0, 0, 5, 3]);
    expect(wider('ArrowLeft')).toEqual([0, 0, 3, 3]);
    expect(wider('ArrowDown')).toEqual([0, 0, 4, 4]);
    expect(wider('ArrowUp')).toEqual([0, 0, 4, 2]);

    const smallest = [at('a', 0, 0, 3, 2, 3, 2)];
    expect(arrangeByKey(smallest, 'a', 'ArrowLeft', true, 12)).toBeUndefined();
    expect(arrangeByKey(smallest, 'a', 'ArrowUp', true, 12)).toBeUndefined();
    expect(arrangeByKey(layout, 'b', 'ArrowRight', true, 12)).toBeUndefined();
  });

  it('FR-5.11 pushes the widget beside a growing one down, as a resize by pointer does', () => {
    const layout = [at('a', 0, 0, 4, 3), at('b', 4, 0, 8, 3)];
    expect(positions(arrangeByKey(layout, 'a', 'ArrowRight', true, 12))).toEqual({
      a: [0, 0, 5, 3],
      b: [4, 3, 8, 3],
    });
  });

  it('starts from the layout as the grid shows it, compacted upwards', () => {
    // Saved with a gap above it, which the grid closes.
    const layout = [at('a', 0, 5, 4, 3)];
    expect(positions(arrangeByKey(layout, 'a', 'ArrowRight', false, 12))).toEqual({
      a: [1, 0, 4, 3],
    });
    expect(arrangeByKey(layout, 'missing', 'ArrowRight', false, 12)).toBeUndefined();
  });
});
