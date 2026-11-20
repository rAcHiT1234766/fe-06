import { describe, expect, it } from 'vitest';
import { slugify, unusedId } from './slug';

describe('slugify', () => {
  it('keeps letters and digits, drops accents, and joins the words with dashes', () => {
    expect(slugify('Côte d’Ivoire: GDP 2024!', 'dashboard')).toBe('cote-d-ivoire-gdp-2024');
  });

  it('falls back when no letter or digit is left', () => {
    expect(slugify('— ? —', 'dashboard')).toBe('dashboard');
  });
});

describe('unusedId', () => {
  it('keeps a free id and numbers a taken one with the first free number', () => {
    expect(unusedId('sales', ['overview'])).toBe('sales');
    expect(unusedId('sales', ['sales', 'sales-2', 'sales-4'])).toBe('sales-3');
  });
});
