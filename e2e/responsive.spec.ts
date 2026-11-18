import { expect, test, type Page } from '@playwright/test';

// A small phone: 360 px wide, with a finger for a pointer. Without animation the bars are at full
// length as soon as they are drawn, so taps land on them.
test.use({
  viewport: { width: 360, height: 780 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'reduce',
});

const dataOf = (page: Page, widgetTitle: string) =>
  page.getByRole('table', { name: widgetTitle, exact: true });

async function showDashboardFor(page: Page, userId: string) {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption(userId);
  await expect(dataOf(page, 'Countries')).toBeAttached();
}

test('FR-6.8 FR-6.9 the dashboard is usable on a 360 px phone', async ({ page }) => {
  // Ravi may see two regions, so the bar chart is his once it has two rows.
  await showDashboardFor(page, 'ravi');
  await expect(dataOf(page, 'Population by region').getByRole('row')).toHaveCount(3);

  // Nothing makes the page scroll sideways, and the widgets share one column.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const columns = await page.locator('.react-grid-item').evaluateAll((items) => [
    ...new Set(
      items.map((item) => {
        const { left, width } = item.getBoundingClientRect();
        return JSON.stringify([left, width]);
      }),
    ),
  ]);
  expect(columns).toHaveLength(1);

  // The table scrolls within its widget instead.
  const table = page.getByRole('region', { name: 'Countries table' });
  const scroll = await table.evaluate((element) => {
    element.scrollLeft = 120;
    return { overflows: element.scrollWidth > element.clientWidth, left: element.scrollLeft };
  });
  expect(scroll.overflows).toBe(true);
  expect(scroll.left).toBeGreaterThan(0);

  // Every control the dashboard shows is at least 44 px square.
  const tooSmall = await page
    .locator('.dk-root')
    .locator('button, select, input')
    .evaluateAll((controls) =>
      controls
        .filter((control) => control.getClientRects().length > 0)
        .filter((control) => !control.closest('.dk-visually-hidden'))
        .map((control) => {
          const { width, height } = control.getBoundingClientRect();
          return { name: control.getAttribute('aria-label') ?? control.textContent, width, height };
        })
        .filter(({ width, height }) => width < 44 || height < 44),
    );
  expect(tooSmall).toEqual([]);

  // A tap on a bar filters the dashboard, like a click.
  const topRegion = await dataOf(page, 'Population by region')
    .getByRole('row')
    .nth(1)
    .getByRole('cell')
    .first()
    .textContent();
  const chart = page.getByRole('img', { name: 'Population by region chart' });
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  // Bars are sorted largest first, so the top bar reaches well past the middle of the chart.
  await chart.tap({ position: { x: box!.width * 0.7, y: box!.height * 0.3 } });
  await expect(page.getByRole('group', { name: 'Active filters' })).toContainText(
    `Region: ${topRegion}`,
  );
});

test('FR-6.10 an editor on a phone sees the dashboard and a notice instead of the builder', async ({
  page,
}) => {
  // Elena's tenant belongs to the builder test, which changes its dashboard; Asha also edits.
  await showDashboardFor(page, 'asha');
  await expect(page.getByText('Editing needs a wider screen.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit dashboard' })).toHaveCount(0);
});
