import { describe, expect, it } from 'vitest';
import type { DashboardConfig, LayoutItem } from '../types';
import { breakpointFor, canEditAt, deriveLayout, layoutFor } from './layout';

// The demo's overview: a KPI beside a bar chart, a pie beside a line chart, then a full-width table.
const overview: LayoutItem[] = [
  { i: 'table', x: 0, y: 7, w: 12, h: 5 },
  { i: 'bar', x: 3, y: 0, w: 9, h: 3 },
  { i: 'kpi', x: 0, y: 0, w: 3, h: 3 },
  { i: 'line', x: 5, y: 3, w: 7, h: 4 },
  { i: 'pie', x: 0, y: 3, w: 5, h: 4 },
];

// Each row of the layout as "id:width" pairs, in order.
function rows(layout: LayoutItem[]) {
  const byRow = new Map<number, string[]>();
  for (const { i, y, w } of layout) byRow.set(y, [...(byRow.get(y) ?? []), `${i}:${w}`]);
  return [...byRow.values()].map((row) => row.join(' '));
}

describe('breakpointFor', () => {
  it('FR-6.7 picks the breakpoint from the container width', () => {
    expect(breakpointFor(1200)).toBe('lg');
    expect(breakpointFor(1199)).toBe('md');
    expect(breakpointFor(900)).toBe('md');
    expect(breakpointFor(899)).toBe('sm');
    expect(breakpointFor(600)).toBe('sm');
    expect(breakpointFor(599)).toBe('xs');
    expect(breakpointFor(360)).toBe('xs');
  });

  it('treats a width not yet measured as lg', () => {
    expect(breakpointFor(undefined)).toBe('lg');
  });
});

describe('canEditAt', () => {
  it('FR-6.10 offers the builder from md up', () => {
    expect(['lg', 'md', 'sm', 'xs'].filter((b) => canEditAt(b as 'lg'))).toEqual(['lg', 'md']);
  });
});

describe('deriveLayout', () => {
  it('returns the authored layout at lg', () => {
    expect(deriveLayout(overview, 'lg')).toBe(overview);
  });

  it('FR-6.7 keeps side-by-side widgets together at md, in reading order', () => {
    expect(rows(deriveLayout(overview, 'md'))).toEqual(['kpi:2 bar:6', 'pie:3 line:5', 'table:8']);
  });

  it('FR-6.7 gives narrow widgets a whole row at sm, so no row ends in a gap', () => {
    expect(rows(deriveLayout(overview, 'sm'))).toEqual([
      'kpi:4',
      'bar:4',
      'pie:2 line:2',
      'table:4',
    ]);
  });

  it('FR-6.8 stacks every widget in one column at xs, with taller charts', () => {
    const xs = deriveLayout(overview, 'xs');
    expect(xs.map(({ i }) => i)).toEqual(['kpi', 'bar', 'pie', 'line', 'table']);
    expect(xs.every(({ x, w }) => x === 0 && w === 1)).toBe(true);
    expect(xs.map(({ h }) => h)).toEqual([3, 3, 5, 5, 6]);
    // Each widget starts where the one above it ends.
    expect(xs.map(({ y }) => y)).toEqual([0, 3, 6, 11, 16]);
  });

  it('never makes a widget wider than the grid', () => {
    const wide = [{ i: 'a', x: 0, y: 0, w: 12, h: 2 }];
    for (const breakpoint of ['md', 'sm', 'xs'] as const) {
      expect(deriveLayout(wide, breakpoint)[0]?.w).toBe({ md: 8, sm: 4, xs: 1 }[breakpoint]);
    }
  });

  it('leaves the authored layout unchanged', () => {
    const before = structuredClone(overview);
    deriveLayout(overview, 'sm');
    expect(overview).toEqual(before);
  });
});

describe('layoutFor', () => {
  it('prefers a layout the dashboard provides for the breakpoint', () => {
    const sm: LayoutItem[] = [{ i: 'kpi', x: 0, y: 0, w: 4, h: 2 }];
    const layouts: DashboardConfig['layouts'] = { lg: overview, sm };
    expect(layoutFor(layouts, 'sm')).toBe(sm);
    expect(layoutFor(layouts, 'xs')).toEqual(deriveLayout(overview, 'xs'));
    expect(layoutFor(layouts, 'lg')).toBe(overview);
  });
});
