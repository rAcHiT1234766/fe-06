import { fireEvent, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DashKitOptions } from '../core/types';
import { mount, type DashKitHandle } from '../element';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('../react/hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

setupMockApi();

const handles: DashKitHandle[] = [];

afterEach(async () => {
  act(() => handles.splice(0).forEach((handle) => handle.unmount()));
  await Promise.resolve();
  document.body.replaceChildren();
});

async function mountDashboard(options: Partial<DashKitOptions> = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const token = await demoToken('asha');
  let handle: DashKitHandle | undefined;
  act(() => {
    handle = mount(container, { apiUrl: API_URL, dashboardId: 'overview', token, ...options });
  });
  if (!handle) throw new Error('mount() returned nothing');
  handles.push(handle);
  return { container, handle };
}

const inside = ({ element }: DashKitHandle) => within(element.shadowRoot as unknown as HTMLElement);

describe('DashKit.mount()', () => {
  it('FR-1.8 shows a dashboard in the given container', async () => {
    const { container, handle } = await mountDashboard();
    expect(container.firstElementChild).toBe(handle.element);
    expect(handle.element.localName).toBe('dashkit-dashboard');
    expect(await inside(handle).findByRole('table', { name: 'Countries' })).toBeTruthy();
  });

  it('FR-1.8 calls the callbacks in the options, including ones changed later', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { handle } = await mountDashboard({ onFilterChange: first });
    await inside(handle).findByRole('table', { name: 'Countries' });

    fireEvent.click(inside(handle).getByRole('button', { name: 'Filter by South Asia' }));
    expect(first).toHaveBeenLastCalledWith([
      { field: 'region', values: ['South Asia'], sourceWidgetId: 'population-by-region' },
    ]);

    act(() => handle.update({ onFilterChange: second }));
    act(() => handle.clearFilters());
    expect(second).toHaveBeenLastCalledWith([]);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('FR-1.8 reports errors through onError', async () => {
    const onError = vi.fn();
    const { handle } = await mountDashboard({ token: 'not-a-token', onError });
    await inside(handle).findByRole('alert');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHENTICATED' }));
  });

  it('FR-1.8 update() changes some options and keeps the rest', async () => {
    const { handle } = await mountDashboard();
    await inside(handle).findByRole('table', { name: 'Countries' });

    const client = await import('../core/query-client');
    const loader = new client.QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    const config = { ...(await loader.loadDashboard('overview')), title: 'Given directly' };
    act(() => handle.update({ config }));
    expect(await inside(handle).findByRole('heading', { name: 'Given directly' })).toBeTruthy();
    expect(handle.element.getAttribute('api-url')).toBe(API_URL);
    expect(handle.element.getAttribute('dashboard-id')).toBe('overview');
  });

  it('NFR-C4 unmount() removes the dashboard and tears it down', async () => {
    const { container, handle } = await mountDashboard();
    await inside(handle).findByRole('table', { name: 'Countries' });

    act(() => handle.unmount());
    await waitFor(() => expect(handle.element.shadowRoot?.querySelector('.dk-root')).toBeNull());
    expect(container.children).toHaveLength(0);
  });
});
