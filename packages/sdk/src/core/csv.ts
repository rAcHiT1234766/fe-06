import type { QueryResult, Scalar } from './types';

// A spreadsheet runs a cell that starts with one of these as a formula, so a text cell that does is
// kept as text with a leading apostrophe. Numbers are left alone: a negative number is no formula.
const FORMULA_START = /^[=+\-@\t\r]/;

function toCell(value: Scalar): string {
  if (value === null) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * A result as CSV (RFC 4180): a heading row of column labels, then one line per row. Values are
 * written unformatted, so a spreadsheet can calculate with them, and a missing value stays empty
 * rather than becoming 0.
 */
export function toCsv({ columns, rows }: QueryResult): string {
  const lines = [
    columns.map(({ label }) => toCell(label)),
    ...rows.map((row) => columns.map(({ name }) => toCell(row[name] ?? null))),
  ];
  return lines.map((cells) => `${cells.join(',')}\r\n`).join('');
}

/** A file name from a widget's title: letters and digits only, accents dropped, words joined by dashes. */
export function csvFileName(title: string): string {
  const words = title
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return `${words.join('-') || 'data'}.csv`;
}
