import { expect, test, type Page } from '@playwright/test';

// Without animation, charts are drawn at once.
test.use({ reducedMotion: 'reduce' });

// The chart's data table, which keyboard and screen reader users get in place of the canvas.
const chartData = (page: Page) =>
  page.getByRole('table', { name: 'Population by region', exact: true });

const regionsInChart = (page: Page) => chartData(page).locator('tbody tr td:first-child');

test('Filter controls: a list above the grid filters every widget, and shows chart clicks', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption('asha');
  // Added in an unsaved draft, so no saved dashboard changes.
  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  await page
    .getByRole('group', { name: 'Filters above the dashboard' })
    .getByLabel('Region')
    .check();
  const region = page.getByRole('group', { name: 'Filters', exact: true }).getByLabel('Region');
  // "All" and the seven regions.
  await expect(region.locator('option')).toHaveCount(8);
  await expect(regionsInChart(page)).toHaveCount(7);

  await region.selectOption({ label: 'South Asia' });
  await expect(page.getByText('Region: South Asia', { exact: true })).toBeVisible();
  // A control is not a widget, so every widget is filtered, the chart of regions too.
  await expect(regionsInChart(page)).toHaveText(['South Asia'], { useInnerText: true });

  await region.selectOption({ label: 'All' });
  await expect(page.getByText('Region: South Asia', { exact: true })).toHaveCount(0);
  await expect(regionsInChart(page)).toHaveCount(7);

  await chartData(page).getByRole('button', { name: 'Filter by East Asia & Pacific' }).focus();
  await page.keyboard.press('Enter');
  await expect(region.locator('option:checked')).toHaveText('East Asia & Pacific');

  await page.getByRole('button', { name: 'Cancel' }).click();
});
