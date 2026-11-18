import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function downloadFrom(page: Page, button: Locator) {
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const path = await download.path();
  return { name: download.suggestedFilename(), text: await readFile(path, 'utf8') };
}

test('CSV export: a user downloads a widget’s data, only ever inside their scope', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption('ravi');
  await expect(
    page.getByRole('table', { name: 'Population by region', exact: true }).locator('tbody tr'),
  ).toHaveCount(2);

  const { name, text } = await downloadFrom(
    page,
    page.getByRole('button', { name: 'Download Population by region as CSV' }),
  );
  expect(name).toBe('population-by-region.csv');
  // The byte order mark lets spreadsheet apps read the file as UTF-8.
  expect(text.startsWith('\uFEFFRegion,Population\r\n')).toBe(true);
  const regions = text
    .trimEnd()
    .split('\r\n')
    .slice(1)
    .map((line) => line.split(',')[0]);
  expect(regions.toSorted()).toEqual(['East Asia & Pacific', 'South Asia']);
});

test('CSV export: the script-tag element downloads from inside its shadow root', async ({
  page,
}) => {
  await page.goto('/plain-html/');
  const { name, text } = await downloadFrom(
    page,
    page.getByRole('button', { name: 'Download Total population as CSV' }),
  );
  expect(name).toBe('total-population.csv');
  expect(text).toMatch(/^\uFEFFPopulation\r\n\d+\r\n$/);
});
