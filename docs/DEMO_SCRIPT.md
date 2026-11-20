# Demo script

This follows the eleven steps in section 11 of the project requirements, shot by shot. It serves
three purposes:

- **The backup recording** (deliverable D1): record it once, in 4 to 5 minutes.
- **The live demo** in the presentation, which has about 3 minutes 30 seconds for it; see
  [Keeping to time live](#keeping-to-time-live).
- **The acceptance test** on the deployed version: every step's "Expect" column must hold.

## Addresses

| What            | Deployed (see [DEPLOYMENT.md](DEPLOYMENT.md)) | Locally, after `pnpm dev` and `pnpm storybook` |
| --------------- | --------------------------------------------- | ---------------------------------------------- |
| Demo app        | `https://<demo address>`                      | http://localhost:5173                          |
| Plain HTML page | `https://<demo address>/plain-html/`          | http://localhost:5173/plain-html/              |
| Storybook       | `https://<storybook address>`                 | http://localhost:6006                          |
| Demo API        | `https://<api address>`                       | http://localhost:4000                          |

## Before you record

1. Open `https://<api address>/health` and wait for `{"status":"ok"}`. A free API that has been
   idle takes up to a minute to wake.
2. In Chrome, open three tabs: the plain HTML page, the demo app and Storybook. Set the zoom to
   100 % and the window to about 1280 × 800. Close DevTools.
3. Reload the demo app so it starts as Asha, in the Acme Global brand, on the Analytics page, with
   the starter dashboard. The dark **Demo** bar at the top holds the controls the shots use;
   everything below it is the host product.
4. Put the step 8 snippet below in a text editor, with the API's address filled in, ready to copy.
5. Silence notifications. On Windows 11, Snipping Tool can record the screen; any recorder will do.

## Shots

| #   | Time      | Do                                                                                                                                                                                                                                                                                                               | Say                                                                                                                                                                                                                          | Expect                                                                                                                                                                                                                                                                    |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 0:00–0:25 | On the plain HTML tab, press Ctrl+U to show the page source. Point at the `<script src="/dashkit.js">` tag and the `<dashkit-dashboard>` element. Close the source tab.                                                                                                                                          | "This page has no framework and no build step: one script tag and one element. That is the whole integration."                                                                                                               | The source shows one script tag and the element; the page shows five widgets.                                                                                                                                                                                             |
| 2   | 0:25–0:40 | Switch to the demo app tab.                                                                                                                                                                                                                                                                                      | "The same dashboard inside a React product, installed from npm as `@dashkit/sdk`. The product around it is the host's own."                                                                                                  | The same "World development overview" dashboard, on the host product's Analytics page.                                                                                                                                                                                    |
| 3   | 0:40–1:10 | Under **Brand**, choose AsiaInsights, then EuroStat Co. Under **Mode**, choose Dark, then Light.                                                                                                                                                                                                                 | "Each customer brings their own brand: colours, fonts, corner radius, logo, and the charts follow. Dark mode is part of the theme."                                                                                          | Colours, font, corners (rounded to square), logo and chart colours change each time, and the host product's top bar and navigation follow; dark mode restyles everything.                                                                                                 |
| 4   | 1:10–1:55 | Set the brand back to Acme Global. Under **Signed in as**, Asha is selected: point at the table's regions. Choose Ravi. Press F12, open **Network**, type `query` in the filter, click a request and open **Response**. Choose Kofi, and look at the `query` requests again.                                     | "Asha sees every region. Ravi may see two. The browser never decides that: the API filters the rows, so other regions never reach the browser. Kofi may see every region but no GDP, and the API refuses those queries too." | As Ravi, the charts show only South Asia and East Asia & Pacific, and no `query` response holds another region. As Kofi, all seven regions are back, the GDP pie and the Countries table say "Access denied" and name the measure, and their `query` requests answer 403. |
| 5   | 1:55–2:10 | Close DevTools. Click **Tamper with token**.                                                                                                                                                                                                                                                                     | "If anyone edits the token, its signature no longer matches, and the API refuses it."                                                                                                                                        | The dashboard is replaced by a "Session invalid" message.                                                                                                                                                                                                                 |
| 6   | 2:10–2:40 | Choose Asha again. In **Population by region**, click the South Asia bar. Then click it again.                                                                                                                                                                                                                   | "Clicking a bar filters every other widget, and a chip shows the filter. Clicking again clears it."                                                                                                                          | The pie, line and table change, and a "Region: South Asia" chip appears. The second click restores them and the chip goes.                                                                                                                                                |
| 7   | 2:40–3:30 | Click **Edit dashboard**. Drag a widget by its handle; resize another from its bottom-right corner. Under **Add a widget**, click **Pie chart**: it appears at the bottom, with its **Configure** button focused. Press Enter, change the title and the measure, close the panel. Click **Save**, then press F5. | "Editors can rearrange and extend the dashboard. Nothing is stored until Save. After a reload, it is still there, because the API stored it."                                                                                | "Saved" appears; after the reload the new layout and the new pie chart are back.                                                                                                                                                                                          |
| 8   | 3:30–3:55 | Choose Ravi. Point out that there is no **Edit dashboard** button. Press F12, open **Console**, paste the snippet below and press Enter.                                                                                                                                                                         | "Ravi is a viewer, so there is no edit button. Even a hand-made save request with his valid token is refused by the API."                                                                                                    | No edit button. The console prints `403` and `FORBIDDEN`, "Only editors can change dashboards".                                                                                                                                                                           |
| 9   | 3:55–4:10 | Close DevTools. Narrow the window to phone width, or press Ctrl+Shift+M in DevTools and pick a phone.                                                                                                                                                                                                            | "The layout follows its container, down to a phone."                                                                                                                                                                         | One widget per row; the page does not scroll sideways.                                                                                                                                                                                                                    |
| 10  | 4:10–4:35 | Restore the window. On the Storybook tab, open **Widgets › Bar chart** and click Loading, Empty and Error. Open **Concepts › Theming** and move the radius slider. Open **API reference**.                                                                                                                       | "Storybook shows every widget in every state, a theming playground, and the API reference generated from the TypeScript types."                                                                                              | Each state renders; the playground restyles as you drag; the reference lists every export.                                                                                                                                                                                |
| 11  | 4:35–5:00 | Show [TEST_REPORT.md](TEST_REPORT.md) and [PERFORMANCE.md](PERFORMANCE.md), or the latest GitHub Actions run.                                                                                                                                                                                                    | "512 unit and component tests, and 102 end-to-end checks across three browsers, accessibility included. First chart in 155 ms, a cross-filter in 257 ms, 246 kB gzipped."                                                    | The reports' summary tables.                                                                                                                                                                                                                                              |

### Snippet for step 8

Paste it into the console of the demo app's tab, so the request comes from the demo's own origin.
The first time, Chrome asks you to type `allow pasting` before it accepts a paste.

```js
const api = 'https://<api address>';
const { token } = await (
  await fetch(`${api}/auth/demo-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'ravi' }),
  })
).json();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const config = await (await fetch(`${api}/dashboards/overview`, { headers })).json();
const response = await fetch(`${api}/dashboards/overview`, {
  method: 'PUT',
  headers,
  body: JSON.stringify(config),
});
console.log(response.status, await response.json());
```

It asks the API for Ravi's token, reads his dashboard, and tries to save it unchanged. The
console prints `403` and an error object; expand it to show the code `FORBIDDEN` and the message
"Only editors can change dashboards".

## Keeping to time live

The presentation gives the demo about 3 minutes 30 seconds. Do shots 1 to 9 live and leave
shots 10 and 11 to the slides: the results slide carries the numbers, and Storybook can be shown
in the questions if asked. If time runs short, shorten shot 7 to one drag, one added widget and
Save.

## If something goes wrong live

- **The demo cannot reach the API:** it is waking up. Talk through the architecture slide for a
  minute and reload.
- **A step fails outright:** switch to the backup recording at that step.
- **The saved dashboard from a rehearsal is still there:** that is expected until the API
  restarts; edit it again or leave it.
