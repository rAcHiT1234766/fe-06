import { expect, test, type Locator, type Page } from '@playwright/test';

// Without animation the charts are finished as soon as they are drawn, so screenshots are stable.
test.use({ reducedMotion: 'reduce' });

// Styles a careless host page might have. None of them may change how the dashboard looks.
const HOSTILE_CSS = `
  * {
    font-family: 'Comic Sans MS', 'Comic Sans', cursive !important;
    letter-spacing: 0.1em;
    line-height: 3;
    text-transform: uppercase;
  }
  button { background: red !important; color: yellow !important; padding: 0 !important; }
  table, th, td { border: 3px solid lime !important; }
  div, p, h2, h3 { margin: 20px !important; padding: 10px !important; }
  svg { display: none !important; }
`;

// Playwright's locators reach into open shadow roots, so these find the dashboard's own elements.
const dataOf = (page: Page, widgetTitle: string) =>
  page.getByRole('table', { name: widgetTitle, exact: true });

async function showPlainPage(page: Page) {
  await page.goto('/plain-html/');
  await expect(dataOf(page, 'Countries')).toBeAttached();
}

// Two screenshots in a row that match mean the dashboard has finished drawing.
async function settledScreenshot(element: Locator) {
  let previous = await element.screenshot();
  await expect
    .poll(async () => {
      const next = await element.screenshot();
      const isSame = next.equals(previous);
      previous = next;
      return isSame;
    })
    .toBe(true);
  return previous;
}

/**
 * Counts the pixels that differ between two screenshots of the same size, decoding them in the
 * browser. Channels within a few levels of each other count as equal: the rounded corners of the
 * widgets are anti-aliased slightly differently at another scroll position. A leaked style moves
 * text or changes colours, which differs by far more.
 */
async function differingPixels(page: Page, first: Buffer, second: Buffer) {
  return page.evaluate(
    async ({ a, b }) => {
      const decode = async (base64: string) => {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
        const bitmap = await createImageBitmap(blob);
        const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')!;
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height);
      };
      const [imageA, imageB] = await Promise.all([decode(a), decode(b)]);
      if (imageA.width !== imageB.width || imageA.height !== imageB.height) {
        return `sizes differ: ${imageA.width}×${imageA.height} and ${imageB.width}×${imageB.height}`;
      }
      let count = 0;
      for (let index = 0; index < imageA.data.length; index += 4) {
        for (let channel = 0; channel < 3; channel++) {
          if (Math.abs(imageA.data[index + channel]! - imageB.data[index + channel]!) > 8) {
            count++;
            break;
          }
        }
      }
      return count;
    },
    { a: first.toString('base64'), b: second.toString('base64') },
  );
}

test('FR-1.2 FR-1.5 one script tag shows the dashboard, and hostile host CSS changes nothing', async ({
  page,
}) => {
  await showPlainPage(page);
  const dashboard = page.locator('dashkit-dashboard');
  const before = await settledScreenshot(dashboard);

  await page.addStyleTag({ content: HOSTILE_CSS });
  // The host page itself does change, which shows the styles are in force.
  await expect(page.getByRole('heading', { name: 'DashKit in plain HTML' })).toHaveCSS(
    'text-transform',
    'uppercase',
  );
  const after = await settledScreenshot(dashboard);
  expect(await differingPixels(page, before, after)).toBe(0);
});

test('FR-1.7 the page hears about filter changes inside the element', async ({ page }) => {
  await showPlainPage(page);
  // Keyboard users filter through the chart's data table, which shows while it has focus.
  const southAsia = dataOf(page, 'Population by region').getByRole('button', {
    name: 'Filter by South Asia',
  });
  await southAsia.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#filters')).toHaveText('Filters: region is South Asia');
});

test('FR-1.6 FR-1.8 DashKit.mount() adds a second dashboard that keeps its own filters', async ({
  page,
}) => {
  await showPlainPage(page);
  await page.evaluate(() => {
    interface DashKitGlobal {
      mount: (
        container: Element,
        options: { apiUrl: string; dashboardId: string; getToken: () => Promise<string> },
      ) => { unmount: () => void };
    }
    const { DashKit } = window as unknown as { DashKit: DashKitGlobal };
    const container = document.createElement('section');
    document.body.append(container);
    const handle = DashKit.mount(container, {
      apiUrl: 'http://localhost:4000',
      dashboardId: 'overview',
      getToken: () =>
        fetch('http://localhost:4000/auth/demo-token', {
          method: 'POST',
          body: JSON.stringify({ userId: 'asha' }),
        })
          .then((response) => response.json() as Promise<{ token: string }>)
          .then((body) => body.token),
    });
    Object.assign(window, { secondDashboard: handle });
  });

  const dashboards = page.locator('dashkit-dashboard');
  await expect(dashboards).toHaveCount(2);
  await expect(
    dashboards.nth(1).getByRole('table', { name: 'Countries', exact: true }),
  ).toBeAttached();

  const southAsia = dashboards
    .first()
    .getByRole('table', { name: 'Population by region', exact: true })
    .getByRole('button', { name: 'Filter by South Asia' });
  await southAsia.focus();
  await page.keyboard.press('Enter');
  await expect(dashboards.first().getByRole('group', { name: 'Active filters' })).toBeVisible();
  await expect(dashboards.nth(1).getByRole('group', { name: 'Active filters' })).toHaveCount(0);

  await page.evaluate(() =>
    (window as unknown as { secondDashboard: { unmount: () => void } }).secondDashboard.unmount(),
  );
  await expect(dashboards).toHaveCount(1);
});
