import { cn } from "../../utils/cn.js";

export default function Table({
  caption,
  className,
  columns,
  emptyMessage = "There are no records to display.",
  rowKey = (row, index) => row.id ?? index,
  rows,
}) {
  return (
    <div
      className="overflow-x-auto rounded-sm border border-gov-border bg-white focus-visible:outline-2 focus-visible:outline-gov-green"
      tabIndex={0}
    >
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
      >
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-gov-page text-xs uppercase tracking-wide text-gov-muted">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 font-bold" key={column.key} scope="col">
                {column.heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gov-border">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-5 text-gov-muted" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr className="align-top" key={rowKey(row, index)}>
                {columns.map((column) => (
                  <td
                    className="px-4 py-4 leading-6 text-gov-ink"
                    key={column.key}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
