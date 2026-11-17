import { describe, expect, it } from 'vitest';
import { formatValue } from './format';

describe('formatValue', () => {
  it.each([
    [2364906569, 'number', 'standard', '2,364,906,569'],
    [2364906569, 'number', 'compact', '2.4B'],
    [72.345, 'number', 'standard', '72.3'],
    [12345.67, 'currency', 'standard', '$12,346'],
    [3.1e13, 'currency', 'compact', '$31T'],
    [45.67, 'percent', 'standard', '45.7%'],
    [2024, 'year', 'standard', '2024'],
    ['South Asia', undefined, 'standard', 'South Asia'],
  ] as const)('formats %s as %s (%s)', (value, format, notation, expected) => {
    expect(formatValue(value, format, notation)).toBe(expected);
  });

  it('shows missing values as a dash, never as zero', () => {
    expect(formatValue(null, 'number')).toBe('—');
  });
});
