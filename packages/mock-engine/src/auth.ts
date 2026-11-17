import type { TokenClaims } from '@dashkit/sdk';
import { errors, jwtVerify, SignJWT } from 'jose';
import { ApiError } from './errors.ts';
import { findDemoUser } from './users.ts';

const ALGORITHM = 'HS256';
const TOKEN_LIFETIME = '15m';

const encodeSecret = (secret: string) => new TextEncoder().encode(secret);

/** A fresh 256-bit secret, for runs where tokens only need to outlive the current process. */
export const createRandomSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

/** Plays the part of the host's backend: mints a short-lived embed token for a demo user. */
export async function signDemoToken(userId: unknown, secret: string): Promise<string> {
  const user = findDemoUser(userId);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Unknown demo user');
  return new SignJWT({ tenantId: user.tenantId, role: user.role, scopes: user.scopes })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(TOKEN_LIFETIME)
    .sign(encodeSecret(secret));
}

export async function verifyToken(
  authorization: string | null,
  secret: string,
): Promise<TokenClaims> {
  const token = /^Bearer (\S+)$/.exec(authorization ?? '')?.[1];
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Missing bearer token');
  try {
    // Only this API holds the secret, so a payload that verifies was written by signDemoToken.
    const { payload } = await jwtVerify<TokenClaims>(token, encodeSecret(secret), {
      algorithms: [ALGORITHM],
    });
    return payload;
  } catch (error) {
    if (!(error instanceof errors.JOSEError)) throw error;
    const message = error instanceof errors.JWTExpired ? 'Token expired' : 'Invalid token';
    throw new ApiError(401, 'UNAUTHENTICATED', message);
  }
}
