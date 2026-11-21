import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Waiting for the mock API takes a fraction of a second alone, but can take more than a second, the
// default limit, when every project runs at once on a busy machine. The limit only ends a wait that
// is failing anyway, so a test that passes takes no longer for it.
configure({ asyncUtilTimeout: 5_000 });

afterEach(cleanup);
