import { mkdirSync, writeFileSync } from 'node:fs';

// Natural Earth's 1:110m countries, which are in the public domain, at a fixed release.
const NATURAL_EARTH_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson';
const WORLD_BANK_URL = 'https://api.worldbank.org/v2/country?format=json&per_page=400';
const OUTPUT_DIR = new URL('../apps/demo/public/maps/', import.meta.url);
// Two decimal places, about a kilometre, is finer than a 1:110m map draws.
const PRECISION = 100;
// No data describes Antarctica, and it would take a fifth of the map's height.
const LEFT_OUT = new Set(['ATA']);
// Where the two sources use different codes for the same country.
const WORLD_BANK_CODE: Record<string, string> = { KOS: 'XKX' };

interface Feature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

interface WorldBankCountry {
  id: string;
  name: string;
  region: { value: string };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return (await response.json()) as T;
}

const round = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(round)
    : typeof value === 'number'
      ? Math.round(value * PRECISION) / PRECISION
      : value;

// Natural Earth leaves ISO_A3 at "-99" for a few countries, such as France and Norway, whose other
// codes are filled in.
function codeOf({ ISO_A3, ISO_A3_EH, ADM0_A3 }: Record<string, unknown>): string {
  const code = [ISO_A3, ISO_A3_EH, ADM0_A3].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate !== '-99',
  );
  if (!code) throw new Error('A Natural Earth country has no code');
  return WORLD_BANK_CODE[code] ?? code;
}

const { features } = await fetchJson<{ features: Feature[] }>(NATURAL_EARTH_URL);
const [, countries] = await fetchJson<[unknown, WorldBankCountry[]]>(WORLD_BANK_URL);
const worldBankNames = new Map(
  countries
    .filter((country) => country.region.value !== 'Aggregates')
    .map((country) => [country.id, country.name.trim()]),
);

const unmatched: string[] = [];
const mapped = features
  .filter((feature) => !LEFT_OUT.has(codeOf(feature.properties)))
  .map((feature): Feature => {
    const code = codeOf(feature.properties);
    const worldBankName = worldBankNames.get(code);
    const name = worldBankName ?? String(feature.properties.NAME);
    if (!worldBankName) unmatched.push(`${code} ${name}`);
    return {
      type: 'Feature',
      // The data's country names, which the map matches its values to.
      properties: { name, code },
      geometry: { type: feature.geometry.type, coordinates: round(feature.geometry.coordinates) },
    };
  })
  .sort((a, b) => String(a.properties.name).localeCompare(String(b.properties.name)));

const missing = [...worldBankNames]
  .filter(([code]) => !mapped.some((feature) => feature.properties.code === code))
  .map(([code, name]) => `${code} ${name}`);

const map = {
  type: 'FeatureCollection',
  source: `Natural Earth 1:110m countries (public domain), ${NATURAL_EARTH_URL}; names from ${WORLD_BANK_URL}`,
  features: mapped,
};
mkdirSync(OUTPUT_DIR, { recursive: true });
// One country per line keeps the diff readable when the map is built again.
const json = [
  '{',
  `  "type": "FeatureCollection",`,
  `  "source": ${JSON.stringify(map.source)},`,
  '  "features": [',
  mapped.map((feature) => `    ${JSON.stringify(feature)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(new URL('world.json', OUTPUT_DIR), json);

console.log(`${mapped.length} countries drawn, ${json.length} bytes`);
console.log(`Drawn without World Bank data (${unmatched.length}): ${unmatched.join(', ')}`);
console.log(
  `World Bank countries too small for the map (${missing.length}): ${missing.join(', ')}`,
);
