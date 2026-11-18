import { csvFileName, toCsv } from '../../core/csv';
import type { QueryResult } from '../../core/types';
import { DownloadIcon } from '../builder/icons';

// The browser reads the file after click() returns, so its address is kept a while before release.
const RELEASE_AFTER_MS = 40_000;

function download(fileName: string, text: string, beside: Element) {
  // The byte order mark tells spreadsheet apps the file is UTF-8, so names such as Côte d'Ivoire
  // keep their letters.
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }));
  const link = beside.ownerDocument.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  // Placed beside the button, so it is inside the dashboard's shadow root when there is one, and a
  // host's handler for link clicks never sees it.
  beside.after(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), RELEASE_AFTER_MS);
}

/** Downloads the widget's current result, every row of it, as a CSV file named after its title. */
export function ExportButton({ title, result }: { title: string; result: QueryResult }) {
  return (
    <button
      type="button"
      className="dk-icon-button"
      aria-label={`Download ${title} as CSV`}
      title="Download CSV"
      onClick={(event) => download(csvFileName(title), toCsv(result), event.currentTarget)}
    >
      <DownloadIcon />
    </button>
  );
}
