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
                      onClick={() => selection.toggle(value)}
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
