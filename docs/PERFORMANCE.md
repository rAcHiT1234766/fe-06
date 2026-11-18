# Performance

Every number on this page was measured on 18 November 2026: the timings in the main table on the
code at commit `a0f0817`, the bundle sizes at `9637048`, the last change to code, and the timings
under "Re-measured after Phase 7" at both. The targets come from the project requirements (NFR-P1
to NFR-P6). Where a target is missed, the row says so and why.

## How it was measured

|         |                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Machine | Laptop, 11th Gen Intel Core i5-1135G7 at 2.40 GHz (4 cores, 8 threads), 16 GB RAM, Windows 11                                           |
| Browser | Chromium 159.0.8154.6, the build Playwright installs, at 1280 × 720                                                                     |
| API     | The mock API, running locally on the same machine (no network latency)                                                                  |
| Demo    | A production build of the demo, served by `vite preview`                                                                                |
| Runs    | 5 cold page loads per condition (a new browser context each, so nothing is cached); 7 cross-filters, one per region visible to the user |

Run it yourself with `pnpm perf` (about a minute and a half, after it has built the SDK and the
demo). It writes the table below to `test-results/performance.md`. The bundle sizes come from
`pnpm size`, which CI also runs and which fails a build that goes over its target.

Each measurement runs with animation on, as most users see it. Most are repeated with reduced
motion, which turns chart animation off, and with Chrome's CPU throttling set to four times slower,
which approximates a slow laptop or a mid-range phone. Only the normal-speed runs are compared
with the targets; the throttled runs show how much headroom there is.

## Results

| Requirement  | What was measured                                                                | Result                                                                                     | Target                         | Met           |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ | ------------- |
| NFR-P1       | npm build as a host bundles it: minified, every dependency except React included | 217.6 kB gzipped                                                                           | ≤ 300 kB                       | Yes           |
| NFR-P1       | `dist/index.js` alone, dependencies external                                     | 20.1 kB gzipped                                                                            | (context)                      |               |
| NFR-P2       | Script-tag build, `dist/dashkit.js`, everything included                         | 284.6 kB gzipped                                                                           | ≤ 500 kB                       | Yes           |
| NFR-P3       | Mount to first chart finished, animation on                                      | median 155 ms, worst 637 ms                                                                | ≤ 1.5 s                        | Yes           |
| NFR-P3       | Same, reduced motion                                                             | median 103 ms, worst 123 ms                                                                | ≤ 1.5 s                        | Yes           |
| NFR-P3       | Same, animation on, CPU 4× slower                                                | median 1281 ms, worst 1489 ms                                                              | ≤ 1.5 s                        | Yes           |
| NFR-P3       | Page navigation to first chart finished, animation on                            | median 274 ms, worst 773 ms                                                                | (context)                      |               |
| NFR-P3       | Same, CPU 4× slower                                                              | median 1807 ms, worst 1972 ms                                                              | (context)                      |               |
| NFR-P4       | Filter by a region not filtered before, animation on                             | median 257 ms, worst 300 ms                                                                | ≤ 300 ms                       | Yes           |
| NFR-P4       | Clear the filter (every result cached), animation on                             | median 238 ms, worst 261 ms                                                                | ≤ 300 ms                       | Yes           |
| NFR-P4       | Filter by a new region, reduced motion                                           | median 43 ms, worst 53 ms                                                                  | ≤ 300 ms                       | Yes           |
| NFR-P4       | Clear the filter, reduced motion                                                 | median 33 ms, worst 33 ms                                                                  | ≤ 300 ms                       | Yes           |
| NFR-P4       | Filter by a new region, animation on, CPU 4× slower                              | median 534 ms, worst 572 ms                                                                | ≤ 300 ms                       | No, see below |
| NFR-P4       | Clear the filter, animation on, CPU 4× slower                                    | median 464 ms, worst 491 ms                                                                | ≤ 300 ms                       | No, see below |
| NFR-P5       | Drag a widget across the builder with 12 widgets                                 | frames every 16.7 ms (median and 95th percentile), worst 17 ms; 0 of 139 frames over 50 ms | No visible jank                | Yes           |
| NFR-P5       | Resize a widget with 12 widgets                                                  | median 16.7 ms, 95th percentile 16.8 ms, worst 33 ms; 0 of 138 frames over 50 ms           | No visible jank                | Yes           |
| NFR-P5       | Drag, CPU 4× slower                                                              | median 16.7 ms, 95th percentile 16.8 ms, worst 100 ms; 1 of 202 frames over 50 ms          | No visible jank                | Yes           |
| NFR-P5       | Resize, CPU 4× slower                                                            | median 16.7 ms, 95th percentile 50.0 ms, worst 267 ms; 9 of 219 frames over 50 ms          | No visible jank                | No, see below |
| NFR-P6       | A new dashboard with 10 widgets, every query appearing twice                     | 5 requests for 5 distinct queries                                                          | One request per distinct query | Yes           |
| Page quality | Lighthouse on the deployed demo                                                  | Not measured yet: it needs the demo deployed                                               |                                |               |

"No visible jank" is read here as a 95th-percentile frame time within 33 ms (30 frames a second)
and no single frame over 100 ms. The drag and resize are paced at one pointer move per 16 ms,
the way a hand moves.

### Where the targets are missed

- **Cross-filter on a CPU four times slower (NFR-P4).** Every chart ends a filter change with a
  200 ms transition, which stays the same on a slow machine, while the work before it (React
  rendering the widgets and ECharts drawing them) grows with the slower CPU. With reduced motion
  the same filter takes 43 ms at normal speed.
- **Resizing on a CPU four times slower (NFR-P5).** Each step of a resize changes the widget's
  size, and its chart redraws to fit, so a slow CPU drops some frames; 9 of 219 were over 50 ms.
  Dragging, which moves widgets without resizing their charts, stayed smooth.

## Re-measured after Phase 7

Everything after Phase 7, from paged tables to multi-select, was checked for a slowdown on 18
November 2026: `pnpm perf` ran at `a0f0817`, the code measured above, and at `9637048`, the last
change to code, one after the other and each from a fresh clone.

| Measurement, medians                                     |  `a0f0817` |  `9637048` | Target                 |
| -------------------------------------------------------- | ---------: | ---------: | ---------------------- |
| Mount to first chart finished, animation on              |     243 ms |     207 ms | ≤ 1.5 s                |
| Same, reduced motion                                     |     122 ms |     110 ms | ≤ 1.5 s                |
| Same, animation on, CPU 4× slower                        |    2001 ms |    2150 ms | ≤ 1.5 s                |
| Filter by a region not seen before, animation on         |     259 ms |     266 ms | ≤ 300 ms               |
| Clear the filter, animation on                           |     245 ms |     244 ms | ≤ 300 ms               |
| Filter by a region not seen before, CPU 4× slower        |     600 ms |     696 ms | ≤ 300 ms               |
| Resize with 12 widgets, CPU 4× slower: frames over 50 ms |  12 of 211 |  13 of 192 | No visible jank        |
| Identical queries from 10 widgets                        | 5 requests | 5 requests | One per distinct query |

The two are within the spread between runs, so the changes did not slow the dashboard: the
commits in between, measured the same way, gave 184 to 284 ms for the first row and 257 to 273 ms
for the fourth. The machine was slower than when the table above was made, since the same code at
`a0f0817` now took 2001 ms rather than 1281 ms to mount on a CPU slowed four times. That row misses
its target on both commits; the normal-speed rows meet theirs.

Two earlier runs at `9637048`, made inside the working repository rather than a fresh clone, were
slower and erratic: one measured a cross-filter at 334 ms and failed. The likely difference is the
editor and other tools watching that folder while the builds write to it, though that was not
proven. Measure from a clean clone, with nothing else busy.

## Cross-filter latency before and after the brief transitions

The first measurement of NFR-P4 missed: a median of 549 ms with animation on, against 42 ms with
reduced motion. The results arrived, and the table and KPI were drawn, within 60 ms of the click;
the rest was ECharts' default animations, which `finished` waits for. The pie series has its own 500 ms update animation, and when a line's
points all move far, as when the North America filter puts life expectancy outside the previous
value range, ECharts draws the line again with its one-second entrance animation (1054 ms for
that region). Charts now animate for 200 ms, set on every series as well as on the chart, because
a series' own defaults win over the chart's. That follows the guidance to animate chart updates
briefly, and brought the median to 257 ms and the North America case to 249 ms.

## What is inside the bundles

![Gzipped size of each package in dashkit.js: echarts 124.6 kB, react-dom 62.2 kB, zrender 55.3 kB, the SDK's own code 15.0 kB, react-grid-layout 10.0 kB, react-draggable 5.8 kB, react 3.0 kB, react-resizable 2.9 kB, and 5.0 kB of six small packages and bundler glue.](images/bundle-breakdown.png)

The breakdown was made once, by attributing every byte of the minified bundle to its source file
through the bundle's source map, and compressing each package's share on its own. It shows the
build at the end of Phase 7. What came after, from paged tables to multi-select, added no dependency
and 2.9 kB gzipped to the whole bundle, while `dist/index.js` alone grew from 16.7 to 20.1 kB.

| Package                                                       | Minified     | Share | Gzipped      |
| ------------------------------------------------------------- | ------------ | ----- | ------------ |
| echarts                                                       | 368.6 kB     | 42.2% | 124.6 kB     |
| react-dom                                                     | 202.7 kB     | 23.2% | 62.2 kB      |
| zrender (ECharts' renderer)                                   | 169.7 kB     | 19.4% | 55.3 kB      |
| @dashkit/sdk, own code                                        | 46.5 kB      | 5.3%  | 15.0 kB      |
| react-grid-layout                                             | 28.4 kB      | 3.3%  | 10.0 kB      |
| react-draggable                                               | 27.5 kB      | 3.1%  | 5.8 kB       |
| react-resizable                                               | 11.2 kB      | 1.3%  | 2.9 kB       |
| react                                                         | 7.9 kB       | 0.9%  | 3.0 kB       |
| scheduler, fast-equals, clsx, prop-types, tslib, bundler glue | 11.2 kB      | 1.3%  | 5.0 kB       |
| **Whole bundle**                                              | **873.7 kB** |       | **281.7 kB** |

ECharts and its renderer are 62% of the script-tag build, even though only the bar, line and pie
charts, the grid, legend and tooltip components, and the canvas renderer are registered. The npm
build keeps React, ECharts and the grid library as the host's dependencies, so a host that already
uses any of them does not ship them twice.

## Reading the SDK's timings in your own app

The SDK records these entries in the browser's performance timeline, so a host can watch them in
the performance panel or send them to its own monitoring:

| Entry                   | Type    | From                                                  | To                                                   |
| ----------------------- | ------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `dashkit:mount`         | mark    | a dashboard mounts                                    |                                                      |
| `dashkit:first-chart`   | measure | `dashkit:mount`                                       | the first chart's ECharts `finished` event           |
| `dashkit:filter-change` | mark    | the cross-filters change, by a click or from the host |                                                      |
| `dashkit:cross-filter`  | measure | `dashkit:filter-change`                               | every widget the change updated has finished drawing |

```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.startsWith('dashkit:')) console.log(entry.name, Math.round(entry.duration));
  }
}).observe({ entryTypes: ['measure'] });
```
