import snapshot from '../data/wdi.json' with { type: 'json' };
import type { DataRow } from './schema.ts';

export const snapshotRows: DataRow[] = snapshot.rows;
