import {
  cloneLayout,
  moveElement,
  verticalCompactor,
  type Layout,
  type LayoutItem as GridItem,
} from 'react-grid-layout';

export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export const isArrowKey = (key: string): key is ArrowKey =>
  key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';

const STEP: Record<ArrowKey, [dx: number, dy: number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

// The grid keeps every item inside its columns and compacts the layout upwards before showing it,
// so that is what a key press starts from.
function asShown(layout: readonly GridItem[], cols: number) {
  const inside = layout.map((item) => {
    const w = Math.min(item.w, cols);
    return { ...item, w, x: Math.min(Math.max(item.x, 0), cols - w) };
  });
  return verticalCompactor.compact(inside, cols);
}

function move(layout: Layout, id: string, [dx, dy]: [number, number], cols: number) {
  const item = layout.find(({ i }) => i === id)!;
  const bottom = Math.max(...layout.map(({ y, h }) => y + h));
  for (let distance = 1; distance <= Math.max(cols, bottom); distance++) {
    const x = Math.min(Math.max(item.x + dx * distance, 0), cols - item.w);
    const y = Math.max(item.y + dy * distance, 0);
    if (x === item.x && y === item.y) return undefined;
    const working = cloneLayout(layout);
    const target = working.find(({ i }) => i === id)!;
    // The grid's own move, as at the end of a drag: widgets in the way make room.
    const moved = moveElement(working, target, x, y, true, false, 'vertical', cols, false);
    const next = verticalCompactor.compact(moved, cols);
    // A step can end with the widget where it was, floated back into its place or with only its
    // neighbours shuffled, so the widget goes further until it has itself moved that way.
    const { x: nextX, y: nextY } = next.find(({ i }) => i === id)!;
    if ((nextX - item.x) * dx > 0 || (nextY - item.y) * dy > 0) return next;
  }
  return undefined;
}

function resize(layout: Layout, id: string, [dw, dh]: [number, number], cols: number) {
  const item = layout.find(({ i }) => i === id)!;
  const w = Math.min(Math.max(item.w + dw, item.minW ?? 1), cols - item.x);
  const h = Math.max(item.h + dh, item.minH ?? 1);
  if (w === item.w && h === item.h) return undefined;
  return asShown(
    layout.map((other) => (other.i === id ? { ...other, w, h } : other)),
    cols,
  );
}

/**
 * The layout after an arrow key on a widget's handle: the widget moves at least one column or row
 * that way, or with `isResizing` gets one column or row wider, narrower, taller or shorter. Widgets
 * in the way make room and the layout is compacted, as after a drag. Gives `undefined` when the
 * widget can go no further, or get no smaller than its minimum or larger than the grid.
 */
export function arrangeByKey(
  layout: readonly GridItem[],
  id: string,
  key: ArrowKey,
  isResizing: boolean,
  cols: number,
): Layout | undefined {
  const current = asShown(layout, cols);
  if (!current.some(({ i }) => i === id)) return undefined;
  return isResizing ? resize(current, id, STEP[key], cols) : move(current, id, STEP[key], cols);
}
