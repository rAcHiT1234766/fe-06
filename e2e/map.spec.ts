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

// Moves the pointer across the map until its tooltip names the country, and returns that point,
// so the test finds a country wherever the map draws it rather than at one place in one window.
async function pointOver(page: Page, country: string) {
  const chart = page.getByRole('img', { name: `${MAP} chart` });
  // ECharts adds its tooltip to the chart's element, after its own drawing. The country's name is
  // an element of its own there, and the tooltip keeps its text while hidden.
  const isNamed = () =>
    chart.evaluate((element, name) => {
      const tooltip = element.children[1];
      const isShown = tooltip?.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      return (
        Boolean(isShown) &&
        [...tooltip!.querySelectorAll('*')].some((part) => part.textContent === name)
      );
    }, country);
  // The pointer only reaches what is in the window.
  await chart.scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  // A grid fine enough to land in any large country; a few small ones fall between its points.
  for (let row = 1; row < 12; row++) {
    for (let column = 1; column < 24; column++) {
      const point = { x: box.x + (box.width * column) / 24, y: box.y + (box.height * row) / 12 };
      await page.mouse.move(point.x, point.y);
      if (!(await isNamed())) continue;
      // Asked again from a pixel along, in case the tooltip still showed where the pointer was.
      await page.mouse.move(point.x + 1, point.y);
      if (await isNamed()) return point;
    }
  }
  throw new Error(`The map's tooltip never named ${country}.`);
}

test('Map: a click on a country filters the dashboard by it', async ({ page }) => {
  await showExplorer(page);
  const india = await pointOver(page, 'India');
  await page.mouse.click(india.x, india.y);

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
