import { formatValue } from '../../core/format';
import type { QueryResult } from '../../core/types';

export function DataTable({ result, caption }: { result: QueryResult; caption: string }) {
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
            {result.columns.map((column) => (
              <td key={column.name} className={numericClass(column.role)}>
                {formatValue(row[column.name] ?? null, column.format)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
