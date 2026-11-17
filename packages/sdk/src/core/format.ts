import type { QueryResult, Scalar } from './types';

type ColumnFormat = QueryResult['columns'][number]['format'];

// Figures are shown in English because a multi-language UI is out of scope; pinning the locale
// keeps tables, charts and tests consistent on every machine.
export function formatValue(
  value: Scalar,
  format: ColumnFormat,
  notation: 'standard' | 'compact' = 'standard',
): string {
  if (value === null) return '—';
  if (typeof value !== 'number' || format === 'year') return String(value);
  const isCurrency = format === 'currency';
  const formatted = new Intl.NumberFormat('en-US', {
    notation,
    style: isCurrency ? 'currency' : 'decimal',
    currency: 'USD',
    maximumFractionDigits: isCurrency && notation === 'standard' ? 0 : 1,
  }).format(value);
  // Percentage measures are already on the 0–100 scale.
  return format === 'percent' ? `${formatted}%` : formatted;
}
