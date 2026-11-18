import { useState } from 'react';
import type { QueryResult } from '../../core/types';

/** The page a table shows, and what the pager says about it. */
export interface Page {
  /** The page shown, from 0. */
  index: number;
  count: number;
  /** The first and last rows shown, counted from 1, and the number of rows in all. */
  firstRow: number;
  lastRow: number;
  rowCount: number;
}

/**
 * Splits a result's rows into pages of `pageSize`, or returns it whole when there is no page size
 * or one page holds every row. A new result, as after a filter, starts again on its first page, so
 * the reader never lands on a page that no longer exists.
 */
export function usePagedResult(result: QueryResult, pageSize: number | undefined) {
  const [shown, setShown] = useState({ result, index: 0 });
  const rowCount = result.rows.length;
  if (!pageSize || rowCount <= pageSize) return { result, page: undefined, showPage: undefined };

  const count = Math.ceil(rowCount / pageSize);
  const index = shown.result === result ? Math.min(shown.index, count - 1) : 0;
  const start = index * pageSize;
  const rows = result.rows.slice(start, start + pageSize);
  const page: Page = {
    index,
    count,
    firstRow: start + 1,
    lastRow: start + rows.length,
    rowCount,
  };
  const showPage = (next: number) => setShown({ result, index: next });
  return { result: { ...result, rows }, page, showPage };
}

interface PagerProps {
  /** Names the pager for screen readers, such as "Pages of Countries". */
  label: string;
  page: Page;
  onPage: (index: number) => void;
}

/** Previous and Next buttons, with the rows shown between them. */
export function Pager({ label, page, onPage }: PagerProps) {
  const isFirst = page.index === 0;
  const isLast = page.index === page.count - 1;
  // aria-disabled rather than disabled: a disabled button loses the focus, which would leave a
  // keyboard user on the page body once Next reaches the last page.
  return (
    <nav className="dk-pager" aria-label={label}>
      <button
        type="button"
        className="dk-button"
        aria-disabled={isFirst}
        onClick={() => {
          if (!isFirst) onPage(page.index - 1);
        }}
      >
        Previous
      </button>
      <p className="dk-pager-status" role="status">
        Rows {page.firstRow}–{page.lastRow} of {page.rowCount}
      </p>
      <button
        type="button"
        className="dk-button"
        aria-disabled={isLast}
        onClick={() => {
          if (!isLast) onPage(page.index + 1);
        }}
      >
        Next
      </button>
    </nav>
  );
}
