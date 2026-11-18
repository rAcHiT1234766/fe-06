/** The names of the User Timing entries the SDK records in the browser's performance timeline. */
export const TIMING_NAMES = {
  /** Mark: a dashboard was mounted. */
  mount: 'dashkit:mount',
  /** Measure: from the mount to the first chart's `finished` event. */
  firstChart: 'dashkit:first-chart',
  /** Mark: the cross-filters changed, by a click or from the host. */
  filterChange: 'dashkit:filter-change',
  /** Measure: from a filter change until every widget it updated has finished drawing. */
  crossFilter: 'dashkit:cross-filter',
} as const;

const canRecord = () =>
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.measure === 'function';

function mark(name: string) {
  const startTime = performance.now();
  performance.mark(name, { startTime });
  return startTime;
}

/**
 * Follows which widgets are still waiting for data or drawing, so the SDK can record how long a
 * dashboard takes to show its first chart and how long a filter change takes to reach every
 * widget. Integrators read the entries with a PerformanceObserver or in the performance panel.
 */
export class RenderTiming {
  // Widgets whose current content is not drawn yet, and among them, those still waiting for data.
  #pending = new Set<string>();
  #fetching = new Set<string>();
  #mountedAt: number | undefined;
  #hasFirstChart = false;
  #filterChangedAt: number | undefined;
  #hasUpdateSinceFilterChange = false;

  mounted() {
    if (!canRecord()) return;
    this.#mountedAt = mark(TIMING_NAMES.mount);
    this.#hasFirstChart = false;
  }

  filtersChanged() {
    if (!canRecord()) return;
    this.#filterChangedAt = mark(TIMING_NAMES.filterChange);
    this.#hasUpdateSinceFilterChange = false;
  }

  /** The widget waits for a query's result, or has received it. */
  fetching(widgetId: string, isFetching: boolean) {
    if (isFetching) {
      this.#fetching.add(widgetId);
      this.started(widgetId);
    } else {
      this.#fetching.delete(widgetId);
    }
  }

  /** The widget began drawing new content. */
  started(widgetId: string) {
    this.#pending.add(widgetId);
    if (this.#filterChangedAt !== undefined) this.#hasUpdateSinceFilterChange = true;
  }

  /** The widget finished drawing. A chart's earlier content finishing is ignored while it waits for data. */
  finished(widgetId: string, kind: 'chart' | 'other') {
    if (this.#fetching.has(widgetId)) return;
    this.#pending.delete(widgetId);

    if (kind === 'chart' && !this.#hasFirstChart && this.#mountedAt !== undefined) {
      this.#hasFirstChart = true;
      performance.measure(TIMING_NAMES.firstChart, { start: this.#mountedAt });
    }
    // A filter change counts as done once something it changed has started and nothing is left.
    if (
      this.#filterChangedAt !== undefined &&
      this.#hasUpdateSinceFilterChange &&
      this.#pending.size === 0
    ) {
      performance.measure(TIMING_NAMES.crossFilter, { start: this.#filterChangedAt });
      this.#filterChangedAt = undefined;
    }
  }

  removed(widgetId: string) {
    this.#fetching.delete(widgetId);
    this.#pending.delete(widgetId);
  }
}
