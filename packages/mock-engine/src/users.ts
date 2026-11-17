import type { TokenClaims } from '@dashkit/sdk';

type DemoUser = Pick<TokenClaims, 'tenantId' | 'role' | 'scopes'>;

// Region codes are the World Bank's: SAS South Asia, EAS East Asia & Pacific, ECS Europe & Central Asia.
export const demoUsers: Record<string, DemoUser> = {
  asha: { tenantId: 'acme', role: 'editor', scopes: { regions: '*' } },
  ravi: { tenantId: 'asiainsights', role: 'viewer', scopes: { regions: ['SAS', 'EAS'] } },
  elena: { tenantId: 'eurostat', role: 'editor', scopes: { regions: ['ECS'] } },
};

export const findDemoUser = (userId: unknown): DemoUser | undefined =>
  typeof userId === 'string' && Object.hasOwn(demoUsers, userId) ? demoUsers[userId] : undefined;
