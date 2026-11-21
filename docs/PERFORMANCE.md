# Performance

Every number on this page was measured on 18 November 2026: the timings in the main table on the
code at commit `a0f0817`, the bundle sizes at `9637048`, the last change to code, and the timings
under "Re-measured after Phase 7" at both. The sections after that one give their own dates and
commits. The targets come from the project requirements (NFR-P1
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
  Dragging, which moves widgets without resizing their charts, stayed smooth. A chart being resized
  is now drawn once, when the drag ends; see "Re-measured after closing the known gaps".

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

## Re-measured after the features beyond the requirements

CSV export, drill-down, filter controls, the dashboard picker and the map widget were checked for a
slowdown on 21 November 2026: `pnpm perf` ran at `9637048`, the code measured in the section
above, and at `c278550`, the last change to code apart from a comment in this test, one after the
other and each from a fresh clone. Both ran the drag and resize test as `c278550` has it; why it
changed is below.

| Measurement, medians                                     |  `9637048` |  `c278550` | Target                 |
| -------------------------------------------------------- | ---------: | ---------: | ---------------------- |
| Mount to first chart finished, animation on              |     149 ms |     165 ms | ≤ 1.5 s                |
| Same, reduced motion                                     |     102 ms |      87 ms | ≤ 1.5 s                |
| Same, animation on, CPU 4× slower                        |    1267 ms |    1226 ms | ≤ 1.5 s                |
| Filter by a region not seen before, animation on         |     251 ms |     256 ms | ≤ 300 ms               |
| Clear the filter, animation on                           |     239 ms |     237 ms | ≤ 300 ms               |
| Filter by a region not seen before, CPU 4× slower        |     513 ms |     549 ms | ≤ 300 ms               |
| Resize with 12 widgets, CPU 4× slower: frames over 50 ms |   8 of 215 |   9 of 197 | No visible jank        |
| Identical queries from 10 widgets                        | 5 requests | 5 requests | One per distinct query |

The two are within the spread between runs, so the five features did not slow the dashboard. The
machine was faster than on 18 November: both commits mounted within 1.5 s on the slowed CPU this
time. A cross-filter on the slowed CPU still misses its 300 ms at both.

### The resize test measured the page around the grid

The first run at `570ce15`, the map's commit, found resizing on the slowed CPU much worse than at
`9637048`: 72 of 156 frames over 50 ms instead of 12 of 218, and at full speed a 95th percentile of
33.3 ms instead of 16.8 ms. Repeated runs agreed. Measuring each commit in between put most of the
rise at `2c4e9ce`, the dashboard picker, and some at `217c644`, the filter controls; removing the
picker from the demo took it back to the level before that commit.

What the two commits share is room above the grid: the builder's row of filter-control
checkboxes, the picker, and the note the picker shows while there are unsaved changes put the grid
96 pixels lower. The test took its start point from wherever the widget's resize corner was, then
dragged it 150 pixels down, so the drag that ended at 715 pixels in the 720-pixel window now ended
at 811, outside it.

While the mouse button is held, Chrome scrolls the page once the pointer comes within about 20
pixels of the window's edge, as it does to extend a text selection, because the grid's drag library
does not cancel the mouse press; and while the pointer moves, the widget being resized grows with
every pixel scrolled. In a probe at `570ce15`, the page started scrolling when the pointer reached
701 pixels, a quarter of the way through the drag, and scrolled 5218 pixels; with the mouse press
cancelled, it did not scroll at all and 4 of 200 frames were over 50 ms. At `9637048` the drag
reached that band only in its last tenth, and the page scrolled 142 pixels.

The test now scrolls each drag's start point to 300 pixels down the window first, so it measures
the same drag whatever sits above the grid. With that change, `9637048` and `570ce15` gave the same
frames in two rounds each: 10 of about 210 over 50 ms on the slowed CPU. The table above uses the
changed test for both commits, so the rows are comparable with each other but not with the tables
above, which used the old one.

A user who held a resize corner near the bottom of the window in Chrome saw the same until
`59132a6`: the page scrolled and the widget stopped following the pointer. The grid now cancels the
press on a resize corner, so the page stays still. The test keeps its start height, so that its
numbers stay comparable with the runs before.

## Re-measured after closing the known gaps

The charts drawn once at the end of a resize, the page kept still during one, and the map's own
entry were measured on 21 November 2026: `pnpm perf` ran from fresh clones of `111c8e0`, the code
measured in the section above with only comments and documentation changed since, and `7690cff`,
the last change to code. Each ran twice, in the order `111c8e0`, `7690cff`, `7690cff`, `111c8e0`,
and each cell gives the first run and then the second.

| Measurement                                               |            `111c8e0` |           `7690cff` | Target                 |
| --------------------------------------------------------- | -------------------: | ------------------: | ---------------------- |
| Mount to first chart finished, animation on, median       |         206 / 205 ms |        232 / 160 ms | ≤ 1.5 s                |
| Same, reduced motion                                      |          101 / 98 ms |         116 / 99 ms | ≤ 1.5 s                |
| Same, animation on, CPU 4× slower                         |       1889 / 1649 ms |      1840 / 1722 ms | ≤ 1.5 s                |
| Filter by a region not seen before, animation on, median  |         279 / 287 ms |        267 / 263 ms | ≤ 300 ms               |
| Clear the filter, animation on, median                    |         252 / 260 ms |        244 / 245 ms | ≤ 300 ms               |
| Filter by a region not seen before, CPU 4× slower, median |         788 / 826 ms |        626 / 758 ms | ≤ 300 ms               |
| Resize with 12 widgets: frames over 50 ms                 |  0 of 147 / 0 of 142 | 0 of 152 / 1 of 166 | No visible jank        |
| Resize, CPU 4× slower: frames over 50 ms                  | 9 of 234 / 10 of 194 | 3 of 184 / 3 of 199 | No visible jank        |
| Resize, CPU 4× slower: 95th percentile                    |       50.0 / 99.9 ms |      33.3 / 33.4 ms | No visible jank        |
| Resize, CPU 4× slower: worst frame                        |         567 / 600 ms |        350 / 483 ms | No visible jank        |
| Identical queries from 10 widgets                         |           5 requests |          5 requests | One per distinct query |

Resizing on the slowed CPU improved: 3 frames over 50 ms in each run rather than 9 and 10, and a
95th percentile of 33.3 and 33.4 ms, about the 30 frames a second that the reading of "no visible
jank" above allows, rather than 50.0 and 99.9 ms. It still misses that reading, since one frame in
each run took 350 ms or more, past its 100 ms. A further run, which logged where the slow frames
fell, had one: the first frame after the press on the resize corner, at 333 ms. The frames of the
drag itself and of the release, when the chart is drawn again, stayed under 50 ms. That is one run,
so it shows where the long frame can fall rather than that it always falls there.

The other rows are within the spread between runs. Moving the map to its own entry changes none of
them, since the demo imports that entry and so loads the same code as before. The machine was
slower than earlier the same day: `111c8e0` mounted in 1889 and 1649 ms on the slowed CPU, against
1226 ms for the same code in the section above, so that row missed its 1.5 s at both commits, as it
did on 18 November. A cross-filter on the slowed CPU missed its 300 ms at both, as before.

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
and 2.9 kB gzipped to the whole bundle, while `dist/index.js` alone grew from 16.7 to 20.1 kB. The
features beyond the requirements then added 28.8 kB, to 313.4 kB, most of it ECharts' map and its
colour classes, and `dist/index.js` grew to 25.4 kB; the npm build as a host bundles it went from
217.6 to 245.8 kB. Since the map moved to its own entry, `@dashkit/sdk/map`, a host that shows no
map bundles 222.6 kB, and one that also imports the map entry 246.2 kB; `dist/index.js` alone is
25.7 kB, and `dashkit.js`, which keeps the map, 313.8 kB.

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
charts, the grid, legend and tooltip components, and the canvas renderer are registered; the map
chart and its colour classes were added since, and the npm build carries them in the map entry
only. The npm
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
