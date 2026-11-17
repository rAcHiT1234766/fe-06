import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartOption } from '../charts/chart-options';
import { useEChart } from './use-echart';

const chart = {
  setOption: vi.fn(),
  setTheme: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  isDisposed: () => false,
};
const init = vi.hoisted(() => vi.fn());
vi.mock('echarts/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  init,
}));

const observer = { observe: vi.fn(), disconnect: vi.fn() };

beforeEach(() => {
  init.mockReturnValue(chart);
  // The observer is replaced so its teardown can be checked; happy-dom has no document.fonts.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = observer.observe;
      disconnect = observer.disconnect;
    },
  );
  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Chart({ option, theme }: { option: ChartOption; theme: object }) {
  const ref = useEChart(option, theme);
  return <div ref={ref} data-testid="chart" />;
}

describe('useEChart', () => {
  it('draws into its element with the theme, then replaces the option on change', () => {
    const theme = { color: ['#ff0000'] };
    const view = render(<Chart option={{ series: [] }} theme={theme} />);

    expect(init).toHaveBeenCalledWith(view.getByTestId('chart'));
    expect(chart.setTheme).toHaveBeenCalledWith(theme);
    expect(chart.setOption).toHaveBeenLastCalledWith(
      { series: [], animation: true },
      { notMerge: true },
    );

    view.rerender(<Chart option={{ legend: { show: true } }} theme={theme} />);
    expect(chart.setOption).toHaveBeenLastCalledWith(
      { legend: { show: true }, animation: true },
      { notMerge: true },
    );
    expect(chart.setTheme).toHaveBeenCalledTimes(1);
  });

  it('FR-2.4 themes a new chart only once it has an option, as ECharts ignores it before', () => {
    render(<Chart option={{ series: [] }} theme={{ color: ['#ff0000'] }} />);
    const [firstOption] = chart.setOption.mock.invocationCallOrder;
    expect(chart.setTheme.mock.invocationCallOrder[0]).toBeGreaterThan(firstOption!);
  });

  it('FR-2.3 switches theme on the same chart instance', () => {
    const view = render(<Chart option={{}} theme={{ color: ['#ff0000'] }} />);
    view.rerender(<Chart option={{}} theme={{ color: ['#00ff00'] }} />);
    expect(init).toHaveBeenCalledTimes(1);
    expect(chart.setTheme).toHaveBeenLastCalledWith({ color: ['#00ff00'] });
  });

  it('NFR-A5 turns animation off when reduced motion is requested', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (media: string) =>
        ({ media, matches: media.includes('reduced-motion') }) as unknown as MediaQueryList,
    );
    render(<Chart option={{}} theme={{}} />);
    expect(chart.setOption).toHaveBeenLastCalledWith({ animation: false }, { notMerge: true });
  });

  it('NFR-C4 disconnects its observer and disposes the chart on unmount', () => {
    const view = render(<Chart option={{}} theme={{}} />);
    expect(observer.observe).toHaveBeenCalledWith(view.getByTestId('chart'));

    view.unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(chart.dispose).toHaveBeenCalledOnce();
  });
});
