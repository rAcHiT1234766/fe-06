import { version } from 'react';
import { version as domVersion } from 'react-dom';

// The aliases in vitest.config.ts are what make this run React 18; if they stop working, the tests
// would quietly run on React 19 and prove nothing.
if (!version.startsWith('18.') || !domVersion.startsWith('18.')) {
  throw new Error(`Expected React 18, but react is ${version} and react-dom is ${domVersion}.`);
}
