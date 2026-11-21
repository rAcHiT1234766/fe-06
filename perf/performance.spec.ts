import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, release, totalmem, type as osType } from 'node:os';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

const API_URL = 'http://localhost:4000';

interface Result {
  requirement: string;
  measurement: string;
  value: string;
  target: string;
}

// Playwright starts a new worker after a failed test, so results are kept in a file, not in memory.
const RESULTS_FILE = 'test-results/performance.jsonl';
const results = {
  push: (...rows: Result[]) => {
    for (const row of rows) appendFileSync(RESULTS_FILE, `${JSON.stringify(row)}\n`);
  },
  read: () =>
    existsSync(RESULTS_FILE)
      ? readFileSync(RESULTS_FILE, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line) as Result)
      : [],
};

const round = (ms: number) => Math.round(ms);
const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
const percentile = (values: number[], fraction: number) =>
  sorted(values)[Math.min(values.length - 1, Math.ceil(fraction * values.length) - 1)]!;
const median = (values: number[]) => percentile(values, 0.5);
const summary = (values: number[]) =>
  `median ${round(median(values))} ms, worst ${round(Math.max(...values))} ms (n = ${values.length})`;

// The SDK records these User Timing entries itself; see src/core/render-timing.ts.
const entries = (page: Page, name: string) =>
  page.evaluate(
    (entryName) =>
      performance.getEntriesByName(entryName).map((entry) => entry.toJSON() as PerformanceEntry),
    name,
  );

// The widgets are there, and none is loading or updating.
async function settle(page: Page) {
  await expect(page.locator('.dk-widget').first()).toBeVisible();
  await expect(page.locator('.dk-skeleton, [aria-busy="true"]')).toHaveCount(0);
}

interface Conditions {
  label: string;
  reducedMotion: 'reduce' | 'no-preference';
  cpuSlowdown: number;
}
const CONDITIONS: Conditions[] = [
  { label: 'animation on', reducedMotion: 'no-preference', cpuSlowdown: 1 },
  { label: 'reduced motion', reducedMotion: 'reduce', cpuSlowdown: 1 },
  { label: 'animation on, CPU 4× slower', reducedMotion: 'no-preference', cpuSlowdown: 4 },
];

// Each page gets a new context, so nothing is cached between loads.
async function openPage(browser: Browser, conditions: Conditions) {
  const context = await browser.newContext({ reducedMotion: conditions.reducedMotion });
  const page = await context.newPage();
  if (conditions.cpuSlowdown > 1) {
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: conditions.cpuSlowdown });
  }
  return page;
}

test.afterAll(({ browser }) => {
  const machine = `${cpus()[0]?.model.trim()} (${cpus().length} threads), ${Math.round(totalmem() / 2 ** 30)} GB RAM, ${osType()} ${release()}`;
  const lines = [
    `Machine: ${machine}`,
    `Browser: Chromium ${browser.version()} (Playwright), viewport 1280×720`,
    'API: local mock API on the same machine; demo: production build served by vite preview',
    '',
    '| Requirement | Measurement | Result | Target |',
    '|---|---|---|---|',
    ...results
      .read()
      .map((r) => `| ${r.requirement} | ${r.measurement} | ${r.value} | ${r.target} |`),
  ];
  const report = lines.join('\n');
  console.log(`\n${report}\n`);
  writeFileSync('test-results/performance.md', `${report}\n`);
});

test('NFR-P3 time from mount to the first finished chart', async ({ browser }) => {
  for (const conditions of CONDITIONS) {
    const fromMount: number[] = [];
    const fromNavigation: number[] = [];
    for (let load = 0; load < 5; load++) {
      const page = await openPage(browser, conditions);
      await page.goto('/');
      await expect.poll(async () => (await entries(page, 'dashkit:first-chart')).length).toBe(1);
      const [measure] = await entries(page, 'dashkit:first-chart');
      fromMount.push(measure!.duration);
      fromNavigation.push(measure!.startTime + measure!.duration);
      await page.context().close();
    }
    results.push(
      {
        requirement: 'NFR-P3',
        measurement: `Mount to first chart finished, ${conditions.label}`,
        value: summary(fromMount),
        target: '≤ 1.5 s',
      },
      {
        requirement: 'NFR-P3',
        measurement: `Page navigation to first chart finished, ${conditions.label}`,
        value: summary(fromNavigation),
        target: '(context)',
      },
    );
    if (conditions.cpuSlowdown === 1) expect.soft(median(fromMount)).toBeLessThanOrEqual(1500);
  }
});

test('NFR-P4 time from a cross-filter to every widget updated', async ({ browser }) => {
  for (const conditions of CONDITIONS) {
    const page = await openPage(browser, conditions);
    await page.goto('/');
    await settle(page);
    // Keyboard users filter through each chart's data table, the same path a click on a bar takes.
    const regionButtons = page
      .getByRole('table', { name: 'Population by region', exact: true })
      .getByRole('button', { name: /^Filter by / });
    const regions = await regionButtons.allTextContents();

    const newFilter: number[] = [];
    const clearing: number[] = [];
    for (const region of regions) {
      for (const durations of [newFilter, clearing]) {
        const before = (await entries(page, 'dashkit:cross-filter')).length;
        const button = page
          .getByRole('table', { name: 'Population by region', exact: true })
          .getByRole('button', { name: `Filter by ${region}` });
        await button.focus();
        await page.keyboard.press('Enter');
        await expect
          .poll(async () => (await entries(page, 'dashkit:cross-filter')).length)
          .toBe(before + 1);
        durations.push((await entries(page, 'dashkit:cross-filter')).at(-1)!.duration);
        await settle(page);
      }
    }
    results.push(
      {
        requirement: 'NFR-P4',
        measurement: `Filter by a region not seen before, ${conditions.label}`,
        value: summary(newFilter),
        target: '≤ 300 ms',
      },
      {
        requirement: 'NFR-P4',
        measurement: `Clear the filter (results cached), ${conditions.label}`,
        value: summary(clearing),
        target: '≤ 300 ms',
      },
    );
    if (conditions.cpuSlowdown === 1) expect.soft(median(newFilter)).toBeLessThanOrEqual(300);
    await page.context().close();
  }
});

test('NFR-P5 frames while dragging and resizing with 12 widgets', async ({ browser }) => {
  for (const conditions of [CONDITIONS[0]!, CONDITIONS[2]!]) {
    const page = await openPage(browser, conditions);
    await page.goto('/');
    await settle(page);
    await page.getByRole('button', { name: 'Edit dashboard' }).click();
    const palette = page.getByRole('group', { name: 'Add a widget' });
    const types = [
      'Bar chart',
      'Line chart',
      'Pie chart',
      'Table',
      'KPI',
      'Bar chart',
      'Line chart',
    ];
    for (const type of types)
      await palette.getByRole('button', { name: type, exact: true }).click();
    await expect(page.locator('.dk-widget')).toHaveCount(12);
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);

    // Records the time between frames for as long as the drag lasts.
    const recordFrames = () =>
      page.evaluate(() => {
        const state = window as unknown as { frameGaps: number[]; recording: boolean };
        state.frameGaps = [];
        state.recording = true;
        let last = performance.now();
        const onFrame = (now: number) => {
          state.frameGaps.push(now - last);
          last = now;
          if (state.recording) requestAnimationFrame(onFrame);
        };
        requestAnimationFrame(onFrame);
      });
    const stopFrames = () =>
      page.evaluate(() => {
        const state = window as unknown as { frameGaps: number[]; recording: boolean };
        state.recording = false;
        return state.frameGaps.slice(1);
      });

    // A hand moves the pointer about once a frame, so the drag is paced the same way.
    async function slowDrag(from: { x: number; y: number }, to: { x: number; y: number }) {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let step = 1; step <= 60; step++) {
        const progress = step / 60;
        await page.mouse.move(
          from.x + (to.x - from.x) * progress,
          from.y + (to.y - from.y) * progress,
        );
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
    }

    // Each drag starts 300 pixels down the window, whatever sits above the grid, so the pointer stays
    // away from its edge. Near it, Chrome scrolls the page while the button is held, as it does to
    // extend a text selection, and a widget being resized grows with every pixel scrolled while the
    // pointer moves, which measures a different thing.
    async function startAt(locator: Locator) {
      const box = (await locator.boundingBox())!;
      await page.evaluate((offset) => window.scrollBy(0, offset), box.y + box.height / 2 - 300);
      const moved = (await locator.boundingBox())!;
      return { x: moved.x + moved.width / 2, y: moved.y + moved.height / 2 };
    }

    const start = await startAt(page.getByTitle('Drag to move').first());
    await recordFrames();
    await slowDrag(start, { x: start.x + 600, y: start.y + 250 });
    const dragGaps = await stopFrames();
    await settle(page);

    const corner = await startAt(page.locator('.react-resizable-handle').first());
    await recordFrames();
    await slowDrag(corner, { x: corner.x + 300, y: corner.y + 150 });
    const resizeGaps = await stopFrames();

    for (const [action, gaps] of [
      ['Drag', dragGaps],
      ['Resize', resizeGaps],
    ] as const) {
      const longFrames = gaps.filter((gap) => gap > 50).length;
      results.push({
        requirement: 'NFR-P5',
        measurement: `${action} with 12 widgets, ${conditions.label}: time between frames`,
        value: `median ${median(gaps).toFixed(1)} ms, 95th percentile ${percentile(gaps, 0.95).toFixed(1)} ms, worst ${round(Math.max(...gaps))} ms; ${longFrames} of ${gaps.length} frames over 50 ms`,
        target: 'No visible jank',
      });
      if (conditions.cpuSlowdown === 1) {
        expect.soft(percentile(gaps, 0.95)).toBeLessThanOrEqual(1000 / 30);
        expect.soft(Math.max(...gaps)).toBeLessThanOrEqual(100);
      }
    }
    await page.context().close();
  }
});

test('NFR-P6 identical queries from different widgets send one request', async ({ page }) => {
  await page.goto('/plain-html/');
  await settle(page);

  // A second dashboard, with its own empty cache, in which every widget appears twice.
  const queries: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url() === `${API_URL}/query`) {
      queries.push(request.postData() ?? '');
    }
  });
  await page.evaluate(async (apiUrl) => {
    const getToken = () =>
      fetch(`${apiUrl}/auth/demo-token`, {
        method: 'POST',
        body: JSON.stringify({ userId: 'asha' }),
      })
        .then((response) => response.json() as Promise<{ token: string }>)
        .then((body) => body.token);
    interface Widget {
      id: string;
      title: string;
    }
    interface Item {
      i: string;
      y: number;
    }
    const overview = (await fetch(`${apiUrl}/dashboards/overview`, {
      headers: { Authorization: `Bearer ${await getToken()}` },
    }).then((response) => response.json())) as { widgets: Widget[]; layouts: { lg: Item[] } };
    const config = {
      ...overview,
      widgets: [
        ...overview.widgets,
        ...overview.widgets.map((widget) => ({
          ...widget,
          id: `${widget.id}-copy`,
          title: `${widget.title} (copy)`,
        })),
      ],
      layouts: {
        lg: [
          ...overview.layouts.lg,
          ...overview.layouts.lg.map((item) => ({ ...item, i: `${item.i}-copy`, y: item.y + 100 })),
        ],
      },
    };
    const container = document.createElement('section');
    document.body.append(container);
    const { DashKit } = window as unknown as {
      DashKit: { mount: (element: Element, options: object) => unknown };
    };
    DashKit.mount(container, { apiUrl, getToken, config });
  }, API_URL);

  const second = page.locator('dashkit-dashboard').nth(1);
  await expect(second.locator('.dk-widget')).toHaveCount(10);
  await settle(page);
  const distinct = new Set(queries).size;
  results.push({
    requirement: 'NFR-P6',
    measurement: '10 widgets, each query twice, on a new dashboard',
    value: `${queries.length} requests for ${distinct} distinct queries`,
    target: 'One request per distinct query',
  });
  expect(queries.length).toBe(distinct);
});
