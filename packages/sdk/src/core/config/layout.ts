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
 * and the last widget in a row takes any columns left over, so no row ends in a gap. Widgets that
 * sit side by side at `lg` stay side by side as long as each can have the minimum width, with the
 * widest giving up columns first. In the single `xs` column, charts and tables get one more row for
 * legends and labels below the plot.
 */
export function deriveLayout(lg: LayoutItem[], breakpoint: Breakpoint): LayoutItem[] {
  if (breakpoint === 'lg') return lg;
  const columns = COLUMNS[breakpoint];
  const minimum = MIN_COLUMNS[breakpoint];
  const scale = (column: number) => Math.round((column * columns) / COLUMNS.lg);

  const derived: LayoutItem[] = [];
  let row: { item: LayoutItem; w: number; h: number }[] = [];
  let y = 0;
  const placeRow = () => {
    const widths = fitRow(
      row.map(({ w }) => w),
      columns,
    );
    let x = 0;
    for (const [index, { item, h }] of row.entries()) {
      const w = widths[index]!;
      derived.push({ i: item.i, x, y, w, h });
      x += w;
    }
    y += Math.max(...row.map(({ h }) => h));
    row = [];
  };

  for (const item of lg.toSorted((a, b) => a.y - b.y || a.x - b.x)) {
    const scaled = scale(item.x + item.w) - scale(item.x);
    const w = Math.min(columns, Math.max(minimum, scaled));
    const h = breakpoint === 'xs' && item.h > 3 ? item.h + 1 : item.h;
    const used = row.reduce((total, placed) => total + placed.w, 0);
    // Only neighbours from the same `lg` row are narrowed; a widget from the next row starts a new
    // one rather than squeezing the row above.
    const isSameRow = row[0]?.item.y === item.y;
    const fits = used + w <= columns || (isSameRow && (row.length + 1) * minimum <= columns);
    if (row.length > 0 && !fits) placeRow();
    row.push({ item, w, h });
  }
  if (row.length > 0) placeRow();
  return derived;
}

/**
 * Fits one row's widths into the grid: while they add up to more than `columns`, the widest gives
 * up a column, and the last widget takes any columns left over. Callers make sure every widget can
 * keep the minimum width, so the widest is always above it.
 */
function fitRow(widths: number[], columns: number): number[] {
  const fitted = [...widths];
  let total = fitted.reduce((sum, width) => sum + width, 0);
  while (total > columns) {
    fitted[fitted.indexOf(Math.max(...fitted))]! -= 1;
    total -= 1;
  }
  fitted[fitted.length - 1]! += columns - total;
  return fitted;
}

/** The layout for a breakpoint: the one the dashboard provides, or one derived from `lg`. */
export function layoutFor(layouts: DashboardConfig['layouts'], breakpoint: Breakpoint) {
  if (breakpoint === 'lg') return layouts.lg;
  return layouts[breakpoint] ?? deriveLayout(layouts.lg, breakpoint);
}
