import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
}

export function DataTable<T>({ columns, rows, getKey }: DataTableProps<T>) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="app-scroll overflow-x-auto scrollbar-soft" tabIndex={0} aria-label="Scrollable data table">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm sm:table-fixed">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className="px-4 py-4 font-semibold sm:px-5">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={getKey(row)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.header} className="min-w-36 break-words px-4 py-4 align-middle text-slate-700 sm:px-5">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
