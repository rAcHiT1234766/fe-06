import type { DashboardConfig, LayoutItem, Query, WidgetConfig, WidgetType } from '../types';

const bottomOf = (layout: LayoutItem[]) => Math.max(0, ...layout.map(({ y, h }) => y + h));

/** The first free id of the form `bar-1`, `bar-2` and so on. */
export function nextWidgetId({ widgets }: DashboardConfig, type: WidgetType) {
  const taken = new Set(widgets.map(({ id }) => id));
  let number = 1;
  while (taken.has(`${type}-${number}`)) number++;
  return `${type}-${number}`;
}

/** Adds a widget at the left edge, below everything else. */
export function addWidget(
  config: DashboardConfig,
  widget: WidgetConfig,
  size: { w: number; h: number },
): DashboardConfig {
  const item = { i: widget.id, x: 0, y: bottomOf(config.layouts.lg), ...size };
  return {
    ...config,
    widgets: [...config.widgets, widget],
    layouts: { lg: [...config.layouts.lg, item] },
  };
}

export function updateWidget(config: DashboardConfig, widget: WidgetConfig): DashboardConfig {
  return {
    ...config,
    widgets: config.widgets.map((current) => (current.id === widget.id ? widget : current)),
  };
}

export function removeWidget(config: DashboardConfig, widgetId: string): DashboardConfig {
  return {
    ...config,
    widgets: config.widgets.filter(({ id }) => id !== widgetId),
    layouts: { lg: config.layouts.lg.filter(({ i }) => i !== widgetId) },
  };
}

/** Copies a widget with its size, and places the copy below everything else. */
export function duplicateWidget(config: DashboardConfig, widgetId: string): DashboardConfig {
  const widget = config.widgets.find(({ id }) => id === widgetId);
  const item = config.layouts.lg.find(({ i }) => i === widgetId);
  if (!widget || !item) return config;
  const copy = {
    ...structuredClone(widget),
    id: nextWidgetId(config, widget.type),
    title: `${widget.title} (copy)`,
  };
  return addWidget(config, copy, { w: item.w, h: item.h });
}

/**
 * A widget grouped by year shows every year. Any other widget shows one year, the latest, so that
 * values such as population are not added up across years.
 */
export function withYearRule(query: Query, latestYear: number | undefined): Query {
  const filters = query.filters ?? [];
  const otherFilters = filters.filter(({ field }) => field !== 'year');
  const hasYearFilter = otherFilters.length < filters.length;
  if (query.dimensions?.includes('year')) {
    return hasYearFilter ? { ...query, filters: otherFilters } : query;
  }
  if (hasYearFilter || latestYear === undefined) return query;
  return { ...query, filters: [...filters, { field: 'year', op: 'eq', value: latestYear }] };
}
