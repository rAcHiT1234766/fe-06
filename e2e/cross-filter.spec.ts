import { expect, test, type Page } from '@playwright/test';

// Without animation the bars are at full length as soon as they are drawn, so clicks land on them.
test.use({ reducedMotion: 'reduce' });

const LINKED_WIDGETS = ['GDP by income level', 'Average life expectancy', 'Countries'];

// Every chart also renders its numbers as a table for screen readers, so the tests read what a
// widget shows from that table rather than from pixels.
const dataOf = (page: Page, widgetTitle: string) =>
  page.getByRole('table', { name: widgetTitle, exact: true });

const activeFilters = (page: Page) => page.getByRole('group', { name: 'Active filters' });

async function showDashboardFor(page: Page, userId: string) {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption(userId);
  // Ravi may see two regions, so the bar chart is his once it has two rows.
  await expect(dataOf(page, 'Population by region').getByRole('row')).toHaveCount(3);
  for (const title of LINKED_WIDGETS) await expect(dataOf(page, title)).toBeAttached();
}

async function regionsOfCountries(page: Page) {
  const cells = await dataOf(page, 'Countries')
    .getByRole('row')
    .locator('td:nth-child(2)')
    .allTextContents();
  return [...new Set(cells)];
}

test('FR-4.1 FR-4.2 a bar click filters the pie, line and table, and a second click restores them', async ({
  page,
}) => {
  // Two regions make each bar tall enough to hit without measuring the chart's layout.
  await showDashboardFor(page, 'ravi');
  const topRegion = await dataOf(page, 'Population by region')
    .getByRole('row')
    .nth(1)
    .getByRole('cell')
    .first()
    .textContent();
  const before = await Promise.all(
    LINKED_WIDGETS.map((title) => dataOf(page, title).textContent()),
  );

  // Bars are sorted largest first, so the top bar reaches well past the middle of the chart.
  const chart = page.getByRole('img', { name: 'Population by region chart' });
  const box = await chart.boundingBox();
  const topBar = { x: box!.width / 2, y: box!.height * 0.3 };
  await chart.click({ position: topBar });

  await expect(activeFilters(page)).toContainText(`Region: ${topRegion}`);
  for (const [index, title] of LINKED_WIDGETS.entries()) {
    await expect(dataOf(page, title)).not.toHaveText(before[index]!);
  }
  await expect.poll(() => regionsOfCountries(page)).toEqual([topRegion]);

  await chart.click({ position: topBar });

  await expect(activeFilters(page)).toHaveCount(0);
  for (const [index, title] of LINKED_WIDGETS.entries()) {
    await expect(dataOf(page, title)).toHaveText(before[index]!);
  }
});

test('NFR-A1 keyboard users filter through a chart’s data table, which shows while it has focus', async ({
  page,
}) => {
  await showDashboardFor(page, 'ravi');
  const barData = dataOf(page, 'Population by region');
  const firstRegion = barData.getByRole('button').first();
  const region = (await firstRegion.textContent())!;

  await firstRegion.focus();
  const overlay = await page.locator('.dk-chart-data', { has: barData }).boundingBox();
  expect(overlay!.width).toBeGreaterThan(100);

  await page.keyboard.press('Enter');
  await expect(activeFilters(page)).toContainText(`Region: ${region}`);
  await expect(firstRegion).toHaveAttribute('aria-pressed', 'true');
});

test('FR-4.10 Ctrl-click, or Cmd-click on a Mac, adds a bar to the selection and takes it out again', async ({
  page,
}) => {
  await showDashboardFor(page, 'ravi');
  const barData = dataOf(page, 'Population by region');
  const [topRegion, otherRegion] = await barData.getByRole('button').allTextContents();
  const chip = activeFilters(page).locator('.dk-chip > span');
  const sorted = (regions: string[]) => regions.toSorted();

  // The smaller region from its data table, which then stops covering the chart.
  await barData.getByRole('button', { name: `Filter by ${otherRegion}` }).focus();
  await page.keyboard.press('Enter');
  await expect(chip).toHaveText(`Region: ${otherRegion}`);
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());

  const chart = page.getByRole('img', { name: 'Population by region chart' });
  const box = (await chart.boundingBox())!;
  const topBar = { x: box.width / 2, y: box.height * 0.3 };
  await chart.click({ position: topBar, modifiers: ['ControlOrMeta'] });
  await expect(chip).toHaveText(`Region: ${otherRegion}, ${topRegion}`);
  await expect
    .poll(async () => sorted(await regionsOfCountries(page)))
    .toEqual(sorted([otherRegion!, topRegion!]));

  await chart.click({ position: topBar, modifiers: ['ControlOrMeta'] });
  await expect(chip).toHaveText(`Region: ${otherRegion}`);
  await expect.poll(() => regionsOfCountries(page)).toEqual([otherRegion]);

  // From the keyboard, the same keys with Enter on a region in the data table.
  await barData.getByRole('button', { name: `Filter by ${topRegion}` }).focus();
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(chip).toHaveText(`Region: ${otherRegion}, ${topRegion}`);
});
