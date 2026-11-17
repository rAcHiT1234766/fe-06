import type { DataRow } from '../src/schema.ts';

declare const snapshot: { source: string; fetchedAt: string; rows: DataRow[] };
export default snapshot;
