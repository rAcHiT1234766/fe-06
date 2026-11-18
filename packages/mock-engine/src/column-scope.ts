import type { MeasureField, TokenClaims } from '@dashkit/sdk';
import { ApiError } from './errors.ts';
import type { ParsedQuery } from './parse-query.ts';
import { isMeasureField, measures } from './schema.ts';

type Scopes = TokenClaims['scopes'];

/** Whether a token's column scope lets its user query a measure. A token without one allows every measure. */
export const mayQueryMeasure = (scopes: Scopes, field: MeasureField) =>
  scopes.measures === undefined || scopes.measures === '*' || scopes.measures.includes(field);

const listWithOr = new Intl.ListFormat('en-GB', { type: 'disjunction' });

/**
 * Refuses a query that names a measure outside the token's column scope, whether it would show the
 * measure or only filter on it: a filter such as "GDP above a trillion" would otherwise reveal GDP
 * one narrowing step at a time.
 */
export function assertMeasuresAllowed(query: ParsedQuery, scopes: Scopes) {
  const named = new Set([
    ...query.measures.map(({ field }) => field),
    ...query.filters.map(({ field }) => field).filter(isMeasureField),
  ]);
  const refused = [...named].filter((field) => !mayQueryMeasure(scopes, field));
  if (refused.length > 0) {
    const labels = refused.map((field) => measures[field].label);
    throw new ApiError(
      403,
      'FORBIDDEN',
      `Your access does not include ${listWithOr.format(labels)}`,
    );
  }
}
