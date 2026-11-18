import { expect, test, type Page } from '@playwright/test';

// Without animation, charts are drawn at once.
test.use({ reducedMotion: 'reduce' });

// The chart sorts by population, largest first, and keeps that order for the countries.
const SOUTH_ASIA = ['India', 'Bangladesh', 'Nepal', 'Sri Lanka', 'Bhutan', 'Maldives'];

// The chart's data table, which keyboard and screen reader users get in place of the canvas.
const chartData = (page: Page) =>
  page.getByRole('table', { name: 'Population by region', exact: true });

const firstColumn = (page: Page) => chartData(page).locator('tbody tr td:first-child');

test('Drill-down: a click shows a region’s countries, and keyboard users keep their place', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption('asha');
  // Turned on in an unsaved draft, so no saved dashboard changes.
  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  await page.getByRole('button', { name: 'Configure Population by region' }).click();
  await page
    .getByRole('region', { name: 'Widget settings' })
    .getByLabel('Drill down to')
    .selectOption('country');
  await page.getByRole('button', { name: 'Close widget settings' }).click();
  await expect(firstColumn(page)).toHaveCount(7);

  await chartData(page).getByRole('button', { name: 'Filter by South Asia' }).focus();
  await page.keyboard.press('Enter');
  const back = page.getByRole('button', { name: 'All regions' });
  await expect(back).toBeFocused();
  await expect(firstColumn(page)).toHaveText(SOUTH_ASIA, { useInnerText: true });
  // The other widgets are filtered by the region, as by any click.
  await expect(page.getByText('Region: South Asia', { exact: true })).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(chartData(page).getByRole('button', { name: 'Filter by South Asia' })).toBeFocused();
  await expect(firstColumn(page)).toHaveCount(7);
  await expect(back).toHaveCount(0);

  await page.getByRole('button', { name: 'Cancel' }).click();
});
