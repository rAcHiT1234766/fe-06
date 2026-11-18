import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { Dashboard } from './Dashboard';
import { DashboardBuilder } from './DashboardBuilder';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

setupMockApi();

// The test DOM does no layout, so every element reports the width of the pretend container.
let width = 1280;
const resizeCallbacks = new Set<ResizeObserverCallback>();

class FakeResizeObserver {
  readonly #callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }
  observe() {
    resizeCallbacks.add(this.#callback);
  }
  unobserve() {}
  disconnect() {
    resizeCallbacks.delete(this.#callback);
  }
}

beforeEach(() => {
  width = 1280;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() =>
    DOMRect.fromRect({ width, height: 800 }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resizeCallbacks.clear();
});

function resizeTo(next: number) {
  width = next;
  const entries = [{ contentRect: DOMRect.fromRect({ width: next, height: 800 }) }];
  act(() => {
    for (const callback of resizeCallbacks) {
      callback(entries as unknown as ResizeObserverEntry[], {} as ResizeObserver);
    }
  });
}

const breakpoint = () => document.querySelector<HTMLElement>('.dk-dashboard')?.dataset.dkBreakpoint;

// The grid places each widget with a CSS transform; its first number is the left edge.
const leftEdges = () =>
  new Set(
    [...document.querySelectorAll<HTMLElement>('.react-grid-item')].map(
      (item) => /translate\((-?[\d.]+)px/.exec(item.style.transform)?.[1],
    ),
  );

async function renderDashboard(builder?: { mode: 'view' | 'edit' }) {
  const token = await demoToken('asha');
  render(
    <DashKitProvider apiUrl={API_URL} token={token}>
      {builder ? (
        <DashboardBuilder dashboardId="overview" mode={builder.mode} />
      ) : (
        <Dashboard dashboardId="overview" />
      )}
    </DashKitProvider>,
  );
  await screen.findByRole('table', { name: 'Countries' });
}

describe('responsive layout', () => {
  it('FR-6.8 stacks the widgets in one column in a phone-sized container', async () => {
    width = 360;
    await renderDashboard();
    expect(breakpoint()).toBe('xs');
    expect(leftEdges()).toEqual(new Set(['0']));
  });

  it('FR-6.7 follows the container as it is resized', async () => {
    await renderDashboard();
    expect(breakpoint()).toBe('lg');
    expect(leftEdges().size).toBeGreaterThan(1);

    resizeTo(1000);
    expect(breakpoint()).toBe('md');
    resizeTo(700);
    expect(breakpoint()).toBe('sm');
    resizeTo(360);
    expect(breakpoint()).toBe('xs');
    expect(leftEdges()).toEqual(new Set(['0']));
  });

  it('keeps the last width while the container is hidden', async () => {
    width = 700;
    await renderDashboard();
    resizeTo(0);
    expect(breakpoint()).toBe('sm');
  });
});

describe('builder in a narrow container', () => {
  it('FR-6.10 shows the dashboard with a notice instead of the builder', async () => {
    width = 700;
    await renderDashboard({ mode: 'edit' });
    expect(screen.getByText('Editing needs a wider screen.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit dashboard' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Add a widget' })).toBeNull();
  });

  it('FR-6.10 offers the builder from md up', async () => {
    width = 1000;
    await renderDashboard({ mode: 'edit' });
    expect(screen.getByRole('group', { name: 'Add a widget' })).toBeTruthy();
    expect(screen.queryByText('Editing needs a wider screen.')).toBeNull();
  });

  it('FR-6.10 keeps unsaved changes while there is no room to edit them', async () => {
    await renderDashboard({ mode: 'edit' });
    const widgetCount = () => document.querySelectorAll('.react-grid-item').length;
    const before = widgetCount();
    fireEvent.click(screen.getByRole('button', { name: 'KPI' }));
    expect(widgetCount()).toBe(before + 1);

    resizeTo(700);
    expect(
      screen.getByText('Your unsaved changes are kept until there is room to edit again.'),
    ).toBeTruthy();
    expect(widgetCount()).toBe(before);

    resizeTo(1280);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(widgetCount()).toBe(before + 1);
  });
});
