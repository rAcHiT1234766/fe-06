import { expect, test, type Page } from '@playwright/test';

// The demo app plays a host product with its own navigation, styled from the customer's brand.
// These check that the product around the dashboard behaves like one, and leaves the dashboard
// the room it needs.

const countries = (page: Page) => page.getByRole('table', { name: 'Countries', exact: true });

async function showDashboard(page: Page) {
  await page.goto('/');
  await expect(countries(page)).toBeAttached();
}

const breakpointOf = (page: Page) =>
  page.locator('.dk-dashboard').getAttribute('data-dk-breakpoint');

test('on a 1280 px screen the navigation shares the top bar and the dashboard keeps twelve columns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await showDashboard(page);

  const bar = await page.getByRole('banner').boundingBox();
  const nav = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
  expect(nav!.y).toBeGreaterThanOrEqual(bar!.y);
  expect(nav!.y + nav!.height).toBeLessThanOrEqual(bar!.y + bar!.height + 1);
  expect(await breakpointOf(page)).toBe('lg');
});

test('on a wide screen the navigation is a sidebar and the dashboard beside it keeps twelve columns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await showDashboard(page);

  const nav = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
  const main = await page.getByRole('main').boundingBox();
  expect(nav!.x).toBe(0);
  expect(main!.x).toBeGreaterThanOrEqual(nav!.x + nav!.width);
  expect(await breakpointOf(page)).toBe('lg');
});

test('the host product moves between its own pages and the one with the dashboard', async ({
  page,
}) => {
  await showDashboard(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  const heading = page.getByRole('heading', { level: 1 });
  await expect(nav.getByRole('link', { name: 'Analytics' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(heading).toHaveText('Analytics');

  await nav.getByRole('link', { name: 'Orders' }).click();
  await expect(heading).toHaveText('Orders');
  await expect(heading).toBeFocused();
  await expect(nav.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  await expect(countries(page)).toHaveCount(0);

  // The page is in the address, so Back returns to the dashboard.
  await page.goBack();
  await expect(heading).toHaveText('Analytics');
  await expect(countries(page)).toBeAttached();

  await page.goto('/#settings');
  await page.getByRole('link', { name: 'Open Analytics' }).click();
  await expect(countries(page)).toBeAttached();
});

test('the host product takes the brand and mode it gives the dashboard, and names the user', async ({
  page,
}) => {
  await showDashboard(page);
  const banner = page.getByRole('banner');
  await expect(banner.getByRole('link', { name: 'Acme Global' })).toBeVisible();
  await expect(banner.getByText('Asha', { exact: true })).toBeVisible();
  await expect(banner.getByText('Editor', { exact: true })).toBeVisible();

  await page.getByLabel('Signed in as').selectOption('elena');
  await expect(banner.getByText('Elena', { exact: true })).toBeVisible();
  await page.getByLabel('Brand').selectOption('eurostat');
  await expect(banner.getByRole('link', { name: 'EuroStat Co' })).toBeVisible();

  for (const mode of ['dark', 'light']) {
    await page.getByLabel('Mode').selectOption(mode);
    const backgrounds = await page.evaluate(() =>
      ['.app', '.dk-root'].map(
        (selector) => getComputedStyle(document.querySelector(selector)!).backgroundColor,
      ),
    );
    expect(new Set(backgrounds).size, `${mode}: ${backgrounds.join(' and ')}`).toBe(1);
  }
});
