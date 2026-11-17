import type { DashboardConfig, DashKitError } from '../types';

/** The schema version this SDK reads and writes. */
export const SCHEMA_VERSION = 1;

/** The API returns at most this many rows for one query. */
export const MAX_ROWS = 1000;

class ConfigError extends Error implements DashKitError {
  readonly code = 'UNKNOWN';

  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Brings a stored config up to the current schema. Version 1 is the only one so far, so for now
 * this only refuses configs from a newer SDK, which this one cannot show correctly. A future
 * version adds one step here for each older schema.
 */
export function migrate(config: DashboardConfig): DashboardConfig {
  // Typed as 1, but a stored config may come from any version.
  const version: number = config.schemaVersion;
  if (version === SCHEMA_VERSION) return config;
  throw new ConfigError(
    `This dashboard uses schema version ${version}, which this version of DashKit cannot show.`,
  );
}

const quoted = (text: string) => `"${text}"`;

/**
 * What stops a dashboard from being saved, worded for the person editing it. The API rejects
 * the same mistakes; checking first lets the builder name every problem at once.
 */
export function validateDashboard({ title, widgets, layouts }: DashboardConfig): string[] {
  const problems: string[] = [];
  if (title.trim() === '') problems.push('The dashboard needs a title.');
  if (widgets.some((widget) => widget.title.trim() === '')) {
    problems.push('Every widget needs a title.');
  }

  const ids = widgets.map(({ id }) => id);
  for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index))) {
    problems.push(`More than one widget has the id ${quoted(id)}.`);
  }

  const placed = layouts.lg.map(({ i }) => i);
  for (const { id, title: widgetTitle } of widgets) {
    const name = quoted(widgetTitle || id);
    const places = placed.filter((i) => i === id).length;
    if (places === 0) problems.push(`${name} has no place on the grid.`);
    if (places > 1) problems.push(`${name} has more than one place on the grid.`);
  }
  for (const i of new Set(placed.filter((i) => !ids.includes(i)))) {
    problems.push(`The grid has a place for ${quoted(i)}, which is not a widget.`);
  }

  for (const { id, title: widgetTitle, query } of widgets) {
    const name = quoted(widgetTitle || id);
    if (query.measures.length === 0) problems.push(`${name} needs a measure.`);
    const { limit } = query;
    if (limit !== undefined && !(Number.isInteger(limit) && limit >= 1 && limit <= MAX_ROWS)) {
      problems.push(`${name} needs a row limit from 1 to ${MAX_ROWS}, or none.`);
    }
  }
  return problems;
}
