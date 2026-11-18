import { fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { formatValue } from '../core/format';
import { QueryClient } from '../core/query-client';
import type { DashboardConfig, WidgetConfig } from '../core/types';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { DashboardBuilder, type DashboardBuilderProps } from './DashboardBuilder';
import { placeWidgets } from './DashboardGrid';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

const server = setupMockApi();

async function renderBuilder(
  userId: string,
  props: DashboardBuilderProps = { dashboardId: 'overview' },
) {
  const token = await demoToken(userId);
  const view = render(
    <DashKitProvider apiUrl={API_URL} token={token}>
      <DashboardBuilder {...props} />
    </DashKitProvider>,
  );
  await screen.findByRole('table', { name: 'Countries' });
  return view;
}

async function renderEditing(
  userId: string,
  props: { dashboardId?: string } & Pick<DashboardBuilderProps, 'onSave'> = {},
) {
  const view = await renderBuilder(userId, { dashboardId: 'overview', ...props, mode: 'edit' });
  await screen.findByRole('button', { name: 'Cancel' });
  return view;
}

// The mock API keeps its dashboards for the whole file, so tests that save work on a copy and
// leave the overview as the other tests expect it.
async function copyOverview(userId: string, id: string) {
  const client = new QueryClient({ apiUrl: API_URL, token: await demoToken(userId) });
  await client.saveDashboard({ ...(await client.loadDashboard('overview')), id });
  return client;
}

const emptyDashboard = (id: string): DashboardConfig => ({
  id,
  schemaVersion: 1,
  title: 'Empty',
  widgets: [],
  layouts: { lg: [] },
});

const dragHandles = () => screen.queryAllByTitle('Drag to move');

const palette = () => screen.getByRole('group', { name: 'Add a widget' });

const widget = (title: string) => screen.getByRole('region', { name: title });

async function openSettings(title: string) {
  fireEvent.click(screen.getByRole('button', { name: `Configure ${title}` }));
  const panel = screen.getByRole('region', { name: 'Widget settings' });
  // The measure list arrives from the API after the panel opens.
  await within(panel).findByLabelText('Measure');
  return panel;
}

const change = (panel: HTMLElement, label: string, value: string) =>
  fireEvent.change(within(panel).getByLabelText(label), { target: { value } });

describe('column scope', () => {
  it('FR-3.11 shows an editor only the measures they may query, and starts new widgets on one', async () => {
    render(
      <DashKitProvider apiUrl={API_URL} token={await demoToken('kofi')}>
        <DashboardBuilder dashboardId="overview" mode="edit" />
      </DashKitProvider>,
    );
    await screen.findByRole('button', { name: 'Cancel' });

    // The API refuses the widgets that need GDP, and says which measure.
    const refused = await within(widget('GDP by income level')).findByRole('alert');
    expect(refused.textContent).toBe('Access deniedYour access does not include GDP (US$)');

    const panel = await openSettings('GDP by income level');
    const measure = within(panel).getByLabelText<HTMLSelectElement>('Measure');
    expect([...measure.options].map(({ textContent }) => textContent)).toEqual([
      'Not available to you',
      'Population',
      'Life expectancy (years)',
      'Internet users (%)',
      'Unemployment (%)',
      'Electricity access (%)',
    ]);
    expect(measure.selectedOptions[0]!.textContent).toBe('Not available to you');
    fireEvent.click(within(panel).getByRole('button', { name: 'Close widget settings' }));

    // The KPI starter shows total GDP; for this editor it starts on population instead.
    fireEvent.click(within(palette()).getByRole('button', { name: 'KPI' }));
    const added = await screen.findByRole('region', { name: 'Population' });
    expect(await within(added).findByText(/^\d+(\.\d)?B$/)).toBeTruthy();
    expect(within(added).queryByRole('alert')).toBeNull();
  });
});

describe('DashboardBuilder', () => {
  it('FR-5.1 lets an editor switch between the dashboard and the builder', async () => {
    await renderBuilder('asha');
    expect(dragHandles()).toEqual([]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }));
    expect(dragHandles()).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dragHandles()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Edit dashboard' })).toBeTruthy();
  });

  it('FR-5.1 shows viewers no edit controls, even when asked to start in the builder', async () => {
    await renderBuilder('ravi', { dashboardId: 'overview', mode: 'edit' });
    // The role arrives after the widgets have loaded, so wait for any late render.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: 'Edit dashboard' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(dragHandles()).toEqual([]);
  });

  it('starts an editor in the builder with mode "edit"', async () => {
    await renderBuilder('elena', { dashboardId: 'overview', mode: 'edit' });
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(dragHandles()).toHaveLength(5);
  });

  it('FR-5.4 adds a widget from the palette, showing the latest year by default', async () => {
    await renderEditing('asha');
    const totalGdp = await new QueryClient({
      apiUrl: API_URL,
      token: await demoToken('asha'),
    }).run({
      dataset: 'wdi',
      measures: [{ field: 'gdp', agg: 'sum' }],
      filters: [{ field: 'year', op: 'eq', value: 2024 }],
    });

    fireEvent.click(within(palette()).getByRole('button', { name: 'KPI' }));

    const added = await screen.findByRole('region', { name: 'Total GDP' });
    expect(
      await within(added).findByText(formatValue(totalGdp.rows[0]!.gdp!, 'currency', 'compact')),
    ).toBeTruthy();
    expect(dragHandles()).toHaveLength(6);
    // Focus moves to the new widget, which scrolls it into view and announces it.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Configure Total GDP' }),
    );
  });

  it('FR-5.4 removes widgets, down to an empty dashboard', async () => {
    await renderEditing('asha');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Population by region' }));
    expect(screen.queryByRole('region', { name: 'Population by region' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Countries' })).toBeTruthy();

    for (const button of screen.getAllByRole('button', { name: /^Remove / })) {
      fireEvent.click(button);
    }
    expect(dragHandles()).toEqual([]);
    expect(screen.getByText('Add a widget to start.')).toBeTruthy();
  });

  it('FR-5.9 duplicates a widget', async () => {
    await renderEditing('asha');
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Population by region' }));

    const copy = await screen.findByRole('region', { name: 'Population by region (copy)' });
    expect(
      await within(copy).findByRole('table', { name: 'Population by region (copy)' }),
    ).toBeTruthy();
  });

  it('FR-5.5 FR-5.6 configures a widget, which shows each change at once', async () => {
    await renderEditing('asha');
    const panel = await openSettings('Population by region');
    expect(document.activeElement).toBe(within(panel).getByLabelText('Title'));

    change(panel, 'Title', 'Population by income level');
    expect(widget('Population by income level')).toBeTruthy();

    change(panel, 'Group by', 'incomeLevel');
    const chart = widget('Population by income level');
    expect(
      await within(chart).findByRole('button', { name: 'Filter by High income' }),
    ).toBeTruthy();

    change(panel, 'Measure', 'gdp');
    expect(within(panel).getByLabelText<HTMLSelectElement>('Aggregation').value).toBe('sum');
    expect(await within(chart).findByRole('columnheader', { name: 'GDP (US$)' })).toBeTruthy();

    change(panel, 'Sort', 'desc:gdp');
    change(panel, 'Row limit', '2');
    const richest = await new QueryClient({
      apiUrl: API_URL,
      token: await demoToken('asha'),
    }).run({
      dataset: 'wdi',
      measures: [{ field: 'gdp', agg: 'sum' }],
      dimensions: ['incomeLevel'],
      filters: [{ field: 'year', op: 'eq', value: 2024 }],
      orderBy: [{ field: 'gdp', direction: 'desc' }],
      limit: 2,
    });
    await vi.waitFor(() =>
      expect(
        within(chart)
          .getAllByRole('button', { name: /^Filter by / })
          .map(({ textContent }) => textContent),
      ).toEqual(richest.rows.map(({ incomeLevel }) => incomeLevel)),
    );
  });

  it('FR-5.5 changes the type and offers only the settings of the new type', async () => {
    await renderEditing('asha');
    const panel = await openSettings('Population by region');
    expect(within(panel).getByLabelText('Bars')).toBeTruthy();

    change(panel, 'Type', 'table');
    expect(await screen.findByRole('region', { name: 'Population by region table' })).toBeTruthy();
    expect(within(panel).queryByLabelText('Bars')).toBeNull();
    expect(within(panel).getByLabelText<HTMLSelectElement>('Group by').value).toBe('region');

    change(panel, 'Type', 'kpi');
    expect(within(panel).queryByLabelText('Group by')).toBeNull();
    expect(within(panel).queryByLabelText('Clicking it filters other widgets')).toBeNull();
    expect(within(panel).getByLabelText('Follows filters from other widgets')).toBeTruthy();
  });

  it('FR-5.5 turns cross-filtering on and off', async () => {
    await renderEditing('asha');
    const chart = widget('Population by region');
    expect(await within(chart).findByRole('button', { name: 'Filter by South Asia' })).toBeTruthy();

    const panel = await openSettings('Population by region');
    fireEvent.click(within(panel).getByLabelText('Clicking it filters other widgets'));
    expect(within(chart).queryByRole('button', { name: 'Filter by South Asia' })).toBeNull();
    expect(within(chart).getByRole('cell', { name: 'South Asia' })).toBeTruthy();
  });

  it('offers drill-down to the other fields, while clicking the widget filters', async () => {
    await renderEditing('asha');
    const panel = await openSettings('Population by region');
    const drillDown = within(panel).getByLabelText<HTMLSelectElement>('Drill down to');
    expect([...drillDown.options].map(({ text }) => text)).toEqual([
      'Nothing',
      'Country',
      'Income level',
      'Year',
    ]);
    change(panel, 'Drill down to', 'country');

    // The draft drills down at once: a click shows the region's countries.
    const chart = widget('Population by region');
    fireEvent.click(within(chart).getByRole('button', { name: 'Filter by South Asia' }));
    expect(await within(chart).findByRole('button', { name: 'All regions' })).toBeTruthy();
    expect(await within(chart).findByRole('cell', { name: 'India' })).toBeTruthy();

    // A widget whose clicks filter nothing has no selection to drill into.
    fireEvent.click(within(panel).getByLabelText('Clicking it filters other widgets'));
    expect(within(panel).queryByLabelText('Drill down to')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close widget settings' }));
    expect(
      within(await openSettings('Total population')).queryByLabelText('Drill down to'),
    ).toBeNull();
  });

  it('adds filter controls above the dashboard, which are saved with it', async () => {
    const client = await copyOverview('asha', 'with-controls');
    const onSave = vi.fn();
    await renderEditing('asha', { dashboardId: 'with-controls', onSave });
    const picker = within(
      await screen.findByRole('group', { name: 'Filters above the dashboard' }),
    );
    expect(screen.queryByRole('group', { name: 'Filters' })).toBeNull();

    fireEvent.click(picker.getByLabelText('Year'));
    fireEvent.click(picker.getByLabelText('Region'));
    const controls = within(screen.getByRole('group', { name: 'Filters' }));
    expect(
      controls
        .getAllByRole<HTMLSelectElement>('combobox')
        .map((select) => select.labels?.[0]?.textContent),
    ).toEqual(['Year', 'Region']);
    fireEvent.click(picker.getByLabelText('Year'));
    expect(controls.getAllByRole('combobox')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Saved');
    expect(screen.queryByRole('group', { name: 'Filters above the dashboard' })).toBeNull();
    expect(
      within(screen.getByRole('group', { name: 'Filters' })).getByLabelText('Region'),
    ).toBeTruthy();
    const [stored] = onSave.mock.calls[0] as [DashboardConfig];
    expect(stored.filterControls).toEqual([{ field: 'region' }]);
    expect((await client.loadDashboard('with-controls')).filterControls).toEqual([
      { field: 'region' },
    ]);
  });

  it('FR-5.5 splits a table into pages of the size an editor chooses', async () => {
    await renderEditing('asha');
    const panel = await openSettings('Countries');
    expect(within(widget('Countries')).queryByRole('navigation')).toBeNull();

    change(panel, 'Rows per page', '10');
    const pages = within(widget('Countries')).getByRole('navigation', {
      name: 'Pages of Countries',
    });
    expect(within(pages).getByRole('status').textContent).toMatch(/^Rows 1–10 of \d+$/);

    change(panel, 'Rows per page', '');
    expect(within(widget('Countries')).queryByRole('navigation')).toBeNull();
  });

  it('closes the settings with Escape or the close button, and returns focus', async () => {
    await renderEditing('asha');
    const configure = screen.getByRole('button', { name: 'Configure Countries' });
    configure.focus();
    const panel = await openSettings('Countries');
    expect(configure.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(within(panel).getByLabelText('Title'), { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Widget settings' })).toBeNull();
    expect(document.activeElement).toBe(configure);

    await openSettings('Countries');
    fireEvent.click(screen.getByRole('button', { name: 'Close widget settings' }));
    expect(screen.queryByRole('region', { name: 'Widget settings' })).toBeNull();
    expect(configure.getAttribute('aria-expanded')).toBe('false');
  });

  it('still lets the title and type change when the fields cannot be loaded', async () => {
    server.use(
      http.get(`${API_URL}/meta`, () =>
        HttpResponse.json(
          { error: { code: 'UNKNOWN', message: 'Try again later.' } },
          { status: 500 },
        ),
      ),
    );
    await renderEditing('asha');
    fireEvent.click(screen.getByRole('button', { name: 'Configure Countries' }));
    const panel = screen.getByRole('region', { name: 'Widget settings' });

    expect((await within(panel).findByRole('alert')).textContent).toContain('Try again later.');
    expect(within(panel).queryByLabelText('Measure')).toBeNull();
    change(panel, 'Title', 'Every country');
    expect(widget('Every country')).toBeTruthy();
  });

  it('tells viewers when a dashboard has no widgets', async () => {
    const token = await demoToken('ravi');
    render(
      <DashKitProvider apiUrl={API_URL} token={token}>
        <DashboardBuilder config={emptyDashboard('empty')} />
      </DashKitProvider>,
    );
    expect(await screen.findByText('This dashboard has no widgets yet.')).toBeTruthy();
  });

  it('refuses a dashboard saved by a newer version of the SDK', async () => {
    const token = await demoToken('asha');
    const newer = { ...emptyDashboard('newer'), schemaVersion: 2 } as unknown as DashboardConfig;
    render(
      <DashKitProvider apiUrl={API_URL} token={token}>
        <DashboardBuilder config={newer} />
      </DashKitProvider>,
    );
    expect((await screen.findByRole('alert')).textContent).toContain('schema version 2');
  });
});

describe('undo and redo', () => {
  const button = (name: string) => screen.getByRole('button', { name });
  const isOff = (name: string) => button(name).getAttribute('aria-disabled') === 'true';
  const saveStatus = () => document.querySelector('.dk-toolbar-status')!.textContent;
  const historyNote = () =>
    screen.getAllByRole('status').find((status) => status.textContent?.includes('more to'))
      ?.textContent;
  const press = (key: string, modifiers: { shiftKey?: boolean } = {}) =>
    fireEvent.keyDown(button('Undo'), { key, ctrlKey: true, ...modifiers });

  it('FR-5.10 steps back and forward through edits with the toolbar and the keyboard', async () => {
    await renderEditing('asha');
    expect(isOff('Undo')).toBe(true);
    expect(isOff('Redo')).toBe(true);

    fireEvent.click(button('Remove Total population'));
    fireEvent.click(button('Duplicate Countries'));
    expect(dragHandles()).toHaveLength(5);
    expect(saveStatus()).toBe('Unsaved changes');

    fireEvent.click(button('Undo'));
    expect(dragHandles()).toHaveLength(4);
    expect(historyNote()).toBe('Undid a change. 1 more to undo.');
    press('z');
    expect(dragHandles()).toHaveLength(5);
    expect(widget('Total population')).toBeTruthy();
    // Back to the saved dashboard itself, so nothing is unsaved.
    expect(saveStatus()).toBe('');
    expect(isOff('Undo')).toBe(true);
    // Still focusable at the end of the history, so the focus stays on the button.
    expect(button('Undo').hasAttribute('disabled')).toBe(false);

    press('z', { shiftKey: true });
    expect(screen.queryByRole('region', { name: 'Total population' })).toBeNull();
    press('y');
    expect(dragHandles()).toHaveLength(5);
    expect(historyNote()).toBe('Redid a change. No more to redo.');
    expect(isOff('Redo')).toBe(true);

    // A new edit forgets what could have been redone.
    fireEvent.click(button('Undo'));
    fireEvent.click(button('Duplicate Population by region'));
    expect(isOff('Redo')).toBe(true);
    fireEvent.click(button('Cancel'));
  });

  it('FR-5.10 undoes a typed title in one step, and leaves Ctrl+Z in a text field to the browser', async () => {
    await renderEditing('asha');
    const panel = await openSettings('Population by region');
    for (const typed of ['P', 'Pe', 'People']) change(panel, 'Title', typed);
    expect(widget('People')).toBeTruthy();

    const title = within(panel).getByLabelText('Title');
    expect(fireEvent.keyDown(title, { key: 'z', ctrlKey: true })).toBe(true);
    expect(widget('People')).toBeTruthy();

    fireEvent.click(button('Undo'));
    expect(widget('Population by region')).toBeTruthy();
    expect(isOff('Undo')).toBe(true);
    fireEvent.click(button('Cancel'));
  });
});

describe('moving and resizing from the keyboard', () => {
  const keyNote = () => document.querySelector('.dk-grid [role="status"]')!.textContent;
  const handleOf = (title: string) =>
    screen.getByRole('button', { name: `Move or resize ${title}` });
  // Each key goes to whatever has the focus, so a press after a lost focus would do nothing.
  const press = (key: string, shiftKey = false) =>
    fireEvent.keyDown(document.activeElement!, { key, shiftKey });

  it('FR-5.11 moves and resizes a widget from its handle, says what happened, and keeps the focus there', async () => {
    await copyOverview('asha', 'keyboard-arrange');
    const onSave = vi.fn();
    await renderEditing('asha', { dashboardId: 'keyboard-arrange', onSave });
    const handle = handleOf('Countries');
    expect(document.getElementById(handle.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Arrow keys move it; Shift and the arrow keys resize it.',
    );

    handle.focus();
    press('ArrowRight');
    expect(keyNote()).toBe('Countries cannot move further right.');
    press('ArrowUp');
    expect(keyNote()).toBe('Countries: column 1 of 12, row 4.');
    press('ArrowUp');
    expect(keyNote()).toBe('Countries: column 1 of 12, row 1.');
    expect(screen.getAllByRole('button', { name: /^Move or resize / })[0]).toBe(
      handleOf('Countries'),
    );
    // Down again puts its element after two others in the page, and the focus stays on its handle.
    press('ArrowDown');
    expect(keyNote()).toBe('Countries: column 1 of 12, row 4.');
    expect(screen.getAllByRole('button', { name: /^Move or resize / })[2]).toBe(
      handleOf('Countries'),
    );
    expect(document.activeElement).toBe(handleOf('Countries'));
    press('ArrowUp');

    press('ArrowUp', true);
    expect(keyNote()).toBe('Countries: 12 of 12 columns wide, 4 rows high.');
    press('ArrowUp', true);
    expect(keyNote()).toBe('Countries cannot get any shorter.');

    // A run of presses of one kind is one step to undo.
    const undo = screen.getByRole('button', { name: 'Undo' });
    fireEvent.click(undo);
    fireEvent.click(undo);
    expect(undo.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved')).toBeTruthy();
    const [stored] = onSave.mock.calls[0] as [DashboardConfig];
    expect(stored.layouts.lg.find(({ i }) => i === 'countries')).toEqual({
      i: 'countries',
      x: 0,
      y: 0,
      w: 12,
      h: 5,
    });
    // The widgets it passed are below it, none overlapping.
    expect(stored.layouts.lg.filter(({ i }) => i !== 'countries').every(({ y }) => y >= 5)).toBe(
      true,
    );
  });
});

describe('saving', () => {
  const leavePage = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it('FR-5.7 saves the draft and shows the saved dashboard, which loads again exactly', async () => {
    const client = await copyOverview('asha', 'save-and-reload');
    const onSave = vi.fn();
    const view = await renderEditing('asha', { dashboardId: 'save-and-reload', onSave });

    const saveStatus = () => document.querySelector<HTMLElement>('.dk-toolbar-status')!;
    expect(saveStatus().textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Total population' }));
    // In the theme's warning colour, with an icon, until the draft is saved or cancelled.
    expect(saveStatus().textContent).toBe('Unsaved changes');
    expect(saveStatus().dataset.dkStatus).toBe('unsaved');
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Countries' }));
    change(await openSettings('Population by region'), 'Title', 'People by region');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeTruthy();
    expect(saveStatus().dataset.dkStatus).toBe('saved');
    expect(dragHandles()).toEqual([]);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit dashboard' }));
    expect(onSave).toHaveBeenCalledOnce();
    const [stored] = onSave.mock.calls[0] as [DashboardConfig];
    expect(stored.widgets.map(({ title }) => title)).toEqual([
      'People by region',
      'GDP by income level',
      'Average life expectancy',
      'Countries',
      'Countries (copy)',
    ]);
    expect(await client.loadDashboard('save-and-reload')).toEqual(stored);

    view.unmount();
    await renderBuilder('asha', { dashboardId: 'save-and-reload' });
    expect(screen.getByRole('region', { name: 'People by region' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Countries (copy)' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Total population' })).toBeNull();
  });

  it('FR-5.8 Cancel discards the draft and gives the focus back to Edit dashboard', async () => {
    await renderEditing('asha');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Countries' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('region', { name: 'Countries' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit dashboard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit dashboard' }));
    expect(dragHandles()).toHaveLength(5);
  });

  it('FR-5.8 warns before the page is left with unsaved changes, and only then', async () => {
    await renderEditing('asha');
    expect(leavePage()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Countries' }));
    expect(leavePage()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(leavePage()).toBe(false);
  });

  it('lists the problems and sends nothing while the draft is invalid', async () => {
    const client = await copyOverview('asha', 'invalid-draft');
    await renderEditing('asha', { dashboardId: 'invalid-draft' });
    const panel = await openSettings('Countries');
    change(panel, 'Title', '');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Every widget needs a title.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    const unchanged = await client.loadDashboard('invalid-draft');
    expect(unchanged.widgets.map(({ title }) => title)).toContain('Countries');

    change(panel, 'Title', 'All countries');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows why the API refused a save, and keeps the draft', async () => {
    server.use(
      http.put(`${API_URL}/dashboards/:id`, () =>
        HttpResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Only editors can change dashboards' } },
          { status: 403 },
        ),
      ),
    );
    await renderEditing('asha');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Countries' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Only editors can change dashboards',
    );
    expect(screen.queryByRole('region', { name: 'Countries' })).toBeNull();
    expect(leavePage()).toBe(true);
  });
});

describe('placeWidgets', () => {
  const widget = (id: string, type: WidgetConfig['type']): WidgetConfig => ({
    id,
    type,
    title: id,
    query: { dataset: 'wdi', measures: [{ field: 'population' }] },
  });

  it('FR-5.3 gives every widget its type’s minimum size, in reading order', () => {
    const placed = placeWidgets(
      [
        { i: 'table', x: 0, y: 4, w: 12, h: 5 },
        { i: 'bar', x: 3, y: 0, w: 9, h: 4 },
        { i: 'kpi', x: 0, y: 0, w: 3, h: 4 },
        { i: 'deleted', x: 0, y: 9, w: 3, h: 3 },
      ],
      [widget('bar', 'bar'), widget('kpi', 'kpi'), widget('table', 'table')],
    );
    expect(placed.map(({ item }) => item)).toEqual([
      { i: 'kpi', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
      { i: 'bar', x: 3, y: 0, w: 9, h: 4, minW: 4, minH: 3 },
      { i: 'table', x: 0, y: 4, w: 12, h: 5, minW: 4, minH: 4 },
    ]);
  });

  it('FR-5.3 lets a widget’s own minimum size raise its type’s, but not lower it', () => {
    const placed = placeWidgets(
      [
        { i: 'bar', x: 0, y: 0, w: 8, h: 4, minW: 6, minH: 2 },
        { i: 'kpi', x: 8, y: 0, w: 4, h: 4, minH: 4 },
      ],
      [widget('bar', 'bar'), widget('kpi', 'kpi')],
    );
    expect(placed.map(({ item }) => item)).toEqual([
      { i: 'bar', x: 0, y: 0, w: 8, h: 4, minW: 6, minH: 3 },
      { i: 'kpi', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 4 },
    ]);
  });

  it('gives no minimum size on the narrower grids, which are not edited', () => {
    const placed = placeWidgets(
      [{ i: 'bar', x: 0, y: 0, w: 4, h: 4, minW: 6 }],
      [widget('bar', 'bar')],
      false,
    );
    expect(placed.map(({ item }) => item)).toEqual([{ i: 'bar', x: 0, y: 0, w: 4, h: 4 }]);
  });
});
