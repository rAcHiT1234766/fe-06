import { ApiError } from './errors.ts';

export const invalidRequest = (message: string) => new ApiError(400, 'INVALID_QUERY', message);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isOneOf = <T>(allowed: readonly T[], value: unknown): value is T =>
  (allowed as readonly unknown[]).includes(value);
