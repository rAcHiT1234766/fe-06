import type { DimensionField } from '../core/types';

/** How the interface names each field: one of its values, and all of them. */
export const FIELD_NAMES: Record<DimensionField, { label: string; all: string }> = {
  country: { label: 'Country', all: 'All countries' },
  region: { label: 'Region', all: 'All regions' },
  incomeLevel: { label: 'Income level', all: 'All income levels' },
  year: { label: 'Year', all: 'All years' },
};

/** Years are shown without a thousands separator; other fields as they are. */
export const formatFor = (field: DimensionField) => (field === 'year' ? 'year' : undefined);
