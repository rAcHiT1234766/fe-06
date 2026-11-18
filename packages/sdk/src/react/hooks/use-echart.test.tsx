import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartOption } from '../charts/chart-options';
import { useEChart } from './use-echart';

const chart = {
  on: vi.fn<(eventName: string, handler: (event: { dataIndex: number }) => void) => void>(),
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

interface ChartProps {
  option: ChartOption;
  theme: object;
  onItemClick?: (dataIndex: number) => void;
  onFinished?: () => void;
}

function Chart({ option, theme, onItemClick, onFinished }: ChartProps) {
  const ref = useEChart(option, theme, onItemClick, onFinished);
  return <div ref={ref} data-testid="chart" />;
}

const briefAnimation = {
  animationDuration: 200,
  animationDurationUpdate: 200,
  animationEasingUpdate: 'cubicOut',
};

const handlersFor = (eventName: string) =>
  chart.on.mock.calls.filter(([name]) => name === eventName).map(([, handler]) => handler);

describe('useEChart', () => {
  it('draws into its element with the theme, then replaces the option on change', () => {
    const theme = { color: ['#ff0000'] };
    const view = render(<Chart option={{ series: [] }} theme={theme} />);

    expect(init).toHaveBeenCalledWith(view.getByTestId('chart'));
    expect(chart.setTheme).toHaveBeenCalledWith(theme);
    expect(chart.setOption).toHaveBeenLastCalledWith(
      { series: [], ...briefAnimation, animation: true },
      { notMerge: true },
    );

    view.rerender(<Chart option={{ legend: { show: true } }} theme={theme} />);
    expect(chart.setOption).toHaveBeenLastCalledWith(
      { legend: { show: true }, ...briefAnimation, animation: true },
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
    expect(chart.setOption).toHaveBeenLastCalledWith(
      { ...briefAnimation, animation: false },
      { notMerge: true },
    );
  });

  it('NFR-P4 animates briefly, setting the durations on each series as well', () => {
    render(<Chart option={{ series: [{ type: 'line', data: [1, 2] }] }} theme={{}} />);
    expect(chart.setOption).toHaveBeenLastCalledWith(
      {
        series: [{ type: 'line', data: [1, 2], ...briefAnimation }],
        ...briefAnimation,
        animation: true,
      },
      { notMerge: true },
    );
  });

  it('FR-4.1 passes a clicked item to the handler from the latest render', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const view = render(<Chart option={{}} theme={{}} onItemClick={first} />);
    view.rerender(<Chart option={{}} theme={{}} onItemClick={latest} />);

    const clickHandlers = handlersFor('click');
    expect(clickHandlers).toHaveLength(1);
    clickHandlers[0]!({ dataIndex: 3 });
    expect(latest).toHaveBeenCalledWith(3);
    expect(first).not.toHaveBeenCalled();
  });

  it('NFR-P3 tells the handler from the latest render when a render has finished', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const view = render(<Chart option={{}} theme={{}} onFinished={first} />);
    view.rerender(<Chart option={{}} theme={{}} onFinished={latest} />);

    const finishedHandlers = handlersFor('finished');
    expect(finishedHandlers).toHaveLength(1);
    finishedHandlers[0]!({ dataIndex: 0 });
    expect(latest).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });

  it('NFR-C4 disconnects its observer and disposes the chart on unmount', () => {
    const view = render(<Chart option={{}} theme={{}} />);
    expect(observer.observe).toHaveBeenCalledWith(view.getByTestId('chart'));

    view.unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(chart.dispose).toHaveBeenCalledOnce();
  });
});
