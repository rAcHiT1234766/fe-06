import { describe, expect, it } from 'vitest';
import { csvFileName, toCsv } from './csv';
import type { QueryResult } from './types';

const result = (rows: QueryResult['rows']): QueryResult => ({
  columns: [
    { name: 'country', role: 'dimension', label: 'Country' },
    { name: 'gdp', role: 'measure', label: 'GDP (US$)', format: 'currency' },
  ],
  rows,
  meta: { rowCount: rows.length, truncated: false, durationMs: 1 },
});

describe('toCsv', () => {
  it('writes a heading row of labels, then the raw values, each line ending in CRLF', () => {
    expect(
      toCsv(
        result([
          { country: 'India', gdp: 3912686168582.4 },
          { country: 'Nepal', gdp: 40908073249.5 },
        ]),
      ),
    ).toBe('Country,GDP (US$)\r\nIndia,3912686168582.4\r\nNepal,40908073249.5\r\n');
  });

  it('leaves a missing value empty rather than writing 0', () => {
    expect(toCsv(result([{ country: 'Eritrea', gdp: null }, { country: 'Chad' }]))).toBe(
      'Country,GDP (US$)\r\nEritrea,\r\nChad,\r\n',
    );
  });

  it('quotes values with commas, quotes or line breaks, doubling the quotes', () => {
    const csv = toCsv(
      result([
        { country: 'Korea, Rep.', gdp: 1 },
        { country: 'Say "hi"', gdp: 2 },
        { country: 'Two\nlines', gdp: 3 },
      ]),
    );
    expect(csv.split('\r\n').slice(1, 4)).toEqual([
      '"Korea, Rep.",1',
      '"Say ""hi""",2',
      '"Two\nlines",3',
    ]);
  });

  it('keeps text that a spreadsheet would run as a formula as text, but not negative numbers', () => {
    const csv = toCsv(
      result([
        { country: '=HYPERLINK("http://example.com")', gdp: -4.5 },
        { country: '+1', gdp: 0 },
        { country: '@SUM(A1)', gdp: 0 },
        { country: '-2', gdp: 0 },
      ]),
    );
    expect(csv.split('\r\n').slice(1, 5)).toEqual([
      '"\'=HYPERLINK(""http://example.com"")",-4.5',
      "'+1,0",
      "'@SUM(A1),0",
      "'-2,0",
    ]);
  });

  it('writes only the heading row when there are no rows', () => {
    expect(toCsv(result([]))).toBe('Country,GDP (US$)\r\n');
  });
});

describe('csvFileName', () => {
  it('names the file after the title', () => {
    expect(csvFileName('Population by region')).toBe('population-by-region.csv');
    expect(csvFileName('GDP (US$) — Côte d’Ivoire, 2024')).toBe('gdp-us-cote-d-ivoire-2024.csv');
  });

  it('falls back to "data" when the title has no letters or digits', () => {
    expect(csvFileName('  —  ')).toBe('data.csv');
  });
});
