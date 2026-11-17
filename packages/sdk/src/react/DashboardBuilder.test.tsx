import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WidgetConfig } from '../core/types';
import { API_URL, demoToken, setupMockApi } from '../testing/mock-api';
import { DashboardBuilder, type DashboardBuilderProps } from './DashboardBuilder';
import { placeWidgets } from './DashboardGrid';
import { DashKitProvider } from './DashKitProvider';

// The test DOM cannot draw on a canvas. Chart options are tested on their own, and drawing in a browser.
vi.mock('./hooks/use-echart', () => ({ useEChart: () => ({ current: null }) }));

setupMockApi();

async function renderBuilder(
  userId: string,
  props: DashboardBuilderProps = { dashboardId: 'overview' },
) {
  const token = await demoToken(userId);
  render(
    <DashKitProvider apiUrl={API_URL} token={token}>
      <DashboardBuilder {...props} />
    </DashKitProvider>,
  );
  await screen.findByRole('table', { name: 'Countries' });
}

const dragHandles = () => screen.queryAllByTitle('Drag to move');

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
});
