import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// axe checks the DOM and computed styles, which every engine builds alike, so one browser is enough.
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'axe results do not depend on the engine',
);
test.use({ reducedMotion: 'reduce' });

const BRANDS = ['acme', 'asiainsights', 'eurostat'];

const dataOf = (page: Page, widgetTitle: string) =>
  page.getByRole('table', { name: widgetTitle, exact: true });

/** Fails on any serious or critical WCAG 2.x A or AA violation, listing where each one is. */
async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.map(({ target }) => target.join(' ')),
    }));
  expect(serious).toEqual([]);
}

async function showDashboard(page: Page, userId = 'asha') {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption(userId);
  await expect(dataOf(page, 'Countries')).toBeAttached();
}

for (const brand of BRANDS) {
  for (const mode of ['light', 'dark']) {
    test(`NFR-A1 NFR-A3 the ${brand} dashboard in ${mode} mode has no serious violations`, async ({
      page,
    }) => {
      await showDashboard(page);
      await page.getByLabel('Brand').selectOption(brand);
      await page.getByLabel('Mode').selectOption(mode);
      await expect(dataOf(page, 'Countries')).toBeAttached();
      await expectNoSeriousViolations(page);
    });
  }
}

test('NFR-A1 the host product with its sidebar, in every brand and mode, has no serious violations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await showDashboard(page);
  for (const brand of BRANDS) {
    for (const mode of ['light', 'dark']) {
      await page.getByLabel('Brand').selectOption(brand);
      await page.getByLabel('Mode').selectOption(mode);
      await expectNoSeriousViolations(page);
    }
  }
});

test('NFR-A1 one of the host product’s own pages has no serious violations', async ({ page }) => {
  await page.goto('/#orders');
  await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('NFR-A1 the dashboard with an active filter has no serious violations', async ({ page }) => {
  await showDashboard(page);
  const southAsia = dataOf(page, 'Population by region').getByRole('button', {
    name: 'Filter by South Asia',
  });
  await southAsia.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Active filters' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('NFR-A1 the Population explorer, drilled into a region, in every brand and mode, has no serious violations', async ({
  page,
}) => {
  await showDashboard(page);
  await page
    .getByLabel('Dashboard', { exact: true })
    .selectOption({ label: 'Population explorer' });
  await expect(page.getByRole('img', { name: 'Population by country chart' })).toBeVisible();
  // The region chart then lists South Asia's countries, with a link back and the lists above.
  const southAsia = dataOf(page, 'Population by region').getByRole('button', {
    name: 'Filter by South Asia',
  });
  await southAsia.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'All regions' })).toBeVisible();
  for (const brand of BRANDS) {
    for (const mode of ['light', 'dark']) {
      await page.getByLabel('Brand').selectOption(brand);
      await page.getByLabel('Mode').selectOption(mode);
      await expectNoSeriousViolations(page);
    }
  }
});

test('NFR-A1 the dashboard picker, asking before a deletion, has no serious violations', async ({
  page,
}) => {
  await showDashboard(page);
  await page.getByRole('button', { name: 'Delete dashboard' }).click();
  await expect(page.getByRole('button', { name: 'Keep' })).toBeFocused();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Keep' }).click();
});

test('NFR-A1 the session-invalid state has no serious violations', async ({ page }) => {
  await showDashboard(page);
  await page.getByRole('button', { name: 'Tamper with token' }).click();
  await expect(page.getByRole('alert')).toContainText('Session invalid');
  await expectNoSeriousViolations(page);
});

test('NFR-A1 the builder with its settings open has no serious violations', async ({ page }) => {
  await showDashboard(page);
  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  await page.getByRole('button', { name: 'Configure Population by region' }).click();
  await expect(page.getByRole('region', { name: 'Widget settings' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('NFR-A1 the plain HTML page, inside the shadow root, has no serious violations', async ({
  page,
}) => {
  await page.goto('/plain-html/');
  await expect(dataOf(page, 'Countries')).toBeAttached();
  await expectNoSeriousViolations(page);
});

test('NFR-A1 the phone layout has no serious violations', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await showDashboard(page);
  await expectNoSeriousViolations(page);
});
