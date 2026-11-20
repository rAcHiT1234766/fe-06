import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('Dashboard picker: switch, create and delete dashboards', async ({ page, browserName }) => {
  await page.goto('/');
  await page.getByLabel('Signed in as').selectOption('asha');
  const list = page.getByLabel('Dashboard', { exact: true });
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('World development overview');

  await list.selectOption({ label: 'Population explorer' });
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Population explorer');
  const controls = page.getByRole('group', { name: 'Filters', exact: true });
  await expect(controls.getByRole('combobox')).toHaveCount(3);

  // Each browser runs at the same time against one API, so each makes a dashboard of its own.
  const title = `Picker test ${browserName}`;
  await page.getByRole('button', { name: 'New dashboard' }).click();
  await page.getByLabel('Title of the new dashboard').fill(title);
  await page.getByLabel('Title of the new dashboard').press('Enter');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(title);
  await expect(page.getByText('This dashboard has no widgets yet.')).toBeVisible();
  await expect(list).toBeFocused();
  await expect(list).toHaveValue(`picker-test-${browserName}`);

  await page.getByRole('button', { name: 'Delete dashboard' }).click();
  await expect(page.getByRole('button', { name: 'Keep' })).toBeFocused();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('World development overview');
  await expect(list.locator('option', { hasText: title })).toHaveCount(0);
});
