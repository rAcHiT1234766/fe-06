import type { DashboardConfig } from '../types';

/**
 * Whether two dashboards hold the same content, so that an edit undone by hand leaves nothing
 * unsaved. Widgets and layout items are matched by id, since their order means nothing, and a
 * property set to `undefined` counts as missing, as it does in the JSON sent to the API.
 */
export function isSameDashboard(a: DashboardConfig, b: DashboardConfig): boolean {
  return a === b || isSameValue(inIdOrder(a), inIdOrder(b));
}

const byId = <T>(items: T[], idOf: (item: T) => string) =>
  items.toSorted((x, y) => (idOf(x) < idOf(y) ? -1 : idOf(x) > idOf(y) ? 1 : 0));

const inIdOrder = (config: DashboardConfig) => ({
  ...config,
  widgets: byId(config.widgets, ({ id }) => id),
  layouts: Object.fromEntries(
    Object.entries(config.layouts).map(([breakpoint, items]) => [
      breakpoint,
      items && byId(items, ({ i }) => i),
    ]),
  ),
});

function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isSameValue(item, b[index]))
    );
  }
  const present = (value: object) => Object.entries(value).filter(([, item]) => item !== undefined);
  const left = present(a);
  const right = new Map(present(b));
  return (
    left.length === right.size &&
    left.every(([key, item]) => right.has(key) && isSameValue(item, right.get(key)))
  );
}
