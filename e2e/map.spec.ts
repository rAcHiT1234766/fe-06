import { expect, test, type Page } from '@playwright/test';

// Without animation the map is drawn at once, so a click lands on a country.
test.use({ reducedMotion: 'reduce' });

const MAP = 'Population by country';

// The map's figures are also a table, for keyboard and screen reader users.
const mapData = (page: Page) => page.getByRole('table', { name: MAP, exact: true });
const chip = (page: Page) =>
  page.getByRole('group', { name: 'Active filters' }).locator('.dk-chip > span');
const mostPopulous = (page: Page) =>
  page
    .getByRole('table', { name: 'Countries by population', exact: true })
    .locator('tbody tr td:first-child');

async function showExplorer(page: Page) {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption('asha');
  await page
    .getByLabel('Dashboard', { exact: true })
    .selectOption({ label: 'Population explorer' });
  // The demo registers the borders from a file beside the app, so the map replaces its table.
  await expect(page.getByRole('img', { name: `${MAP} chart` })).toBeVisible();
}

test('Map: a click on a country filters the dashboard by it', async ({ page }) => {
  await showExplorer(page);
  const chart = page.getByRole('img', { name: `${MAP} chart` });
  const box = (await chart.boundingBox())!;
  // India, on the desktop viewport every browser here uses. The map keeps its proportions, so a
  // country is always in the same place in a widget of the same size.
  await chart.click({ position: { x: box.width * 0.732, y: box.height * 0.444 } });

  await expect(chip(page)).toHaveText('Country: India');
  await expect(mostPopulous(page)).toHaveText(['India']);
});

test('NFR-A1 Map: keyboard users filter by a country from the map’s data table', async ({
  page,
}) => {
  await showExplorer(page);
  const brazil = mapData(page).getByRole('button', { name: 'Filter by Brazil' });
  await brazil.focus();
  await page.keyboard.press('Enter');

  await expect(chip(page)).toHaveText('Country: Brazil');
  await expect(brazil).toHaveAttribute('aria-pressed', 'true');
  await expect(mostPopulous(page)).toHaveText(['Brazil']);
});
