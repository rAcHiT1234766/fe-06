import { expect, test, type Page } from '@playwright/test';

const API_URL = 'http://localhost:4000';

const dataOf = (page: Page, widgetTitle: string) =>
  page.getByRole('table', { name: widgetTitle, exact: true });

test('FR-3.11 a user without GDP sees those widgets refused, the API refuses them too, and the builder never offers GDP', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption('kofi');

  // Kofi may see every region, so the population chart has all seven.
  await expect(dataOf(page, 'Population by region').locator('tbody tr')).toHaveCount(7);
  await expect(
    page.getByRole('region', { name: 'GDP by income level' }).getByRole('alert'),
  ).toContainText('Your access does not include GDP (US$)');
  await expect(page.getByRole('region', { name: 'Countries' }).getByRole('alert')).toContainText(
    'Your access does not include GDP per capita (US$)',
  );

  // A query written by hand is refused the same way, so hiding the widgets is not the protection.
  const { token } = (await (
    await request.post(`${API_URL}/auth/demo-token`, { data: { userId: 'kofi' } })
  ).json()) as { token: string };
  const refused = await request.post(`${API_URL}/query`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataset: 'wdi', measures: [{ field: 'gdp' }], dimensions: ['country'] },
  });
  expect(refused.status()).toBe(403);
  expect(await refused.json()).toEqual({
    error: { code: 'FORBIDDEN', message: 'Your access does not include GDP (US$)' },
  });

  await page.getByRole('button', { name: 'Edit dashboard' }).click();
  await page.getByRole('button', { name: 'Configure Population by region' }).click();
  const settings = page.getByRole('region', { name: 'Widget settings' });
  await expect(settings.getByLabel('Measure').locator('option')).toHaveText([
    'Population',
    'Life expectancy (years)',
    'Internet users (%)',
    'Unemployment (%)',
    'Electricity access (%)',
  ]);
});
