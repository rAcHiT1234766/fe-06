import { fireEvent, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '../core/query-client';
import type { ActiveFilter, DashboardConfig } from '../core/types';
import '../element';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { DashKitElement } from './dashkit-element';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('../react/hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

const server = setupMockApi();

afterEach(() => {
  for (const element of document.querySelectorAll('dashkit-dashboard')) element.remove();
});

function addElement(attributes: Record<string, string>) {
  const element = document.createElement('dashkit-dashboard') as DashKitElement;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  act(() => {
    document.body.append(element);
  });
  return element;
}

async function addDashboard(userId = 'asha', attributes: Record<string, string> = {}) {
  const token = await demoToken(userId);
  return addElement({ 'api-url': API_URL, 'dashboard-id': 'overview', token, ...attributes });
}

const inside = (element: Element) => within(element.shadowRoot as unknown as HTMLElement);

const showsCountries = (element: Element) =>
  inside(element).findByRole('table', { name: 'Countries' });

function collect<T>(name: string) {
  const details: T[] = [];
  const listener = (event: Event) => details.push((event as CustomEvent<T>).detail);
  document.addEventListener(name, listener);
  afterEach(() => document.removeEventListener(name, listener));
  return details;
}

const southAsia: ActiveFilter = {
  field: 'region',
  values: ['South Asia'],
  sourceWidgetId: 'population-by-region',
};

describe('<dashkit-dashboard>', () => {
  it('FR-1.2 shows the dashboard its attributes name, inside its own shadow root', async () => {
    const element = await addDashboard();
    expect(await showsCountries(element)).toBeTruthy();
    // Nothing is added to the page itself, so the page's styles have nothing to match.
    expect(element.children).toHaveLength(0);
    expect(document.querySelector('.dk-root')).toBeNull();
  });

  it('FR-1.7 announces once that it is ready, with an event that leaves the shadow root', async () => {
    const ready = collect('dashkit:ready');
    const element = await addDashboard();
    await showsCountries(element);
    expect(ready).toHaveLength(1);
  });

  it('FR-1.7 keeps properties set before the element was defined', async () => {
    const client = new QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    const config = { ...(await client.loadDashboard('overview')), title: 'Set before loading' };
    const early = document.createElement('dashkit-early');
    Object.assign(early, { config });
    early.setAttribute('api-url', API_URL);
    early.setAttribute('token', await demoToken('asha'));
    document.body.append(early);

    act(() => {
      customElements.define('dashkit-early', class extends DashKitElement {});
    });
    expect(await inside(early).findByRole('heading', { name: 'Set before loading' })).toBeTruthy();
    early.remove();
  });

  it('FR-1.7 reports filter changes and takes filters from the page', async () => {
    const changes = collect<ActiveFilter[]>('dashkit:filterchange');
    const element = await addDashboard();
    await showsCountries(element);

    fireEvent.click(inside(element).getByRole('button', { name: 'Filter by South Asia' }));
    expect(changes.at(-1)).toEqual([southAsia]);

    act(() => {
      element.setFilters([
        { field: 'incomeLevel', values: ['High income'], sourceWidgetId: 'page' },
      ]);
    });
    const activeFilters = inside(element).getByRole('group', { name: 'Active filters' });
    expect(activeFilters.textContent).toContain('High income');
    expect(activeFilters.textContent).not.toContain('South Asia');

    act(() => {
      element.clearFilters();
    });
    expect(inside(element).queryByRole('group', { name: 'Active filters' })).toBeNull();
    expect(changes.at(-1)).toEqual([]);
  });

  it('FR-1.7 reports errors with their code and message', async () => {
    const errors = collect<{ code: string; message: string }>('dashkit:error');
    const element = addElement({
      'api-url': API_URL,
      'dashboard-id': 'overview',
      token: 'not-a-token',
    });
    expect(await inside(element).findByRole('alert')).toBeTruthy();
    expect(errors[0]).toEqual({ code: 'UNAUTHENTICATED', message: expect.any(String) as string });
  });

  it('FR-1.7 reports the dashboard an editor saved', async () => {
    const client = new QueryClient({ apiUrl: API_URL, token: await demoToken('asha') });
    await client.saveDashboard({ ...(await client.loadDashboard('overview')), id: 'element-save' });
    const saves = collect<DashboardConfig>('dashkit:save');
    const element = await addDashboard('asha', { 'dashboard-id': 'element-save', mode: 'edit' });

    fireEvent.click(await inside(element).findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0]).toMatchObject({ id: 'element-save', updatedBy: 'asha' });
  });

  it('FR-1.7 refresh() loads everything again and keeps the filters', async () => {
    const ready = collect('dashkit:ready');
    const element = await addDashboard();
    await showsCountries(element);
    fireEvent.click(inside(element).getByRole('button', { name: 'Filter by South Asia' }));
    await waitFor(() => expect(inside(element).getAllByRole('row').length).toBeGreaterThan(0));

    const requests: string[] = [];
    server.events.on('request:start', ({ request }) =>
      requests.push(new URL(request.url).pathname),
    );
    act(() => {
      element.refresh();
    });
    await showsCountries(element);

    expect(requests).toContain('/dashboards/overview');
    expect(requests).toContain('/query');
    expect(ready).toHaveLength(2);
    expect(inside(element).getByRole('group', { name: 'Active filters' }).textContent).toContain(
      'South Asia',
    );
    server.events.removeAllListeners();
  });

  it('FR-1.6 keeps two dashboards on one page apart', async () => {
    const first = await addDashboard();
    const second = await addDashboard();
    await showsCountries(first);
    await showsCountries(second);

    fireEvent.click(inside(first).getByRole('button', { name: 'Filter by South Asia' }));
    expect(inside(first).getByRole('group', { name: 'Active filters' })).toBeTruthy();
    expect(inside(second).queryByRole('group', { name: 'Active filters' })).toBeNull();
  });

  it('NFR-C4 tears down when removed, but not when moved', async () => {
    const element = await addDashboard();
    const table = await showsCountries(element);

    await act(async () => {
      document.body.prepend(element);
      await Promise.resolve();
    });
    expect(await showsCountries(element)).toBe(table);

    await act(async () => {
      element.remove();
      await Promise.resolve();
    });
    expect(element.shadowRoot?.querySelector('.dk-root')).toBeNull();
  });

  it('starts again when a removed element is added back', async () => {
    const ready = collect('dashkit:ready');
    const element = await addDashboard();
    await showsCountries(element);
    await act(async () => {
      element.remove();
      await Promise.resolve();
    });

    act(() => {
      document.body.append(element);
    });
    await showsCountries(element);
    expect(ready).toHaveLength(2);
  });

  it('lets color-scheme override the mode of the theme', async () => {
    const element = await addDashboard('asha', { 'color-scheme': 'dark' });
    element.theme = { mode: 'light' };
    await showsCountries(element);
    const themeStyle = [...element.shadowRoot!.querySelectorAll('style')].at(-1)?.textContent;
    expect(themeStyle).toContain('--dk-color-scheme: dark');
  });

  it('shows nothing until it knows the API and the dashboard', () => {
    const element = addElement({ 'api-url': API_URL, token: 'any' });
    expect(element.shadowRoot?.querySelector('.dk-root')).toBeNull();
  });

  it('waits for a token or a way to get one before loading anything', async () => {
    const errors = collect('dashkit:error');
    const element = addElement({ 'api-url': API_URL, 'dashboard-id': 'overview' });
    expect(element.shadowRoot?.querySelector('.dk-root')).toBeNull();

    act(() => {
      element.getToken = () => demoToken('asha');
    });
    expect(await showsCountries(element)).toBeTruthy();
    expect(errors).toEqual([]);
  });
});
