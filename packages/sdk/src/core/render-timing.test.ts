import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RenderTiming, TIMING_NAMES } from './render-timing';

const measures = (name: string) => performance.getEntriesByName(name, 'measure');

beforeEach(() => {
  performance.clearMarks();
  performance.clearMeasures();
});
afterEach(() => {
  performance.clearMarks();
  performance.clearMeasures();
});

describe('RenderTiming', () => {
  it('NFR-P3 measures from the mount to the first finished chart, once', () => {
    const timing = new RenderTiming();
    timing.mounted();
    timing.fetching('kpi', true);
    timing.fetching('bar', true);
    timing.fetching('kpi', false);
    timing.finished('kpi', 'other');
    expect(measures(TIMING_NAMES.firstChart)).toHaveLength(0);

    timing.fetching('bar', false);
    timing.finished('bar', 'chart');
    timing.finished('bar', 'chart');
    expect(performance.getEntriesByName(TIMING_NAMES.mount, 'mark')).toHaveLength(1);
    expect(measures(TIMING_NAMES.firstChart)).toHaveLength(1);
  });

  it('ignores a chart finishing its old content while it waits for data', () => {
    const timing = new RenderTiming();
    timing.mounted();
    timing.fetching('bar', true);
    timing.finished('bar', 'chart');
    expect(measures(TIMING_NAMES.firstChart)).toHaveLength(0);
  });

  it('NFR-P4 measures a filter change when the last widget it updated has finished', () => {
    const timing = new RenderTiming();
    timing.filtersChanged();
    // The source chart only redraws its highlight; the other two fetch.
    timing.started('bar');
    timing.fetching('pie', true);
    timing.fetching('table', true);
    timing.finished('bar', 'chart');
    timing.fetching('pie', false);
    timing.finished('pie', 'chart');
    expect(measures(TIMING_NAMES.crossFilter)).toHaveLength(0);

    timing.fetching('table', false);
    timing.finished('table', 'other');
    expect(measures(TIMING_NAMES.crossFilter)).toHaveLength(1);

    // Later redraws, such as a resize, are not another filter change.
    timing.started('pie');
    timing.finished('pie', 'chart');
    expect(measures(TIMING_NAMES.crossFilter)).toHaveLength(1);
  });

  it('does not count a filter change as done before anything it changed has started', () => {
    const timing = new RenderTiming();
    timing.filtersChanged();
    // A chart finishing an animation that began before the click.
    timing.finished('line', 'chart');
    expect(measures(TIMING_NAMES.crossFilter)).toHaveLength(0);
  });

  it('forgets a removed widget, so it cannot hold a measure open', () => {
    const timing = new RenderTiming();
    timing.filtersChanged();
    timing.fetching('pie', true);
    timing.fetching('table', true);
    timing.removed('pie');
    timing.fetching('table', false);
    timing.finished('table', 'other');
    expect(measures(TIMING_NAMES.crossFilter)).toHaveLength(1);
  });
});
