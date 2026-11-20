import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '../core/query-client';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { DashboardBuilder } from './DashboardBuilder';
import { DashboardPicker } from './DashboardPicker';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

const server = setupMockApi();

// A host keeps the id of the dashboard shown, as the demo does.
function Host({ initialId, onChange }: { initialId: string; onChange: (id: string) => void }) {
  const [dashboardId, setDashboardId] = useState(initialId);
  return (
    <>
      <DashboardPicker
        value={dashboardId}
        onChange={(id) => {
          onChange(id);
          setDashboardId(id);
        }}
      />
      <DashboardBuilder dashboardId={dashboardId} />
    </>
  );
}

async function renderPicker(userId: string, initialId = 'overview') {
  const onChange = vi.fn();
  const onFilterChange = vi.fn();
  render(
    <DashKitProvider
      apiUrl={API_URL}
      token={await demoToken(userId)}
      onFilterChange={onFilterChange}
    >
      <Host initialId={initialId} onChange={onChange} />
    </DashKitProvider>,
  );
  const list = await screen.findByLabelText<HTMLSelectElement>('Dashboard');
  await waitFor(() => expect(titles(list)).toContain('Population explorer'));
  return { list, onChange, onFilterChange };
}

// The mock API keeps its dashboards for the whole file, so tests that add one remove it again.
async function clientFor(userId: string) {
  return new QueryClient({ apiUrl: API_URL, token: await demoToken(userId) });
}

const titles = (select: HTMLSelectElement) => [...select.options].map(({ text }) => text);

const heading = (name: string) => screen.findByRole('heading', { level: 2, name });

const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });

function choose(select: HTMLSelectElement, text: string) {
  const option = [...select.options].find((candidate) => candidate.text === text);
  if (!option) throw new Error(`No option "${text}"`);
  fireEvent.change(select, { target: { value: option.value } });
}

describe('DashboardPicker', () => {
  it('lists the tenant’s dashboards and shows the one chosen, without the old one’s filters', async () => {
    const { list, onChange, onFilterChange } = await renderPicker('ravi');
    expect(titles(list)).toEqual(['World development overview', 'Population explorer']);
    // Viewers only switch.
    expect(screen.queryByRole('button', { name: 'New dashboard' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete dashboard' })).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Filter by South Asia' }));
    expect(onFilterChange).toHaveBeenLastCalledWith([
      { field: 'region', values: ['South Asia'], sourceWidgetId: 'population-by-region' },
    ]);

    choose(list, 'Population explorer');
    expect(onChange).toHaveBeenCalledWith('population');
    expect(onFilterChange).toHaveBeenLastCalledWith([]);
    expect(await heading('Population explorer')).toBeTruthy();
    expect(list.value).toBe('population');
  });

  it('lets an editor create a dashboard, with an id from its title, and shows it', async () => {
    const { onChange } = await renderPicker('asha');
    fireEvent.click(button('New dashboard'));
    const title = screen.getByLabelText('Title of the new dashboard');
    expect(document.activeElement).toBe(title);
    expect(button('Create').disabled).toBe(true);

    fireEvent.change(title, { target: { value: 'Sales in Asia' } });
    fireEvent.click(button('Create'));
    expect(await heading('Sales in Asia')).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith('sales-in-asia');
    expect(screen.getByText('This dashboard has no widgets yet.')).toBeTruthy();
    const shownList = screen.getByLabelText<HTMLSelectElement>('Dashboard');
    expect(document.activeElement).toBe(shownList);
    expect(shownList.value).toBe('sales-in-asia');

    // The same title again gets the next free id.
    fireEvent.click(button('New dashboard'));
    fireEvent.change(screen.getByLabelText('Title of the new dashboard'), {
      target: { value: 'Sales in Asia' },
    });
    fireEvent.submit(screen.getByLabelText('Title of the new dashboard'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('sales-in-asia-2'));
    expect(screen.getByLabelText<HTMLSelectElement>('Dashboard').value).toBe('sales-in-asia-2');

    const client = await clientFor('asha');
    await client.deleteDashboard('sales-in-asia');
    await client.deleteDashboard('sales-in-asia-2');
  });

  it('cancels a new dashboard and gives the focus back', async () => {
    await renderPicker('asha');
    fireEvent.click(button('New dashboard'));
    fireEvent.click(button('Cancel'));
    expect(document.activeElement).toBe(button('New dashboard'));
  });

  it('asks before deleting, keeps the dashboard on Keep, and shows another after Delete', async () => {
    const client = await clientFor('asha');
    const overview = await client.loadDashboard('overview');
    await client.saveDashboard({ ...overview, id: 'to-delete', title: 'To delete' });
    const { onChange } = await renderPicker('asha', 'to-delete');
    expect(await heading('To delete')).toBeTruthy();

    fireEvent.click(button('Delete dashboard'));
    expect(
      screen.getByRole('group', { name: 'Delete “To delete”? Its widgets cannot be restored.' }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(button('Keep'));
    fireEvent.click(button('Keep'));
    expect(document.activeElement).toBe(button('Delete dashboard'));

    fireEvent.click(button('Delete dashboard'));
    fireEvent.click(button('Delete'));
    expect(await heading('World development overview')).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith('overview');
    const list = screen.getByLabelText<HTMLSelectElement>('Dashboard');
    expect(document.activeElement).toBe(list);
    await waitFor(() => expect(titles(list)).not.toContain('To delete'));
    expect((await client.listDashboards()).map(({ id }) => id)).not.toContain('to-delete');
  });

  it('waits while the builder has unsaved changes', async () => {
    const { list } = await renderPicker('asha');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }));
    expect(list.disabled).toBe(false);

    fireEvent.click(await screen.findByRole('button', { name: 'Remove Countries' }));
    expect(list.disabled).toBe(true);
    expect(button('New dashboard').disabled).toBe(true);
    expect(
      screen.getByText(
        'Save or cancel the changes to this dashboard before you switch to another.',
      ),
    ).toBeTruthy();

    fireEvent.click(button('Cancel'));
    expect(list.disabled).toBe(false);
    expect(screen.queryByText(/before you switch to another/)).toBeNull();
  });

  it('shows why the API refused a deletion, and stays on the dashboard', async () => {
    server.use(
      http.delete(`${API_URL}/dashboards/:id`, () =>
        HttpResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Only editors can change dashboards' } },
          { status: 403 },
        ),
      ),
    );
    const { onChange } = await renderPicker('asha');
    fireEvent.click(button('Delete dashboard'));
    fireEvent.click(button('Delete'));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Only editors can change dashboards',
    );
    expect(button('Delete').disabled).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
