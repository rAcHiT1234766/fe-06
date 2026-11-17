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
