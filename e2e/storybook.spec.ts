import { expect, test, type Page } from '@playwright/test';

// The built Storybook, served as static files the way it is deployed. Its data API runs in the
// browser, so these tests use neither the demo API nor the demo app.
const STORYBOOK_URL = 'http://localhost:6007';

// Storybook is a tool for integrators; the widgets themselves are tested in every browser by the
// other specs.
test.skip(({ browserName }) => browserName !== 'chromium', 'Storybook is checked in Chromium');

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

const openStory = (page: Page, id: string, query = '') =>
  page.goto(`${STORYBOOK_URL}/iframe.html?id=${id}&viewMode=story${query}`);

const regionRows = (page: Page) =>
  page.getByRole('table', { name: 'Population by region', exact: true }).locator('tbody tr');

// What each widget shows once its data has arrived.
const populated: Record<string, (page: Page) => Promise<void>> = {
  'bar-chart': (page) => expect(page.locator('.dk-chart canvas').first()).toBeVisible(),
  'line-chart': (page) => expect(page.locator('.dk-chart canvas').first()).toBeVisible(),
  'pie-chart': (page) => expect(page.locator('.dk-chart canvas').first()).toBeVisible(),
  table: (page) => expect(page.getByRole('table').locator('tbody tr').first()).toBeVisible(),
  kpi: (page) => expect(page.locator('.dk-kpi-value')).toHaveText(/\d/),
  // The story registers the demo's borders, so the map is drawn rather than shown as a table.
  map: (page) => expect(page.locator('.dk-chart canvas').first()).toBeVisible(),
};

for (const widget of Object.keys(populated)) {
  test(`FR-6.4 the ${widget} widget has a story for each state`, async ({ page }) => {
    await openStory(page, `widgets-${widget}--default`);
    await populated[widget]!(page);
    await expect(page.getByRole('alert')).toHaveCount(0);

    await openStory(page, `widgets-${widget}--loading`);
    await expect(page.locator('.dk-skeleton, [aria-busy="true"]').first()).toBeVisible();

    await openStory(page, `widgets-${widget}--empty`);
    await expect(page.getByText('No data for this selection')).toBeVisible();

    await openStory(page, `widgets-${widget}--failed`);
    await expect(page.getByRole('alert')).toBeVisible();
  });
}

test('the paged table story moves between pages', async ({ page }) => {
  await openStory(page, 'widgets-table--paged');
  const pager = page.getByRole('navigation', { name: 'Pages of Countries' });
  await expect(pager.getByRole('status')).toHaveText(/^Rows 1–8 of \d+$/);
  await expect(page.getByRole('table', { name: 'Countries' }).locator('tbody tr')).toHaveCount(8);
  await pager.getByRole('button', { name: 'Next' }).click();
  await expect(pager.getByRole('status')).toHaveText(/^Rows 9–16 of \d+$/);
});

test('FR-6.5 the theming playground applies its controls', async ({ page }) => {
  await openStory(page, 'concepts-theming--playground', '&args=radius:0');
  await expect(page.locator('.dk-widget').first()).toHaveCSS('border-top-left-radius', '0px');
  await openStory(page, 'concepts-theming--playground', '&args=radius:20');
  await expect(page.locator('.dk-widget').first()).toHaveCSS('border-top-left-radius', '20px');
});

test('FR-6.5 the cross-filtering page filters the other widgets', async ({ page }) => {
  await openStory(page, 'concepts-cross-filtering--click-to-filter');
  await expect(regionRows(page)).toHaveCount(7);
  // Each chart's data table offers the same filter as a click, to keyboard users.
  await page
    .getByRole('table', { name: 'Population by region', exact: true })
    .getByRole('button', { name: 'Filter by South Asia' })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Active filters' })).toContainText(
    'Region: South Asia',
  );
});

test('FR-6.5 switching the signed-in user changes the rows the API returns', async ({ page }) => {
  await openStory(page, 'dashboard--view-mode');
  await expect(regionRows(page)).toHaveCount(7);
  await openStory(page, 'dashboard--view-mode', '&globals=user:ravi');
  await expect(regionRows(page)).toHaveCount(2);
  await openStory(page, 'concepts-security-model--row-level-security');
  await expect(regionRows(page)).toHaveCount(2);
});

test('FR-6.5 the builder stories show editing to an editor and not to a viewer', async ({
  page,
}) => {
  await openStory(page, 'builder--editing');
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Add a widget' })).toBeVisible();
  await openStory(page, 'builder--viewer');
  await expect(regionRows(page)).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Edit dashboard' })).toHaveCount(0);
});

for (const [id, heading, text] of [
  ['getting-started--docs', 'Getting started', 'DashKitProvider'],
  ['concepts-theming--docs', 'Theming', 'primary'],
  ['concepts-security-model--docs', 'Security model', 'token'],
  ['api-reference--docs', 'API reference', 'DashKitProvider'],
] as const) {
  test(`FR-6.6 the "${heading}" docs page renders`, async ({ page }) => {
    await page.goto(`${STORYBOOK_URL}/iframe.html?id=${id}&viewMode=docs`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText(text).first()).toBeVisible();
  });
}
