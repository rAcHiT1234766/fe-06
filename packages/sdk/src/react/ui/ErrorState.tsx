import type { DashKitError } from '../../core/types';

const TITLES: Record<DashKitError['code'], string> = {
  UNAUTHENTICATED: 'Session invalid',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Not found',
  NETWORK: 'Data service unreachable',
  INVALID_QUERY: 'Invalid widget settings',
  UNKNOWN: 'Something went wrong',
};

export function ErrorState({ error }: { error: DashKitError }) {
  return (
    <div className="dk-state dk-error" role="alert">
      <p className="dk-state-title">{TITLES[error.code]}</p>
      <p className="dk-state-detail">{error.message}</p>
    </div>
  );
}
