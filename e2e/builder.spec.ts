import { expect, test, type Locator, type Page } from '@playwright/test';

const API_URL = 'http://localhost:4000';

// Without animation, charts are drawn at once and widgets settle as soon as they are dropped.
test.use({ reducedMotion: 'reduce' });

const widgets = (page: Page) => page.locator('.dk-widget');
const widgetTitled = (page: Page, title: string) =>
  page.getByRole('region', { name: title, exact: true });

async function signIn(page: Page, userId: string) {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption(userId);
  await expect(page.getByRole('heading', { name: 'World development overview' })).toBeVisible();
}

// Waits until every widget shows data, then records what each shows and where on the page. Chart
// data is read from the table each chart renders for screen readers.
async function describeDashboard(page: Page) {
  await expect(page.locator('.dk-skeleton, [aria-busy="true"]')).toHaveCount(0);
  return widgets(page).evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return {
        title: element.querySelector('h3')?.textContent,
        box: [x + window.scrollX, y + window.scrollY, width, height].map(Math.round),
        content: element.textContent,
      };
    }),
  );
}

// Mouse positions are relative to the viewport, so a drag starts from an element in view.
async function centreOf(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.up();
}

const top = async (locator: Locator) => (await locator.boundingBox())!.y;

test('FR-5.1 to FR-5.7 an editor builds a dashboard from empty, saves it, and a reload shows it unchanged', async ({
  page,
}) => {
  // Elena's tenant is used by no other test, so this test may change its dashboard.
  await signIn(page, 'elena');
  await page.getByRole('button', { name: 'Edit dashboard' }).click();

  const removeButtons = page.getByRole('button', { name: /^Remove / });
  while ((await removeButtons.count()) > 0) await removeButtons.first().click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();

  await signIn(page, 'elena');
  await expect(page.getByText('This dashboard has no widgets yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  const palette = page.getByRole('group', { name: 'Add a widget' });
  for (const type of ['Bar chart', 'Line chart', 'Table', 'KPI']) {
    await palette.getByRole('button', { name: type, exact: true }).click();
  }
  await expect(widgets(page)).toHaveCount(4);

  // Arrange: the line chart moves up beside the bar chart, and the table grows to full width.
  // Adding the KPI scrolled it into view, so the page goes back to the top first.
  await page.evaluate(() => window.scrollTo(0, 0));
  const bar = widgetTitled(page, 'GDP per capita by region');
  const line = widgetTitled(page, 'Internet users over time');
  const barBox = (await bar.boundingBox())!;
  const lineHandle = await centreOf(line.getByTitle('Drag to move'));
  await drag(page, lineHandle, { x: lineHandle.x + barBox.width, y: barBox.y + 20 });
  await expect.poll(() => top(line)).toBe(await top(bar));

  const tableCell = page.locator('.react-grid-item', {
    has: widgetTitled(page, 'Life expectancy by country'),
  });
  const narrowWidth = (await tableCell.boundingBox())!.width;
  const resizeHandle = await centreOf(tableCell.locator('.react-resizable-handle'));
  await drag(page, resizeHandle, { x: resizeHandle.x + narrowWidth, y: resizeHandle.y });
  await expect
    .poll(async () => (await tableCell.boundingBox())!.width)
    .toBeGreaterThan(narrowWidth * 1.5);

  // Configure: the KPI shows another measure, the bar chart another grouping, the table fewer rows.
  await page.getByRole('button', { name: 'Configure Total GDP' }).click();
  const settings = page.getByRole('region', { name: 'Widget settings' });
  await settings.getByLabel('Measure').selectOption('lifeExpectancy');
  await settings.getByLabel('Title').fill('Average life expectancy');
  await page.getByRole('button', { name: 'Configure GDP per capita by region' }).click();
  await settings.getByLabel('Group by').selectOption('incomeLevel');
  await settings.getByLabel('Bars').selectOption('vertical');
  await settings.getByLabel('Title').fill('GDP per capita by income level');
  await page.getByRole('button', { name: 'Configure Life expectancy by country' }).click();
  await settings.getByLabel('Row limit').fill('5');
  await settings.getByRole('button', { name: 'Close widget settings' }).click();
  await expect(
    page.getByRole('table', { name: 'Life expectancy by country', exact: true }).getByRole('row'),
  ).toHaveCount(6);

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await expect(page.getByTitle('Drag to move')).toHaveCount(0);
  const saved = await describeDashboard(page);
  expect(saved.map(({ title }) => title)).toEqual([
    'GDP per capita by income level',
    'Internet users over time',
    'Life expectancy by country',
    'Average life expectancy',
  ]);

  await signIn(page, 'elena');
  expect(await describeDashboard(page)).toEqual(saved);
});

test('FR-5.10 an editor undoes a resize and a removal from the keyboard, and redoes them', async ({
  page,
}) => {
  await signIn(page, 'asha');
  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  const before = await describeDashboard(page);

  const kpiCell = page.locator('.react-grid-item', { has: widgetTitled(page, 'Total population') });
  const kpiWidth = (await kpiCell.boundingBox())!.width;
  const resizeHandle = await centreOf(kpiCell.locator('.react-resizable-handle'));
  await drag(page, resizeHandle, { x: resizeHandle.x + kpiWidth, y: resizeHandle.y });
  await expect
    .poll(async () => (await kpiCell.boundingBox())!.width)
    .toBeGreaterThan(kpiWidth * 1.5);
  await page.getByRole('button', { name: 'Remove GDP by income level' }).click();
  await expect(widgets(page)).toHaveCount(4);

  // Ctrl+Z, or Cmd+Z on a Mac, from anywhere in the dashboard.
  await page.getByRole('button', { name: 'Undo' }).focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(widgets(page)).toHaveCount(5);
  await page.keyboard.press('ControlOrMeta+z');
  expect(await describeDashboard(page)).toEqual(before);
  await expect(page.getByText('Unsaved changes')).toHaveCount(0);

  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect
    .poll(async () => (await kpiCell.boundingBox())!.width)
    .toBeGreaterThan(kpiWidth * 1.5);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(widgets(page)).toHaveCount(4);
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('NFR-P5 a chart resized with the mouse is stretched during the drag and drawn again at the end', async ({
  page,
}) => {
  await signIn(page, 'asha');
  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  await describeDashboard(page);

  const cell = page.locator('.react-grid-item', {
    has: widgetTitled(page, 'Population by region'),
  });
  const chart = cell.locator('.dk-chart');
  const canvas = chart.locator('canvas').first();
  const bitmapWidth = () => canvas.evaluate((element: HTMLCanvasElement) => element.width);
  const widthOf = async (locator: Locator) => (await locator.boundingBox())!.width;
  const drawnWidth = await bitmapWidth();
  const startWidth = await widthOf(cell);

  const handle = await centreOf(cell.locator('.react-resizable-handle'));
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x - startWidth / 3, handle.y, { steps: 20 });
  await expect.poll(() => widthOf(cell)).toBeLessThan(startWidth * 0.8);
  // Not drawn again yet, but filling the narrower widget rather than spilling out of it.
  expect(await bitmapWidth()).toBe(drawnWidth);
  expect(Math.abs((await widthOf(canvas)) - (await widthOf(chart)))).toBeLessThan(1);

  await page.mouse.up();
  await expect.poll(bitmapWidth).toBeLessThan(drawnWidth);
  await expect
    .poll(async () => Math.abs((await widthOf(canvas)) - (await widthOf(chart))))
    .toBeLessThan(1);
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('FR-5.11 an editor moves and resizes a widget from the keyboard, and the focus stays on its handle', async ({
  page,
}) => {
  await signIn(page, 'asha');
  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  // Out of the way, so that no chart moved under the pointer shows a tooltip.
  await page.mouse.move(0, 0);
  const before = await describeDashboard(page);
  const hint = 'Arrow keys move it; Shift and the arrow keys resize it.';
  const handle = page.getByRole('button', { name: 'Move or resize Countries' });
  await expect(handle).toHaveAccessibleDescription(hint);

  // Reached with Tab, as a keyboard user reaches it, the handle shows which keys to use.
  await page.getByRole('button', { name: 'Remove Countries' }).focus();
  await page.keyboard.press('Tab');
  await expect(handle).toBeFocused();
  expect(await handle.evaluate((element) => getComputedStyle(element, '::after').content)).toBe(
    JSON.stringify(hint),
  );

  const status = page.locator('.dk-grid [role="status"]');
  const cell = page.locator('.react-grid-item', { has: widgetTitled(page, 'Countries') });
  const box = () =>
    cell.evaluate((element) => {
      const { top, height } = element.getBoundingClientRect();
      return { top: Math.round(top + window.scrollY), height: Math.round(height) };
    });
  const start = await box();
  await page.keyboard.press('ArrowUp');
  await expect(status).toHaveText('Countries: column 1 of 12, row 4.');
  await page.keyboard.press('ArrowUp');
  await expect(status).toHaveText('Countries: column 1 of 12, row 1.');
  await expect.poll(async () => (await box()).top).toBeLessThan(start.top);
  // Down puts the table's element after two others in the page; the focus stays on its handle.
  await page.keyboard.press('ArrowDown');
  await expect(status).toHaveText('Countries: column 1 of 12, row 4.');
  await expect(page.getByRole('button', { name: /^Move or resize / }).nth(2)).toHaveAccessibleName(
    'Move or resize Countries',
  );
  await expect(handle).toBeFocused();

  await page.keyboard.press('Shift+ArrowUp');
  await expect(status).toHaveText('Countries: 12 of 12 columns wide, 4 rows high.');
  await expect.poll(async () => (await box()).height).toBeLessThan(start.height);

  // The moves are one step to undo, and the resize another.
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  expect(await describeDashboard(page)).toEqual(before);
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('FR-5.1 a viewer sees no edit controls, and the API refuses their save', async ({
  page,
  request,
}) => {
  await signIn(page, 'ravi');
  await expect(widgets(page).first()).toBeVisible();
  await describeDashboard(page);
  await expect(page.getByRole('button', { name: 'Edit dashboard' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await expect(page.getByTitle('Drag to move')).toHaveCount(0);
  await expect(page.locator('.react-resizable-handle').filter({ visible: true })).toHaveCount(0);

  const { token } = (await (
    await request.post(`${API_URL}/auth/demo-token`, { data: { userId: 'ravi' } })
  ).json()) as { token: string };
  const headers = { Authorization: `Bearer ${token}` };
  const overview: unknown = await (
    await request.get(`${API_URL}/dashboards/overview`, { headers })
  ).json();
  const response = await request.put(`${API_URL}/dashboards/overview`, {
    headers,
    data: overview,
  });
  expect(response.status()).toBe(403);
  const body: unknown = await response.json();
  expect(body).toMatchObject({ error: { code: 'FORBIDDEN' } });
});
