import type { Breakpoint, DashboardConfig, LayoutItem } from '../types';

/** Grid columns at each breakpoint. */
export const COLUMNS: Record<Breakpoint, number> = { lg: 12, md: 8, sm: 4, xs: 1 };

// The smallest container width of each breakpoint, widest first.
const MIN_WIDTHS: [Breakpoint, number][] = [
  ['lg', 1200],
  ['md', 900],
  ['sm', 600],
];

// Below lg, no widget is narrower than this many columns, so charts keep room for their axes.
const MIN_COLUMNS: Record<Breakpoint, number> = { lg: 1, md: 2, sm: 2, xs: 1 };

/** The breakpoint for a container width in pixels. A width not yet measured counts as `lg`. */
export function breakpointFor(width: number | undefined): Breakpoint {
  if (width === undefined) return 'lg';
  return MIN_WIDTHS.find(([, minWidth]) => width >= minWidth)?.[0] ?? 'xs';
}

/** Dashboards are arranged on the twelve-column `lg` grid, which needs at least an `md` container. */
export const canEditAt = (breakpoint: Breakpoint) => breakpoint === 'lg' || breakpoint === 'md';

/**
 * Re-flows the authored `lg` layout into the columns of a smaller breakpoint. Each widget keeps its
 * share of the row where it can, widgets stay in reading order (top to bottom, then left to right),
 * and the last widget in a row takes any columns left over, so no row ends in a gap. In the single
 * `xs` column, charts and tables get one more row for legends and labels below the plot.
 */
export function deriveLayout(lg: LayoutItem[], breakpoint: Breakpoint): LayoutItem[] {
  if (breakpoint === 'lg') return lg;
  const columns = COLUMNS[breakpoint];
  const scale = (column: number) => Math.round((column * columns) / COLUMNS.lg);

  const derived: LayoutItem[] = [];
  let row: LayoutItem[] = [];
  let x = 0;
  let y = 0;
  let rowBottom = 0;
  const endRow = () => {
    const last = row.at(-1);
    if (last) last.w += columns - x;
    row = [];
    x = 0;
    y = rowBottom;
  };

  for (const item of lg.toSorted((a, b) => a.y - b.y || a.x - b.x)) {
    const scaled = scale(item.x + item.w) - scale(item.x);
    const w = Math.min(columns, Math.max(MIN_COLUMNS[breakpoint], scaled));
    const h = breakpoint === 'xs' && item.h > 3 ? item.h + 1 : item.h;
    if (x + w > columns) endRow();
    const placed = { i: item.i, x, y, w, h };
    derived.push(placed);
    row.push(placed);
    x += w;
    rowBottom = Math.max(rowBottom, y + h);
  }
  endRow();
  return derived;
}

/** The layout for a breakpoint: the one the dashboard provides, or one derived from `lg`. */
export function layoutFor(layouts: DashboardConfig['layouts'], breakpoint: Breakpoint) {
  if (breakpoint === 'lg') return layouts.lg;
  return layouts[breakpoint] ?? deriveLayout(layouts.lg, breakpoint);
}
