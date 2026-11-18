import { formatValue } from '../../core/format';
import type { QueryResult } from '../../core/types';
import type { Selection } from '../hooks/use-cross-filter';

interface DataTableProps {
  result: QueryResult;
  caption: string;
  /** Turns the cells of the selection's field into buttons that toggle a cross-filter. */
  selection?: Selection | undefined;
}

export function DataTable({ result, caption, selection }: DataTableProps) {
  const numericClass = (role: string) => (role === 'measure' ? 'dk-numeric' : undefined);
  return (
    <table className="dk-table">
      <caption className="dk-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {result.columns.map((column) => (
            <th key={column.name} scope="col" className={numericClass(column.role)}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {result.columns.map((column) => {
              const value = row[column.name] ?? null;
              const text = formatValue(value, column.format);
              return (
                <td key={column.name} className={numericClass(column.role)}>
                  {column.name === selection?.field ? (
                    <button
                      type="button"
                      className="dk-select"
                      aria-label={`Filter by ${text}`}
                      aria-pressed={selection.values?.includes(value) ?? false}
                      // Cmd on a Mac, where Ctrl-click opens the context menu.
                      onClick={(event) => selection.toggle(value, event.ctrlKey || event.metaKey)}
                      onKeyDown={(event) => {
                        // Browsers differ on whether Ctrl+Enter clicks a button, and on whether
                        // that click says Ctrl was held, so the key is handled here instead.
                        if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
                        event.preventDefault();
                        selection.toggle(value, true);
                      }}
                    >
                      {text}
                    </button>
                  ) : (
                    text
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
