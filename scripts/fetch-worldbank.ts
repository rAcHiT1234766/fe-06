import { writeFileSync } from 'node:fs';
import type { MeasureField } from '@dashkit/sdk';
import { measures, type DataRow } from '../packages/mock-engine/src/schema.ts';

const API_URL = 'https://api.worldbank.org/v2';
const FIRST_YEAR = 2000;
const LAST_YEAR_REQUESTED = new Date().getFullYear() - 1;
// New figures arrive over several years, so the most recent years are mostly empty. Keep a year
// only if every indicator has a value for at least this share of countries.
const MIN_COVERAGE = 0.5;
const OUTPUT = new URL('../packages/mock-engine/data/wdi.json', import.meta.url);

interface WorldBankCountry {
  id: string;
  name: string;
  region: { id: string; value: string };
  incomeLevel: { value: string };
}

interface WorldBankObservation {
  countryiso3code: string;
  date: string;
  value: number | null;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1, pageCount = 1; page <= pageCount; page++) {
    const url = `${API_URL}${path}${path.includes('?') ? '&' : '?'}format=json&per_page=20000&page=${page}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    // The API reports errors such as a retired indicator code as a one-element array with status 200.
    const body = (await response.json()) as [{ pages?: number }, T[]?];
    if (!body[1]) throw new Error(`${url} returned no data: ${JSON.stringify(body[0])}`);
    pageCount = body[0].pages ?? 1;
    items.push(...body[1]);
  }
  return items;
}

const measureFields = Object.keys(measures) as MeasureField[];

const countries = (await fetchAllPages<WorldBankCountry>('/country')).filter(
  (country) => country.region.value !== 'Aggregates',
);

const rowsByKey = new Map<string, DataRow>();
for (const country of countries) {
  for (let year = FIRST_YEAR; year <= LAST_YEAR_REQUESTED; year++) {
    const emptyMeasures = Object.fromEntries(measureFields.map((field) => [field, null]));
    rowsByKey.set(`${country.id}:${year}`, {
      country: country.name.trim(),
      region: country.region.value.trim(),
      regionCode: country.region.id,
      incomeLevel: country.incomeLevel.value.trim(),
      year,
      ...(emptyMeasures as Record<MeasureField, null>),
    });
  }
}

for (const field of measureFields) {
  const { indicator } = measures[field];
  const observations = await fetchAllPages<WorldBankObservation>(
    `/country/all/indicator/${indicator}?date=${FIRST_YEAR}:${LAST_YEAR_REQUESTED}`,
  );
  for (const observation of observations) {
    const row = rowsByKey.get(`${observation.countryiso3code}:${observation.date}`);
    if (row) row[field] = observation.value;
  }
  console.log(`${field.padEnd(18)} ${indicator.padEnd(15)} ${observations.length} observations`);
}

const allRows = [...rowsByKey.values()];
const coverage = (year: number, field: MeasureField) => {
  const rowsInYear = allRows.filter((row) => row.year === year);
  return rowsInYear.filter((row) => row[field] !== null).length / rowsInYear.length;
};

let lastYear = LAST_YEAR_REQUESTED;
while (measureFields.some((field) => coverage(lastYear, field) < MIN_COVERAGE)) lastYear--;

const rows = allRows
  .filter((row) => row.year <= lastYear)
  .sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);

// One row per line keeps the diff readable when the snapshot is refreshed.
const json = [
  '{',
  `  "source": "World Bank World Development Indicators, ${API_URL}",`,
  `  "fetchedAt": "${new Date().toISOString().slice(0, 10)}",`,
  '  "rows": [',
  rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(OUTPUT, json);

console.log(
  `\n${countries.length} countries, years ${FIRST_YEAR}-${lastYear}, ${rows.length} rows`,
);
console.log(
  `Years after ${lastYear} dropped: some indicator covered under ${MIN_COVERAGE * 100}% of countries.`,
);
for (const field of measureFields) {
  const nulls = rows.filter((row) => row[field] === null).length;
  console.log(`${field.padEnd(18)} ${nulls} nulls (${Math.round((100 * nulls) / rows.length)}%)`);
}
console.log(
  `Regions: ${[...new Set(rows.map((row) => `${row.regionCode} ${row.region}`))].join(', ')}`,
);
